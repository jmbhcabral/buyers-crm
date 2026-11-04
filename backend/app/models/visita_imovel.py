"""Fichas de visita a imóveis angariados (cliente vendedor).

Preenchidas pelo consultor no CRM depois de cada visita. Alimentam as
estatísticas que o vendedor vê no link público.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.imovel_versao import ImovelVersao


class VisitaImovel(Base, PKMixin, TimestampMixin):
    __tablename__ = "visitas_imovel"

    imovel_versao_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    data_visita: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Internos — nunca saem para o endpoint público
    visitante_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    visitante_contacto: Mapped[str | None] = mapped_column(String(64))
    visitante_email: Mapped[str | None] = mapped_column(String(255))
    consultor_representante: Mapped[str | None] = mapped_column(String(255))
    notas_internas: Mapped[str | None] = mapped_column(Text)

    # Visíveis ao vendedor
    visitante_origem: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="particular",
        server_default="particular",
    )
    agencia_nome: Mapped[str | None] = mapped_column(String(255))
    gostou: Mapped[str | None] = mapped_column(Text)
    nao_gostou: Mapped[str | None] = mapped_column(Text)
    observacoes: Mapped[str | None] = mapped_column(Text)
    rating_areas: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rating_acabamentos: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rating_localizacao: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rating_apresentacao: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rating_preco: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rating_global: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    compraria: Mapped[bool] = mapped_column(Boolean, nullable=False)

    versao: Mapped["ImovelVersao"] = relationship(back_populates="visitas")

    __table_args__ = (
        CheckConstraint(
            "visitante_origem IN ('agencia_externa', 'particular', "
            "'cliente_proprio', 'walk_in', 'outro')",
            name="ck_visitas_imovel_origem",
        ),
        CheckConstraint(
            "rating_areas BETWEEN 1 AND 5 AND "
            "rating_acabamentos BETWEEN 1 AND 5 AND "
            "rating_localizacao BETWEEN 1 AND 5 AND "
            "rating_apresentacao BETWEEN 1 AND 5 AND "
            "rating_preco BETWEEN 1 AND 5 AND "
            "rating_global BETWEEN 1 AND 5",
            name="ck_visitas_imovel_ratings",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<VisitaImovel id={self.id} versao={self.imovel_versao_id} "
            f"data={self.data_visita:%Y-%m-%d}>"
        )