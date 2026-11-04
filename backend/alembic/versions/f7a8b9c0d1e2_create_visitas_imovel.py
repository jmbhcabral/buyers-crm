"""create visitas_imovel

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "visitas_imovel",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "imovel_versao_id",
            sa.BigInteger(),
            sa.ForeignKey("imoveis_versoes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("data_visita", sa.DateTime(timezone=True), nullable=False),
        # Internos (nunca saem para o endpoint público)
        sa.Column("visitante_nome", sa.String(255), nullable=False),
        sa.Column("visitante_contacto", sa.String(64), nullable=True),
        sa.Column("visitante_email", sa.String(255), nullable=True),
        sa.Column("consultor_representante", sa.String(255), nullable=True),
        sa.Column("notas_internas", sa.Text(), nullable=True),
        # Visíveis ao vendedor
        sa.Column(
            "visitante_origem",
            sa.String(32),
            nullable=False,
            server_default="particular",
        ),
        sa.Column("agencia_nome", sa.String(255), nullable=True),
        sa.Column("gostou", sa.Text(), nullable=True),
        sa.Column("nao_gostou", sa.Text(), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("rating_areas", sa.SmallInteger(), nullable=False),
        sa.Column("rating_acabamentos", sa.SmallInteger(), nullable=False),
        sa.Column("rating_localizacao", sa.SmallInteger(), nullable=False),
        sa.Column("rating_apresentacao", sa.SmallInteger(), nullable=False),
        sa.Column("rating_preco", sa.SmallInteger(), nullable=False),
        sa.Column("rating_global", sa.SmallInteger(), nullable=False),
        sa.Column("compraria", sa.Boolean(), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "visitante_origem IN ('agencia_externa', 'particular', "
            "'cliente_proprio', 'walk_in', 'outro')",
            name="ck_visitas_imovel_origem",
        ),
        sa.CheckConstraint(
            "rating_areas BETWEEN 1 AND 5 AND "
            "rating_acabamentos BETWEEN 1 AND 5 AND "
            "rating_localizacao BETWEEN 1 AND 5 AND "
            "rating_apresentacao BETWEEN 1 AND 5 AND "
            "rating_preco BETWEEN 1 AND 5 AND "
            "rating_global BETWEEN 1 AND 5",
            name="ck_visitas_imovel_ratings",
        ),
    )


def downgrade() -> None:
    op.drop_table("visitas_imovel")