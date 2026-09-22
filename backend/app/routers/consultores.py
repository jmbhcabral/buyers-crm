"""Endpoints de consultores.

- Listagem pública (autenticada): todos os consultores ativos.
- Edição do próprio perfil em /me/consultor.
- Edição de qualquer consultor apenas por admin.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import AdminUser, CurrentConsultor, CurrentUser, DbSession
from app.models import Consultor, User
from app.schemas.consultor import ConsultorComUser, ConsultorRead, ConsultorUpdate

router = APIRouter(prefix="/consultores", tags=["consultores"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _obter_consultor_ou_404(db: Session, consultor_id: int) -> Consultor:
    consultor = db.get(Consultor, consultor_id)
    if consultor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultor não encontrado")
    return consultor


def _to_com_user(db: Session, consultor: Consultor) -> ConsultorComUser:
    """Junta Consultor + User (nome, email) num schema só."""
    user = db.get(User, consultor.user_id)
    return ConsultorComUser(
        id=consultor.id,
        user_id=consultor.user_id,
        telefone=consultor.telefone,
        nif=consultor.nif,
        bio=consultor.bio,
        ativo=consultor.ativo,
        criado_em=consultor.criado_em,
        atualizado_em=consultor.atualizado_em,
        nome=user.nome if user else "",
        email=user.email if user else "",
    )


# ---------------------------------------------------------------------------
# Listar todos os consultores ativos
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ConsultorComUser])
def listar_consultores(
    db: DbSession,
    user: CurrentUser,
    q: str | None = Query(default=None, description="Pesquisa por nome ou email"),
    incluir_inativos: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ConsultorComUser]:
    """Lista consultores.

    Útil para associar clientes/imóveis a outros consultores.
    Por omissão, só mostra consultores ativos.
    """
    stmt = select(Consultor, User).join(User, User.id == Consultor.user_id)

    if not incluir_inativos:
        stmt = stmt.where(Consultor.ativo.is_(True), User.ativo.is_(True))

    if q:
        like = f"%{q.lower()}%"
        from sqlalchemy import func

        stmt = stmt.where(
            func.lower(User.nome).like(like) | func.lower(User.email).like(like)
        )

    stmt = stmt.order_by(User.nome).limit(limit).offset(offset)
    rows = db.execute(stmt).all()

    return [
        ConsultorComUser(
            id=c.id,
            user_id=c.user_id,
            telefone=c.telefone,
            nif=c.nif,
            bio=c.bio,
            ativo=c.ativo,
            criado_em=c.criado_em,
            atualizado_em=c.atualizado_em,
            nome=u.nome,
            email=u.email,
        )
        for c, u in rows
    ]


# ---------------------------------------------------------------------------
# Obter um consultor
# ---------------------------------------------------------------------------
@router.get("/{consultor_id}", response_model=ConsultorComUser)
def obter_consultor(
    consultor_id: int,
    db: DbSession,
    user: CurrentUser,
) -> ConsultorComUser:
    consultor = _obter_consultor_ou_404(db, consultor_id)
    return _to_com_user(db, consultor)


# ---------------------------------------------------------------------------
# Atualizar consultor — só admin
# ---------------------------------------------------------------------------
@router.patch("/{consultor_id}", response_model=ConsultorRead)
def atualizar_consultor_admin(
    consultor_id: int,
    payload: ConsultorUpdate,
    db: DbSession,
    admin: AdminUser,
) -> Consultor:
    """Atualiza um consultor (apenas admin)."""
    consultor = _obter_consultor_ou_404(db, consultor_id)

    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(consultor, campo, valor)

    db.commit()
    db.refresh(consultor)
    return consultor


# ---------------------------------------------------------------------------
# Perfil do próprio — /me/consultor
# ---------------------------------------------------------------------------
me_router = APIRouter(prefix="/me/consultor", tags=["me"])


@me_router.get("", response_model=ConsultorRead)
def obter_meu_consultor(consultor: CurrentConsultor) -> Consultor:
    """Devolve o perfil do consultor autenticado."""
    return consultor


@me_router.patch("", response_model=ConsultorRead)
def atualizar_meu_consultor(
    payload: ConsultorUpdate,
    db: DbSession,
    consultor: CurrentConsultor,
) -> Consultor:
    """Atualiza o perfil do consultor autenticado.

    Só permite editar: telefone, nif, bio.
    (nome e email vivem no User e são geridos noutro endpoint.)
    """
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(consultor, campo, valor)

    db.commit()
    db.refresh(consultor)
    return consultor