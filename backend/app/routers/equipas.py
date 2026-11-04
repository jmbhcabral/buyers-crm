"""CRUD de equipas (admin)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import AdminUser, DbSession
from app.models import Cliente, Consultor, Equipa
from app.schemas.equipa import (
    ConsultorMembroRead,
    EquipaComMembros,
    EquipaCreate,
    EquipaRead,
    EquipaUpdate,
)

router = APIRouter(prefix="/admin/equipas", tags=["admin-equipas"])


def _build_read(db, equipa: Equipa) -> dict:
    num_consultores = db.scalar(
        select(func.count())
        .select_from(Consultor)
        .where(Consultor.equipa_id == equipa.id)
    ) or 0
    num_clientes = db.scalar(
        select(func.count())
        .select_from(Cliente)
        .where(Cliente.equipa_id == equipa.id)
    ) or 0
    return {
        "id": equipa.id,
        "nome": equipa.nome,
        "criado_em": equipa.criado_em,
        "atualizado_em": equipa.atualizado_em,
        "num_consultores": num_consultores,
        "num_clientes": num_clientes,
    }


@router.get("", response_model=list[EquipaRead])
def listar_equipas(db: DbSession, _admin: AdminUser) -> list[EquipaRead]:
    equipas = db.scalars(select(Equipa).order_by(Equipa.nome)).all()
    return [EquipaRead(**_build_read(db, e)) for e in equipas]


@router.post("", response_model=EquipaComMembros, status_code=status.HTTP_201_CREATED)
def criar_equipa(
    payload: EquipaCreate, db: DbSession, _admin: AdminUser
) -> EquipaComMembros:
    existente = db.scalar(select(Equipa).where(Equipa.nome == payload.nome))
    if existente is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Já existe uma equipa com esse nome."
        )
    equipa = Equipa(nome=payload.nome)
    db.add(equipa)
    db.commit()
    db.refresh(equipa)
    return EquipaComMembros(**_build_read(db, equipa), consultores=[])


@router.get("/{equipa_id}", response_model=EquipaComMembros)
def obter_equipa(
    equipa_id: int, db: DbSession, _admin: AdminUser
) -> EquipaComMembros:
    equipa = db.get(Equipa, equipa_id)
    if equipa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Equipa não encontrada")
    membros = db.scalars(
        select(Consultor)
        .where(Consultor.equipa_id == equipa_id)
        .order_by(Consultor.id)
    ).all()
    return EquipaComMembros(
        **_build_read(db, equipa),
        consultores=[ConsultorMembroRead.model_validate(m) for m in membros],
    )


@router.patch("/{equipa_id}", response_model=EquipaRead)
def atualizar_equipa(
    equipa_id: int, payload: EquipaUpdate, db: DbSession, _admin: AdminUser
) -> EquipaRead:
    equipa = db.get(Equipa, equipa_id)
    if equipa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Equipa não encontrada")
    data = payload.model_dump(exclude_unset=True)
    if "nome" in data and data["nome"] != equipa.nome:
        existente = db.scalar(select(Equipa).where(Equipa.nome == data["nome"]))
        if existente is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Já existe uma equipa com esse nome."
            )
        equipa.nome = data["nome"]
    db.commit()
    db.refresh(equipa)
    return EquipaRead(**_build_read(db, equipa))


@router.delete("/{equipa_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_equipa(equipa_id: int, db: DbSession, _admin: AdminUser) -> None:
    equipa = db.get(Equipa, equipa_id)
    if equipa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Equipa não encontrada")
    # As FKs SET NULL fazem com que consultores e clientes fiquem sem equipa.
    db.delete(equipa)
    db.commit()


@router.post(
    "/{equipa_id}/consultores/{consultor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def adicionar_consultor(
    equipa_id: int, consultor_id: int, db: DbSession, _admin: AdminUser
) -> None:
    equipa = db.get(Equipa, equipa_id)
    if equipa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Equipa não encontrada")
    consultor = db.get(Consultor, consultor_id)
    if consultor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultor não encontrado")
    if consultor.equipa_id is not None and consultor.equipa_id != equipa_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Consultor já pertence a outra equipa. Remove-o dessa equipa primeiro.",
        )
    consultor.equipa_id = equipa_id
    db.commit()


@router.delete(
    "/{equipa_id}/consultores/{consultor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remover_consultor(
    equipa_id: int, consultor_id: int, db: DbSession, _admin: AdminUser
) -> None:
    equipa = db.get(Equipa, equipa_id)
    if equipa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Equipa não encontrada")
    consultor = db.get(Consultor, consultor_id)
    if consultor is None or consultor.equipa_id != equipa_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Consultor não pertence a esta equipa"
        )
    consultor.equipa_id = None
    db.commit()