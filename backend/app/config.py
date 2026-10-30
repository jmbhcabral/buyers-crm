"""Configuração central da aplicação.

Carrega variáveis de ambiente do ficheiro .env (via Pydantic Settings).
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings da aplicação, validadas no arranque."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Ambiente ---
    env: str = Field(default="dev", description="dev | staging | prod")
    log_level: str = Field(default="INFO")

    # --- Database ---
    database_url: str = Field(
        ...,
        description="URL completa do SQLAlchemy. Ex: postgresql+psycopg://user:pass@host:5432/db",
    )

    # --- JWT ---
    jwt_secret: str = Field(..., min_length=16)
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    refresh_token_expire_days: int = Field(default=7)

    # --- Storage ---
    storage_dir: Path = Field(default=Path("/app/storage/fotos"))

    # --- Downloads ---
    idealista_download_concurrency: int = Field(default=4, ge=1, le=16)

    # --- Links públicos ---
    public_base_url: str = Field(default="https://imoveis.chanilaicastro.pt")

    @property
    def is_dev(self) -> bool:
        return self.env.lower() in {"dev", "development", "local"}

    @property
    def is_prod(self) -> bool:
        return self.env.lower() in {"prod", "production"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Devolve uma instância única (cacheada) das settings."""
    return Settings()


settings = get_settings()