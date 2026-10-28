"""Endpoints de administração (apenas admin)."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import AdminUser, DbSession
from app.models import (
    Cliente,
    ClienteConsultor,
    Consultor,
    Foto,
    ImovelCanonico,
    ImovelCanonicoHistorico,
    ImovelVersao,
    ImovelVersaoCliente,
    PdfGerado,
    User,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Stats globais
# ---------------------------------------------------------------------------
@router.get("/stats")
def admin_stats(db: DbSession, admin: AdminUser) -> dict:
    """Estatísticas globais do sistema."""
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_consultores = db.scalar(select(func.count()).select_from(Consultor)) or 0
    total_clientes = db.scalar(select(func.count()).select_from(Cliente)) or 0
    total_canonicos = db.scalar(select(func.count()).select_from(ImovelCanonico)) or 0
    total_versoes = db.scalar(select(func.count()).select_from(ImovelVersao)) or 0
    total_pdfs = db.scalar(select(func.count()).select_from(PdfGerado)) or 0
    total_historico = db.scalar(select(func.count()).select_from(ImovelCanonicoHistorico)) or 0

    # Últimos 7 dias
    sete_dias = datetime.now(UTC) - timedelta(days=7)
    ingest_7d = (
        db.scalar(
            select(func.count())
            .select_from(ImovelCanonico)
            .where(ImovelCanonico.criado_em >= sete_dias)
        )
        or 0
    )
    pdfs_7d = (
        db.scalar(
            select(func.count())
            .select_from(PdfGerado)
            .where(PdfGerado.criado_em >= sete_dias)
        )
        or 0
    )

    return {
        "total_users": total_users,
        "total_consultores": total_consultores,
        "total_clientes": total_clientes,
        "total_canonicos": total_canonicos,
        "total_versoes": total_versoes,
        "total_pdfs": total_pdfs,
        "total_historico": total_historico,
        "ingest_ultimos_7_dias": ingest_7d,
        "pdfs_ultimos_7_dias": pdfs_7d,
    }


# ---------------------------------------------------------------------------
# Consultores
# ---------------------------------------------------------------------------
@router.get("/consultores")
def admin_listar_consultores(db: DbSession, admin: AdminUser) -> list[dict]:
    """Lista todos os consultores com dados agregados."""
    rows = db.execute(
        select(Consultor, User)
        .join(User, User.id == Consultor.user_id)
        .order_by(User.nome)
    ).all()

    resultado = []
    for c, u in rows:
        n_versoes = db.scalar(
            select(func.count())
            .select_from(ImovelVersao)
            .where(ImovelVersao.consultor_id == c.id)
        ) or 0
        n_clientes = db.scalar(
            select(func.count(func.distinct(ClienteConsultor.cliente_id)))
            .select_from(ClienteConsultor)
            .where(ClienteConsultor.consultor_id == c.id)
        ) or 0
        n_pdfs = db.scalar(
            select(func.count())
            .select_from(PdfGerado)
            .where(PdfGerado.consultor_id == c.id)
        ) or 0

        resultado.append(
            {
                "id": c.id,
                "user_id": c.user_id,
                "nome": u.nome,
                "email": u.email,
                "is_admin": u.is_admin,
                "ativo": c.ativo and u.ativo,
                "telefone": c.telefone,
                "criado_em": c.criado_em.isoformat(),
                "num_imoveis": n_versoes,
                "num_clientes": n_clientes,
                "num_pdfs": n_pdfs,
            }
        )

    return resultado


# ---------------------------------------------------------------------------
# Canónicos
# ---------------------------------------------------------------------------
@router.get("/canonicos")
def admin_listar_canonicos(
    db: DbSession,
    admin: AdminUser,
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Lista todos os canónicos (snapshot do Idealista)."""
    stmt = select(ImovelCanonico)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(ImovelCanonico.titulo).like(like)
            | func.lower(ImovelCanonico.property_id).like(like)
        )
    stmt = stmt.order_by(ImovelCanonico.criado_em.desc()).limit(limit).offset(offset)
    canonicos = db.scalars(stmt).all()

    # Contagens por canónico
    ids = [c.id for c in canonicos]
    if ids:
        contagem_fotos = dict(
            db.execute(
                select(Foto.imovel_canonico_id, func.count())
                .where(Foto.imovel_canonico_id.in_(ids), Foto.ativa.is_(True))
                .group_by(Foto.imovel_canonico_id)
            ).all()
        )
        contagem_versoes = dict(
            db.execute(
                select(ImovelVersao.imovel_canonico_id, func.count())
                .where(ImovelVersao.imovel_canonico_id.in_(ids))
                .group_by(ImovelVersao.imovel_canonico_id)
            ).all()
        )
    else:
        contagem_fotos = {}
        contagem_versoes = {}

    return [
        {
            "id": c.id,
            "property_id": c.property_id,
            "titulo": c.titulo,
            "preco": c.preco,
            "localizacao": c.localizacao,
            "url": c.url,
            "criado_em": c.criado_em.isoformat(),
            "extraido_em": c.extraido_em.isoformat(),
            "num_fotos": contagem_fotos.get(c.id, 0),
            "num_versoes": contagem_versoes.get(c.id, 0),
        }
        for c in canonicos
    ]


