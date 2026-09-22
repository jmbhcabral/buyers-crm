"""Endpoints do utilizador autenticado."""

from fastapi import APIRouter

from app.deps import CurrentUser
from app.schemas.user import UserRead

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserRead)
def obter_me(user: CurrentUser) -> UserRead:
    """Devolve o perfil do utilizador autenticado."""
    return UserRead.model_validate(user)