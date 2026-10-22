"""Serviço de geração de PDF de imóvel (formato mobile 390×844)."""

import io
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Cliente, Consultor, Foto, ImovelCanonico, ImovelVersao

# Dimensões estilo ecrã de telemóvel
LARGURA_MOBILE = 390
ALTURA_MOBILE = 844
TAMANHO_ECRA = (LARGURA_MOBILE, ALTURA_MOBILE)

MARGIN = 12
LARGURA_UTIL = LARGURA_MOBILE - (MARGIN * 2)

COR_PRINCIPAL = colors.HexColor("#0F2C59")
COR_TEXTO = colors.HexColor("#1F2937")
COR_MUTED = colors.HexColor("#6B7280")
COR_FUNDO = colors.HexColor("#F8FAFC")
COR_LINHA = colors.HexColor("#E2E8F0")


def _redimensionar_imagem(caminho: str, largura_max: float, altura_max: float) -> RLImage | None:
    """Redimensiona uma imagem mantendo o rácio, para caber numa caixa."""
    try:
        pil_img = PILImage.open(caminho)
        w, h = pil_img.size
        fator = min(largura_max / w, altura_max / h)
        return RLImage(caminho, width=w * fator, height=h * fator)
    except Exception as e:
        print(f"[pdf] Erro ao processar imagem {caminho}: {e}")
        return None


def _construir_estilos() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "titulo": ParagraphStyle(
            "MainTitle", fontName="Helvetica-Bold", fontSize=18, leading=22,
            textColor=COR_PRINCIPAL, spaceAfter=4,
        ),
        "local": ParagraphStyle(
            "Loc", fontName="Helvetica", fontSize=11, leading=14,
            textColor=COR_MUTED, spaceAfter=8,
        ),
        "preco": ParagraphStyle(
            "Price", fontName="Helvetica-Bold", fontSize=22, leading=25,
            textColor=colors.white, alignment=TA_CENTER,
        ),
        "cliente": ParagraphStyle(
            "Cliente", fontName="Helvetica-Bold", fontSize=13, leading=16,
            textColor=colors.white, alignment=TA_CENTER,
        ),
        "seccao": ParagraphStyle(
            "SecTitle", fontName="Helvetica-Bold", fontSize=13.5, leading=16,
            textColor=COR_PRINCIPAL, spaceBefore=10, spaceAfter=4,
        ),
        "corpo": ParagraphStyle(
            "BodyDark", fontName="Helvetica", fontSize=10.5, leading=14.5,
            textColor=COR_TEXTO, alignment=TA_JUSTIFY, spaceAfter=5,
        ),
        "topico": ParagraphStyle(
            "FeatureItem", fontName="Helvetica", fontSize=10, leading=13,
            textColor=COR_TEXTO,
        ),
        "spec_val": ParagraphStyle(
            "SpecVal", fontName="Helvetica-Bold", fontSize=11.5, leading=13,
            textColor=COR_PRINCIPAL, alignment=TA_CENTER,
        ),
        "spec_lbl": ParagraphStyle(
            "SpecLbl", fontName="Helvetica", fontSize=9, leading=11,
            textColor=COR_MUTED, alignment=TA_CENTER,
        ),
        "galeria_header": ParagraphStyle(
            "FotoHeader", parent=styles["Normal"], fontSize=10,
            textColor=COR_MUTED, alignment=TA_CENTER,
        ),
    }


def _seccao_contacto(cliente: Cliente, consultor: Consultor) -> Table:
    """Bloco de contacto com nome do cliente e do consultor."""
    styles = _construir_estilos()

    p_c1 = Paragraph(
        "<b>Gostaria de conhecer este imóvel?</b>",
        ParagraphStyle(
            "C1", parent=styles["cliente"], fontSize=10.5,
            textColor=COR_PRINCIPAL, alignment=TA_CENTER,
        ),
    )

    nome_consultor = consultor.user.nome if consultor.user else "Consultor"
    telefone = consultor.telefone or "—"

    p_c2 = Paragraph(
        f"<b>{nome_consultor}</b><br/>Contacto: <b>{telefone}</b>",
        ParagraphStyle(
            "C2", parent=styles["cliente"], fontSize=11.5, leading=15,
            textColor=COR_TEXTO, alignment=TA_CENTER,
        ),
    )

    t = Table([[p_c1], [Spacer(1, 2)], [p_c2]], colWidths=[LARGURA_UTIL])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COR_FUNDO),
            ("BORDER", (0, 0), (-1, -1), 1, COR_PRINCIPAL),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    return t


def _seccao_cabecalho_cliente(cliente: Cliente) -> Table:
    """Faixa superior azul com o nome do cliente."""
    styles = _construir_estilos()
    p = Paragraph(f"Preparado para: {cliente.nome}", styles["cliente"])
    t = Table([[p]], colWidths=[LARGURA_UTIL])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COR_PRINCIPAL),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    return t