# ---------------------------------------------------------------------------
# Versões
# ---------------------------------------------------------------------------
@router.get("/versoes")
def admin_listar_versoes(
    db: DbSession,
    admin: AdminUser,
    consultor_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Lista todas as versões (com filtro opcional por consultor)."""
    stmt = (
        select(ImovelVersao, ImovelCanonico, Consultor, User)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .join(Consultor, Consultor.id == ImovelVersao.consultor_id)
        .join(User, User.id == Consultor.user_id)
    )

    if consultor_id:
        stmt = stmt.where(ImovelVersao.consultor_id == consultor_id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(ImovelVersao.titulo).like(like)
            | func.lower(ImovelCanonico.property_id).like(like)
        )

    stmt = stmt.order_by(ImovelVersao.criado_em.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).all()

    return [
        {
            "id": v.id,
            "imovel_canonico_id": v.imovel_canonico_id,
            "property_id": c.property_id,
            "titulo": v.titulo,
            "preco": v.preco,
            "consultor_id": v.consultor_id,
            "consultor_nome": u.nome,
            "consultor_email": u.email,
            "tem_conflitos": v.tem_conflitos,
            "criado_em": v.criado_em.isoformat(),
            "atualizado_em": v.atualizado_em.isoformat(),
        }
        for v, c, cons, u in rows
    ]


# ---------------------------------------------------------------------------
# Auditoria — histórico de captações
# ---------------------------------------------------------------------------
@router.get("/historico")
def admin_listar_historico(
    db: DbSession,
    admin: AdminUser,
    imovel_canonico_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Histórico de captações (raw_json antigo de cada canónico)."""
    stmt = (
        select(ImovelCanonicoHistorico, ImovelCanonico)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelCanonicoHistorico.imovel_canonico_id)
    )

    if imovel_canonico_id:
        stmt = stmt.where(ImovelCanonicoHistorico.imovel_canonico_id == imovel_canonico_id)

    stmt = (
        stmt.order_by(ImovelCanonicoHistorico.capturado_em.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()

    return [
        {
            "id": h.id,
            "imovel_canonico_id": h.imovel_canonico_id,
            "property_id": c.property_id,
            "imovel_titulo": c.titulo,
            "capturado_em": h.capturado_em.isoformat(),
        }
        for h, c in rows
    ]


# ---------------------------------------------------------------------------
# Auditoria — PDFs gerados
# ---------------------------------------------------------------------------
@router.get("/pdfs")
def admin_listar_pdfs(
    db: DbSession,
    admin: AdminUser,
    consultor_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Lista todos os PDFs gerados por todos os consultores."""
    stmt = (
        select(PdfGerado, ImovelVersao, ImovelCanonico, Cliente, Consultor, User)
        .join(ImovelVersao, ImovelVersao.id == PdfGerado.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .join(Cliente, Cliente.id == PdfGerado.cliente_id)
        .join(Consultor, Consultor.id == PdfGerado.consultor_id)
        .join(User, User.id == Consultor.user_id)
    )

    if consultor_id:
        stmt = stmt.where(PdfGerado.consultor_id == consultor_id)

    stmt = stmt.order_by(PdfGerado.criado_em.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).all()

    return [
        {
            "id": p.id,
            "imovel_versao_id": p.imovel_versao_id,
            "imovel_titulo": c.titulo,
            "property_id": c.property_id,
            "cliente_nome": cl.nome,
            "consultor_id": p.consultor_id,
            "consultor_nome": u.nome,
            "tamanho_bytes": p.tamanho_bytes,
            "criado_em": p.criado_em.isoformat(),
        }
        for p, v, c, cl, cons, u in rows
    ]