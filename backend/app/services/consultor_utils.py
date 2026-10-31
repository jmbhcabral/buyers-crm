"""Helpers para resolver o consultor de um user."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Consultor, User
from app.schemas.consultor import ConsultorRead


def get_consultor_do_user(db: Session, user: User) -> Consultor:
    """Devolve o consultor associado ao user. 403 se não tiver."""
    consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    if consultor is None or not consultor.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador não tem perfil de consultor ativo",
        )
    return consultor


def build_consultor_read(db, consultor) -> ConsultorRead:
    user = db.get(User, consultor.user_id)
    foto_url = None
    if consultor.foto_caminho:
        # ?v=... invalida a cache do browser quando a foto muda
        versao = int(consultor.atualizado_em.timestamp())
        foto_url = f"/api/public/consultores/{consultor.id}/foto?v={versao}"

    return ConsultorRead(
        id=consultor.id,
        user_id=consultor.user_id,
        telefone=consultor.telefone,
        nif=consultor.nif,
        bio=consultor.bio,
        agencia=consultor.agencia,
        foto_url=foto_url,
        nome=user.nome if user else None,
        ativo=consultor.ativo,
        criado_em=consultor.criado_em,
        atualizado_em=consultor.atualizado_em,
    )