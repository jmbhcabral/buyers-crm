"""Schemas Pydantic para links de cliente."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# --- Inputs ---
class LinkCreate(BaseModel):
    cliente_id: int
    expira_em_dias: int = Field(default=180, ge=1, le=730)
    # Se omitido, o backend usa o consultor autenticado (dono do link).
    consultor_apresentacao_id: int | None = None


class LinkAddImovel(BaseModel):
    imovel_versao_id: int


class LinkApresentacaoUpdate(BaseModel):
    """PATCH do consultor de apresentação no link público.

    `consultor_apresentacao_id=None` faz fallback para o dono do link
    (comportamento pré-equipas).
    """

    consultor_apresentacao_id: int | None = None


# --- Outputs ---
class LinkImovelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    imovel_versao_id: int
    ordem: int
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    num_fotos: int = 0
    criado_em: datetime
    estado_imovel: str = "disponivel"


class LinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    consultor_id: int
    consultor_apresentacao_id: int | None = None
    token_prefix: str
    ativo: bool
    expira_em: datetime
    revogado_em: datetime | None = None
    ultimo_acesso_em: datetime | None = None
    criado_em: datetime
    atualizado_em: datetime

    # Enriquecidos no endpoint
    cliente_nome: str = ""
    num_imoveis: int = 0
    num_acessos: int = 0

    url_publica: str | None = None
    token_visible: str | None = None


class LinkCreated(LinkRead):
    """Devolvido APENAS no POST. Inclui URL completa."""

    token: str


class LinkComDetalhes(LinkRead):
    imoveis: list[LinkImovelRead] = []


class LinkAcessoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    imovel_versao_id: int | None = None
    imovel_titulo: str | None = None
    user_agent: str | None = None
    referrer: str | None = None
    criado_em: datetime


class ImovelAnalyticsItem(BaseModel):
    imovel_versao_id: int
    imovel_titulo: str | None = None
    num_acessos: int
    ultimo_acesso_em: datetime | None = None


class LinkAnalyticsRead(BaseModel):
    link_id: int
    num_acessos_total: int
    num_acessos_lista: int
    num_acessos_detalhe: int
    ultimo_acesso_em: datetime | None = None
    por_imovel: list[ImovelAnalyticsItem]
    acessos_recentes: list[LinkAcessoRead]