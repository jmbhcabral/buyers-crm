"""Schemas de utilizador e consultor."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ConsultorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telefone: str | None = None
    nif: str | None = None
    bio: str | None = None
    ativo: bool


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nome: str
    is_admin: bool
    ativo: bool
    criado_em: datetime
    consultor: ConsultorRead | None = None