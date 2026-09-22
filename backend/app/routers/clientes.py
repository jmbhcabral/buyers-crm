"""Endpoints de clientes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import Cliente, ClienteConsultor, Consultor, User
from app.schemas.cliente import ClienteCreate, ClienteRead, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["clientes"])

# Alias local — mantém a assinatura limpa sem criar um tipo problemático
ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _obter_cliente_com_acesso(
    db: Session,
    cliente_id: int,
    user: User,
    consultor: Consultor | None,
) -> Cliente:
    """Devolve o cliente se o user tem acesso, senão 404.

    Regras:
    - Admin: acede a qualquer cliente.
    - Consultor: acede se estiver associado ao cliente.
    - Sem consultor (user normal): 404.
    """
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    if user.is_admin:
        return cliente

    if consultor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    associado = db.scalar(
        select(ClienteConsultor).where(
            ClienteConsultor.cliente_id == cliente_id,
            ClienteConsultor.consultor_id == consultor.id,
        )
    )
    if associado is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    return cliente


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ClienteRead])
def listar_clientes(
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    q: str | None = Query(default=None, description="Pesquisa por nome/email"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[Cliente]:
    """Lista clientes acessíveis ao utilizador autenticado."""
    stmt = select(Cliente)

    if not user.is_admin:
        if consultor is None:
            return []
        stmt = stmt.join(
            ClienteConsultor, ClienteConsultor.cliente_id == Cliente.id
        ).where(ClienteConsultor.consultor_id == consultor.id)

    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Cliente.nome).like(like) | func.lower(Cliente.email).like(like)
        )

    stmt = stmt.order_by(Cliente.nome).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Obter um
# ---------------------------------------------------------------------------
@router.get("/{cliente_id}", response_model=ClienteRead)
def obter_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> Cliente:
    return _obter_cliente_com_acesso(db, cliente_id, user, consultor)


# ---------------------------------------------------------------------------
# Criar
# ---------------------------------------------------------------------------
@router.post("", response_model=ClienteRead, status_code=status.HTTP_201_CREATED)
def criar_cliente(
    payload: ClienteCreate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> Cliente:
    """Cria um cliente.

    - Consultor: cria e associa-se automaticamente.
    - Admin sem perfil de consultor: cria sem associação.
    """
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.flush()

    if consultor is not None:
        db.add(ClienteConsultor(cliente_id=cliente.id, consultor_id=consultor.id))

    db.commit()
    db.refresh(cliente)
    return cliente


# ---------------------------------------------------------------------------
# Atualizar
# ---------------------------------------------------------------------------
@router.patch("/{cliente_id}", response_model=ClienteRead)
def atualizar_cliente(
    cliente_id: int,
    payload: ClienteUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> Cliente:
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)

    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return cliente


# ---------------------------------------------------------------------------
# Apagar
# ---------------------------------------------------------------------------
@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)
    db.delete(cliente)
    db.commit()