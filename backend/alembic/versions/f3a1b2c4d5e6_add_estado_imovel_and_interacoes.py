"""add estado_imovel and interacoes_imovel/notas_cliente_imovel

Revision ID: f3a1b2c4d5e6
Revises: 10151798770d
Create Date: 2026-11-01 15:30:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f3a1b2c4d5e6"
down_revision: str | None = "10151798770d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. imoveis_versoes.estado_imovel
    op.add_column(
        "imoveis_versoes",
        sa.Column(
            "estado_imovel",
            sa.String(length=32),
            nullable=False,
            server_default="disponivel",
        ),
    )
    op.create_index(
        op.f("ix_imoveis_versoes_estado_imovel"),
        "imoveis_versoes",
        ["estado_imovel"],
        unique=False,
    )

    # 2. interacoes_imovel
    op.create_table(
        "interacoes_imovel",
        sa.Column("cliente_id", sa.BigInteger(), nullable=False),
        sa.Column("imovel_versao_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo", sa.String(length=32), nullable=False),
        sa.Column(
            "estado", sa.String(length=32), nullable=False,
            server_default="pendente",
        ),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "lida_pelo_consultor", sa.Boolean(), nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "lida_pelo_cliente", sa.Boolean(), nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["imovel_versao_id"], ["imoveis_versoes.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_interacoes_imovel_cliente_id"),
        "interacoes_imovel", ["cliente_id"],
    )
    op.create_index(
        op.f("ix_interacoes_imovel_imovel_versao_id"),
        "interacoes_imovel", ["imovel_versao_id"],
    )
    op.create_index(
        "uq_interesse_cliente_versao",
        "interacoes_imovel",
        ["cliente_id", "imovel_versao_id"],
        unique=True,
        postgresql_where=sa.text("tipo = 'interesse'"),
    )
    op.create_index(
        "ix_interacoes_versao_tipo",
        "interacoes_imovel", ["imovel_versao_id", "tipo"],
    )

    # 3. notas_cliente_imovel
    op.create_table(
        "notas_cliente_imovel",
        sa.Column("cliente_id", sa.BigInteger(), nullable=False),
        sa.Column("imovel_versao_id", sa.BigInteger(), nullable=True),
        sa.Column("autor_tipo", sa.String(length=16), nullable=False),
        sa.Column("autor_user_id", sa.BigInteger(), nullable=True),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.Column(
            "lida_pelo_destinatario", sa.Boolean(), nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["imovel_versao_id"], ["imoveis_versoes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["autor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_notas_cliente_imovel_cliente_id"),
        "notas_cliente_imovel", ["cliente_id"],
    )
    op.create_index(
        op.f("ix_notas_cliente_imovel_imovel_versao_id"),
        "notas_cliente_imovel", ["imovel_versao_id"],
    )
    op.create_index(
        "ix_notas_cliente_imovel_imovel",
        "notas_cliente_imovel", ["cliente_id", "imovel_versao_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_notas_cliente_imovel_imovel", table_name="notas_cliente_imovel")
    op.drop_index(op.f("ix_notas_cliente_imovel_imovel_versao_id"), table_name="notas_cliente_imovel")
    op.drop_index(op.f("ix_notas_cliente_imovel_cliente_id"), table_name="notas_cliente_imovel")
    op.drop_table("notas_cliente_imovel")

    op.drop_index("ix_interacoes_versao_tipo", table_name="interacoes_imovel")
    op.drop_index(
        "uq_interesse_cliente_versao",
        table_name="interacoes_imovel",
        postgresql_where=sa.text("tipo = 'interesse'"),
    )
    op.drop_index(op.f("ix_interacoes_imovel_imovel_versao_id"), table_name="interacoes_imovel")
    op.drop_index(op.f("ix_interacoes_imovel_cliente_id"), table_name="interacoes_imovel")
    op.drop_table("interacoes_imovel")

    op.drop_index(op.f("ix_imoveis_versoes_estado_imovel"), table_name="imoveis_versoes")
    op.drop_column("imoveis_versoes", "estado_imovel")