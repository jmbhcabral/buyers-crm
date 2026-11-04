"""add equipas + consultor_apresentacao em links + criador da associação

Revision ID: g1h2i3j4k5l6
Revises: f7a8b9c0d1e2
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa

revision = "g1h2i3j4k5l6"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) equipas — criado_em/atualizado_em sem server_default (TimestampMixin)
    op.create_table(
        "equipas",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome", name="uq_equipas_nome"),
    )
    op.create_index("ix_equipas_nome", "equipas", ["nome"], unique=False)

    # 2) consultores.equipa_id
    op.add_column("consultores", sa.Column("equipa_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_consultores_equipa_id", "consultores", "equipas",
        ["equipa_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_consultores_equipa_id", "consultores", ["equipa_id"], unique=False)

    # 3) clientes.equipa_id
    op.add_column("clientes", sa.Column("equipa_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_clientes_equipa_id", "clientes", "equipas",
        ["equipa_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_clientes_equipa_id", "clientes", ["equipa_id"], unique=False)

    # 4) imoveis_versoes_clientes.criado_por_consultor_id
    op.add_column(
        "imoveis_versoes_clientes",
        sa.Column("criado_por_consultor_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_ivc_criado_por", "imoveis_versoes_clientes", "consultores",
        ["criado_por_consultor_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index(
        "ix_ivc_criado_por",
        "imoveis_versoes_clientes", ["criado_por_consultor_id"], unique=False,
    )
    # Backfill: dono da versão na altura da migração (comportamento legacy)
    op.execute(
        """
        UPDATE imoveis_versoes_clientes ivc
        SET criado_por_consultor_id = iv.consultor_id
        FROM imoveis_versoes iv
        WHERE iv.id = ivc.imovel_versao_id
        """
    )

    # 5) links_cliente.consultor_apresentacao_id (default = dono do link)
    op.add_column(
        "links_cliente",
        sa.Column("consultor_apresentacao_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_links_consultor_apresentacao", "links_cliente", "consultores",
        ["consultor_apresentacao_id"], ["id"], ondelete="SET NULL",
    )
    op.execute("UPDATE links_cliente SET consultor_apresentacao_id = consultor_id")


def downgrade() -> None:
    op.drop_constraint("fk_links_consultor_apresentacao", "links_cliente", type_="foreignkey")
    op.drop_column("links_cliente", "consultor_apresentacao_id")

    op.drop_index("ix_ivc_criado_por", "imoveis_versoes_clientes")
    op.drop_constraint("fk_ivc_criado_por", "imoveis_versoes_clientes", type_="foreignkey")
    op.drop_column("imoveis_versoes_clientes", "criado_por_consultor_id")

    op.drop_index("ix_clientes_equipa_id", "clientes")
    op.drop_constraint("fk_clientes_equipa_id", "clientes", type_="foreignkey")
    op.drop_column("clientes", "equipa_id")

    op.drop_index("ix_consultores_equipa_id", "consultores")
    op.drop_constraint("fk_consultores_equipa_id", "consultores", type_="foreignkey")
    op.drop_column("consultores", "equipa_id")

    op.drop_index("ix_equipas_nome", "equipas")
    op.drop_table("equipas")