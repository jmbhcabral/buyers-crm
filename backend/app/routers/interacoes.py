"""Endpoints CRM de interações e notas cliente↔imóvel."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import (
    Cliente,
    ClienteConsultor,
    Consultor,
    ImovelVersao,
    InteracaoImovel,
    NotaClienteImovel,
    User,
)
from app.schemas.interacao import (
    EstadoImovelUpdate,
    InteracaoComContexto,
    InteracaoRead,
    InteracaoUpdate,
    NotaComContexto,
    NotaCreateCRM,
    NotaRead,
)

router = APIRouter(tags=["interacoes"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


def _acesso_cliente(
    db: Session, cliente_id: int, user: User, consultor: Consultor | None,
) -> Cliente:
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")
    if user.is_admin:
        return cliente
    if consultor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")
    assoc = db.scalar(
        select(ClienteConsultor).where(
            ClienteConsultor.cliente_id == cliente_id,
            ClienteConsultor.consultor_id == consultor.id,
        )
    )
    if assoc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")
    return cliente


def _acesso_versao(
    db: Session, versao_id: int, user: User, consultor: Consultor | None,
) -> ImovelVersao:
    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    if user.is_admin:
        return versao
    if consultor is None or versao.consultor_id != consultor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    return versao


# ---------------------------------------------------------------------------
# Cliente
# ---------------------------------------------------------------------------
@router.get(
    "/clientes/{cliente_id}/interacoes",
    response_model=list[InteracaoComContexto],
)
def listar_interacoes_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[InteracaoComContexto]:
    cliente = _acesso_cliente(db, cliente_id, user, consultor)
    rows = db.scalars(
        select(InteracaoImovel)
        .where(InteracaoImovel.cliente_id == cliente_id)
        .order_by(InteracaoImovel.criado_em.desc())
    ).all()
    out: list[InteracaoComContexto] = []
    for r in rows:
        versao = db.get(ImovelVersao, r.imovel_versao_id)
        out.append(
            InteracaoComContexto(
                **InteracaoRead.model_validate(r).model_dump(),
                cliente_nome=cliente.nome,
                imovel_titulo=versao.titulo if versao else None,
                imovel_estado=versao.estado_imovel if versao else None,
            )
        )
    return out


@router.get(
    "/clientes/{cliente_id}/notas", response_model=list[NotaComContexto],
)
def listar_notas_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    imovel_versao_id: int | None = None,
) -> list[NotaComContexto]:
    cliente = _acesso_cliente(db, cliente_id, user, consultor)
    stmt = select(NotaClienteImovel).where(
        NotaClienteImovel.cliente_id == cliente_id
    )
    if imovel_versao_id is not None:
        stmt = stmt.where(NotaClienteImovel.imovel_versao_id == imovel_versao_id)
    stmt = stmt.order_by(NotaClienteImovel.criado_em)

    out: list[NotaComContexto] = []
    for n in db.scalars(stmt).all():
        autor_nome = None
        if n.autor_tipo == "consultor" and n.autor_user_id:
            u = db.get(User, n.autor_user_id)
            autor_nome = u.nome if u else None
        titulo = None
        if n.imovel_versao_id:
            v = db.get(ImovelVersao, n.imovel_versao_id)
            titulo = v.titulo if v else None
        out.append(
            NotaComContexto(
                **NotaRead.model_validate(n).model_dump(),
                autor_nome=autor_nome,
                imovel_titulo=titulo,
                cliente_nome=cliente.nome,      
            )
        )
    return out


@router.post(
    "/clientes/{cliente_id}/notas",
    response_model=NotaRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_nota_crm(
    cliente_id: int,
    payload: NotaCreateCRM,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> NotaRead:
    _acesso_cliente(db, cliente_id, user, consultor)
    _acesso_versao(db, payload.imovel_versao_id, user, consultor) 

    nota = NotaClienteImovel(
        cliente_id=cliente_id,
        imovel_versao_id=payload.imovel_versao_id,
        autor_tipo="consultor",
        autor_user_id=user.id,
        conteudo=payload.conteudo,
        lida_pelo_destinatario=False,
    )
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return NotaRead.model_validate(nota)


# ---------------------------------------------------------------------------
# Interações
# ---------------------------------------------------------------------------
@router.patch("/interacoes/{interacao_id}", response_model=InteracaoRead)
def atualizar_interacao(
    interacao_id: int,
    payload: InteracaoUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> InteracaoRead:
    interacao = db.get(InteracaoImovel, interacao_id)
    if interacao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interação não encontrada")
    _acesso_versao(db, interacao.imovel_versao_id, user, consultor)
    interacao.estado = payload.estado
    if payload.estado in ("visto", "concluido", "cancelado"):
        interacao.lida_pelo_consultor = True
    db.commit()
    db.refresh(interacao)
    return InteracaoRead.model_validate(interacao)


# ---------------------------------------------------------------------------
# Imóvel
# ---------------------------------------------------------------------------
@router.get(
    "/imoveis/{versao_id}/interacoes",
    response_model=list[InteracaoComContexto],
)
def listar_interacoes_imovel(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[InteracaoComContexto]:
    versao = _acesso_versao(db, versao_id, user, consultor)
    rows = db.scalars(
        select(InteracaoImovel)
        .where(InteracaoImovel.imovel_versao_id == versao_id)
        .order_by(InteracaoImovel.criado_em.desc())
    ).all()
    out: list[InteracaoComContexto] = []
    for r in rows:
        cliente = db.get(Cliente, r.cliente_id)
        out.append(
            InteracaoComContexto(
                **InteracaoRead.model_validate(r).model_dump(),
                cliente_nome=cliente.nome if cliente else "",
                imovel_titulo=versao.titulo,
                imovel_estado=versao.estado_imovel,
            )
        )
    return out


@router.get("/imoveis/{versao_id}/notas", response_model=list[NotaComContexto])
def listar_notas_imovel(
    versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[NotaComContexto]:
    _acesso_versao(db, versao_id, user, consultor)
    stmt = (
        select(NotaClienteImovel)
        .where(NotaClienteImovel.imovel_versao_id == versao_id)
        .order_by(NotaClienteImovel.criado_em)
    )
    out: list[NotaComContexto] = []
    for n in db.scalars(stmt).all():
        autor_nome = None
        if n.autor_tipo == "consultor" and n.autor_user_id:
            u = db.get(User, n.autor_user_id)
            autor_nome = u.nome if u else None
        cliente = db.get(Cliente, n.cliente_id)
        out.append(
            NotaComContexto(
                **NotaRead.model_validate(n).model_dump(),
                autor_nome=autor_nome,
                imovel_titulo=None,
                cliente_nome=cliente.nome if cliente else None, 
            )
        )
    return out


@router.patch("/notas/{nota_id}/ler", status_code=status.HTTP_204_NO_CONTENT)
def marcar_nota_lida_crm(
    nota_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    nota = db.get(NotaClienteImovel, nota_id)
    if nota is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nota não encontrada")
    if nota.imovel_versao_id:
        _acesso_versao(db, nota.imovel_versao_id, user, consultor)
    else:
        _acesso_cliente(db, nota.cliente_id, user, consultor)

    if nota.autor_tipo == "cliente":
        nota.lida_pelo_destinatario = True
        db.commit()


@router.patch("/imoveis/{versao_id}/estado", status_code=status.HTTP_204_NO_CONTENT)
def atualizar_estado_imovel(
    versao_id: int,
    payload: EstadoImovelUpdate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    versao = _acesso_versao(db, versao_id, user, consultor)
    versao.estado_imovel = payload.estado_imovel
    db.commit()