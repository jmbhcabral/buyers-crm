"""Schemas de equipas (admin CRUD)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EquipaBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=120)


class EquipaCreate(EquipaBase):
    pass


class EquipaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)


class ConsultorMembroRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    equipa_id: int | None = None


class EquipaRead(EquipaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime
    num_consultores: int = 0
    num_clientes: int = 0


class EquipaComMembros(EquipaRead):
    consultores: list[ConsultorMembroRead] = []