"""Ponto de entrada da aplicação FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware import PrivateNetworkAccessMiddleware

from app.config import settings
from app.routers import api_keys, auth, me, clientes, consultores, imoveis, pdfs

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

# PNA depois (Starlette aplica por ordem inversa — este é o exterior)
app.add_middleware(PrivateNetworkAccessMiddleware)


# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(consultores.router, prefix="/api")
app.include_router(pdfs.router, prefix="/api")
app.include_router(imoveis.router, prefix="/api")


@app.get("/health", tags=["sistema"])
def health() -> dict[str, str]:
    """Confirma que o backend está vivo."""
    return {"status": "ok", "env": settings.env}