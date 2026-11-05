"""Origem de um imóvel canónico numa plataforma externa.

Permite que o mesmo imóvel canónico tenha N origens (Idealista,
Imovirtual, Supercasa, Properstar). A origem é a fonte de verdade
para o id_externo de cada plataforma; o `imoveis_canonicos.property_id`
mantém-se como atalho para o Idealista (retrocompatibilidade com o
userscript antigo e com queries existentes).
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.imovel_canonico import ImovelCanonico


class ImovelOrigem(Base, PKMixin, TimestampMixin):
    """Origem de um imóvel canónico numa plataforma externa."""

    __tablename__ = "imoveis_origem"
    __table_args__ = (
        UniqueConstraint(
            "fonte", "id_externo", name="uq_imoveis_origem_fonte_id"
        ),
    )

    imovel_canonico_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_canonicos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fonte: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    id_externo: Mapped[str] = mapped_column(String(128), nullable=False)
    url: Mapped[str | None] = mapped_column(String(1024))
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    extraido_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    imovel_canonico: Mapped["ImovelCanonico"] = relationship(
        back_populates="origens"
    )

    def __repr__(self) -> str:
        return (
            f"<ImovelOrigem id={self.id} canonico_id={self.imovel_canonico_id} "
            f"fonte={self.fonte!r} id_externo={self.id_externo!r}>"
        )