"""Importa todos os modelos para que o Alembic e o SQLAlchemy os descubram."""

from app.models.api_key import ApiKey
from app.models.associacoes import ClienteConsultor, ImovelVersaoCliente
from app.models.cliente import Cliente
from app.models.consultor import Consultor
from app.models.imovel_canonico import Foto, ImovelCanonico, ImovelCanonicoHistorico
from app.models.imovel_versao import ImovelVersao
from app.models.user import User

__all__ = [
    "ApiKey",
    "Cliente",
    "ClienteConsultor",
    "Consultor",
    "Foto",
    "ImovelCanonico",
    "ImovelCanonicoHistorico",
    "ImovelVersao",
    "ImovelVersaoCliente",
    "User",
]