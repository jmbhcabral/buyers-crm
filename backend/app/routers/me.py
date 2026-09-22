"""Endpoints do utilizador autenticado."""

from fastapi import APIRouter

from app.deps import CurrentConsultor, CurrentUser, DbSession
from app.models import Consultor
from app.schemas.consultor import ConsultorRead, ConsultorUpdate
from app.schemas.user import UserRead

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserRead)
def obter_me(user: CurrentUser) -> UserRead:
    """Devolve o perfil do utilizador autenticado (user + consultor)."""
    return UserRead.model_validate(user)


@router.get("/consultor", response_model=ConsultorRead)
def obter_meu_consultor(consultor: CurrentConsultor) -> Consultor:
    """Devolve o perfil do consultor autenticado."""
    return consultor


@router.patch("/consultor", response_model=ConsultorRead)
def atualizar_meu_consultor(
    payload: ConsultorUpdate,
    db: DbSession,
    consultor: CurrentConsultor,
) -> Consultor:
    """Atualiza o perfil do consultor autenticado."""
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(consultor, campo, valor)

    db.commit()
    db.refresh(consultor)
    return consultor