"""Schemas específicos para o endpoint de ingest (userscript)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Payload — espelha o JSON do userscript (camelCase)
# ---------------------------------------------------------------------------
class FotoIngest(BaseModel):
    """Foto tal como o userscript envia."""

    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(alias="id")
    tag: str | None = Field(default=None, alias="tag")
    titulo: str | None = Field(default=None, alias="titulo")
    url: str | None = Field(default=None, alias="url")
    url_webp: str | None = Field(default=None, alias="urlWebp")
    largura: int | None = Field(default=None, alias="largura")
    altura: int | None = Field(default=None, alias="altura")
    posicao: int | None = Field(default=None, alias="posicao")


class TelefoneIngest(BaseModel):
    """Bloco de telefone do userscript (aceita qualquer estrutura — guardamos como vem)."""

    model_config = ConfigDict(extra="allow")


class ImovelIngestPayload(BaseModel):
    """Payload completo do userscript.

    Os campos usam aliases camelCase porque o userscript envia camelCase.
    `populate_by_name=True` permite construir também com nomes snake_case.
    """

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    # --- Identificação ---
    property_id: int = Field(alias="propertyId")
    ad_external_reference: str | None = Field(default=None, alias="adExternalReference")
    ad_commercial_name: str | None = Field(default=None, alias="adCommercialName")
    ad_professional_name: str | None = Field(default=None, alias="adProfessionalName")

    # --- Conteúdo ---
    titulo: str | None = None
    preco: str | None = None
    localizacao: list[Any] | None = None
    descricao: str | None = None
    url: str | None = None
    anunciante: str | None = None
    referencia_anunciante: str | None = Field(default=None, alias="referenciaAnunciante")

    caracteristicas: list[Any] | None = None
    caracteristicas_especificas: list[Any] | None = Field(
        default=None, alias="caracteristicasEspecificas"
    )
    plantas: list[Any] | None = None
    videos: list[Any] | None = None
    tours_virtuais: list[Any] | None = Field(default=None, alias="toursVirtuais")
    contagens: dict[str, Any] | None = None
    telefone: dict[str, Any] | None = None

    fotos: list[FotoIngest] = Field(default_factory=list)

    # --- Metadados ---
    extraido_em: datetime | None = Field(default=None, alias="extraidoEm")


# ---------------------------------------------------------------------------
# Resultado do ingest
# ---------------------------------------------------------------------------
AcaoIngest = Literal["criado", "atualizado", "sem_mudancas", "versao_criada"]


class IngestResult(BaseModel):
    """Resultado do endpoint POST /api/imoveis/ingest."""

    acao: AcaoIngest
    imovel_canonico_id: int
    imovel_versao_id: int
    property_id: str
    fotos_novas: int = 0
    fotos_inativadas: int = 0
    versoes_sincronizadas: int = 0
    versoes_com_conflito: int = 0
    mensagem: str