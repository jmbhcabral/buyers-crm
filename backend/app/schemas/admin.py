"""Schemas de administração."""

from pydantic import BaseModel, EmailStr, Field


class ConsultorAdminCreate(BaseModel):
    """Criação de consultor pelo admin (User + Consultor numa transação)."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    nome: str = Field(..., min_length=1, max_length=255)
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    bio: str | None = None
    agencia: str | None = Field(default=None, max_length=255)
    is_admin: bool = False


class ConsultorAdminCredenciaisUpdate(BaseModel):
    """Admin redefine email e/ou password de um consultor (sem password atual)."""

    email: EmailStr | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


class PasswordChangeSelf(BaseModel):
    """Utilizador altera a própria password (exige a atual)."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)