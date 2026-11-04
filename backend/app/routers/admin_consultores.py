"""Endpoints de administração de consultores.

- POST   /admin/consultores                          — criar User + Consultor
- PUT    /admin/consultores/{consultor_id}/credenciais — alterar email/password

A atribuição de equipa faz-se pelo router `/admin/equipas`.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminUser, DbSession
from app.models import Consultor, User
from app.schemas.admin import (
    ConsultorAdminCreate,
    ConsultorAdminCredenciaisUpdate,
)
from app.schemas.consultor import ConsultorComUser
from app.security import hash_password

router = APIRouter(prefix="/admin/consultores", tags=["admin"])


def _to_com_user(consultor: Consultor, user: User) -> ConsultorComUser:
    return ConsultorComUser(
        id=consultor.id,
        user_id=consultor.user_id,
        equipa_id=consultor.equipa_id,
        telefone=consultor.telefone,
        nif=consultor.nif,
        bio=consultor.bio,
        ativo=consultor.ativo,
        criado_em=consultor.criado_em,
        atualizado_em=consultor.atualizado_em,
        agencia=consultor.agencia,
        foto_url=None,
        nome=user.nome,
        email=user.email,
    )


@router.post(
    "",
    response_model=ConsultorComUser,
    status_code=status.HTTP_201_CREATED,
)
def criar_consultor(
    payload: ConsultorAdminCreate,
    db: DbSession,
    admin: AdminUser,
) -> ConsultorComUser:
    """Cria um User (role consultor ou admin) + Consultor, tudo ou nada."""
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe um utilizador com esse email",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        nome=payload.nome,
        is_admin=payload.is_admin,
        ativo=True,
    )
    db.add(user)
    db.flush()

    consultor = Consultor(
        user_id=user.id,
        telefone=payload.telefone,
        nif=payload.nif,
        bio=payload.bio,
        agencia=payload.agencia,
        ativo=True,
        # equipa_id fica NULL por omissão; atribui-se via /admin/equipas
    )
    db.add(consultor)
    db.commit()
    db.refresh(user)
    db.refresh(consultor)

    return _to_com_user(consultor, user)


@router.put(
    "/{consultor_id}/credenciais",
    response_model=ConsultorComUser,
)
def alterar_credenciais_consultor(
    consultor_id: int,
    payload: ConsultorAdminCredenciaisUpdate,
    db: DbSession,
    admin: AdminUser,
) -> ConsultorComUser:
    """Admin redefine email e/ou password de um consultor."""
    consultor = db.get(Consultor, consultor_id)
    if consultor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultor não encontrado")

    user = db.get(User, consultor.user_id)
    if user is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Utilizador associado não encontrado",
        )

    if payload.email is not None and payload.email != user.email:
        if db.scalar(select(User).where(User.email == payload.email)):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Email já em uso por outro utilizador",
            )
        user.email = payload.email

    if payload.new_password is not None:
        user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(user)

    return _to_com_user(consultor, user)