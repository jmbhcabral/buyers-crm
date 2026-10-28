from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession, get_optional_consultor
from app.models import Cliente, ClienteConsultor, Consultor, ImovelCanonico, ImovelVersao, PdfGerado
from app.schemas.pdf import PdfGeradoComContexto, PdfGeradoRead
from app.services.pdf_storage import gerar_e_guardar_pdf

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

ConsultorOpcional = Annotated[Consultor | None, Depends(get_optional_consultor)]


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[PdfGeradoComContexto])
def listar_pdfs(
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
    q: str | None = Query(default=None, description="Pesquisa por nome/título"),
    imovel_id: int | None = Query(default=None, description="Filtrar por imóvel"),
    cliente_id: int | None = Query(default=None, description="Filtrar por cliente"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[PdfGeradoComContexto]:
    """Lista PDFs acessíveis ao utilizador autenticado."""
    stmt = (
        select(PdfGerado, ImovelVersao, ImovelCanonico, Cliente)
        .join(ImovelVersao, ImovelVersao.id == PdfGerado.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .join(Cliente, Cliente.id == PdfGerado.cliente_id)
    )

    if not user.is_admin:
        if consultor is None:
            return []
        stmt = stmt.where(PdfGerado.consultor_id == consultor.id)

    if imovel_id:
        stmt = stmt.where(PdfGerado.imovel_versao_id == imovel_id)
    if cliente_id:
        stmt = stmt.where(PdfGerado.cliente_id == cliente_id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(ImovelCanonico.titulo).like(like)
            | func.lower(Cliente.nome).like(like)
        )

    stmt = stmt.order_by(PdfGerado.criado_em.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).all()

    return [
        PdfGeradoComContexto(
            id=p.id,
            imovel_versao_id=p.imovel_versao_id,
            cliente_id=p.cliente_id,
            nome_ficheiro=p.nome_ficheiro,
            tamanho_bytes=p.tamanho_bytes,
            criado_em=p.criado_em,
            imovel_titulo=c.titulo,
            imovel_property_id=c.property_id,
            cliente_nome=cl.nome,
        )
        for p, v, c, cl in rows
    ]


# ---------------------------------------------------------------------------
# Descarregar
# ---------------------------------------------------------------------------
@router.get("/{pdf_id}")
def descarregar_pdf(
    pdf_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> FileResponse:
    """Serve o ficheiro PDF (com validação de acesso)."""
    pdf = db.get(PdfGerado, pdf_id)
    if pdf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF não encontrado")

    if not user.is_admin:
        if consultor is None or pdf.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF não encontrado")

    caminho = Path(pdf.caminho_local)
    if not caminho.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficheiro não encontrado")

    return FileResponse(
        caminho,
        media_type="application/pdf",
        filename=pdf.nome_ficheiro,
    )


# ---------------------------------------------------------------------------
# Apagar
# ---------------------------------------------------------------------------
@router.delete("/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_pdf(
    pdf_id: int,
    db: DbSession,
    user: CurrentUser,
    consultor: ConsultorOpcional,
) -> None:
    """Apaga o PDF (registo + ficheiro)."""
    pdf = db.get(PdfGerado, pdf_id)
    if pdf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF não encontrado")

    if not user.is_admin:
        if consultor is None or pdf.consultor_id != consultor.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF não encontrado")

    caminho = Path(pdf.caminho_local)
    if caminho.exists():
        try:
            caminho.unlink()
        except OSError:
            pass

    db.delete(pdf)
    db.commit()