"""Ponto de entrada da aplicação FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware import PrivateNetworkAccessMiddleware

from app.config import settings
from app.routers import (
    admin,
    admin_consultores,
    api_keys,
    auth,
    me,
    clientes,
    consultores,
    dashboard,
    equipas,
    interacoes,
    links,
    imoveis,
    pdfs,
    public,
    qualificacao_comprador,
    visitas,
)
from app.routers.public import router_consultores

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
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://www.idealista.pt",
            "https://idealista.pt",
            "https://crm.chanilaicastro.pt",
            "https://imoveis.chanilaicastro.pt",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

app.add_middleware(PrivateNetworkAccessMiddleware)


# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(consultores.router, prefix="/api")
app.include_router(pdfs.router, prefix="/api")
app.include_router(imoveis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(admin_consultores.router, prefix="/api")
app.include_router(equipas.router, prefix="/api")
app.include_router(links.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(router_consultores, prefix="/api")
app.include_router(interacoes.router, prefix="/api")
app.include_router(qualificacao_comprador.router, prefix="/api")
app.include_router(visitas.router, prefix="/api")


@app.get("/health", tags=["sistema"])
def health() -> dict[str, str]:
    """Confirma que o backend está vivo."""
    return {"status": "ok", "env": settings.env}