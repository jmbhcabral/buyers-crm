"""Schemas Pydantic para os endpoints públicos (link do cliente)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ConsultorPublic(BaseModel):
    id: int
    nome: str
    agencia: str | None = None
    email: str | None = None
    telefone: str | None = None
    foto_url: str | None = None


class PublicLinkInfo(BaseModel):
    cliente_nome_mascarado: str
    expira_em: datetime
    e_comprador: bool = True
    e_vendedor: bool = False


class PublicImovelItem(BaseModel):
    imovel_versao_id: int
    ordem: int
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    num_fotos: int = 0
    primeira_foto_url: str | None = None
    estado_imovel: str = "disponivel"


class PublicImovelVendedorItem(PublicImovelItem):
    num_visitas: int = 0
    rating_global_medio: float | None = None
    ultima_visita_em: datetime | None = None


class PublicLinkResponse(BaseModel):
    link: PublicLinkInfo
    imoveis: list[PublicImovelItem]
    imoveis_vendedor: list[PublicImovelVendedorItem] = []
    consultor: ConsultorPublic | None = None


class PublicFotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem: int
    url: str
    largura: int | None = None
    altura: int | None = None
    tag: str | None = None
    titulo: str | None = None


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
    # NOVO: true quando o imóvel é uma angariação do próprio cliente.
    # O frontend esconde AcoesImovel (Interesse/Visita/Notas) neste caso.
    e_angariacao: bool = False