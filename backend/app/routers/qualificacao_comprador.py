"""Endpoints da ficha de qualificação de comprador."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import Cliente, Consultor, QualificacaoComprador
from app.routers.clientes import _obter_cliente_com_acesso
from app.schemas.qualificacao_comprador import (
    QualificacaoCompradorRead,
    QualificacaoCompradorUpsert,
)

router = APIRouter(prefix="/clientes", tags=["qualificacao-comprador"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


@router.get(
    "/{cliente_id}/qualificacao-comprador",
    response_model=QualificacaoCompradorRead,
)
def obter_qualificacao(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> QualificacaoComprador:
    """Devolve a ficha de qualificação do cliente. 404 se não existir."""
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)
    qual = db.scalar(
        select(QualificacaoComprador).where(
            QualificacaoComprador.cliente_id == cliente.id
        )
    )
    if qual is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Qualificação ainda não preenchida",
        )
    return qual


@router.put(
    "/{cliente_id}/qualificacao-comprador",
    response_model=QualificacaoCompradorRead,
)
def upsert_qualificacao(
    cliente_id: int,
    payload: QualificacaoCompradorUpsert,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> QualificacaoComprador:
    """Cria ou atualiza a ficha de qualificação.

    - Só aceita se o cliente tiver `e_comprador=true` (409 caso contrário).
    - `consultor_id` é o `user.id` de quem fez o PUT.
    - Upsert 1:1 — sem histórico (decisão da fase 1).
    """
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)
    if not cliente.e_comprador:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cliente não está marcado como comprador.",
        )

    qual = db.scalar(
        select(QualificacaoComprador).where(
            QualificacaoComprador.cliente_id == cliente.id
        )
    )
    data = payload.model_dump()

    if qual is None:
        qual = QualificacaoComprador(
            cliente_id=cliente.id,
            consultor_id=user.id,
            **data,
        )
        db.add(qual)
    else:
        for campo, valor in data.items():
            setattr(qual, campo, valor)
        qual.consultor_id = user.id

    db.commit()
    db.refresh(qual)
    return qual


@router.delete(
    "/{cliente_id}/qualificacao-comprador",
    status_code=status.HTTP_204_NO_CONTENT,
)
def apagar_qualificacao(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    """Apaga a ficha de qualificação (raro, útil para corrigir enganos)."""
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)
    qual = db.scalar(
        select(QualificacaoComprador).where(
            QualificacaoComprador.cliente_id == cliente.id
        )
    )
    if qual is not None:
        db.delete(qual)
        db.commit()