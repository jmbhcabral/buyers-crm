"""Schemas Pydantic da ficha de qualificação de comprador."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

UrgenciaComprador = Literal["baixa", "media", "alta"]
EstadoDesejadoImovel = Literal[
    "novo", "semi_novo", "remodelado", "obras", "indiferente"
]
EstadoQualificacao = Literal["nao_iniciada", "em_preenchimento", "concluida"]


class QualificacaoCompradorBase(BaseModel):
    estado: EstadoQualificacao = "nao_iniciada"

    # Bloco 1 — Disponibilidade
    compra_sozinho: bool | None = None
    disp_notas: str | None = None
    disp_alternativas: str | None = None

    # Bloco 2 — Perfil / Motivação
    motivo_compra: str | None = None
    tempo_procura: str | None = None
    urgencia: UrgenciaComprador | None = None
    quando_resolver: str | None = None
    tem_imovel_venda: bool | None = None
    precisa_vender_comprar: bool | None = None

    # Bloco 3 — Imóvel pretendido
    caracteristicas: str | None = None
    nao_prescinde: str | None = None
    valor_maximo: Decimal | None = Field(default=None, ge=0)
    zonas_pretendidas: str | None = None
    motivo_zonas: str | None = None
    quartos: int | None = Field(default=None, ge=0)
    tipologia: str | None = Field(default=None, max_length=20)
    estado_desejado: EstadoDesejadoImovel | None = None
    preferencia_andar: str | None = Field(default=None, max_length=50)
    elevador: bool | None = None
    parqueamento: str | None = Field(default=None, max_length=50)
    arrecadacao: bool | None = None
    exteriores: str | None = None
    acessos: str | None = None
    transportes: str | None = None
    comercio_jardins: str | None = None
    areas_especificas: str | None = None
    notas_extra: str | None = None

    # Bloco 4 — Financeira
    compra_pp: bool | None = None
    financiamento_100: bool | None = None
    falou_banco: bool | None = None
    banco: str | None = Field(default=None, max_length=100)
    capitais_proprios: bool | None = None
    capitais_proprios_valor: Decimal | None = Field(default=None, ge=0)
    efetivo: bool | None = None
    fiadores: bool | None = None
    reuniao_loja: bool | None = None


class QualificacaoCompradorUpsert(QualificacaoCompradorBase):
    """Payload de PUT — todos os campos opcionais exceto `estado`."""


class QualificacaoCompradorRead(QualificacaoCompradorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    consultor_id: int
    criado_em: datetime
    atualizado_em: datetime