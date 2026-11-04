"""Endpoints do dashboard (estatísticas agregadas)."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import (
    Cliente,
    ClienteConsultor,
    ImovelVersao,
    ImovelVersaoCliente,
    PdfGerado,
    InteracaoImovel,
    NotaClienteImovel,
)
from app.models.consultor import Consultor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

OptionalConsultor = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Filtros (SQLAlchemy conditions; None = sem filtro, admin sem consultor)
# ---------------------------------------------------------------------------
def _cliente_filter(user: CurrentUser, consultor: Consultor | None):
    if user.is_admin and consultor is None:
        return None
    if consultor is None:
        return Cliente.id < 0
    conds = [
        Cliente.id.in_(
            select(ClienteConsultor.cliente_id)
            .where(ClienteConsultor.consultor_id == consultor.id)
        )
    ]
    if consultor.equipa_id is not None:
        conds.append(Cliente.equipa_id == consultor.equipa_id)
    return or_(*conds)


def _versao_filter(user: CurrentUser, consultor: Consultor | None):
    if user.is_admin and consultor is None:
        return None
    if consultor is None:
        return ImovelVersao.id < 0
    conds = [ImovelVersao.consultor_id == consultor.id]
    if consultor.equipa_id is not None:
        conds.append(
            ImovelVersao.id.in_(
                select(ImovelVersaoCliente.imovel_versao_id)
                .join(Cliente, Cliente.id == ImovelVersaoCliente.cliente_id)
                .where(Cliente.equipa_id == consultor.equipa_id)
            )
        )
    return or_(*conds)


def _pdf_filter(user: CurrentUser, consultor: Consultor | None):
    if user.is_admin and consultor is None:
        return None
    if consultor is None:
        return PdfGerado.id < 0
    conds = [PdfGerado.consultor_id == consultor.id]
    if consultor.equipa_id is not None:
        conds.append(
            PdfGerado.cliente_id.in_(
                select(Cliente.id).where(Cliente.equipa_id == consultor.equipa_id)
            )
        )
    return or_(*conds)


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@router.get("/stats")
def obter_stats(
    db: DbSession,
    user: CurrentUser,
    consultor: OptionalConsultor,
) -> dict:
    """Estatísticas do utilizador (inclui itens da equipa)."""
    if not user.is_admin and consultor is None:
        return {
            "total_imoveis": 0,
            "total_clientes": 0,
            "total_pdfs": 0,
            "imoveis_com_conflitos": 0,
            "imoveis_sem_cliente": 0,
            "pdfs_ultimos_30_dias": 0,
        }

    f_versao = _versao_filter(user, consultor)
    f_cliente = _cliente_filter(user, consultor)
    f_pdf = _pdf_filter(user, consultor)

    # Total imóveis
    stmt = select(func.count()).select_from(ImovelVersao)
    if f_versao is not None:
        stmt = stmt.where(f_versao)
    total_imoveis = db.scalar(stmt) or 0

    # Com conflitos
    stmt = (
        select(func.count())
        .select_from(ImovelVersao)
        .where(ImovelVersao.tem_conflitos.is_(True))
    )
    if f_versao is not None:
        stmt = stmt.where(f_versao)
    imoveis_com_conflitos = db.scalar(stmt) or 0

    # Total clientes
    stmt = select(func.count()).select_from(Cliente)
    if f_cliente is not None:
        stmt = stmt.where(f_cliente)
    total_clientes = db.scalar(stmt) or 0

    # Total PDFs
    stmt = select(func.count()).select_from(PdfGerado)
    if f_pdf is not None:
        stmt = stmt.where(f_pdf)
    total_pdfs = db.scalar(stmt) or 0

    # Imóveis sem cliente associado
    subq = select(ImovelVersaoCliente.imovel_versao_id).distinct()
    stmt = (
        select(func.count())
        .select_from(ImovelVersao)
        .where(~ImovelVersao.id.in_(subq))
    )
    if f_versao is not None:
        stmt = stmt.where(f_versao)
    imoveis_sem_cliente = db.scalar(stmt) or 0

    # PDFs últimos 30 dias
    trinta_dias_atras = datetime.now(UTC) - timedelta(days=30)
    stmt = (
        select(func.count())
        .select_from(PdfGerado)
        .where(PdfGerado.criado_em >= trinta_dias_atras)
    )
    if f_pdf is not None:
        stmt = stmt.where(f_pdf)
    pdfs_ultimos_30_dias = db.scalar(stmt) or 0

    return {
        "total_imoveis": total_imoveis,
        "total_clientes": total_clientes,
        "total_pdfs": total_pdfs,
        "imoveis_com_conflitos": imoveis_com_conflitos,
        "imoveis_sem_cliente": imoveis_sem_cliente,
        "pdfs_ultimos_30_dias": pdfs_ultimos_30_dias,
    }


@router.get("/imoveis-recentes")
def obter_imoveis_recentes(
    db: DbSession,
    user: CurrentUser,
    consultor: OptionalConsultor,
    limit: int = 5,
) -> list[dict]:
    """Últimos imóveis acessíveis (próprios + de clientes da equipa)."""
    from app.models import ImovelCanonico

    stmt = (
        select(ImovelVersao, ImovelCanonico)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
    )
    f_versao = _versao_filter(user, consultor)
    if f_versao is not None:
        stmt = stmt.where(f_versao)

    stmt = stmt.order_by(ImovelVersao.criado_em.desc()).limit(limit)
    rows = db.execute(stmt).all()

    return [
        {
            "id": v.id,
            "titulo": v.titulo,
            "preco": v.preco,
            "property_id": c.property_id,
            "criado_em": v.criado_em.isoformat(),
            "tem_conflitos": v.tem_conflitos,
        }
        for v, c in rows
    ]


@router.get("/pdfs-recentes")
def obter_pdfs_recentes(
    db: DbSession,
    user: CurrentUser,
    consultor: OptionalConsultor,
    limit: int = 5,
) -> list[dict]:
    """Últimos PDFs acessíveis (próprios + de clientes da equipa)."""
    from app.models import Cliente as _Cliente, ImovelCanonico

    stmt = (
        select(PdfGerado, ImovelVersao, ImovelCanonico, _Cliente)
        .join(ImovelVersao, ImovelVersao.id == PdfGerado.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .join(_Cliente, _Cliente.id == PdfGerado.cliente_id)
    )
    f_pdf = _pdf_filter(user, consultor)
    if f_pdf is not None:
        stmt = stmt.where(f_pdf)

    stmt = stmt.order_by(PdfGerado.criado_em.desc()).limit(limit)
    rows = db.execute(stmt).all()

    return [
        {
            "id": p.id,
            "imovel_versao_id": p.imovel_versao_id,
            "imovel_titulo": c.titulo,
            "cliente_nome": cl.nome,
            "criado_em": p.criado_em.isoformat(),
            "tamanho_bytes": p.tamanho_bytes,
        }
        for p, v, c, cl in rows
    ]


@router.get("/interacoes-pendentes")
def obter_interacoes_pendentes(
    db: DbSession,
    user: CurrentUser,
    consultor: OptionalConsultor,
) -> dict:
    if not user.is_admin and consultor is None:
        return {
            "interesses_nao_vistos": 0,
            "pedidos_pendentes": 0,
            "pedidos_info_pendentes": 0,
            "notas_nao_lidas": 0,
            "recentes": [],
        }

    f_versao = _versao_filter(user, consultor)
    f_cliente = _cliente_filter(user, consultor)

    # Subqueries para uso em IN(...)
    versao_sub = select(ImovelVersao.id)
    if f_versao is not None:
        versao_sub = versao_sub.where(f_versao)
    cliente_sub = select(Cliente.id)
    if f_cliente is not None:
        cliente_sub = cliente_sub.where(f_cliente)

    interesses = db.scalar(
        select(func.count()).select_from(InteracaoImovel).where(
            InteracaoImovel.tipo == "interesse",
            InteracaoImovel.lida_pelo_consultor.is_(False),
            InteracaoImovel.imovel_versao_id.in_(versao_sub),
        )
    ) or 0

    pedidos = db.scalar(
        select(func.count()).select_from(InteracaoImovel).where(
            InteracaoImovel.tipo == "pedido_visita",
            InteracaoImovel.estado == "pendente",
            InteracaoImovel.imovel_versao_id.in_(versao_sub),
        )
    ) or 0

    pedidos_info = db.scalar(
        select(func.count()).select_from(InteracaoImovel).where(
            InteracaoImovel.tipo == "pedido_info",
            InteracaoImovel.estado == "pendente",
            InteracaoImovel.imovel_versao_id.in_(versao_sub),
        )
    ) or 0

    notas = db.scalar(
        select(func.count()).select_from(NotaClienteImovel).where(
            NotaClienteImovel.autor_tipo == "cliente",
            NotaClienteImovel.lida_pelo_destinatario.is_(False),
            NotaClienteImovel.cliente_id.in_(cliente_sub),
        )
    ) or 0

    recentes_rows = db.scalars(
        select(InteracaoImovel)
        .where(InteracaoImovel.imovel_versao_id.in_(versao_sub))
        .order_by(InteracaoImovel.criado_em.desc())
        .limit(5)
    ).all()
    recentes: list[dict] = []
    for r in recentes_rows:
        versao = db.get(ImovelVersao, r.imovel_versao_id)
        cliente = db.get(Cliente, r.cliente_id)
        recentes.append({
            "id": r.id,
            "cliente_id": r.cliente_id,
            "cliente_nome": cliente.nome if cliente else "",
            "imovel_versao_id": r.imovel_versao_id,
            "imovel_titulo": versao.titulo if versao else None,
            "imovel_estado": versao.estado_imovel if versao else None,
            "tipo": r.tipo,
            "estado": r.estado,
            "payload": r.payload,
            "lida_pelo_consultor": r.lida_pelo_consultor,
            "lida_pelo_cliente": r.lida_pelo_cliente,
            "criado_em": r.criado_em.isoformat(),
            "atualizado_em": r.atualizado_em.isoformat(),
        })

    return {
        "interesses_nao_vistos": interesses,
        "pedidos_pendentes": pedidos,
        "pedidos_info_pendentes": pedidos_info,
        "notas_nao_lidas": notas,
        "recentes": recentes,
    }