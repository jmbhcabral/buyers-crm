"""Ponto de entrada da aplicação FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, me, clientes

app = FastAPI(
    title="Buyers CRM API",
    description="Captação de imóveis do Idealista, gestão de clientes e geração de PDF.",
    version="0.1.0",
    docs_url="/docs" if settings.is_dev else None,
    redoc_url="/redoc" if settings.is_dev else None,
)

if settings.is_dev:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",     # aceita qualquer origem em dev
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")


@app.get("/health", tags=["sistema"])
def health() -> dict[str, str]:
    """Confirma que o backend está vivo."""
    return {"status": "ok", "env": settings.env}