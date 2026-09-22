"""Clientes (compradores)."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.consultor import Consultor
    from app.models.imovel_versao import ImovelVersao


class Cliente(Base, PKMixin, TimestampMixin):
    __tablename__ = "clientes"

    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    telefone: Mapped[str | None] = mapped_column(String(32))
    nif: Mapped[str | None] = mapped_column(String(16))
    notas: Mapped[str | None] = mapped_column(Text)

    # Relações
    consultores: Mapped[list["Consultor"]] = relationship(
        secondary="cliente_consultor",
        back_populates="clientes",
    )
    imoveis_versoes: Mapped[list["ImovelVersao"]] = relationship(
        secondary="imoveis_versoes_clientes",
        back_populates="clientes",
    )

    def __repr__(self) -> str:
        return f"<Cliente id={self.id} nome={self.nome!r}>"