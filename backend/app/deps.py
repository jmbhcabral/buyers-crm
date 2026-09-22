"""Dependências reutilizáveis do FastAPI.

Contém:
- get_db (já definido em database.py, re-exportado aqui por conveniência)
- get_current_user: valida JWT do header Authorization
- get_current_consultor: resolve o consultor do user autenticado
- get_user_from_api_key: valida X-API-Key (userscript)
- get_admin_user: exige is_admin=True
"""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import decode_token, hash_api_key

# HTTPBearer do FastAPI: extrai o token do header "Authorization: Bearer <token>"
bearer_scheme = HTTPBearer(auto_error=False)

# Anotação reutilizável
DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# JWT / frontend
# ---------------------------------------------------------------------------
def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
):
    """Valida o JWT e devolve o utilizador.

    TODO(Bloco 1.3+): importar o modelo User e consultar a BD.
    Para já, apenas valida o token e devolve o payload.
    """
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

    # TODO(Bloco 1.3): buscar User por payload["sub"] e validar ativo=True
    # Ex:
    # from app.models.user import User
    # user = db.get(User, int(payload["sub"]))
    # if not user or not user.ativo: raise 401
    # return user

    return payload   # temporário — devolve o payload enquanto não há User


def get_current_consultor(
    db: DbSession,
    user=Depends(get_current_user),
):
    """Devolve o Consultor associado ao User autenticado.

    TODO(Bloco 1.3+): consultar tabela consultores pelo user_id.
    """
    # TODO:
    # from app.models.consultor import Consultor
    # consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    # if not consultor: raise 403 "Sem perfil de consultor"
    # return consultor
    return user


def get_admin_user(user=Depends(get_current_user)):
    """Exige que o utilizador autenticado seja admin.

    TODO(Bloco 1.3+): verificar user.is_admin.
    """
    # TODO:
    # if not getattr(user, "is_admin", False):
    #     raise HTTPException(403, "Apenas administradores")
    return user


# ---------------------------------------------------------------------------
# API key (userscript)
# ---------------------------------------------------------------------------
def get_user_from_api_key(
    db: DbSession,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
):
    """Valida uma API key enviada pelo userscript.

    TODO(Bloco 1.3+): procurar ApiKey pelo hash e devolver o User dono.
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key em falta",
        )

    key_hash = hash_api_key(x_api_key)

    # TODO(Bloco 1.3):
    # from app.models.api_key import ApiKey
    # api_key = db.scalar(select(ApiKey).where(ApiKey.chave_hash == key_hash, ApiKey.ativa == True))
    # if not api_key: raise 401 "API key inválida"
    # api_key.ultimo_uso_em = datetime.now(UTC)
    # db.commit()
    # return api_key.user   # ou o Consultor

    return {"api_key_hash": key_hash}   # temporário