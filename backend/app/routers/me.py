"""Endpoints do utilizador autenticado."""
import uuid
from pathlib import Path
from app.config import settings

from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.services.consultor_utils import build_consultor_read as _build_consultor_read
from app.deps import CurrentConsultor, CurrentUser, DbSession
from app.models import Consultor
from app.schemas.consultor import ConsultorRead, ConsultorUpdate
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserRead)
def obter_me(user: CurrentUser) -> UserRead:
    """Devolve o perfil do utilizador autenticado (user + consultor)."""
    return UserRead.model_validate(user)


@router.get("/consultor", response_model=ConsultorRead)
def obter_meu_consultor(
    db: DbSession,
    consultor: CurrentConsultor,
) -> ConsultorRead:
    """Devolve o perfil do consultor autenticado."""
    return _build_consultor_read(db, consultor)


@router.patch("/consultor", response_model=ConsultorRead)
def atualizar_meu_consultor(
    payload: ConsultorUpdate,
    db: DbSession,
    consultor: CurrentConsultor,
) -> ConsultorRead:
    """Atualiza o perfil do consultor autenticado (PATCH)."""
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(consultor, campo, valor)

    db.commit()
    db.refresh(consultor)
    return _build_consultor_read(db, consultor)


@router.post("/consultor/foto", response_model=ConsultorRead)
async def upload_foto_perfil(
    db: DbSession,
    consultor: CurrentConsultor,
    file: UploadFile = File(...),
) -> ConsultorRead:
    """Upload da foto de perfil do consultor."""
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Formato inválido. Usa JPEG, PNG ou WebP.",
        )

    # Limite de 5MB
    conteudo = await file.read()
    if len(conteudo) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Máximo 5MB.")

    pasta = settings.storage_consultores_dir
    pasta.mkdir(parents=True, exist_ok=True)

    # Extensão
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]

    # Apagar foto antiga
    if consultor.foto_caminho:
        antigo = Path(consultor.foto_caminho)
        if antigo.exists():
            antigo.unlink()

    nome = f"{consultor.id}_{uuid.uuid4().hex[:8]}{ext}"
    caminho = pasta / nome
    caminho.write_bytes(conteudo)

    consultor.foto_caminho = str(caminho)
    db.commit()
    db.refresh(consultor)

    return _build_consultor_read(db, consultor)


@router.delete("/consultor/foto", status_code=status.HTTP_204_NO_CONTENT)
def apagar_foto_perfil(db: DbSession, consultor: CurrentConsultor) -> None:
    """Apaga a foto de perfil do consultor."""
    if consultor.foto_caminho:
        antigo = Path(consultor.foto_caminho)
        if antigo.exists():
            antigo.unlink()
        consultor.foto_caminho = None
        db.commit()


@router.patch("", response_model=UserRead)
def atualizar_meu_user(
    payload: UserUpdate,
    db: DbSession,
    user: CurrentUser,
) -> UserRead:
    """Atualiza o User (nome, email)."""
    if payload.nome is not None:
        nome = payload.nome.strip()
        if not nome:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "O nome não pode ficar vazio",
            )
        user.nome = nome
    if payload.email is not None:
        user.email = payload.email
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)