"""Serviço de ingestão de imóveis do Idealista.

Responsável por:
- Criar ou atualizar o snapshot canónico (dedup por property_id).
- Detetar se o raw_json é idêntico ao anterior (evita trabalho desnecessário).
- Guardar histórico sempre que o raw muda.
- Atualizar fotos (soft delete para as que desapareceram).
- Sincronizar versões de cada consultor com merge campo a campo.
"""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Foto,
    ImovelCanonico,
    ImovelCanonicoHistorico,
    ImovelVersao,
    User,
)
from app.schemas.ingest import FotoIngest, ImovelIngestPayload, IngestResult
from app.services.consultor_utils import get_consultor_do_user

# Campos editáveis pelo consultor (para o merge)
CAMPOS_EDITAVEIS = [
    "titulo",
    "preco",
    "localizacao",
    "descricao",
    "anunciante",
    "caracteristicas",
    "caracteristicas_especificas",
    "telefone",
]

# Campos que vivem no canónico (não editáveis na versão)
CAMPOS_CANONICOS = [
    "titulo", "preco", "localizacao", "descricao", "url",
    "ad_external_reference", "ad_commercial_name", "ad_professional_name",
    "anunciante", "referencia_anunciante",
    "caracteristicas", "caracteristicas_especificas", "plantas",
    "videos", "tours_virtuais", "contagens", "telefone",
]


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _raw_iguais(a: dict | None, b: dict | None) -> bool:
    """Compara dois raw_json ignorando a ordem das chaves."""
    if a is None or b is None:
        return a == b
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(
        b, sort_keys=True, default=str
    )


def _dados_canonicos_do_payload(payload: ImovelIngestPayload) -> dict:
    """Extrai do payload os campos que vão para o canónico."""
    dados = {}
    for campo in CAMPOS_CANONICOS:
        dados[campo] = getattr(payload, campo, None)
    return dados


# ---------------------------------------------------------------------------
# Canónico
# ---------------------------------------------------------------------------
def _criar_canonico(
    payload: ImovelIngestPayload,
    raw_json: dict,
) -> ImovelCanonico:
    dados = _dados_canonicos_do_payload(payload)
    return ImovelCanonico(
        property_id=str(payload.property_id),
        **dados,
        raw_json=raw_json,
        extraido_em=payload.extraido_em or _utcnow(),
    )


def _atualizar_canonico(
    canonico: ImovelCanonico,
    payload: ImovelIngestPayload,
    raw_json: dict,
) -> None:
    """Atualiza o canónico com os dados novos.

    IMPORTANTE: só atualiza campos cujo valor NÃO é None.
    Isto evita apagar dados com payloads parciais (o userscript pode não
    enviar todos os campos, e não queremos limpar o que já existe).
    """
    dados = _dados_canonicos_do_payload(payload)
    for campo, valor in dados.items():
        if valor is not None:
            setattr(canonico, campo, valor)
    canonico.raw_json = raw_json
    canonico.extraido_em = payload.extraido_em or _utcnow()


# ---------------------------------------------------------------------------
# Fotos
# ---------------------------------------------------------------------------
def _atualizar_fotos(
    db: Session,
    canonico: ImovelCanonico,
    fotos_payload: list[FotoIngest],
) -> tuple[int, int]:
    """Sincroniza fotos do canónico. Devolve (novas, inativadas).

    NOTA: assume que as fotos já estão carregadas via selectinload.
    NÃO chamar db.refresh(canonico) aqui — isso descartaria quaisquer
    alterações pendentes no canónico (como o preço atualizado antes).
    """
    fotos_existentes = {
        f.idealista_id: f for f in canonico.fotos if f.idealista_id is not None
    }
    ids_novos = {f.id for f in fotos_payload}

    fotos_novas = 0
    fotos_inativadas = 0

    # 1. Fotos que desapareceram → soft delete
    for idealista_id, foto in fotos_existentes.items():
        if idealista_id not in ids_novos and foto.ativa:
            foto.ativa = False
            fotos_inativadas += 1

    # 2. Fotos novas → inserir; existentes → atualizar metadados
    for f in fotos_payload:
        existente = fotos_existentes.get(f.id)
        if existente is None:
            db.add(
                Foto(
                    imovel_canonico_id=canonico.id,
                    idealista_id=f.id,
                    ordem=f.posicao or 0,
                    url_original=f.url,
                    url_webp=f.url_webp,
                    largura=f.largura,
                    altura=f.altura,
                    tag=f.tag,
                    titulo=f.titulo,
                    ativa=True,
                )
            )
            fotos_novas += 1
        else:
            existente.ordem = f.posicao or existente.ordem
            existente.url_original = f.url or existente.url_original
            existente.url_webp = f.url_webp or existente.url_webp
            existente.largura = f.largura or existente.largura
            existente.altura = f.altura or existente.altura
            existente.tag = f.tag or existente.tag
            existente.titulo = f.titulo or existente.titulo
            if not existente.ativa:
                existente.ativa = True

    return fotos_novas, fotos_inativadas