def gerar_pdf(
    versao: ImovelVersao,
    canonico: ImovelCanonico,
    fotos: list[Foto],
    cliente: Cliente,
    consultor: Consultor,
) -> bytes:
    """Gera o PDF do imóvel para um cliente específico.

    Retorna os bytes do PDF (para o endpoint devolver via StreamingResponse).
    """
    styles = _construir_estilos()
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=TAMANHO_ECRA,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=15,
        bottomMargin=15,
    )

    elementos = []

    # 1. Cabeçalho: cliente
    elementos.append(_seccao_cabecalho_cliente(cliente))
    elementos.append(Spacer(1, 8))

    # 2. Título + localização
    if versao.titulo:
        elementos.append(Paragraph(versao.titulo, styles["titulo"]))
    if versao.localizacao:
        loc_str = ", ".join(str(x) for x in versao.localizacao if x)
        if loc_str:
            elementos.append(Paragraph(f"📍 {loc_str}", styles["local"]))

    # 3. Preço
    preco = versao.preco or "Sob Consulta"
    p_preco = Paragraph(f"<b>{preco}</b>", styles["preco"])
    t_preco = Table([[p_preco]], colWidths=[LARGURA_UTIL])
    t_preco.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COR_PRINCIPAL),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elementos.append(t_preco)
    elementos.append(Spacer(1, 8))

    # 4. Specs (características do canónico — estrutura {nome, valor, subtexto})
    specs = []
    for c in (canonico.caracteristicas or []):
        if not isinstance(c, dict):
            continue
        if c.get("nome") == "PRICE":
            continue
        val = c.get("valor") or ""
        sub = c.get("subtexto") or ""
        lbl = sub.strip() if (val and sub) else (sub.strip() if sub else "")
        if not val and sub:
            val = sub.strip()
            lbl = ""
        if val:
            specs.append({"valor": val, "label": lbl})

    if specs:
        colunas = []
        for s in specs[:4]:  # máx 4 para caber
            colunas.append([
                Paragraph(f"<b>{s['valor']}</b>", styles["spec_val"]),
                Spacer(1, 2),
                Paragraph(s["label"], styles["spec_lbl"]),
            ])
        if colunas:
            largura_col = LARGURA_UTIL / len(colunas)
            t_specs = Table([colunas], colWidths=[largura_col] * len(colunas))
            t_specs.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), COR_FUNDO),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("GRID", (0, 0), (-1, -1), 0.5, COR_LINHA),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ])
            )
            elementos.append(t_specs)
            elementos.append(Spacer(1, 8))

    # 5. Descrição
    descricao = versao.descricao or canonico.descricao
    if descricao:
        elementos.append(Paragraph("Descrição do Imóvel", styles["seccao"]))
        elementos.append(
            HRFlowable(width="100%", thickness=1, color=COR_PRINCIPAL,
                       spaceBefore=2, spaceAfter=5)
        )
        for p in str(descricao).split("\n\n"):
            if p.strip():
                elementos.append(Paragraph(p.strip(), styles["corpo"]))

    # 6. Características específicas (2 colunas)
    caracts = versao.caracteristicas_especificas or canonico.caracteristicas_especificas or []
    caracts = [str(c) for c in caracts if c]
    if caracts:
        elementos.append(Spacer(1, 4))
        elementos.append(Paragraph("Principais Características", styles["seccao"]))
        elementos.append(
            HRFlowable(width="100%", thickness=1, color=COR_PRINCIPAL,
                       spaceBefore=2, spaceAfter=5)
        )
        meio = (len(caracts) + 1) // 2
        l1 = [Paragraph(f"• {item}", styles["topico"]) for item in caracts[:meio]]
        l2 = [Paragraph(f"• {item}", styles["topico"]) for item in caracts[meio:]]
        while len(l2) < len(l1):
            l2.append(Paragraph("", styles["topico"]))
        t_feat = Table([[l1, l2]], colWidths=[LARGURA_UTIL * 0.5, LARGURA_UTIL * 0.5])
        t_feat.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elementos.append(t_feat)

    # 7. Contacto
    elementos.append(Spacer(1, 10))
    elementos.append(_seccao_contacto(cliente, consultor))

    # 8. Galeria (2 fotos por página)
    fotos_com_ficheiro = [f for f in fotos if f.caminho_local and Path(f.caminho_local).exists()]
    tot = len(fotos_com_ficheiro)
    max_h_por_foto = (ALTURA_MOBILE - 100) / 2

    for idx in range(0, tot, 2):
        elementos.append(PageBreak())
        par = fotos_com_ficheiro[idx:idx + 2]
        for i_sub, foto in enumerate(par):
            num = idx + i_sub + 1
            elementos.append(Paragraph(
                f"<b>Galeria de Fotos</b> — Imagem {num} de {tot}",
                styles["galeria_header"],
            ))
            elementos.append(Spacer(1, 4))
            img = _redimensionar_imagem(foto.caminho_local, LARGURA_UTIL, max_h_por_foto)
            if img:
                t_img = Table([[img]], colWidths=[LARGURA_UTIL])
                t_img.setStyle(
                    TableStyle([
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ])
                )
                elementos.append(t_img)
            if i_sub == 0 and len(par) > 1:
                elementos.append(Spacer(1, 12))

    doc.build(elementos)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes