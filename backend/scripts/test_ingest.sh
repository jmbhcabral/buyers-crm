#!/usr/bin/env bash
set -euo pipefail

API_KEY="bcr_DIGrCpPjGKpEVJkI0xerOFX8As3tPCDQEH-XH6kWi0U"

curl -s -X POST http://localhost:8000/api/imoveis/ingest \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON' | python3 -m json.tool
{
  "propertyId": 12345678,
  "adExternalReference": "REF-NOVO-1",
  "adCommercialName": "Imobiliária X",
  "titulo": "Moradia T3 em Sintra",
  "preco": "€ 450.000",
  "localizacao": ["Sintra", "Lisboa", "Portugal"],
  "descricao": "Moradia com jardim e piscina.",
  "url": "https://www.idealista.pt/imovel/12345678/",
  "anunciante": "Imobiliária X",
  "referenciaAnunciante": "REF-NOVO-1",
  "caracteristicas": [{"nome": "AREA", "valor": "200", "subtexto": "m²"}],
  "caracteristicasEspecificas": ["Ar condicionado", "Piscina"],
  "plantas": [],
  "videos": [],
  "toursVirtuais": [],
  "contagens": {"fotos": 2},
  "telefone": {"numero": "912345678"},
  "fotos": [
    {"id": 111, "posicao": 0, "url": "https://example.com/a.jpg", "tag": "fachada", "largura": 1200, "altura": 800},
    {"id": 222, "posicao": 1, "url": "https://example.com/b.jpg", "tag": "sala", "largura": 1200, "altura": 800}
  ],
  "extraidoEm": "2025-01-15T10:30:00Z"
}
JSON