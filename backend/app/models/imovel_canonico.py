"""Imóvel canónico (snapshot do Idealista) + histórico de captações + fotos."""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.imovel_versao import ImovelVersao


class ImovelCanonico(Base, PKMixin, TimestampMixin):
    """Snapshot canónico do imóvel, vindo do Idealista.

    Este registo é PARTILHADO por todos os consultores.
    Ninguém o edita diretamente — só se atualiza via ingest.
    """

    __tablename__ = "imoveis_canonicos"

    property_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    # Campos principais (extraídos no ingest)
    titulo: Mapped[str | None] = mapped_column(String(512))
    preco: Mapped[str | None] = mapped_column(String(64))
    localizacao: Mapped[list[Any] | None] = mapped_column(JSONB)
    descricao: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(1024))
    ad_external_reference: Mapped[str | None] = mapped_column(String(120))
    ad_commercial_name: Mapped[str | None] = mapped_column(String(255))
    ad_professional_name: Mapped[str | None] = mapped_column(String(255))
    anunciante: Mapped[str | None] = mapped_column(String(255))
    referencia_anunciante: Mapped[str | None] = mapped_column(String(120))

    # Estruturas complexas
    caracteristicas: Mapped[list[Any] | None] = mapped_column(JSONB)
    caracteristicas_especificas: Mapped[list[Any] | None] = mapped_column(JSONB)
    plantas: Mapped[list[Any] | None] = mapped_column(JSONB)
    videos: Mapped[list[Any] | None] = mapped_column(JSONB)
    tours_virtuais: Mapped[list[Any] | None] = mapped_column(JSONB)
    contagens: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    telefone: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    # Guarda o JSON original inteiro (backup/auditoria)
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    extraido_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relações
    fotos: Mapped[list["Foto"]] = relationship(
        back_populates="imovel_canonico",
        cascade="all, delete-orphan",
        order_by="Foto.ordem",
    )
    historico: Mapped[list["ImovelCanonicoHistorico"]] = relationship(
        back_populates="imovel_canonico",
        cascade="all, delete-orphan",
        order_by="ImovelCanonicoHistorico.capturado_em.desc()",
    )
    versoes: Mapped[list["ImovelVersao"]] = relationship(
        back_populates="canonico",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ImovelCanonico id={self.id} property_id={self.property_id!r}>"


class ImovelCanonicoHistorico(Base, PKMixin):
    """Histórico de cada captação do Idealista para um canónico."""

    __tablename__ = "imoveis_canonicos_historico"

    imovel_canonico_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_canonicos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    capturado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    imovel_canonico: Mapped["ImovelCanonico"] = relationship(back_populates="historico")

    def __repr__(self) -> str:
        return f"<ImovelCanonicoHistorico id={self.id} canónico_id={self.imovel_canonico_id}>"


class Foto(Base, PKMixin, TimestampMixin):
    """Fotos do imóvel canónico (ficheiros descarregados pelo backend).

    Suporta soft delete: quando o Idealista remove uma foto, marcamos
    `ativa=False` em vez de apagar, para preservar histórico.
    """

    __tablename__ = "fotos"

    imovel_canonico_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_canonicos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ID da foto no Idealista (multimediaId) — chave natural para dedup
    idealista_id: Mapped[int | None] = mapped_column(BigInteger, index=True)

    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    url_original: Mapped[str | None] = mapped_column(String(1024))
    url_webp: Mapped[str | None] = mapped_column(String(1024))
    caminho_local: Mapped[str | None] = mapped_column(String(512))
    largura: Mapped[int | None] = mapped_column(Integer)
    altura: Mapped[int | None] = mapped_column(Integer)
    tag: Mapped[str | None] = mapped_column(String(64))
    titulo: Mapped[str | None] = mapped_column(String(255))

    # Soft delete
    ativa: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False, index=True)

    imovel_canonico: Mapped["ImovelCanonico"] = relationship(back_populates="fotos")

    def __repr__(self) -> str:
        return (
            f"<Foto id={self.id} idealista_id={self.idealista_id} "
            f"ordem={self.ordem} ativa={self.ativa}>"
        )