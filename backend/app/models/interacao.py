"""Interações e notas entre cliente e imóvel."""

from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.imovel_versao import ImovelVersao
    from app.models.user import User


class InteracaoImovel(Base, PKMixin, TimestampMixin):
    """Interesse / pedido de visita / pedido de info do cliente."""

    __tablename__ = "interacoes_imovel"
    __table_args__ = (
        Index(
            "uq_interesse_cliente_versao",
            "cliente_id",
            "imovel_versao_id",
            unique=True,
            postgresql_where=text("tipo = 'interesse'"),
        ),
        Index("ix_interacoes_versao_tipo", "imovel_versao_id", "tipo"),
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    imovel_versao_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    tipo: Mapped[str] = mapped_column(String(32), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(32), default="pendente", nullable=False,
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    lida_pelo_consultor: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )
    lida_pelo_cliente: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )

    cliente: Mapped["Cliente"] = relationship()
    imovel_versao: Mapped["ImovelVersao"] = relationship()


class NotaClienteImovel(Base, PKMixin, TimestampMixin):
    """Thread de notas cliente↔consultor (por imóvel ou geral)."""

    __tablename__ = "notas_cliente_imovel"
    __table_args__ = (
        Index("ix_notas_cliente_imovel_imovel", "cliente_id", "imovel_versao_id"),
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    imovel_versao_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    autor_tipo: Mapped[str] = mapped_column(String(16), nullable=False)
    autor_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    lida_pelo_destinatario: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )

    cliente: Mapped["Cliente"] = relationship()
    imovel_versao: Mapped["ImovelVersao | None"] = relationship()
    autor_user: Mapped["User | None"] = relationship()