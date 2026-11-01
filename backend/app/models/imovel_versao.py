"""Versão editável de um imóvel, específica a cada consultor."""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.consultor import Consultor
    from app.models.imovel_canonico import ImovelCanonico


class ImovelVersao(Base, PKMixin, TimestampMixin):
    """Cópia editável do imóvel, pertencente a um consultor específico.

    Cada consultor tem no máximo UMA versão de cada imóvel canónico.
    Só o consultor dono vê e edita esta versão.
    """

    __tablename__ = "imoveis_versoes"
    __table_args__ = (
        UniqueConstraint(
            "imovel_canonico_id",
            "consultor_id",
            name="uq_imovel_versao_canonico_consultor",
        ),
    )

    imovel_canonico_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_canonicos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    consultor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("consultores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Espelho dos campos editáveis do canónico
    titulo: Mapped[str | None] = mapped_column(String(512))
    preco: Mapped[str | None] = mapped_column(String(64))
    localizacao: Mapped[list[Any] | None] = mapped_column(JSONB)
    descricao: Mapped[str | None] = mapped_column(Text)
    anunciante: Mapped[str | None] = mapped_column(String(255))
    caracteristicas: Mapped[list[Any] | None] = mapped_column(JSONB)
    caracteristicas_especificas: Mapped[list[Any] | None] = mapped_column(JSONB)
    telefone: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    # Campos exclusivos do consultor
    notas_internas: Mapped[str | None] = mapped_column(Text)

    estado_imovel: Mapped[str] = mapped_column(
    String(32), default="disponivel", nullable=False, index=True,
)

    # Controle de sincronização
    campos_alterados: Mapped[dict[str, bool] | None] = mapped_column(JSONB, default=dict)
    tem_conflitos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sincronizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relações
    canonico: Mapped["ImovelCanonico"] = relationship(back_populates="versoes")
    consultor: Mapped["Consultor"] = relationship(back_populates="imoveis_versoes")
    clientes: Mapped[list["Cliente"]] = relationship(
        secondary="imoveis_versoes_clientes",
        back_populates="imoveis_versoes",
    )

    def __repr__(self) -> str:
        return (
            f"<ImovelVersao id={self.id} canonico_id={self.imovel_canonico_id} "
            f"consultor_id={self.consultor_id}>"
        )