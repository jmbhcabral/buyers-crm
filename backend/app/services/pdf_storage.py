"""Gestão de armazenamento de PDFs em disco."""

import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Cliente, Consultor, ImovelVersao, PdfGerado
from app.services.pdf import gerar_pdf

logger = logging.getLogger(__name__)


def _pasta_do_consultor(consultor_id: int) -> Path:
    pasta = Path(settings.storage_dir).parent / "pdfs" / str(consultor_id)
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def _nome_ficheiro(property_id: str, cliente_nome: str) -> str:
    """Gera um nome legível e seguro."""
    nome_seguro = "".join(
        c if c.isalnum() or c in " -_" else "_" for c in cliente_nome
    ).replace(" ", "_")[:40]
    return f"imovel_{property_id}_cliente_{nome_seguro}.pdf"


def gerar_e_guardar_pdf(
    db: Session,
    versao: ImovelVersao,
    cliente: Cliente,
) -> PdfGerado:
    """Gera o PDF, guarda em disco, e devolve o registo PdfGerado.

    Se já existir um PDF para esta versão+cliente, apaga-o e substitui.
    O dono do PDF é sempre o dono da versão (versao.consultor_id).
    """ 
    existente = db.scalar(
        select(PdfGerado).where(
            PdfGerado.imovel_versao_id == versao.id,
            PdfGerado.cliente_id == cliente.id,
        )
    )
    if existente is not None:
        caminho_antigo = Path(existente.caminho_local)
        if caminho_antigo.exists():
            try:
                caminho_antigo.unlink()
            except OSError as e:
                logger.warning("Não apaguei PDF antigo %s: %s", caminho_antigo, e)
        db.delete(existente)
        db.flush()

    # Carrega o canónico com fotos
    from sqlalchemy.orm import selectinload

    from app.models import Foto, ImovelCanonico

    canonico = db.scalar(
        select(ImovelCanonico)
        .options(selectinload(ImovelCanonico.fotos.and_(Foto.ativa.is_(True))))
        .where(ImovelCanonico.id == versao.imovel_canonico_id)
    )
    if canonico is None:
        raise ValueError("Canónico não encontrado")

    # Consultor dono da versão (com user carregado)
    from sqlalchemy.orm import selectinload

    consultor_dono = db.scalar(
        select(Consultor)
        .options(selectinload(Consultor.user))
        .where(Consultor.id == versao.consultor_id)
    )
    if consultor_dono is None:
        raise ValueError("Consultor não encontrado")

    # Gera o PDF
    pdf_bytes = gerar_pdf(
        versao=versao,
        canonico=canonico,
        fotos=list(canonico.fotos),
        cliente=cliente,
        consultor=consultor_dono,
    )

    # Guarda em disco
    pasta = _pasta_do_consultor(versao.consultor_id)
    nome = _nome_ficheiro(canonico.property_id, cliente.nome)
    caminho = pasta / nome
    caminho.write_bytes(pdf_bytes)

    # Registo na BD
    pdf_gerado = PdfGerado(
        imovel_versao_id=versao.id,
        cliente_id=cliente.id,
        consultor_id=versao.consultor_id,
        nome_ficheiro=nome,
        caminho_local=str(caminho),
        tamanho_bytes=len(pdf_bytes),
    )
    db.add(pdf_gerado)
    db.commit()
    db.refresh(pdf_gerado)

    logger.info(
        "[pdf] Gerado %s (%d bytes) para versão %s cliente %s",
        nome, len(pdf_bytes), versao.id, cliente.id,
    )
    return pdf_gerado