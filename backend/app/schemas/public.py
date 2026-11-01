"""Schemas Pydantic para os endpoints públicos (link do cliente)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# --- Consultor público (usado no header, lista e detalhe) ---
class ConsultorPublic(BaseModel):
    id: int
    nome: str
    agencia: str | None = None
    email: str | None = None
    telefone: str | None = None
    foto_url: str | None = None


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
    primeira_foto_url: str | None = None
    estado_imovel: str = "disponivel"


# --- Resposta da lista ---
class PublicLinkResponse(BaseModel):
    link: PublicLinkInfo
    imoveis: list[PublicImovelItem]
    consultor: ConsultorPublic | None = None       # <-- NOVO


# --- Foto ---
class PublicFotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem: int
    url: str
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

    caracteristicas: list[Any] | None = None
    caracteristicas_especificas: list[Any] | None = None
    telefone: dict[str, Any] | None = None

    url_original: str | None = None
    fotos: list[PublicFotoRead] = []

    consultor: ConsultorPublic | None = None

    estado_imovel: str = "disponivel"