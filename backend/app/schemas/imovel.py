"""Schemas Pydantic de imóveis: canónico, versão, fotos."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ===========================================================================
# Fotos
# ===========================================================================
class FotoRead(BaseModel):
    """Foto do imóvel (armazenada em disco)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    idealista_id: int | None = None
    ordem: int
    url_original: str | None = None
    url_webp: str | None = None
    caminho_local: str | None = None
    largura: int | None = None
    altura: int | None = None
    tag: str | None = None
    titulo: str | None = None
    ativa: bool


# ===========================================================================
# Canónico (snapshot do Idealista — só leitura)
# ===========================================================================
class ImovelCanonicoRead(BaseModel):
    """Snapshot do Idealista. Imutável na prática.

    Devolvido tal como veio, para o consultor poder comparar com a sua versão.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: str
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    descricao: str | None = None
    url: str | None = None
    ad_external_reference: str | None = None
    ad_commercial_name: str | None = None
    ad_professional_name: str | None = None
    anunciante: str | None = None
    referencia_anunciante: str | None = None

    caracteristicas: list[Any] | None = None
    caracteristicas_especificas: list[Any] | None = None
    plantas: list[Any] | None = None
    videos: list[Any] | None = None
    tours_virtuais: list[Any] | None = None
    contagens: dict[str, Any] | None = None
    telefone: dict[str, Any] | None = None

    extraido_em: datetime
    criado_em: datetime
    atualizado_em: datetime


class ImovelCanonicoComFotos(ImovelCanonicoRead):
    """Canónico + lista de fotos."""

    fotos: list[FotoRead] = Field(default_factory=list)


# ===========================================================================
# Versão (cópia editável do consultor)
# ===========================================================================
class ImovelVersaoBase(BaseModel):
    """Campos editáveis pelo consultor (espelho dos campos do canónico).

    O consultor pode alterar qualquer um destes campos na sua versão,
    sem afetar a versão dos outros consultores.
    """

    titulo: str | None = Field(default=None, max_length=512)
    preco: str | None = Field(default=None, max_length=64)
    localizacao: list[Any] | None = None
    descricao: str | None = None
    anunciante: str | None = Field(default=None, max_length=255)
    caracteristicas: list[Any] | None = None
    caracteristicas_especificas: list[Any] | None = None
    telefone: dict[str, Any] | None = None
    notas_internas: str | None = None


class ImovelVersaoUpdate(ImovelVersaoBase):
    """PATCH — todos opcionais.

    Ao contrário de outros schemas, aqui os campos editáveis vêm todos
    do ImovelVersaoBase. O router usa exclude_unset=True para saber o que mudou.
    """


class ImovelVersaoRead(ImovelVersaoBase):
    """Versão completa, para o detalhe do imóvel."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    imovel_canonico_id: int
    consultor_id: int

    campos_alterados: dict[str, bool] | None = None
    tem_conflitos: bool
    sincronizado_em: datetime | None = None
    criado_em: datetime
    atualizado_em: datetime


class ImovelVersaoComDetalhes(ImovelVersaoRead):
    """Versão + canónico + fotos — payload principal do detalhe do imóvel."""

    canonico: ImovelCanonicoComFotos


# ===========================================================================
# Listagem (resumida)
# ===========================================================================
class ImovelVersaoListItem(BaseModel):
    """Item da lista de imóveis. Resumido para performance."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    imovel_canonico_id: int
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None

    tem_conflitos: bool
    atualizado_em: datetime
    criado_em: datetime

    property_id: str
    num_fotos: int = 0
    num_clientes: int = 0
    primeira_foto_id: int | None = None
    estado_imovel: str = "disponivel"


# ===========================================================================
# Cliente associado a uma versão
# ===========================================================================
class ClienteAssociadoRead(BaseModel):
    """Cliente associado a uma versão de imóvel."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str | None = None
    telefone: str | None = None