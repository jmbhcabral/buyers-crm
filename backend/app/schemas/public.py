"""Schemas Pydantic para os endpoints públicos (link do cliente)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# --- Metadata do link ---
class PublicLinkInfo(BaseModel):
    cliente_nome_mascarado: str
    expira_em: datetime


# --- Item da lista de imóveis ---
class PublicImovelItem(BaseModel):
    imovel_versao_id: int
    ordem: int
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    num_fotos: int = 0


# --- Resposta da lista ---
class PublicLinkResponse(BaseModel):
    link: PublicLinkInfo
    imoveis: list[PublicImovelItem]


# --- Foto ---
class PublicFotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem: int
    url: str  # URL público do endpoint de fotos
    largura: int | None = None
    altura: int | None = None
    tag: str | None = None
    titulo: str | None = None


# --- Detalhe do imóvel ---
class PublicImovelDetalhe(BaseModel):
    imovel_versao_id: int
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    descricao: str | None = None
    anunciante: str | None = None

    caracteristicas: list[Any] | None = None
    caracteristicas_especificas: list[Any] | None = None
    telefone: dict[str, Any] | None = None

    url_original: str | None = None
    fotos: list[PublicFotoRead] = []