"""Schemas para interações e notas cliente↔imóvel."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


EstadoImovel = Literal[
    "disponivel", "reservado", "cpcv",
    "escritura_marcada", "vendido", "saiu_mercado",
]
TipoInteracao = Literal["interesse", "pedido_visita", "pedido_info"]
EstadoInteracao = Literal["pendente", "visto", "concluido", "cancelado"]
AutorTipo = Literal["cliente", "consultor"]


# --- Inputs ---
class InteresseToggle(BaseModel):
    ativo: bool


class PedidoCreate(BaseModel):
    tipo: TipoInteracao
    payload: dict[str, Any] | None = None


class NotaCreatePublic(BaseModel):
    imovel_versao_id: int
    conteudo: str = Field(..., min_length=1, max_length=4000)


class NotaCreateCRM(BaseModel):
    imovel_versao_id: int
    conteudo: str = Field(..., min_length=1, max_length=4000)


class InteracaoUpdate(BaseModel):
    estado: EstadoInteracao


class EstadoImovelUpdate(BaseModel):
    estado_imovel: EstadoImovel


# --- Outputs ---
class InteracaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    imovel_versao_id: int
    tipo: TipoInteracao
    estado: EstadoInteracao
    payload: dict[str, Any] | None = None
    lida_pelo_consultor: bool
    lida_pelo_cliente: bool
    criado_em: datetime
    atualizado_em: datetime


class InteracaoComContexto(InteracaoRead):
    cliente_nome: str = ""
    imovel_titulo: str | None = None
    imovel_estado: str | None = None


class NotaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    imovel_versao_id: int | None = None
    autor_tipo: AutorTipo
    autor_user_id: int | None = None
    conteudo: str
    lida_pelo_destinatario: bool
    criado_em: datetime


class NotaComContexto(NotaRead):
    autor_nome: str | None = None
    imovel_titulo: str | None = None
    cliente_nome: str | None = None


class InteracoesResumo(BaseModel):
    interesses: list[int]
    pedidos: list[InteracaoRead]
    notas_nao_lidas: int
    por_imovel: dict[int, dict[str, int]] = Field(default_factory=dict)


class DashboardInteracoesPendentes(BaseModel):
    interesses_nao_vistos: int
    pedidos_pendentes: int
    pedidos_info_pendentes: int
    notas_nao_lidas: int
    recentes: list[InteracaoComContexto]