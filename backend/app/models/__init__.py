"""Importa todos os modelos para que o Alembic e o SQLAlchemy os descubram."""

from app.models.api_key import ApiKey
from app.models.associacoes import ClienteConsultor, ImovelVersaoCliente
from app.models.cliente import Cliente
from app.models.consultor import Consultor
from app.models.equipa import Equipa
from app.models.imovel_canonico import Foto, ImovelCanonico, ImovelCanonicoHistorico
from app.models.imovel_versao import ImovelVersao
from app.models.interacao import InteracaoImovel, NotaClienteImovel
from app.models.link_cliente import LinkAcesso, LinkCliente, LinkImovel
from app.models.pdf_gerado import PdfGerado
from app.models.qualificacao_comprador import QualificacaoComprador
from app.models.user import User
from app.models.visita_imovel import VisitaImovel
from app.models.imovel_origem import ImovelOrigem

__all__ = [
    "ApiKey",
    "Cliente",
    "ClienteConsultor",
    "Consultor",
    "Equipa",
    "Foto",
    "ImovelCanonico",
    "ImovelCanonicoHistorico",
    "ImovelVersao",
    "ImovelVersaoCliente",
    "InteracaoImovel",
    "NotaClienteImovel",
    "LinkAcesso",
    "LinkCliente",
    "LinkImovel",
    "PdfGerado",
    "QualificacaoComprador",
    "User",
    "VisitaImovel",
    "ImovelOrigem"
]