# ---------------------------------------------------------------------------
# Versões
# ---------------------------------------------------------------------------
def _sincronizar_versao(
    versao: ImovelVersao,
    canonico: ImovelCanonico,
    canonico_anterior: dict,
) -> bool:
    """Faz merge do canónico novo na versão do consultor.

    Devolve True se ficou com conflitos.

    `canonico_anterior` é um dict em snake_case com os valores anteriores
    dos campos do canónico (capturado ANTES do _atualizar_canonico correr).
    """
    campos_alterados = dict(versao.campos_alterados or {})
    tem_conflito = False

    for campo in CAMPOS_EDITAVEIS:
        valor_novo = getattr(canonico, campo)
        valor_anterior = canonico_anterior.get(campo)

        if campos_alterados.get(campo):
            # Consultor já tinha editado — mantém o valor dele.
            # É conflito se o Idealista também mudou o valor.
            if valor_novo != valor_anterior:
                tem_conflito = True
        else:
            # Consultor não tocou — copia o novo valor.
            setattr(versao, campo, valor_novo)

    versao.tem_conflitos = tem_conflito
    versao.sincronizado_em = _utcnow()
    return tem_conflito


def _criar_versao(
    canonico: ImovelCanonico,
    consultor_id: int,
) -> ImovelVersao:
    """Cria uma versão nova, copiando os campos editáveis do canónico."""
    return ImovelVersao(
        imovel_canonico_id=canonico.id,
        consultor_id=consultor_id,
        **{campo: getattr(canonico, campo) for campo in CAMPOS_EDITAVEIS},
        notas_internas=None,
        campos_alterados={},
        tem_conflitos=False,
        sincronizado_em=_utcnow(),
    )


def _obter_ou_criar_versao(
    db: Session,
    canonico: ImovelCanonico,
    consultor_id: int,
) -> tuple[ImovelVersao, bool]:
    versao = db.scalar(
        select(ImovelVersao).where(
            ImovelVersao.imovel_canonico_id == canonico.id,
            ImovelVersao.consultor_id == consultor_id,
        )
    )
    if versao is not None:
        return versao, False
    versao = _criar_versao(canonico, consultor_id)
    db.add(versao)
    db.flush()
    return versao, True


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------
def ingerir_imovel(
    db: Session,
    user: User,
    payload: ImovelIngestPayload,
) -> IngestResult:
    """Ponto de entrada do ingest. Ver fluxo no topo do módulo."""

    consultor = get_consultor_do_user(db, user)
    raw_json = payload.model_dump(by_alias=True, exclude_none=False)

    # Procurar canónico
    canonico = db.scalar(
        select(ImovelCanonico)
        .options(selectinload(ImovelCanonico.fotos))
        .where(ImovelCanonico.property_id == str(payload.property_id))
    )

    # --- CASO 1: primeiro ingest ---
    if canonico is None:
        canonico = _criar_canonico(payload, raw_json)
        db.add(canonico)
        db.flush()

        fotos_novas, _ = _atualizar_fotos(db, canonico, payload.fotos)

        versao, _ = _obter_ou_criar_versao(db, canonico, consultor.id)

        db.commit()
        return IngestResult(
            acao="criado",
            imovel_canonico_id=canonico.id,
            imovel_versao_id=versao.id,
            property_id=canonico.property_id,
            fotos_novas=fotos_novas,
            mensagem=f"Imóvel criado com {fotos_novas} fotos.",
        )

    # --- CASO 2: raw_json idêntico ---
    if _raw_iguais(canonico.raw_json, raw_json):
        versao, criada = _obter_ou_criar_versao(db, canonico, consultor.id)
        if criada:
            db.commit()
            return IngestResult(
                acao="versao_criada",
                imovel_canonico_id=canonico.id,
                imovel_versao_id=versao.id,
                property_id=canonico.property_id,
                mensagem="Canónico inalterado; nova versão criada para o consultor.",
            )
        db.commit()
        return IngestResult(
            acao="sem_mudancas",
            imovel_canonico_id=canonico.id,
            imovel_versao_id=versao.id,
            property_id=canonico.property_id,
            mensagem="Nada mudou.",
        )

    # --- CASO 3: raw_json diferente ---
    raw_anterior = canonico.raw_json

    # Snapshot dos campos canónicos ANTES de atualizar (em snake_case)
    canonico_anterior = {
        campo: getattr(canonico, campo) for campo in CAMPOS_CANONICOS
    }

    # Histórico (guarda o raw_json completo para auditoria)
    db.add(
        ImovelCanonicoHistorico(
            imovel_canonico_id=canonico.id,
            raw_json=raw_anterior,
            capturado_em=canonico.extraido_em,
        )
    )

    _atualizar_canonico(canonico, payload, raw_json)

    fotos_novas, fotos_inativadas = _atualizar_fotos(db, canonico, payload.fotos)

    # Sincronizar versões existentes
    versoes = db.scalars(
        select(ImovelVersao).where(
            ImovelVersao.imovel_canonico_id == canonico.id
        )
    ).all()

    versoes_sincronizadas = 0
    versoes_com_conflito = 0
    for v in versoes:
        tem_conflito = _sincronizar_versao(v, canonico, canonico_anterior)
        versoes_sincronizadas += 1
        if tem_conflito:
            versoes_com_conflito += 1

    # Garantir que o consultor que fez ingest tem versão
    versao, criada = _obter_ou_criar_versao(db, canonico, consultor.id)
    if criada:
        versoes_sincronizadas += 1

    db.commit()
    return IngestResult(
        acao="atualizado",
        imovel_canonico_id=canonico.id,
        imovel_versao_id=versao.id,
        property_id=canonico.property_id,
        fotos_novas=fotos_novas,
        fotos_inativadas=fotos_inativadas,
        versoes_sincronizadas=versoes_sincronizadas,
        versoes_com_conflito=versoes_com_conflito,
        mensagem=(
            f"Canónico atualizado. {versoes_sincronizadas} versões sincronizadas, "
            f"{versoes_com_conflito} com conflitos."
        ),
    )