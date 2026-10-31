"""Schemas Pydantic de consultor."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConsultorBase(BaseModel):
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    bio: str | None = None


class ConsultorUpdate(BaseModel):
    """PATCH do próprio perfil — todos opcionais."""

    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    bio: str | None = None
    agencia: str | None = Field(default=None, max_length=255)


class ConsultorRead(ConsultorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime
    agencia: str | None = None
    foto_url: str | None = None
    nome: str | None = None


class ConsultorComUser(ConsultorRead):
    """Consultor com dados públicos do utilizador (nome, email)."""

    nome: str
    email: str