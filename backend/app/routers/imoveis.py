"""Endpoints de imóveis (versões do consultor)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.deps import (
    ApiKeyUser,
    CurrentConsultor,
    CurrentUser,
    DbSession,
    get_optional_consultor,
)
from app.models import Cliente, Foto, ImovelCanonico, ImovelVersao, ImovelVersaoCliente
from app.models.consultor import Consultor
from app.schemas.imovel import (
    ImovelCanonicoComFotos,
    ImovelVersaoComDetalhes,
    ImovelVersaoListItem,
    ImovelVersaoUpdate,
)
from app.schemas.ingest import ImovelIngestPayload, IngestResult
from app.services.ingest import ingerir_imovel

router = APIRouter(prefix="/imoveis", tags=["imoveis"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _obter_versao_com_acesso(
    db: Session,
    versao_id: int,
    user: CurrentUser,
    consultor: Consultor | None,
) -> ImovelVersao:
    """Devolve a versão se o user tem acesso, senão 404.

    Regras:
    - Admin: acede a qualquer versão.
    - Consultor: acede à sua própria versão.
    - Sem consultor: 404.
    """
    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    if user.is_admin:
        return versao

    if consultor is None or versao.consultor_id != consultor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    return versao


# ---------------------------------------------------------------------------
# Listar versões
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ImovelVersaoListItem])
def listar_imoveis(
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    q: str | None = Query(default=None, description="Pesquisa por título ou property_id"),
    apenas_com_conflitos: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ImovelVersaoListItem]:
    """Lista versões de imóveis do consultor autenticado.

    - Consultor: só as suas versões.
    - Admin: só as suas também (para ver todas, usa /admin/... — fase futura).
    """
    if consultor is None:
        return []

    stmt = (
        select(ImovelVersao)
        .options(selectinload(ImovelVersao.canonico))
        .where(ImovelVersao.consultor_id == consultor.id)
    )

    if apenas_com_conflitos:
        stmt = stmt.where(ImovelVersao.tem_conflitos.is_(True))

    # Pesquisa: procura em título da versão OU property_id do canónico
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.join(ImovelVersao.canonico).where(
            func.lower(ImovelVersao.titulo).like(like)
            | func.lower(ImovelCanonico.property_id).like(like)
        )

    stmt = stmt.order_by(ImovelVersao.atualizado_em.desc()).limit(limit).offset(offset)
    versoes = list(db.scalars(stmt).all())

    # Contagem de fotos e clientes por versão (evita N+1)
    versao_ids = [v.id for v in versoes]
    canonico_ids = [v.imovel_canonico_id for v in versoes]

    if versao_ids:
        contagem_fotos = dict(
            db.execute(
                select(
                    ImovelCanonico.id,
                    func.count(),
                )
                .join(ImovelCanonico.fotos)
                .where(ImovelCanonico.id.in_(canonico_ids))
                .group_by(ImovelCanonico.id)
            ).all()
        )
        contagem_clientes = dict(
            db.execute(
                select(
                    ImovelVersaoCliente.imovel_versao_id,
                    func.count(),
                )
                .where(ImovelVersaoCliente.imovel_versao_id.in_(versao_ids))
                .group_by(ImovelVersaoCliente.imovel_versao_id)
            ).all()
        )
    else:
        contagem_fotos = {}
        contagem_clientes = {}

    # Construir a resposta
    resultado: list[ImovelVersaoListItem] = []
    for v in versoes:
        resultado.append(
            ImovelVersaoListItem(
                id=v.id,
                imovel_canonico_id=v.imovel_canonico_id,
                titulo=v.titulo,
                preco=v.preco,
                localizacao=v.localizacao,
                tem_conflitos=v.tem_conflitos,
                atualizado_em=v.atualizado_em,
                criado_em=v.criado_em,
                property_id=v.canonico.property_id,
                num_fotos=contagem_fotos.get(v.imovel_canonico_id, 0),
                num_clientes=contagem_clientes.get(v.id, 0),
            )
        )
    return resultado


# ---------------------------------------------------------------------------
# Detalhe
# ---------------------------------------------------------------------------
def _build_detalhe(db: Session, versao: ImovelVersao) -> ImovelVersaoComDetalhes:
    """Constrói o payload de detalhe a partir de uma versão já carregada."""
    canonico = db.scalar(
        select(ImovelCanonico)
        .options(
            selectinload(ImovelCanonico.fotos.and_(Foto.ativa.is_(True)))
        )
        .where(ImovelCanonico.id == versao.imovel_canonico_id)
    )
    if canonico is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Canónico não encontrado")

    return ImovelVersaoComDetalhes(
        **{
            c: getattr(versao, c)
            for c in [
                "id", "imovel_canonico_id", "consultor_id",
                "titulo", "preco", "localizacao", "descricao",
                "anunciante", "caracteristicas", "caracteristicas_especificas",
                "telefone", "notas_internas", "campos_alterados",
                "tem_conflitos", "sincronizado_em",
                "criado_em", "atualizado_em",
            ]
        },
        canonico=ImovelCanonicoComFotos.model_validate(canonico),
    )


@router.post("/ingest", response_model=IngestResult, status_code=status.HTTP_200_OK)
def ingest_imovel(
    payload: ImovelIngestPayload,
    db: DbSession,
    user: ApiKeyUser,
) -> IngestResult:
    """Recebe um imóvel do userscript e faz o ingest.

    Autenticação via header `X-API-Key`.
    """
    return ingerir_imovel(db, user, payload)


@router.get("/{versao_id}", response_model=ImovelVersaoComDetalhes)
def obter_imovel(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ImovelVersaoComDetalhes:
    """Devolve a versão + canónico + fotos."""
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)
    return _build_detalhe(db, versao)


# ---------------------------------------------------------------------------
# Snapshot canónico (read-only)
# ---------------------------------------------------------------------------
@router.get("/{versao_id}/canonico", response_model=ImovelCanonicoComFotos)
def obter_canonico(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ImovelCanonicoComFotos:
    """Devolve o snapshot canónico do imóvel (o que o Idealista diz).

    Útil para o frontend mostrar "Idealista vs minha versão" lado a lado.
    """
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)

    canonico = db.scalar(
        select(ImovelCanonico)
        .options(selectinload(ImovelCanonico.fotos.and_(Foto.ativa.is_(True))))
        .where(ImovelCanonico.id == versao.imovel_canonico_id)
    )
    if canonico is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Canónico não encontrado")

    return ImovelCanonicoComFotos.model_validate(canonico)


# ---------------------------------------------------------------------------
# Editar versão
# ---------------------------------------------------------------------------
@router.patch("/{versao_id}", response_model=ImovelVersaoComDetalhes)
def atualizar_imovel(
    versao_id: int,
    payload: ImovelVersaoUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ImovelVersaoComDetalhes:
    """Edita campos da versão."""
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)

    data = payload.model_dump(exclude_unset=True)
    if data:
        campos_alterados = dict(versao.campos_alterados or {})
        for campo, valor in data.items():
            setattr(versao, campo, valor)
            if campo != "notas_internas":
                campos_alterados[campo] = True
        versao.campos_alterados = campos_alterados
        db.commit()
        db.refresh(versao)

    return _build_detalhe(db, versao)


# ---------------------------------------------------------------------------
# Apagar versão
# ---------------------------------------------------------------------------
@router.delete("/{versao_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_imovel(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    """Apaga a versão do consultor.

    NOTA: o canónico e as outras versões ficam intactos.
    Só apaga a versão do consultor autenticado (ou qualquer, se admin).
    """
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)
    db.delete(versao)
    db.commit()