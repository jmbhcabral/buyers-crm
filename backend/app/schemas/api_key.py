"""Schemas Pydantic de API key."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=120)


class ApiKeyRead(BaseModel):
    """Devolve os metadados da chave — NUNCA a chave em claro."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    prefixo: str
    ativa: bool
    ultimo_uso_em: datetime | None = None
    criado_em: datetime


class ApiKeyCreated(ApiKeyRead):
    """Resposta de criação — inclui a chave em claro UMA vez.

    Esta é a ÚNICA resposta que mostra `chave`. Depois nunca mais.
    """

    chave: str