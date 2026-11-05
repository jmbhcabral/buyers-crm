"""Serviço de ingestão de imóveis multi-plataforma.

Responsável por:
- Criar ou atualizar o snapshot canónico.
- Deduplicar por (fonte, id_externo) via `ImovelOrigem`; fallback
  para `property_id` quando a origem é o Idealista (retrocompat).
- Detetar se o `raw_json` da origem é idêntico ao anterior.
- Guardar histórico no canónico sempre que o raw muda.
- Atualizar fotos (soft delete para as que desapareceram).
- Sincronizar versões de cada consultor com merge campo a campo.

A lógica de merge (`_sincronizar_versao`) é igual à da versão
anterior — só o lookup do canónico e a atualização do raw_json da
origem mudaram.
"""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Foto,
    ImovelCanonico,
    ImovelCanonicoHistorico,
    ImovelOrigem,
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

# Campos genéricos que vivem no canónico (válidos para qualquer plataforma)
CAMPOS_CANONICOS_GENERICOS = [
    "titulo", "preco", "localizacao", "descricao", "url",
    "anunciante", "referencia_anunciante",
    "caracteristicas", "caracteristicas_especificas",
    "telefone",
]

# Campos específicos do Idealista (só se preenchem quando fonte=idealista;
# nas outras plataformas ficam None e o raw_json da origem preserva-os).
CAMPOS_CANONICOS_IDEALISTA = [
    "ad_external_reference", "ad_commercial_name", "ad_professional_name",
]

# Snapshot dos campos do canónico antes de atualizar (para o merge nas
# versões). Inclui os genéricos + os específicos do Idealista, porque
# o _sincronizar_versao compara `valor_novo != valor_anterior` e os
# campos `ad_*` também podem mudar entre captações do Idealista.
CAMPOS_CANONICOS_SNAPSHOT = CAMPOS_CANONICOS_GENERICOS + CAMPOS_CANONICOS_IDEALISTA


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
    """Extrai do payload os campos que vão para o canónico.

    Campos genéricos vêm sempre; campos `ad_*` só quando a fonte é
    o Idealista (nas outras plataformas ficam None no canónico, mas
    o raw_json da origem preserva-os na mesma).
    """
    dados: dict = {}
    for campo in CAMPOS_CANONICOS_GENERICOS:
        dados[campo] = getattr(payload, campo, None)
    if payload.fonte == "idealista":
        for campo in CAMPOS_CANONICOS_IDEALISTA:
            dados[campo] = getattr(payload, campo, None)
    else:
        for campo in CAMPOS_CANONICOS_IDEALISTA:
            dados[campo] = None
    return dados


# ---------------------------------------------------------------------------
# Origem
# ---------------------------------------------------------------------------
def _obter_origem(
    db: Session, fonte: str, id_externo: str
) -> ImovelOrigem | None:
    return db.scalar(
        select(ImovelOrigem).where(
            ImovelOrigem.fonte == fonte,
            ImovelOrigem.id_externo == id_externo,
        )
    )


def _obter_canonico_por_origem(
    db: Session, fonte: str, id_externo: str
) -> ImovelCanonico | None:
    """Lookup principal: pela origem (fonte, id_externo)."""
    origem = db.scalar(
        select(ImovelOrigem)
        .options(selectinload(ImovelOrigem.imovel_canonico))
        .where(
            ImovelOrigem.fonte == fonte,
            ImovelOrigem.id_externo == id_externo,
        )
    )
    return origem.imovel_canonico if origem else None


def _obter_canonico_por_property_id(
    db: Session, property_id: int
) -> ImovelCanonico | None:
    """Fallback retrocompat: lookup pelo property_id (só Idealista)."""
    return db.scalar(
        select(ImovelCanonico)
        .options(selectinload(ImovelCanonico.fotos))
        .where(ImovelCanonico.property_id == str(property_id))
    )


