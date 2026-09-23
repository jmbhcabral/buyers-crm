"""Helpers para resolver o consultor de um user."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Consultor, User


def get_consultor_do_user(db: Session, user: User) -> Consultor:
    """Devolve o consultor associado ao user. 403 se não tiver."""
    consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    if consultor is None or not consultor.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador não tem perfil de consultor ativo",
        )
    return consultor