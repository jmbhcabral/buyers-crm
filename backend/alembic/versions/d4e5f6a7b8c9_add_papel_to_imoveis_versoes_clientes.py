"""add papel to imoveis_versoes_clientes

Revision ID: d4e5f6a7b8c9
Revises: b8c4e2a1f9d3
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "b8c4e2a1f9d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "imoveis_versoes_clientes",
        sa.Column(
            "papel",
            sa.String(length=16),
            nullable=False,
            server_default="comprador",
        ),
    )
    op.create_index(
        "ix_imoveis_versoes_clientes_papel",
        "imoveis_versoes_clientes",
        ["papel"],
    )
    op.create_check_constraint(
        "ck_imoveis_versoes_clientes_papel",
        "imoveis_versoes_clientes",
        "papel IN ('comprador', 'vendedor')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_imoveis_versoes_clientes_papel",
        "imoveis_versoes_clientes",
        type_="check",
    )
    op.drop_index(
        "ix_imoveis_versoes_clientes_papel",
        table_name="imoveis_versoes_clientes",
    )
    op.drop_column("imoveis_versoes_clientes", "papel")