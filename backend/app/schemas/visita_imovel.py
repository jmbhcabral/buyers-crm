"""Schemas Pydantic para fichas de visita a imóveis angariados."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


VisitanteOrigem = Literal[
    "agencia_externa", "particular", "cliente_proprio", "walk_in", "outro"
]


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------
class VisitaImovelBase(BaseModel):
    data_visita: datetime
    visitante_nome: str = Field(min_length=1, max_length=255)
    visitante_contacto: str | None = Field(default=None, max_length=64)
    visitante_email: str | None = Field(default=None, max_length=255)
    consultor_representante: str | None = Field(default=None, max_length=255)
    notas_internas: str | None = None
    visitante_origem: VisitanteOrigem = "particular"
    agencia_nome: str | None = Field(default=None, max_length=255)
    gostou: str | None = None
    nao_gostou: str | None = None
    observacoes: str | None = None
    rating_areas: int = Field(ge=1, le=5)
    rating_acabamentos: int = Field(ge=1, le=5)
    rating_localizacao: int = Field(ge=1, le=5)
    rating_apresentacao: int = Field(ge=1, le=5)
    rating_preco: int = Field(ge=1, le=5)
    rating_global: int = Field(ge=1, le=5)
    compraria: bool


class VisitaImovelCreate(VisitaImovelBase):
    """Payload do POST — todos os campos base são obrigatórios excepto os
    nullable (contacto, email, etc.)."""


class VisitaImovelUpdate(BaseModel):
    """Payload do PATCH — todos os campos opcionais."""

    data_visita: datetime | None = None
    visitante_nome: str | None = Field(default=None, min_length=1, max_length=255)
    visitante_contacto: str | None = Field(default=None, max_length=64)
    visitante_email: str | None = Field(default=None, max_length=255)
    consultor_representante: str | None = Field(default=None, max_length=255)
    notas_internas: str | None = None
    visitante_origem: VisitanteOrigem | None = None
    agencia_nome: str | None = Field(default=None, max_length=255)
    gostou: str | None = None
    nao_gostou: str | None = None
    observacoes: str | None = None
    rating_areas: int | None = Field(default=None, ge=1, le=5)
    rating_acabamentos: int | None = Field(default=None, ge=1, le=5)
    rating_localizacao: int | None = Field(default=None, ge=1, le=5)
    rating_apresentacao: int | None = Field(default=None, ge=1, le=5)
    rating_preco: int | None = Field(default=None, ge=1, le=5)
    rating_global: int | None = Field(default=None, ge=1, le=5)
    compraria: bool | None = None


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
class VisitaImovelRead(VisitaImovelBase):
    """Vista do CRM — inclui todos os campos, incluindo internos."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    imovel_versao_id: int
    criado_em: datetime
    atualizado_em: datetime


class VisitaImovelPublic(BaseModel):
    """Vista do vendedor no link público.

    NÃO inclui:
      - visitante_nome, visitante_contacto, visitante_email,
        consultor_representante, notas_internas (dados internos)
      - agencia_nome (a agência visitante nunca aparece ao vendedor)
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    data_visita: datetime
    visitante_origem: VisitanteOrigem
    gostou: str | None
    nao_gostou: str | None
    observacoes: str | None
    rating_areas: int
    rating_acabamentos: int
    rating_localizacao: int
    rating_apresentacao: int
    rating_preco: int
    rating_global: int
    compraria: bool


class RatingsMedios(BaseModel):
    """Médias dos 6 ratings. `global` é alias porque é palavra reservada."""

    areas: float | None = None
    acabamentos: float | None = None
    localizacao: float | None = None
    apresentacao: float | None = None
    preco: float | None = None
    global_: float | None = Field(default=None, alias="global")

    model_config = ConfigDict(populate_by_name=True)


class EstatisticasVendedor(BaseModel):
    """Payload do endpoint público de estatísticas do vendedor."""

    imovel_versao_id: int
    num_visitas: int
    rating_global_medio: float | None = None
    ratings_medios: RatingsMedios
    compraria_sim: int
    compraria_nao: int
    visitas: list[VisitaImovelPublic]
    plataformas: list[dict[str, Any]] = Field(default_factory=list)