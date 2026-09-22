"""Endpoints de autenticação: login, refresh."""

from fastapi import APIRouter, HTTPException, status
from jose import JWTError
from sqlalchemy import select

from app.deps import DbSession
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _emitir_tokens(user: User) -> TokenResponse:
    extra = {"email": user.email, "is_admin": user.is_admin}
    return TokenResponse(
        access_token=create_access_token(subject=user.id, extra=extra),
        refresh_token=create_refresh_token(subject=user.id),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    """Autentica um utilizador e devolve access + refresh tokens."""
    user = db.scalar(select(User).where(User.email == payload.email))

    # Mensagem genérica para não revelar se o email existe
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador inativo",
        )

    return _emitir_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenResponse:
    """Troca um refresh token válido por um novo par de tokens."""
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh token inválido: {e}",
        ) from e

    try:
        user_id = int(data["sub"])
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token sem 'sub' válido",
        ) from e

    user = db.get(User, user_id)
    if user is None or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador inválido",
        )

    return _emitir_tokens(user)