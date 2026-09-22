"""Ponto de entrada da aplicação FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="Buyers CRM API",
    description="Captação de imóveis do Idealista, gestão de clientes e geração de PDF.",
    version="0.1.0",
    docs_url="/docs" if settings.is_dev else None,   # docs só em dev
    redoc_url="/redoc" if settings.is_dev else None,
)

# CORS — em dev, aceitamos tudo (o frontend React vai estar noutra porta).
# Em produção, restringimos à origem do frontend.
if settings.is_dev:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["sistema"])
def health() -> dict[str, str]:
    """Confirma que o backend está vivo."""
    return {"status": "ok", "env": settings.env}