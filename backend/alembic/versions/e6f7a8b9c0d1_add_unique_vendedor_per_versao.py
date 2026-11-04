"""add unique vendedor per imovel_versao

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e6f7a8b9c0d1"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Um imóvel (versão) só pode ter um vendedor associado.
    op.create_index(
        "uq_imoveis_versoes_clientes_vendedor",
        "imoveis_versoes_clientes",
        ["imovel_versao_id"],
        unique=True,
        postgresql_where=sa.text("papel = 'vendedor'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_imoveis_versoes_clientes_vendedor",
        table_name="imoveis_versoes_clientes",
    )