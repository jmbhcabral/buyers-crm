"""Endpoints de gestão de API keys do próprio utilizador."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyRead
from app.security import generate_api_key, hash_api_key

router = APIRouter(prefix="/me/api-keys", tags=["me"])


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ApiKeyRead])
def listar_api_keys(
    db: DbSession,
    user: CurrentUser,
) -> list[ApiKey]:
    """Lista as API keys do utilizador autenticado.

    Nunca devolve a chave em claro — apenas o prefixo para identificar.
    """
    stmt = (
        select(ApiKey)
        .where(ApiKey.user_id == user.id)
        .order_by(ApiKey.criado_em.desc())
    )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Criar
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
)
def criar_api_key(
    payload: ApiKeyCreate,
    db: DbSession,
    user: CurrentUser,
) -> ApiKeyCreated:
    """Gera uma nova API key.

    A chave em claro é devolvida APENAS nesta resposta.
    Guarda-a num sítio seguro (gestor de passwords).
    """
    full_key, prefixo = generate_api_key()

    api_key = ApiKey(
        user_id=user.id,
        nome=payload.nome,
        prefixo=prefixo,
        chave_hash=hash_api_key(full_key),
        ativa=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return ApiKeyCreated(
        id=api_key.id,
        nome=api_key.nome,
        prefixo=api_key.prefixo,
        ativa=api_key.ativa,
        ultimo_uso_em=api_key.ultimo_uso_em,
        criado_em=api_key.criado_em,
        chave=full_key,
    )


# ---------------------------------------------------------------------------
# Revogar
# ---------------------------------------------------------------------------
@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revogar_api_key(
    api_key_id: int,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Revoga (apaga) uma API key do próprio utilizador."""
    api_key = db.get(ApiKey, api_key_id)

    # 404 tanto para "não existe" como para "é de outro user".
    # Não revelamos se a chave existe noutro lado.
    if api_key is None or api_key.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key não encontrada",
        )

    db.delete(api_key)
    db.commit()