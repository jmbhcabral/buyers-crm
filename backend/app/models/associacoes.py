"""Tabelas de associação N:N."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.consultor import Consultor


class ClienteConsultor(Base):
    """N:N entre clientes e consultores."""

    __tablename__ = "cliente_consultor"

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("clientes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    consultor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("consultores.id", ondelete="CASCADE"),
        primary_key=True,
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )


class ImovelVersaoCliente(Base):
    """N:N entre versões de imóvel e clientes.

    `papel` distingue dois tipos de associação:
    - `comprador`: imóvel sugerido ao cliente (entra na lista pública de comprador).
    - `vendedor`:  imóvel que o cliente está a vender (angariação; origina o
                    separador "Meus Imóveis" no link público e habilita fichas
                    de visita para esse imóvel).

    A PK é (imovel_versao_id, cliente_id). Consequência: o mesmo par
    cliente↔versão só pode ter UM papel.

    `criado_por_consultor_id` regista quem criou a associação — só ele
    (ou admin) a pode desassociar. É NULL nas linhas anteriores à migração
    `g1h2i3j4k5l6`; nesse caso a regra recai no dono da versão.
    """

    __tablename__ = "imoveis_versoes_clientes"

    imovel_versao_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("clientes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    papel: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="comprador",
        server_default="comprador",
        index=True,
    )
    criado_por_consultor_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("consultores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    # Relações
    criado_por: Mapped["Consultor | None"] = relationship(
        foreign_keys=[criado_por_consultor_id],
    )

    __table_args__ = (
        CheckConstraint(
            "papel IN ('comprador', 'vendedor')",
            name="ck_imoveis_versoes_clientes_papel",
        ),
    )