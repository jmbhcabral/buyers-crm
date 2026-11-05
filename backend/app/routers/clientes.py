"""Endpoints de clientes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import Cliente, ClienteConsultor, Consultor, User
from app.schemas.cliente import ClienteCreate, ClienteRead, ClienteUpdate
from app.models import ImovelCanonico, ImovelVersao, ImovelVersaoCliente
from app.schemas.imovel import ImovelVersaoListItem
from app.services.acesso import pode_editar_cliente, pode_gerir_cliente

router = APIRouter(prefix="/clientes", tags=["clientes"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


def _obter_cliente_com_acesso(
    db: Session,
    cliente_id: int,
    user: User,
    consultor: Consultor | None,
) -> Cliente:
    """Devolve o cliente se o user tem acesso, senão 404.

    Regras em `services.acesso.pode_gerir_cliente`:
    - Admin: qualquer cliente.
    - Cliente pessoal (equipa_id IS NULL): consultor associado via
      `cliente_consultor`.
    - Cliente de equipa (equipa_id NOT NULL): qualquer membro da equipa.
    """
    cliente = db.get(
        Cliente,
        cliente_id,
        options=[selectinload(Cliente.qualificacao)],
    )
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    if not pode_gerir_cliente(db, user, consultor, cliente):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    return cliente


def _validar_equipa_atribuivel(
    user: User, consultor: Consultor | None, equipa_id: int | None
) -> None:
    """Só se pode atribuir o cliente à própria equipa (ou NULL, se admin)."""
    if equipa_id is None:
        if not user.is_admin and consultor is not None:
            pass
        return
    if user.is_admin:
        return
    if consultor is None or consultor.equipa_id != equipa_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Só pode atribuir clientes à equipa a que pertence.",
        )


def _serialize_cliente(
    db: Session,
    user: User,
    consultor: Consultor | None,
    cliente: Cliente,
) -> ClienteRead:
    """`ClienteRead` com `posso_editar` calculado."""
    base = ClienteRead.model_validate(cliente)
    return base.model_copy(
        update={
            "posso_editar": pode_editar_cliente(db, user, consultor, cliente),
        }
    )


@router.get("", response_model=list[ClienteRead])
def listar_clientes(
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    q: str | None = Query(default=None, description="Pesquisa por nome/email"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[Cliente]:
    """Lista clientes acessíveis ao utilizador (próprios + da equipa)."""
    stmt = select(Cliente).options(selectinload(Cliente.qualificacao))

    if not user.is_admin:
        if consultor is None:
            return []
        conds = [
            and_(
                Cliente.equipa_id.is_(None),
                Cliente.id.in_(
                    select(ClienteConsultor.cliente_id)
                    .where(ClienteConsultor.consultor_id == consultor.id)
                ),
            )
        ]
        if consultor.equipa_id is not None:
            conds.append(Cliente.equipa_id == consultor.equipa_id)
        stmt = stmt.where(or_(*conds))

    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Cliente.nome).like(like) | func.lower(Cliente.email).like(like)
        )

    stmt = stmt.order_by(Cliente.nome).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


@router.get("/{cliente_id}", response_model=ClienteRead)
def obter_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ClienteRead:
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)
    return _serialize_cliente(db, user, consultor, cliente)


@router.post("", response_model=ClienteRead, status_code=status.HTTP_201_CREATED)
def criar_cliente(
    payload: ClienteCreate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ClienteRead:
    """Cria um cliente.

    - `equipa_id=None` → cliente pessoal (dono via `cliente_consultor`).
    - `equipa_id=X`   → cliente partilhado pela equipa X (só a própria).
    """
    _validar_equipa_atribuivel(user, consultor, payload.equipa_id)

    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.flush()

    if consultor is not None:
        db.add(ClienteConsultor(cliente_id=cliente.id, consultor_id=consultor.id))

    db.commit()
    db.refresh(cliente)
    # Quem cria é sempre o criador → pode editar.
    return _serialize_cliente(db, user, consultor, cliente)


@router.patch("/{cliente_id}", response_model=ClienteRead)
def atualizar_cliente(
    cliente_id: int,
    payload: ClienteUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> ClienteRead:
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)

    # Só o criador (ou admin) altera os dados base do cliente.
    if not pode_editar_cliente(db, user, consultor, cliente):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Só quem criou o cliente o pode editar.",
        )

    data = payload.model_dump(exclude_unset=True)

    # Valida o estado final dos papéis (o PATCH pode ser parcial)
    novo_e_comprador = data.get("e_comprador", cliente.e_comprador)
    novo_e_vendedor = data.get("e_vendedor", cliente.e_vendedor)
    if not (novo_e_comprador or novo_e_vendedor):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "O cliente tem de ser comprador, vendedor, ou ambos.",
        )

    # Valida mudança de equipa
    if "equipa_id" in data:
        _validar_equipa_atribuivel(user, consultor, data["equipa_id"])

    for campo, valor in data.items():
        setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return _serialize_cliente(db, user, consultor, cliente)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    cliente = _obter_cliente_com_acesso(db, cliente_id, user, consultor)

    if not pode_editar_cliente(db, user, consultor, cliente):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Só quem criou o cliente o pode apagar.",
        )

    db.delete(cliente)
    db.commit()


@router.get("/{cliente_id}/imoveis", response_model=list[ImovelVersaoListItem])
def listar_imoveis_do_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[ImovelVersaoListItem]:
    """Lista os imóveis associados a um cliente (qualquer papel)."""
    _obter_cliente_com_acesso(db, cliente_id, user, consultor)

    versao_ids = db.scalars(
        select(ImovelVersaoCliente.imovel_versao_id).where(
            ImovelVersaoCliente.cliente_id == cliente_id
        )
    ).all()

    if not versao_ids:
        return []

    versoes = db.scalars(
        select(ImovelVersao)
        .options(selectinload(ImovelVersao.canonico))
        .where(ImovelVersao.id.in_(versao_ids))
        .order_by(ImovelVersao.atualizado_em.desc())
    ).all()

    canonico_ids = [v.imovel_canonico_id for v in versoes]

    contagem_fotos = dict(
        db.execute(
            select(ImovelCanonico.id, func.count())
            .join(ImovelCanonico.fotos)
            .where(ImovelCanonico.id.in_(canonico_ids))
            .group_by(ImovelCanonico.id)
        ).all()
    )

    contagem_clientes = dict(
        db.execute(
            select(ImovelVersaoCliente.imovel_versao_id, func.count())
            .where(ImovelVersaoCliente.imovel_versao_id.in_([v.id for v in versoes]))
            .group_by(ImovelVersaoCliente.imovel_versao_id)
        ).all()
    )

    return [
        ImovelVersaoListItem(
            id=v.id,
            imovel_canonico_id=v.imovel_canonico_id,
            titulo=v.titulo,
            preco=v.preco,
            localizacao=v.localizacao,
            tem_conflitos=v.tem_conflitos,
            atualizado_em=v.atualizado_em,
            criado_em=v.criado_em,
            property_id=v.canonico.property_id,
            num_fotos=contagem_fotos.get(v.imovel_canonico_id, 0),
            num_clientes=contagem_clientes.get(v.id, 0),
            estado_imovel=v.estado_imovel,
        )
        for v in versoes
    ]