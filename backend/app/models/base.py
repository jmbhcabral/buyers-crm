"""Base e mixins partilhados pelos modelos."""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column


def utcnow() -> datetime:
    """Devolve a data/hora atual em UTC (timezone-aware)."""
    return datetime.now(UTC)


class TimestampMixin:
    """Adiciona colunas de auditoria temporal a qualquer modelo."""

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )


class PKMixin:
    """Adiciona uma PK BigInteger autoincrement."""

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)