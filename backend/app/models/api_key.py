"""API keys para autenticação do userscript."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class ApiKey(Base, PKMixin, TimestampMixin):
    __tablename__ = "api_keys"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    prefixo: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    chave_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ultimo_uso_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relações
    user: Mapped["User"] = relationship(back_populates="api_keys")

    def __repr__(self) -> str:
        return f"<ApiKey id={self.id} prefixo={self.prefixo!r} ativa={self.ativa}>"