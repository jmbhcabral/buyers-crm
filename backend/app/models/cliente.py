"""Clientes (compradores e/ou vendedores)."""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.consultor import Consultor
    from app.models.equipa import Equipa
    from app.models.imovel_versao import ImovelVersao
    from app.models.qualificacao_comprador import QualificacaoComprador


class Cliente(Base, PKMixin, TimestampMixin):
    __tablename__ = "clientes"

    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    telefone: Mapped[str | None] = mapped_column(String(32))
    nif: Mapped[str | None] = mapped_column(String(16))
    notas: Mapped[str | None] = mapped_column(Text)

    # NULL = cliente privado (dono via `cliente_consultor`).
    # NOT NULL = cliente partilhado pela equipa.
    equipa_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("equipas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Papéis: um cliente pode ser comprador, vendedor, ou ambos.
    # Backfill inicial: todos os clientes existentes são compradores.
    e_comprador: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    e_vendedor: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # Relações
    equipa: Mapped["Equipa | None"] = relationship(back_populates="clientes")
    consultores: Mapped[list["Consultor"]] = relationship(
        secondary="cliente_consultor",
        back_populates="clientes",
    )
    imoveis_versoes: Mapped[list["ImovelVersao"]] = relationship(
        secondary="imoveis_versoes_clientes",
        back_populates="clientes",
    )
    qualificacao: Mapped["QualificacaoComprador | None"] = relationship(
        back_populates="cliente",
        cascade="all, delete-orphan",
        uselist=False,
    )

    __table_args__ = (
        CheckConstraint(
            "e_comprador OR e_vendedor",
            name="ck_clientes_pelo_menos_um_papel",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Cliente id={self.id} nome={self.nome!r} "
            f"equipa_id={self.equipa_id}>"
        )