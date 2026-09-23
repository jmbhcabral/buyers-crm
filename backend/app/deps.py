"""Dependências reutilizáveis do FastAPI.

- get_db: sessão SQLAlchemy (re-exportada)
- get_current_user: valida JWT do header Authorization e devolve User
- get_current_consultor: resolve o Consultor do User autenticado
- get_admin_user: exige is_admin=True
- get_user_from_api_key: valida X-API-Key (userscript)
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ApiKey, Consultor, User
from app.security import decode_token, hash_api_key

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# JWT / frontend
# ---------------------------------------------------------------------------
def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> User:
    """Valida o JWT e devolve o User autenticado."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token em falta",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sem 'sub' válido",
        ) from e

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador não encontrado",
        )
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador inativo",
        )
    return user


def get_current_consultor(
    db: DbSession,
    user: User = Depends(get_current_user),
) -> Consultor:
    """Devolve o Consultor associado ao User autenticado."""
    consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    if consultor is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador não tem perfil de consultor",
        )
    if not consultor.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Consultor inativo",
        )
    return consultor


def get_optional_consultor(
    db: DbSession,
    user: User = Depends(get_current_user),
) -> Consultor | None:
    """Como get_current_consultor, mas devolve None em vez de lançar 403.

    Útil para endpoints que aceitam tanto consultores como admins
    (admins podem não ter perfil de consultor associado).
    """
    consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    if consultor is not None and not consultor.ativo:
        return None
    return consultor


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    """Exige que o utilizador autenticado seja admin."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores",
        )
    return user


# ---------------------------------------------------------------------------
# API key (userscript)
# ---------------------------------------------------------------------------
def get_user_from_api_key(
    db: DbSession,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> User:
    """Valida uma API key e devolve o User dono."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key em falta",
        )

    key_hash = hash_api_key(x_api_key)
    api_key = db.scalar(
        select(ApiKey).where(ApiKey.chave_hash == key_hash, ApiKey.ativa.is_(True))
    )
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida",
        )

    user = db.get(User, api_key.user_id)
    if user is None or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilizador inativo",
        )

    # Atualiza último uso (não é crítico, mas útil para auditoria)
    api_key.ultimo_uso_em = datetime.now(UTC)
    db.flush()

    return user


# ---------------------------------------------------------------------------
# Aliases prontos a usar nos routers
# ---------------------------------------------------------------------------
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentConsultor = Annotated[Consultor, Depends(get_current_consultor)]
AdminUser = Annotated[User, Depends(get_admin_user)]
ApiKeyUser = Annotated[User, Depends(get_user_from_api_key)]