def _criar_origem(
    payload: ImovelIngestPayload,
    canonico: ImovelCanonico,
    raw_json: dict,
) -> ImovelOrigem:
    return ImovelOrigem(
        imovel_canonico_id=canonico.id,
        fonte=payload.fonte,
        id_externo=payload.id_externo or "",
        url=payload.url,
        raw_json=raw_json,
        extraido_em=payload.extraido_em or _utcnow(),
    )


def _atualizar_origem(
    origem: ImovelOrigem,
    payload: ImovelIngestPayload,
    raw_json: dict,
) -> None:
    origem.url = payload.url or origem.url
    origem.raw_json = raw_json
    origem.extraido_em = payload.extraido_em or _utcnow()


# ---------------------------------------------------------------------------
# Canónico
# ---------------------------------------------------------------------------
def _criar_canonico(
    payload: ImovelIngestPayload,
    raw_json: dict,
) -> ImovelCanonico:
    dados = _dados_canonicos_do_payload(payload)
    # property_id só é preenchido para o Idealista (retrocompat).
    property_id = (
        str(payload.property_id)
        if payload.fonte == "idealista" and payload.property_id is not None
        else None
    )
    return ImovelCanonico(
        property_id=property_id,
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
    Isto evita apagar dados com payloads parciais.
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
def _chave_foto(foto: FotoIngest) -> tuple[str, str]:
    """Chave natural para dedup de fotos.

    `id` (Idealista) tem prioridade; `url_externa` é fallback. Se
    ambos faltarem, usa o URL. Devolve (tipo, valor) para evitar
    colisões entre um id numérico e um url que por acaso seja igual.
    """
    if foto.id is not None:
        return ("id", str(foto.id))
    if foto.url_externa:
        return ("url", foto.url_externa)
    if foto.url:
        return ("url", foto.url)
    return ("none", "")


def _chave_foto_existente(foto: Foto) -> tuple[str, str]:
    if foto.idealista_id is not None:
        return ("id", str(foto.idealista_id))
    if foto.url_original:
        return ("url", foto.url_original)
    return ("none", "")


def _atualizar_fotos(
    db: Session,
    canonico: ImovelCanonico,
    fotos_payload: list[FotoIngest],
) -> tuple[int, int]:
    """Sincroniza fotos do canónico. Devolve (novas, inativadas)."""
    fotos_existentes = {
        _chave_foto_existente(f): f for f in canonico.fotos
    }
    chaves_novas = {_chave_foto(f) for f in fotos_payload}

    fotos_novas = 0
    fotos_inativadas = 0

    # 1. Fotos que desapareceram → soft delete
    for chave, foto in fotos_existentes.items():
        if chave not in chaves_novas and foto.ativa:
            foto.ativa = False
            fotos_inativadas += 1

    # 2. Fotos novas → inserir; existentes → atualizar metadados
    for f in fotos_payload:
        chave = _chave_foto(f)
        existente = fotos_existentes.get(chave)
        if existente is None:
            db.add(
                Foto(
                    imovel_canonico_id=canonico.id,
                    idealista_id=f.id,
                    ordem=f.posicao or 0,
                    url_original=f.url or f.url_externa,
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
            existente.url_original = (
                f.url or f.url_externa or existente.url_original
            )
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
    """Merge do canónico novo na versão do consultor.

    Devolve True se ficou com conflitos. (Igual ao anterior.)
    """
    campos_alterados = dict(versao.campos_alterados or {})
    tem_conflito = False

    for campo in CAMPOS_EDITAVEIS:
        valor_novo = getattr(canonico, campo)
        valor_anterior = canonico_anterior.get(campo)

        if campos_alterados.get(campo):
            if valor_novo != valor_anterior:
                tem_conflito = True
        else:
            setattr(versao, campo, valor_novo)

    versao.tem_conflitos = tem_conflito
    versao.sincronizado_em = _utcnow()
    return tem_conflito


def _criar_versao(
    canonico: ImovelCanonico,
    consultor_id: int,
) -> ImovelVersao:
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
    """Ponto de entrada do ingest."""

    consultor = get_consultor_do_user(db, user)
    raw_json = payload.model_dump(by_alias=True, exclude_none=False, mode="json")

    fonte = payload.fonte
    id_externo = payload.id_externo or ""

    # --- Lookup do canónico ---
    # 1. Pela origem (fonte, id_externo) — caminho principal.
    canonico = _obter_canonico_por_origem(db, fonte, id_externo)
    origem = _obter_origem(db, fonte, id_externo)

    # 2. Fallback retrocompat: só para o Idealista, pelo property_id.
    if canonico is None and fonte == "idealista" and payload.property_id is not None:
        canonico = _obter_canonico_por_property_id(db, payload.property_id)
        if canonico is not None and origem is None:
            # Canónico existe mas ainda não tem origem (pré-migração ou
            # backfill incompleto). Criar a origem agora.
            origem = _criar_origem(payload, canonico, raw_json)
            db.add(origem)
            db.flush()

    # --- CASO 1: primeiro ingest ---
    if canonico is None:
        canonico = _criar_canonico(payload, raw_json)
        db.add(canonico)
        db.flush()

        if origem is None:
            origem = _criar_origem(payload, canonico, raw_json)
            db.add(origem)
            db.flush()

        # Recarrega fotos (o canónico acabou de ser criado, não tem nenhuma)
        fotos_novas, _ = _atualizar_fotos(db, canonico, payload.fotos)

        versao, _ = _obter_ou_criar_versao(db, canonico, consultor.id)

        db.commit()
        return IngestResult(
            acao="criado",
            fonte=fonte,
            id_externo=id_externo,
            imovel_canonico_id=canonico.id,
            imovel_versao_id=versao.id,
            property_id=canonico.property_id,
            fotos_novas=fotos_novas,
            mensagem=f"Imóvel criado com {fotos_novas} fotos.",
        )

    # Garantir que a origem existe (pode faltar se veio pelo fallback
    # e o canónico já tinha origem de outra plataforma).
    if origem is None:
        origem = _criar_origem(payload, canonico, raw_json)
        db.add(origem)
        db.flush()

    # Carregar fotos do canónico (selectinload explícito)
    db.refresh(canonico, ["fotos"])

    # --- CASO 2: raw_json da origem idêntico ---
    if _raw_iguais(origem.raw_json, raw_json):
        _atualizar_origem(origem, payload, raw_json)  # atualiza extraido_em
        versao, criada = _obter_ou_criar_versao(db, canonico, consultor.id)
        if criada:
            db.commit()
            return IngestResult(
                acao="versao_criada",
                fonte=fonte,
                id_externo=id_externo,
                imovel_canonico_id=canonico.id,
                imovel_versao_id=versao.id,
                property_id=canonico.property_id,
                mensagem="Canónico inalterado; nova versão criada para o consultor.",
            )
        db.commit()
        return IngestResult(
            acao="sem_mudancas",
            fonte=fonte,
            id_externo=id_externo,
            imovel_canonico_id=canonico.id,
            imovel_versao_id=versao.id,
            property_id=canonico.property_id,
            mensagem="Nada mudou.",
        )

    # --- CASO 3: raw_json da origem diferente ---
    raw_anterior_origem = origem.raw_json

    # Snapshot dos campos canónicos ANTES de atualizar (para o merge)
    canonico_anterior = {
        campo: getattr(canonico, campo) for campo in CAMPOS_CANONICOS_SNAPSHOT
    }

    # Histórico do canónico (guarda o raw_json da origem que está a mudar)
    db.add(
        ImovelCanonicoHistorico(
            imovel_canonico_id=canonico.id,
            raw_json=raw_anterior_origem,
            capturado_em=origem.extraido_em,
        )
    )

    _atualizar_origem(origem, payload, raw_json)
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

    versao, criada = _obter_ou_criar_versao(db, canonico, consultor.id)
    if criada:
        versoes_sincronizadas += 1

    db.commit()
    return IngestResult(
        acao="atualizado",
        fonte=fonte,
        id_externo=id_externo,
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