"""Links partilháveis de seleções de imóveis para clientes."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.consultor import Consultor
    from app.models.imovel_versao import ImovelVersao


class LinkCliente(Base, PKMixin, TimestampMixin):
    """Link público que expõe uma seleção de imóveis a um cliente.

    Cada par (cliente, consultor) tem no máximo UM link.
    O token em claro só é mostrado uma vez, na criação.

    `consultor_apresentacao_id` define quem aparece no público. Default =
    dono do link (`consultor_id`). Alterável pela equipa do cliente.
    """

    __tablename__ = "links_cliente"
    __table_args__ = (
        UniqueConstraint(
            "cliente_id", "consultor_id",
            name="uq_link_cliente_consultor",
        ),
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    consultor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("consultores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    consultor_apresentacao_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("consultores.id", ondelete="SET NULL"),
        nullable=True,
    )

    token_hash: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True
    )
    token_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    token_visible: Mapped[str] = mapped_column(String(512), nullable=False)

    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expira_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revogado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ultimo_acesso_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relações — duas FKs para consultores exigem foreign_keys explícito.
    cliente: Mapped["Cliente"] = relationship()
    consultor: Mapped["Consultor"] = relationship(foreign_keys=[consultor_id])
    consultor_apresentacao: Mapped["Consultor | None"] = relationship(
        foreign_keys=[consultor_apresentacao_id],
    )
    imoveis: Mapped[list["LinkImovel"]] = relationship(
        back_populates="link",
        cascade="all, delete-orphan",
        order_by="LinkImovel.ordem",
    )
    acessos: Mapped[list["LinkAcesso"]] = relationship(
        back_populates="link",
        cascade="all, delete-orphan",
        order_by="LinkAcesso.criado_em.desc()",
    )


class LinkImovel(Base):
    """N:N entre um link e os imóveis (versões) que aparecem nele."""

    __tablename__ = "link_imoveis"

    link_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("links_cliente.id", ondelete="CASCADE"),
        primary_key=True,
    )
    imovel_versao_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    link: Mapped["LinkCliente"] = relationship(back_populates="imoveis")
    imovel_versao: Mapped["ImovelVersao"] = relationship()


class LinkAcesso(Base, PKMixin):
    """Registo de acesso ao link (analytics).

    Um evento por cada abertura (lista ou detalhe).
    `imovel_versao_id=NULL` significa que foi a lista.
    """

    __tablename__ = "link_acessos"

    link_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("links_cliente.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    imovel_versao_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_versoes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(512))
    referrer: Mapped[str | None] = mapped_column(String(512))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    link: Mapped["LinkCliente"] = relationship(back_populates="acessos")