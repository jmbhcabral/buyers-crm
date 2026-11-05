"""add imoveis_origem + property_id nullable

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-11-05

Adiciona a tabela `imoveis_origem` (1:N com `imoveis_canonicos`),
com backfill do Idealista a partir de `imoveis_canonicos.property_id`.

Alterações a `imoveis_canonicos`:
- `property_id` passa a NULLABLE (canónicos vindos de plataformas que
  não o Idealista não têm property_id). O índice único
  `ix_imoveis_canonicos_property_id` mantém-se tal como está — em
  PostgreSQL, um índice único aceita múltiplos NULL, portanto não é
  preciso recriá-lo.

Notas:
- O índice único em `property_id` foi criado como INDEX (não como
  CONSTRAINT) na migração inicial — daí o `op.drop_index` ser evitado.
  Confirmado com `\\d imoveis_canonicos`.
- O `downgrade` repõe NOT NULL. Se já existirem canónicos com
  `property_id IS NULL` (ingeridos de outras plataformas), o
  `SET NOT NULL` falha — aceitável, porque um downgrade depois de
  ingerir imóveis não-Idealista perde esses dados de qualquer forma.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Tabela imoveis_origem ---
    op.create_table(
        "imoveis_origem",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("imovel_canonico_id", sa.BigInteger(), nullable=False),
        sa.Column("fonte", sa.String(length=32), nullable=False),
        sa.Column("id_externo", sa.String(length=128), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=True),
        sa.Column("raw_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("extraido_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "fonte IN ('idealista','imovirtual','supercasa','properstar')",
            name="ck_imoveis_origem_fonte",
        ),
        sa.ForeignKeyConstraint(
            ["imovel_canonico_id"],
            ["imoveis_canonicos.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fonte", "id_externo", name="uq_imoveis_origem_fonte_id"),
    )
    op.create_index(
        "ix_imoveis_origem_imovel_canonico_id",
        "imoveis_origem",
        ["imovel_canonico_id"],
    )
    op.create_index("ix_imoveis_origem_fonte", "imoveis_origem", ["fonte"])

    # --- 2. Backfill: cada canónico existente ganha uma origem 'idealista' ---
    op.execute(
        """
        INSERT INTO imoveis_origem
            (imovel_canonico_id, fonte, id_externo, url, raw_json,
             extraido_em, criado_em, atualizado_em)
        SELECT
            id,
            'idealista',
            property_id,
            url,
            raw_json,
            extraido_em,
            NOW(),
            NOW()
        FROM imoveis_canonicos
        WHERE property_id IS NOT NULL
        """
    )

    # --- 3. property_id passa a NULLABLE ---
    # O índice único `ix_imoveis_canonicos_property_id` fica intacto:
    # em PostgreSQL, um índice UNIQUE aceita múltiplos NULL.
    op.alter_column(
        "imoveis_canonicos",
        "property_id",
        existing_type=sa.String(length=64),
        nullable=True,
    )


def downgrade() -> None:
    # 1. Repor NOT NULL (falha se existirem NULL — ver docstring).
    op.alter_column(
        "imoveis_canonicos",
        "property_id",
        existing_type=sa.String(length=64),
        nullable=False,
    )

    # 2. Apagar imoveis_origem.
    op.drop_index("ix_imoveis_origem_fonte", table_name="imoveis_origem")
    op.drop_index(
        "ix_imoveis_origem_imovel_canonico_id", table_name="imoveis_origem"
    )
    op.drop_table("imoveis_origem")