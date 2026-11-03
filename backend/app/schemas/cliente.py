"""Schemas Pydantic de cliente."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.qualificacao_comprador import QualificacaoCompradorRead


class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    notas: str | None = None

    # Papéis: pelo menos um tem de ser verdadeiro.
    e_comprador: bool = True
    e_vendedor: bool = False

    @field_validator("email")
    @classmethod
    def _normalizar_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        return v or None

    @model_validator(mode="after")
    def _pelo_menos_um_papel(self) -> "ClienteBase":
        if not (self.e_comprador or self.e_vendedor):
            raise ValueError(
                "O cliente tem de ser comprador, vendedor, ou ambos."
            )
        return self


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    """Todos os campos opcionais para PATCH."""

    nome: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    telefone: str | None = Field(default=None, max_length=32)
    nif: str | None = Field(default=None, max_length=16)
    notas: str | None = None
    e_comprador: bool | None = None
    e_vendedor: bool | None = None

    @field_validator("email")
    @classmethod
    def _normalizar_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        return v or None

    @model_validator(mode="after")
    def _papeis_nao_ambos_falsos(self) -> "ClienteUpdate":
        # Só apanha o caso de o payload enviar ambos explicitamente a false.
        # O caso "PATCH parcial sobre cliente já vendedor=false" é validado
        # no router, que conhece o estado atual na BD.
        if self.e_comprador is False and self.e_vendedor is False:
            raise ValueError(
                "O cliente tem de ser comprador, vendedor, ou ambos."
            )
        return self


class ClienteRead(ClienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime
    qualificacao: QualificacaoCompradorRead | None = None


class ClienteComConsultores(ClienteRead):
    """Cliente com a lista de consultores associados (para admin)."""

    consultor_ids: list[int] = []