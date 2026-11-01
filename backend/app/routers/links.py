"""Endpoints de gestão de links de cliente (autenticados)."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import (
    Cliente,
    ClienteConsultor,
    Consultor,
    Foto,
    ImovelCanonico,
    ImovelVersao,
    ImovelVersaoCliente,
    LinkAcesso,
    LinkCliente,
    LinkImovel,
)
from app.schemas.link import (
    ImovelAnalyticsItem,
    LinkAcessoRead,
    LinkAddImovel,
    LinkAnalyticsRead,
    LinkComDetalhes,
    LinkCreate,
    LinkCreated,
    LinkImovelRead,
    LinkRead,
)
from app.security import generate_link_token

router = APIRouter(prefix="/links", tags=["links"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _obter_consultor_obrigatorio(consultor: Consultor | None) -> Consultor:
    if consultor is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Sem perfil de consultor"
        )
    return consultor


def _obter_link_com_acesso(
    db: DbSession,
    link_id: int,
    user: CurrentUser,
    consultor: Consultor | None,
) -> LinkCliente:
    link = db.get(LinkCliente, link_id)
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link não encontrado")
    if not user.is_admin:
        if consultor is None or link.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Link não encontrado")
    return link


def _url_publica(token: str) -> str:
    return f"{settings.public_base_url}/s/{token}"


def _contar_imoveis(db: DbSession, link_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(LinkImovel).where(LinkImovel.link_id == link_id)
    ) or 0


def _contar_acessos(db: DbSession, link_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(LinkAcesso).where(LinkAcesso.link_id == link_id)
    ) or 0


def _build_link_read(db: DbSession, link: LinkCliente, cliente_nome: str) -> dict:
    return {
        "id": link.id,
        "cliente_id": link.cliente_id,
        "consultor_id": link.consultor_id,
        "token_prefix": link.token_prefix,
        "ativo": link.ativo,
        "expira_em": link.expira_em,
        "revogado_em": link.revogado_em,
        "ultimo_acesso_em": link.ultimo_acesso_em,
        "criado_em": link.criado_em,
        "atualizado_em": link.atualizado_em,
        "cliente_nome": cliente_nome,
        "num_imoveis": _contar_imoveis(db, link.id),
        "num_acessos": _contar_acessos(db, link.id),
        "url_publica": _url_publica(link.token_visible),
        "token_visible": link.token_visible,
    }


# ---------------------------------------------------------------------------
# Criar link
# ---------------------------------------------------------------------------
@router.post("", response_model=LinkCreated, status_code=status.HTTP_201_CREATED)
def criar_link(
    payload: LinkCreate,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> LinkCreated:
    """Cria (ou devolve) o link do consultor para um cliente.

    Se já existir um link ativo para este par (cliente, consultor), devolve-o
    com 200 — mas a resposta é sempre 201. O token em claro só aparece aqui.
    """
    c = _obter_consultor_obrigatorio(consultor)

    # Verificar acesso ao cliente
    cliente = db.get(Cliente, payload.cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    if not user.is_admin:
        associado = db.scalar(
            select(ClienteConsultor).where(
                ClienteConsultor.cliente_id == payload.cliente_id,
                ClienteConsultor.consultor_id == c.id,
            )
        )
        if associado is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    # Já existe?
    existente = db.scalar(
        select(LinkCliente).where(
            LinkCliente.cliente_id == payload.cliente_id,
            LinkCliente.consultor_id == c.id,
        )
    )
    if existente is not None:
        if not existente.ativo:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Já existe um link revogado para este cliente. Reative-o em vez de criar outro.",
            )
        # Devolve o mesmo link com o token atual (guardado em claro)
        return LinkCreated(
            **_build_link_read(db, existente, cliente.nome),
            token=existente.token_visible,
        )

    # Criar novo
    token, token_hash, prefix = generate_link_token()
    expira_em = datetime.now(UTC) + timedelta(days=payload.expira_em_dias)

    link = LinkCliente(
        cliente_id=payload.cliente_id,
        consultor_id=c.id,
        token_hash=token_hash,
        token_visible=token,
        token_prefix=prefix,
        ativo=True,
        expira_em=expira_em,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return LinkCreated(
        **_build_link_read(db, link, cliente.nome),
        token=token,
    )


# ---------------------------------------------------------------------------
# Listar links do consultor
# ---------------------------------------------------------------------------
@router.get("", response_model=list[LinkRead])
def listar_links(
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> list[LinkRead]:
    stmt = select(LinkCliente).options(selectinload(LinkCliente.cliente))

    if not user.is_admin:
        c = _obter_consultor_obrigatorio(consultor)
        stmt = stmt.where(LinkCliente.consultor_id == c.id)

    stmt = stmt.order_by(LinkCliente.criado_em.desc())
    links = db.scalars(stmt).all()

    return [
        LinkRead(**_build_link_read(db, l, l.cliente.nome))
        for l in links
    ]


# ---------------------------------------------------------------------------
# Buscar link por cliente
# ---------------------------------------------------------------------------
@router.get("/cliente/{cliente_id}", response_model=LinkComDetalhes | None)
def obter_link_por_cliente(
    cliente_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> LinkComDetalhes | None:
    """Devolve o link do consultor para este cliente (ou None se não existir)."""
    c = _obter_consultor_obrigatorio(consultor)
    link = db.scalar(
        select(LinkCliente)
        .options(selectinload(LinkCliente.cliente), selectinload(LinkCliente.imoveis))
        .where(
            LinkCliente.cliente_id == cliente_id,
            LinkCliente.consultor_id == c.id,
        )
    )
    if link is None:
        return None

    return _build_link_detalhes(db, link)


def _build_link_detalhes(db: DbSession, link: LinkCliente) -> LinkComDetalhes:
    imoveis_out = []
    for li in link.imoveis:
        versao = db.get(ImovelVersao, li.imovel_versao_id)
        if versao is None:
            continue
        canonico = db.get(ImovelCanonico, versao.imovel_canonico_id)
        num_fotos = db.scalar(
            select(func.count()).select_from(Foto).where(
                Foto.imovel_canonico_id == versao.imovel_canonico_id,
                Foto.ativa.is_(True),
            )
        ) or 0
        imoveis_out.append(
            LinkImovelRead(
                imovel_versao_id=li.imovel_versao_id,
                ordem=li.ordem,
                titulo=versao.titulo,
                preco=versao.preco,
                localizacao=versao.localizacao,
                num_fotos=num_fotos,
                criado_em=li.criado_em,
                estado_imovel=versao.estado_imovel
            )
        )

    return LinkComDetalhes(
        **_build_link_read(db, link, link.cliente.nome),
        imoveis=imoveis_out,
    )


# ---------------------------------------------------------------------------
# Detalhe por id
# ---------------------------------------------------------------------------
@router.get("/{link_id}", response_model=LinkComDetalhes)
def obter_link(
    link_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> LinkComDetalhes:
    link = db.scalar(
        select(LinkCliente)
        .options(selectinload(LinkCliente.cliente), selectinload(LinkCliente.imoveis))
        .where(LinkCliente.id == link_id)
    )
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link não encontrado")
    if not user.is_admin:
        if consultor is None or link.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Link não encontrado")
    return _build_link_detalhes(db, link)


# ---------------------------------------------------------------------------
# Renovar
# ---------------------------------------------------------------------------
@router.patch("/{link_id}/renovar", response_model=LinkRead)
def renovar_link(
    link_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    dias: int = 180,
) -> LinkRead:
    link = _obter_link_com_acesso(db, link_id, user, consultor)
    link.expira_em = datetime.now(UTC) + timedelta(days=dias)
    link.ativo = True
    link.revogado_em = None
    db.commit()
    db.refresh(link)
    return LinkRead(**_build_link_read(db, link, link.cliente.nome))


# ---------------------------------------------------------------------------
# Revogar
# ---------------------------------------------------------------------------
@router.patch("/{link_id}/revogar", response_model=LinkRead)
def revogar_link(
    link_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> LinkRead:
    link = _obter_link_com_acesso(db, link_id, user, consultor)
    link.ativo = False
    link.revogado_em = datetime.now(UTC)
    db.commit()
    db.refresh(link)
    return LinkRead(**_build_link_read(db, link, link.cliente.nome))


# ---------------------------------------------------------------------------
# Adicionar imóvel
# ---------------------------------------------------------------------------
@router.post("/{link_id}/imoveis", status_code=status.HTTP_204_NO_CONTENT)
def adicionar_imovel(
    link_id: int,
    payload: LinkAddImovel,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    link = _obter_link_com_acesso(db, link_id, user, consultor)

    # Verificar que o imovel_versao existe, é do consultor do link, e está
    # associado ao cliente do link
    versao = db.get(ImovelVersao, payload.imovel_versao_id)
    if versao is None or versao.consultor_id != link.consultor_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    assoc = db.scalar(
        select(ImovelVersaoCliente).where(
            ImovelVersaoCliente.imovel_versao_id == payload.imovel_versao_id,
            ImovelVersaoCliente.cliente_id == link.cliente_id,
        )
    )
    if assoc is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Este imóvel não está associado ao cliente do link",
        )

    # Já está?
    existente = db.scalar(
        select(LinkImovel).where(
            LinkImovel.link_id == link_id,
            LinkImovel.imovel_versao_id == payload.imovel_versao_id,
        )
    )
    if existente is not None:
        return  # idempotente

    # Ordem = último + 1
    ultimo = db.scalar(
        select(func.max(LinkImovel.ordem)).where(LinkImovel.link_id == link_id)
    ) or 0

    db.add(
        LinkImovel(
            link_id=link_id,
            imovel_versao_id=payload.imovel_versao_id,
            ordem=ultimo + 1,
        )
    )
    db.commit()


# ---------------------------------------------------------------------------
# Remover imóvel
# ---------------------------------------------------------------------------
@router.delete(
    "/{link_id}/imoveis/{imovel_versao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remover_imovel(
    link_id: int,
    imovel_versao_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    _obter_link_com_acesso(db, link_id, user, consultor)

    li = db.scalar(
        select(LinkImovel).where(
            LinkImovel.link_id == link_id,
            LinkImovel.imovel_versao_id == imovel_versao_id,
        )
    )
    if li is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não está no link")

    db.delete(li)
    db.commit()


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@router.get("/{link_id}/analytics", response_model=LinkAnalyticsRead)
def analytics_link(
    link_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    limit_recentes: int = 20,
) -> LinkAnalyticsRead:
    link = _obter_link_com_acesso(db, link_id, user, consultor)

    total = _contar_acessos(db, link_id)
    lista = db.scalar(
        select(func.count()).select_from(LinkAcesso).where(
            LinkAcesso.link_id == link_id,
            LinkAcesso.imovel_versao_id.is_(None),
        )
    ) or 0
    detalhe = total - lista

    # Por imóvel
    rows = db.execute(
        select(
            LinkAcesso.imovel_versao_id,
            func.count().label("n"),
            func.max(LinkAcesso.criado_em).label("ultimo"),
        )
        .where(LinkAcesso.link_id == link_id, LinkAcesso.imovel_versao_id.is_not(None))
        .group_by(LinkAcesso.imovel_versao_id)
    ).all()

    por_imovel = []
    for imovel_id, n, ultimo in rows:
        versao = db.get(ImovelVersao, imovel_id)
        por_imovel.append(
            ImovelAnalyticsItem(
                imovel_versao_id=imovel_id,
                imovel_titulo=versao.titulo if versao else None,
                num_acessos=n,
                ultimo_acesso_em=ultimo,
            )
        )
    por_imovel.sort(key=lambda x: x.num_acessos, reverse=True)

    # Recentes
    recentes_rows = db.scalars(
        select(LinkAcesso)
        .where(LinkAcesso.link_id == link_id)
        .order_by(LinkAcesso.criado_em.desc())
        .limit(limit_recentes)
    ).all()

    recentes = []
    for a in recentes_rows:
        titulo = None
        if a.imovel_versao_id:
            v = db.get(ImovelVersao, a.imovel_versao_id)
            titulo = v.titulo if v else None
        recentes.append(
            LinkAcessoRead(
                id=a.id,
                imovel_versao_id=a.imovel_versao_id,
                imovel_titulo=titulo,
                user_agent=a.user_agent,
                referrer=a.referrer,
                criado_em=a.criado_em,
            )
        )

    return LinkAnalyticsRead(
        link_id=link.id,
        num_acessos_total=total,
        num_acessos_lista=lista,
        num_acessos_detalhe=detalhe,
        ultimo_acesso_em=link.ultimo_acesso_em,
        por_imovel=por_imovel,
        acessos_recentes=recentes,
    )