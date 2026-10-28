"""PDFs gerados por consultores para clientes."""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.consultor import Consultor
    from app.models.imovel_versao import ImovelVersao


class PdfGerado(Base, PKMixin, TimestampMixin):
    """PDF gerado para uma versão de imóvel + cliente específico.

    Fica em disco e é referenciado na BD. Um PDF pertence sempre
    ao consultor que o gerou (dono da versão).
    """

    __tablename__ = "pdfs_gerados"

    imovel_versao_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
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

    nome_ficheiro: Mapped[str] = mapped_column(String(255), nullable=False)
    caminho_local: Mapped[str] = mapped_column(String(512), nullable=False)
    tamanho_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relações
    imovel_versao: Mapped["ImovelVersao"] = relationship()
    cliente: Mapped["Cliente"] = relationship()
    consultor: Mapped["Consultor"] = relationship()

    def __repr__(self) -> str:
        return (
            f"<PdfGerado id={self.id} versao_id={self.imovel_versao_id} "
            f"cliente_id={self.cliente_id}>"
        )