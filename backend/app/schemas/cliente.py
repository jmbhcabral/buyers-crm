"""Schemas Pydantic de cliente."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    notas: str | None = None

    @field_validator("email")
    @classmethod
    def _normalizar_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        return v or None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    """Todos os campos opcionais para PATCH."""

    nome: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    notas: str | None = None

    @field_validator("email")
    @classmethod
    def _normalizar_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        return v or None


class ClienteRead(ClienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime


class ClienteComConsultores(ClienteRead):
    """Cliente com a lista de consultores associados (para admin)."""

    consultor_ids: list[int] = []