"""Configuração do SQLAlchemy 2.0 e da sessão da base de dados."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Base declarativa para todos os modelos ORM."""

    pass


# Engine principal (síncrono, psycopg3)
engine = create_engine(
    settings.database_url,
    echo=settings.is_dev,          # log SQL em dev
    pool_pre_ping=True,             # valida ligações antes de usar
    pool_size=5,
    max_overflow=10,
    future=True,
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,         # objetos continuam usáveis após commit
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Dependência FastAPI: fornece uma sessão e garante o close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()