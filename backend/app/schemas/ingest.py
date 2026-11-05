"""Schemas específicos para o endpoint de ingest (userscripts).

Suporta múltiplas plataformas (Idealista, Imovirtual, Supercasa,
Properstar). O payload do Idealista mantém-se retrocompatível: se
`fonte` não for enviada, assume-se `idealista` e `property_id` é
obrigatório (como antes). Para as outras plataformas, o userscript
envia `fonte` e `id_externo` (string) e omite `property_id`.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


FonteIngest = Literal["idealista", "imovirtual", "supercasa", "properstar"]


# ---------------------------------------------------------------------------
# Payload — espelha o JSON do userscript (camelCase)
# ---------------------------------------------------------------------------
class FotoIngest(BaseModel):
    """Foto tal como o userscript envia.

    `id` é o `multimediaId` do Idealista (int). Para as outras
    plataformas não há um id numérico — usam `url_externa` como chave
    natural. Se ambos vierem, `id` tem prioridade na deduplicação.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: int | None = Field(default=None, alias="id")
    tag: str | None = Field(default=None, alias="tag")
    titulo: str | None = Field(default=None, alias="titulo")
    url: str | None = Field(default=None, alias="url")
    url_webp: str | None = Field(default=None, alias="urlWebp")
    largura: int | None = Field(default=None, alias="largura")
    altura: int | None = Field(default=None, alias="altura")
    posicao: int | None = Field(default=None, alias="posicao")
    url_externa: str | None = Field(default=None, alias="urlExterna")


class TelefoneIngest(BaseModel):
    """Bloco de telefone do userscript (aceita qualquer estrutura — guardamos como vem)."""

    model_config = ConfigDict(extra="allow")


class ImovelIngestPayload(BaseModel):
    """Payload completo do userscript.

    Os campos usam aliases camelCase porque o userscript envia camelCase.
    `populate_by_name=True` permite construir também com nomes snake_case.

    Validação condicional:
    - `fonte == "idealista"` → `property_id` obrigatório (retrocompat).
    - `fonte != "idealista"` → `id_externo` obrigatório.
    """

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    # --- Plataforma ---
    fonte: FonteIngest = "idealista"
    id_externo: str | None = Field(default=None, alias="idExterno")

    # --- Identificação (Idealista; opcional nas outras) ---
    property_id: int | None = Field(default=None, alias="propertyId")
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

    @model_validator(mode="after")
    def _validar_identificacao(self) -> "ImovelIngestPayload":
        if self.fonte == "idealista":
            if self.property_id is None:
                raise ValueError(
                    "Payload do Idealista tem de incluir `propertyId`."
                )
            # Normaliza: o idealista usa property_id como id_externo.
            if self.id_externo is None:
                self.id_externo = str(self.property_id)
        else:
            if not self.id_externo:
                raise ValueError(
                    f"Payload de `{self.fonte}` tem de incluir `idExterno`."
                )
        return self


# ---------------------------------------------------------------------------
# Resultado do ingest
# ---------------------------------------------------------------------------
AcaoIngest = Literal["criado", "atualizado", "sem_mudancas", "versao_criada"]


class IngestResult(BaseModel):
    """Resultado do endpoint POST /api/imoveis/ingest."""

    acao: AcaoIngest
    fonte: str
    id_externo: str
    imovel_canonico_id: int
    imovel_versao_id: int
    property_id: str | None = None
    fotos_novas: int = 0
    fotos_inativadas: int = 0
    versoes_sincronizadas: int = 0
    versoes_com_conflito: int = 0
    mensagem: str