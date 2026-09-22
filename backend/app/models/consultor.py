"""Perfil profissional do consultor (1:1 com User)."""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.imovel_versao import ImovelVersao
    from app.models.user import User


class Consultor(Base, PKMixin, TimestampMixin):
    __tablename__ = "consultores"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    telefone: Mapped[str | None] = mapped_column(String(32))
    nif: Mapped[str | None] = mapped_column(String(16))
    bio: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relações
    user: Mapped["User"] = relationship(back_populates="consultor")

    clientes: Mapped[list["Cliente"]] = relationship(
        secondary="cliente_consultor",
        back_populates="consultores",
    )
    imoveis_versoes: Mapped[list["ImovelVersao"]] = relationship(
        back_populates="consultor",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Consultor id={self.id} user_id={self.user_id}>"