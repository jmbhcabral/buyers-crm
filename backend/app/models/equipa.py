"""Equipas de consultores (multi-consultor por cliente)."""

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.consultor import Consultor


class Equipa(Base, PKMixin, TimestampMixin):
    """Equipa de consultores.

    Um consultor pertence a no máximo uma equipa (garantido pela FK
    `consultores.equipa_id`). Um cliente pode ser gerido por uma equipa
    (`clientes.equipa_id`) ou ficar privado a um consultor (NULL).
    """

    __tablename__ = "equipas"

    nome: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )

    consultores: Mapped[list["Consultor"]] = relationship(back_populates="equipa")
    clientes: Mapped[list["Cliente"]] = relationship(back_populates="equipa")

    def __repr__(self) -> str:
        return f"<Equipa id={self.id} nome={self.nome!r}>"