"""add papeis do cliente (comprador/vendedor) + qualificacoes_comprador

Revision ID: b8c4e2a1f9d3
Revises: f3a1b2c4d5e6
Create Date: 2026-11-02 12:00:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "b8c4e2a1f9d3"
down_revision: str | None = "f3a1b2c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── 1) Papéis no cliente ─────────────────────────────────────
    op.add_column(
        "clientes",
        sa.Column(
            "e_comprador",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "clientes",
        sa.Column(
            "e_vendedor",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Remove os server_default após o backfill implícito
    op.alter_column("clientes", "e_comprador", server_default=None)
    op.alter_column("clientes", "e_vendedor", server_default=None)
    op.create_check_constraint(
        "ck_clientes_pelo_menos_um_papel",
        "clientes",
        "e_comprador OR e_vendedor",
    )

    # ── 2) qualificacoes_comprador ──────────────────────────────
    op.create_table(
        "qualificacoes_comprador",
        # FKs
        sa.Column("cliente_id", sa.BigInteger(), nullable=False),
        sa.Column("consultor_id", sa.BigInteger(), nullable=False),
        # Estado
        sa.Column(
            "estado",
            sa.String(length=20),
            nullable=False,
            server_default="nao_iniciada",
        ),
        # Bloco 1 — Disponibilidade
        sa.Column("compra_sozinho", sa.Boolean(), nullable=True),
        sa.Column("disp_notas", sa.Text(), nullable=True),
        sa.Column("disp_alternativas", sa.Text(), nullable=True),
        # Bloco 2 — Perfil / Motivação
        sa.Column("motivo_compra", sa.Text(), nullable=True),
        sa.Column("tempo_procura", sa.Text(), nullable=True),
        sa.Column("urgencia", sa.String(length=20), nullable=True),
        sa.Column("quando_resolver", sa.Text(), nullable=True),
        sa.Column("tem_imovel_venda", sa.Boolean(), nullable=True),
        sa.Column("precisa_vender_comprar", sa.Boolean(), nullable=True),
        # Bloco 3 — Imóvel pretendido
        sa.Column("caracteristicas", sa.Text(), nullable=True),
        sa.Column("nao_prescinde", sa.Text(), nullable=True),
        sa.Column("valor_maximo", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("zonas_pretendidas", sa.Text(), nullable=True),
        sa.Column("motivo_zonas", sa.Text(), nullable=True),
        sa.Column("quartos", sa.Integer(), nullable=True),
        sa.Column("tipologia", sa.String(length=20), nullable=True),
        sa.Column("estado_desejado", sa.String(length=20), nullable=True),
        sa.Column("preferencia_andar", sa.String(length=50), nullable=True),
        sa.Column("elevador", sa.Boolean(), nullable=True),
        sa.Column("parqueamento", sa.String(length=50), nullable=True),
        sa.Column("arrecadacao", sa.Boolean(), nullable=True),
        sa.Column("exteriores", sa.Text(), nullable=True),
        sa.Column("acessos", sa.Text(), nullable=True),
        sa.Column("transportes", sa.Text(), nullable=True),
        sa.Column("comercio_jardins", sa.Text(), nullable=True),
        sa.Column("areas_especificas", sa.Text(), nullable=True),
        sa.Column("notas_extra", sa.Text(), nullable=True),
        # Bloco 4 — Financeira
        sa.Column("compra_pp", sa.Boolean(), nullable=True),
        sa.Column("financiamento_100", sa.Boolean(), nullable=True),
        sa.Column("falou_banco", sa.Boolean(), nullable=True),
        sa.Column("banco", sa.String(length=100), nullable=True),
        sa.Column("capitais_proprios", sa.Boolean(), nullable=True),
        sa.Column(
            "capitais_proprios_valor",
            sa.Numeric(precision=14, scale=2),
            nullable=True,
        ),
        sa.Column("efetivo", sa.Boolean(), nullable=True),
        sa.Column("fiadores", sa.Boolean(), nullable=True),
        sa.Column("reuniao_loja", sa.Boolean(), nullable=True),
        # PKMixin + TimestampMixin (mesma ordem do f3a1b2c4d5e6)
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        # Constraints
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["consultor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "estado IN ('nao_iniciada','em_preenchimento','concluida')",
            name="ck_qualificacoes_estado",
        ),
        sa.CheckConstraint(
            "urgencia IS NULL OR urgencia IN ('baixa','media','alta')",
            name="ck_qualificacoes_urgencia",
        ),
        sa.CheckConstraint(
            "estado_desejado IS NULL OR estado_desejado IN "
            "('novo','semi_novo','remodelado','obras','indiferente')",
            name="ck_qualificacoes_estado_desejado",
        ),
    )
    op.create_index(
        op.f("ix_qualificacoes_comprador_cliente_id"),
        "qualificacoes_comprador",
        ["cliente_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_qualificacoes_comprador_consultor_id"),
        "qualificacoes_comprador",
        ["consultor_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_qualificacoes_comprador_consultor_id"),
        table_name="qualificacoes_comprador",
    )
    op.drop_index(
        op.f("ix_qualificacoes_comprador_cliente_id"),
        table_name="qualificacoes_comprador",
    )
    op.drop_table("qualificacoes_comprador")
    op.drop_constraint(
        "ck_clientes_pelo_menos_um_papel", "clientes", type_="check"
    )
    op.drop_column("clientes", "e_vendedor")
    op.drop_column("clientes", "e_comprador")