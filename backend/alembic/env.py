"""Configuração do Alembic — corre em runtime, não é um script estático."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.database import Base

# Importar o pacote de modelos força o registo de todas as tabelas
# no Base.metadata (é isto que o autogenerate usa como referência).
import app.models  # noqa: F401

# Config do Alembic (lê o alembic.ini)
config = context.config

# Injeta a URL a partir das settings
config.set_main_option("sqlalchemy.url", settings.database_url)

# Configura logging a partir do alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata alvo para autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo 'offline': gera SQL sem ligar à BD.

    Útil para revisão de migrações em produção.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo 'online': liga à BD e aplica migrações."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,             # deteta mudanças de tipo de coluna
            compare_server_default=True,   # deteta mudanças de defaults
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()