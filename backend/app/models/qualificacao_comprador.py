"""Ficha de qualificação de comprador (1:1 com Cliente).

Preenchida no CRM depois da reunião. Os 4 blocos correspondem ao
"Guião de perguntas — Qualificação de Clientes Compradores".
"""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.user import User


class QualificacaoComprador(Base, PKMixin, TimestampMixin):
    __tablename__ = "qualificacoes_comprador"

    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    consultor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="nao_iniciada"
    )

    # ── Bloco 1 — Disponibilidade ─────────────────────────────────
    compra_sozinho: Mapped[bool | None] = mapped_column(Boolean)
    disp_notas: Mapped[str | None] = mapped_column(Text)
    disp_alternativas: Mapped[str | None] = mapped_column(Text)

    # ── Bloco 2 — Perfil / Motivação ─────────────────────────────
    motivo_compra: Mapped[str | None] = mapped_column(Text)
    tempo_procura: Mapped[str | None] = mapped_column(Text)
    urgencia: Mapped[str | None] = mapped_column(String(20))
    quando_resolver: Mapped[str | None] = mapped_column(Text)
    tem_imovel_venda: Mapped[bool | None] = mapped_column(Boolean)
    precisa_vender_comprar: Mapped[bool | None] = mapped_column(Boolean)

    # ── Bloco 3 — Imóvel pretendido ──────────────────────────────
    caracteristicas: Mapped[str | None] = mapped_column(Text)
    nao_prescinde: Mapped[str | None] = mapped_column(Text)
    valor_maximo: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    zonas_pretendidas: Mapped[str | None] = mapped_column(Text)
    motivo_zonas: Mapped[str | None] = mapped_column(Text)
    quartos: Mapped[int | None] = mapped_column(Integer)
    tipologia: Mapped[str | None] = mapped_column(String(20))
    estado_desejado: Mapped[str | None] = mapped_column(String(20))
    preferencia_andar: Mapped[str | None] = mapped_column(String(50))
    elevador: Mapped[bool | None] = mapped_column(Boolean)
    parqueamento: Mapped[str | None] = mapped_column(String(50))
    arrecadacao: Mapped[bool | None] = mapped_column(Boolean)
    exteriores: Mapped[str | None] = mapped_column(Text)
    acessos: Mapped[str | None] = mapped_column(Text)
    transportes: Mapped[str | None] = mapped_column(Text)
    comercio_jardins: Mapped[str | None] = mapped_column(Text)
    areas_especificas: Mapped[str | None] = mapped_column(Text)
    notas_extra: Mapped[str | None] = mapped_column(Text)

    # ── Bloco 4 — Financeira ─────────────────────────────────────
    compra_pp: Mapped[bool | None] = mapped_column(Boolean)
    financiamento_100: Mapped[bool | None] = mapped_column(Boolean)
    falou_banco: Mapped[bool | None] = mapped_column(Boolean)
    banco: Mapped[str | None] = mapped_column(String(100))
    capitais_proprios: Mapped[bool | None] = mapped_column(Boolean)
    capitais_proprios_valor: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    efetivo: Mapped[bool | None] = mapped_column(Boolean)
    fiadores: Mapped[bool | None] = mapped_column(Boolean)
    reuniao_loja: Mapped[bool | None] = mapped_column(Boolean)

    # ── Relações ──────────────────────────────────────────────────
    cliente: Mapped["Cliente"] = relationship(back_populates="qualificacao")
    consultor: Mapped["User"] = relationship()

    __table_args__ = (
        CheckConstraint(
            "estado IN ('nao_iniciada','em_preenchimento','concluida')",
            name="ck_qualificacoes_estado",
        ),
        CheckConstraint(
            "urgencia IS NULL OR urgencia IN ('baixa','media','alta')",
            name="ck_qualificacoes_urgencia",
        ),
        CheckConstraint(
            "estado_desejado IS NULL OR estado_desejado IN "
            "('novo','semi_novo','remodelado','obras','indiferente')",
            name="ck_qualificacoes_estado_desejado",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<QualificacaoComprador id={self.id} "
            f"cliente_id={self.cliente_id} estado={self.estado!r}>"
        )