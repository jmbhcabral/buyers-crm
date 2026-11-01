"""Endpoints do dashboard (estatísticas agregadas)."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import (
    Cliente,
    ClienteConsultor,
    ImovelCanonico,
    ImovelVersao,
    ImovelVersaoCliente,
    PdfGerado,
    InteracaoImovel,
    NotaClienteImovel,
)
from app.models.consultor import Consultor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

OptionalConsultor = Annotated[Consultor | None, Depends(get_optional_consultor)]


@router.get("/stats")
def obter_stats(
    db: DbSession,
    user: CurrentUser,
    consultor: OptionalConsultor,
) -> dict:
    """Estatísticas do consultor autenticado.

    Devolve:
    - total_imoveis
    - total_clientes
    - total_pdfs
    - imoveis_com_conflitos
    - imoveis_sem_cliente
    - pdfs_ultimos_30_dias
    """
    if not user.is_admin and consultor is None:
        return {
            "total_imoveis": 0,
            "total_clientes": 0,
            "total_pdfs": 0,
            "imoveis_com_conflitos": 0,
            "imoveis_sem_cliente": 0,
            "pdfs_ultimos_30_dias": 0,
        }

    consultor_id = consultor.id if consultor else None

    # Base para filtros (admin vê tudo, consultor vê o seu)
    if user.is_admin and consultor_id is None:
        filtro_versao = None
        filtro_cliente = None
        filtro_pdf = None
    else:
        filtro_versao = ImovelVersao.consultor_id == consultor_id
        filtro_cliente = ClienteConsultor.consultor_id == consultor_id
        filtro_pdf = PdfGerado.consultor_id == consultor_id

    # Total imóveis
    stmt_imoveis = select(func.count()).select_from(ImovelVersao)
    if filtro_versao is not None:
        stmt_imoveis = stmt_imoveis.where(filtro_versao)
    total_imoveis = db.scalar(stmt_imoveis) or 0

    # Total imóveis com conflitos
    stmt_conflitos = (
        select(func.count())
        .select_from(ImovelVersao)
        .where(ImovelVersao.tem_conflitos.is_(True))
    )
    if filtro_versao is not None:
        stmt_conflitos = stmt_conflitos.where(filtro_versao)
    imoveis_com_conflitos = db.scalar(stmt_conflitos) or 0

    # Total clientes
    if user.is_admin and consultor_id is None:
        total_clientes = db.scalar(select(func.count()).select_from(Cliente)) or 0
    else:
        stmt_clientes = (
            select(func.count(func.distinct(ClienteConsultor.cliente_id)))
            .select_from(ClienteConsultor)
            .where(ClienteConsultor.consultor_id == consultor_id)
        )
        total_clientes = db.scalar(stmt_clientes) or 0

    # Total PDFs
    stmt_pdfs = select(func.count()).select_from(PdfGerado)
    if filtro_pdf is not None:
        stmt_pdfs = stmt_pdfs.where(filtro_pdf)
    total_pdfs = db.scalar(stmt_pdfs) or 0

    # Imóveis sem cliente associado
    if user.is_admin and consultor_id is None:
        from app.models import ImovelVersaoCliente

        subq = select(ImovelVersaoCliente.imovel_versao_id).distinct()
        stmt_sem = (
            select(func.count())
            .select_from(ImovelVersao)
            .where(~ImovelVersao.id.in_(subq))
        )
        imoveis_sem_cliente = db.scalar(stmt_sem) or 0
    else:
        from app.models import ImovelVersaoCliente

        subq = select(ImovelVersaoCliente.imovel_versao_id).distinct()
        stmt_sem = (
            select(func.count())
            .select_from(ImovelVersao)
            .where(ImovelVersao.consultor_id == consultor_id)
            .where(~ImovelVersao.id.in_(subq))
        )
        imoveis_sem_cliente = db.scalar(stmt_sem) or 0

    # PDFs últimos 30 dias
    from datetime import UTC, datetime, timedelta

    trinta_dias_atras = datetime.now(UTC) - timedelta(days=30)
    stmt_pdfs_30 = (
        select(func.count())
        .select_from(PdfGerado)
        .where(PdfGerado.criado_em >= trinta_dias_atras)
    )
    if filtro_pdf is not None:
        stmt_pdfs_30 = stmt_pdfs_30.where(filtro_pdf)
    pdfs_ultimos_30_dias = db.scalar(stmt_pdfs_30) or 0

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
    """Últimos imóveis captados (para timeline no dashboard)."""
    from app.models import ImovelCanonico

    stmt = (
        select(ImovelVersao, ImovelCanonico)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
    )

    if not user.is_admin:
        if consultor is None:
            return []
        stmt = stmt.where(ImovelVersao.consultor_id == consultor.id)

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
    """Últimos PDFs gerados."""
    from app.models import Cliente, ImovelCanonico

    stmt = (
        select(PdfGerado, ImovelVersao, ImovelCanonico, Cliente)
        .join(ImovelVersao, ImovelVersao.id == PdfGerado.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .join(Cliente, Cliente.id == PdfGerado.cliente_id)
    )

    if not user.is_admin:
        if consultor is None:
            return []
        stmt = stmt.where(PdfGerado.consultor_id == consultor.id)

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

    if user.is_admin and consultor is None:
        versao_sub = select(ImovelVersao.id)
        cliente_sub = select(Cliente.id)
    else:
        versao_sub = select(ImovelVersao.id).where(
            ImovelVersao.consultor_id == consultor.id
        )
        cliente_sub = select(ClienteConsultor.cliente_id).where(
            ClienteConsultor.consultor_id == consultor.id
        )

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