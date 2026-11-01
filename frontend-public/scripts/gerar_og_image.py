"""Gera a imagem Open Graph (1200x630) para a app pública.

Usa a ilustração da marca (public/brand.png) à esquerda.

Uso:
    cd frontend-public
    python3 scripts/gerar_og_image.py

Gera: public/og-image.png
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LARGURA = 1200
ALTURA = 630
COR_FUNDO = (15, 44, 89)      # #0F2C59
COR_TEXTO = (255, 255, 255)
COR_MUTED = (187, 207, 235)   # azul claro

# Ilustração no lado esquerdo (quadrada)
BRAND_TAMANHO = 440
BRAND_MARGEM = 60

# Coluna de texto começa aqui
TEXTO_X = BRAND_MARGEM + BRAND_TAMANHO + 60


def _fonte(tamanho: int, negrito: bool = False) -> ImageFont.FreeTypeFont:
    candidatos = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if negrito
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for c in candidatos:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, tamanho)
            except Exception:
                continue
    return ImageFont.load_default()


def _medir_texto(draw, texto, fonte):
    bbox = draw.textbbox((0, 0), texto, font=fonte)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _ajustar_fonte(draw, texto, tamanho_max, largura_max, negrito=False):
    """Reduz o tamanho da fonte até o texto caber na largura dada."""
    tamanho = tamanho_max
    while tamanho >= 12:
        f = _fonte(tamanho, negrito=negrito)
        largura, _ = _medir_texto(draw, texto, f)
        if largura <= largura_max:
            return f
        tamanho -= 2
    return _fonte(12, negrito=negrito)


def _quebrar_linhas(draw, texto, fonte, largura_max):
    """Quebra o texto em linhas que respeitem largura_max."""
    linhas, atual = [], ""
    for palavra in texto.split():
        tentativa = f"{atual} {palavra}".strip()
        largura, _ = _medir_texto(draw, tentativa, fonte)
        if largura <= largura_max or not atual:
            atual = tentativa
        else:
            linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


def main() -> None:
    img = Image.new("RGB", (LARGURA, ALTURA), COR_FUNDO)
    draw = ImageDraw.Draw(img)

    # Círculo decorativo no canto superior direito
    draw.ellipse([LARGURA - 220, -120, LARGURA + 120, 220], fill=(30, 65, 118))

    # Ilustração da marca (à esquerda, verticalmente centrada)
    brand_path = Path(__file__).parent.parent / "public" / "brand.png"
    if brand_path.exists():
        brand = Image.open(brand_path).convert("RGBA")
        brand = brand.resize((BRAND_TAMANHO, BRAND_TAMANHO), Image.LANCZOS)
        brand_y = (ALTURA - BRAND_TAMANHO) // 2
        img.paste(brand, (BRAND_MARGEM, brand_y), brand)
    else:
        print(f"⚠️  {brand_path} não existe. Correr o passo 2 primeiro.")

        # Texto (direita) — auto-ajustado à coluna disponível
    largura_col = LARGURA - TEXTO_X - BRAND_MARGEM   # 580 px

    f_titulo = _ajustar_fonte(draw, "Imóveis Selecionados", 150, largura_col, negrito=True)
    f_sub    = _fonte(34)
    f_rodape = _fonte(28)

    w_t, h_t = _medir_texto(draw, "Imóveis Selecionados", f_titulo)

    linhas_sub = ["Uma seleção pessoal", "preparada para si"]
    h_ls = max(_medir_texto(draw, l, f_sub)[1] for l in linhas_sub)
    gap_ls = int(h_ls * 0.30)
    h_sub = h_ls * len(linhas_sub) + gap_ls * (len(linhas_sub) - 1)

    linhas_tag = _quebrar_linhas(
        draw,
        "Porque encontrar a casa certa faz toda a diferença.",
        f_rodape,
        largura_col,
    )
    h_lt = max(_medir_texto(draw, l, f_rodape)[1] for l in linhas_tag)
    gap_lt = int(h_lt * 0.30)
    h_tag = h_lt * len(linhas_tag) + gap_lt * (len(linhas_tag) - 1)

    gap1, gap2 = 30, 38
    altura_total = h_t + gap1 + h_sub + gap2 + h_tag
    y = (ALTURA - altura_total) // 2 - 20

    draw.text((TEXTO_X, y), "Imóveis Selecionados", font=f_titulo, fill=COR_TEXTO)
    y += h_t + gap1

    for i, linha in enumerate(linhas_sub):
        draw.text((TEXTO_X, y), linha, font=f_sub, fill=COR_MUTED)
        y += h_ls + (gap_ls if i < len(linhas_sub) - 1 else 0)
    y += gap2

    for i, linha in enumerate(linhas_tag):
        draw.text((TEXTO_X, y), linha, font=f_rodape, fill=COR_MUTED)
        y += h_lt + (gap_lt if i < len(linhas_tag) - 1 else 0)

    # Rodapé
    draw.line(
        [(BRAND_MARGEM, 555), (LARGURA - BRAND_MARGEM, 555)],
        fill=(60, 90, 140),
        width=2,
    )
    draw.text((BRAND_MARGEM, 568), "chanilaicastro.pt", font=f_rodape, fill=COR_MUTED)

    out = Path(__file__).parent.parent / "public" / "og-image.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"✅ Gerado: {out}  ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()