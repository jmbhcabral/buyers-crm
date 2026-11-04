"""Endpoints CRM para fichas de visita a imóveis angariados."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import ImovelVersao, ImovelVersaoCliente, VisitaImovel
from app.models.consultor import Consultor
from app.schemas.visita_imovel import (
    VisitaImovelCreate,
    VisitaImovelRead,
    VisitaImovelUpdate,
)

router = APIRouter(tags=["visitas"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _obter_versao_com_acesso(
    db: DbSession,
    versao_id: int,
    user: CurrentUser,
    consultor: Consultor | None,
) -> ImovelVersao:
    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    if not user.is_admin:
        if consultor is None or versao.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    return versao


def _validar_angariacao(db: DbSession, versao: ImovelVersao) -> None:
    """Só se registam visitas a imóveis com vendedor associado."""
    existe = db.scalar(
        select(ImovelVersaoCliente).where(
            ImovelVersaoCliente.imovel_versao_id == versao.id,
            ImovelVersaoCliente.papel == "vendedor",
        )
    )
    if existe is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Este imóvel não está associado a nenhum cliente como vendedor. "
            "Associa primeiro o imóvel ao cliente vendedor.",
        )


def _obter_visita_com_acesso(
    db: DbSession,
    visita_id: int,
    user: CurrentUser,
    consultor: Consultor | None,
) -> VisitaImovel:
    visita = db.get(VisitaImovel, visita_id)
    if visita is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visita não encontrada")
    versao = db.get(ImovelVersao, visita.imovel_versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visita não encontrada")
    if not user.is_admin:
        if consultor is None or versao.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Visita não encontrada")
    return visita


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
@router.post(
    "/imoveis/{versao_id}/visitas",
    response_model=VisitaImovelRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_visita(
    versao_id: int,
    payload: VisitaImovelCreate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> VisitaImovelRead:
    """Registra uma ficha de visita a um imóvel angariado."""
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)
    _validar_angariacao(db, versao)

    visita = VisitaImovel(
        imovel_versao_id=versao.id,
        **payload.model_dump(),
    )
    db.add(visita)
    db.commit()
    db.refresh(visita)
    return VisitaImovelRead.model_validate(visita)


@router.get(
    "/imoveis/{versao_id}/visitas",
    response_model=list[VisitaImovelRead],
)
def listar_visitas(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[VisitaImovelRead]:
    """Lista as visitas registadas para um imóvel, mais recentes primeiro."""
    versao = _obter_versao_com_acesso(db, versao_id, user, consultor)
    visitas = db.scalars(
        select(VisitaImovel)
        .where(VisitaImovel.imovel_versao_id == versao.id)
        .order_by(VisitaImovel.data_visita.desc())
    ).all()
    return [VisitaImovelRead.model_validate(v) for v in visitas]


@router.patch("/visitas/{visita_id}", response_model=VisitaImovelRead)
def atualizar_visita(
    visita_id: int,
    payload: VisitaImovelUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> VisitaImovelRead:
    """Actualiza uma visita (parcial)."""
    visita = _obter_visita_com_acesso(db, visita_id, user, consultor)

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(visita, k, v)
    if data:
        db.commit()
        db.refresh(visita)
    return VisitaImovelRead.model_validate(visita)


@router.delete("/visitas/{visita_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_visita(
    visita_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    """Apaga uma visita."""
    visita = _obter_visita_com_acesso(db, visita_id, user, consultor)
    db.delete(visita)
    db.commit()