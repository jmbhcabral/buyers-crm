"""Schemas de PDFs gerados."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PdfGeradoRead(BaseModel):
    """Metadados de um PDF gerado."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    imovel_versao_id: int
    cliente_id: int
    nome_ficheiro: str
    tamanho_bytes: int
    criado_em: datetime


class PdfGeradoComContexto(PdfGeradoRead):
    """PDF com contexto (imóvel + cliente) para listagem."""

    imovel_titulo: str | None = None
    imovel_property_id: str
    cliente_nome: str