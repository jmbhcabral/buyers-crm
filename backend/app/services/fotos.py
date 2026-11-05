"""Serviço de download e armazenamento de fotos dos imóveis.

Suporta múltiplas plataformas:
- Idealista: nome do ficheiro = `{idealista_id}.{ext}` (id numérico estável).
- Outras (Supercasa, etc.): nome do ficheiro = hash curto de `url_original`
  (estável mesmo que a ordem das fotos mude entre captações).

A pasta é por canónico: `{property_id}/` para o Idealista, ou
`canonico_{id}/` quando `property_id` é NULL.
"""

import hashlib
import logging
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Foto, ImovelCanonico

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "image/*,*/*;q=0.8",
}

EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}


def _extensao_do_url(url: str) -> str:
    """Extrai a extensão do URL. Devolve .jpg como fallback."""
    caminho = url.split("?")[0]
    ext = Path(caminho).suffix.lower()
    return ext if ext in EXTENSOES_PERMITIDAS else ".jpg"


def _pasta_do_imovel(nome: str) -> Path:
    """Devolve (e cria) a pasta onde as fotos do imóvel vivem."""
    pasta = Path(settings.storage_dir) / nome
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def _nome_ficheiro(foto: Foto, url: str) -> str:
    """Nome do ficheiro no disco.

    Idealista: `{idealista_id}.{ext}` (estável — o id não muda).
    Outras plataformas: hash curto de `url_original` — estável mesmo
    que a `ordem` mude entre captações.
    """
    ext = _extensao_do_url(url)
    if foto.idealista_id is not None:
        return f"{foto.idealista_id}{ext}"
    chave = foto.url_original or foto.url_webp or url
    return f"{hashlib.sha1(chave.encode()).hexdigest()[:12]}{ext}"


def descarregar_fotos_do_canonico(canonico_id: int) -> None:
    """Descarrega todas as fotos ativas de um canónico.

    Corre em background (chamado por BackgroundTasks do FastAPI).
    Idempotente: se o ficheiro já existe em disco, salta.
    """
    db: Session = SessionLocal()
    try:
        canonico = db.scalar(
            select(ImovelCanonico).where(ImovelCanonico.id == canonico_id)
        )
        if canonico is None:
            logger.warning("Canónico %s não encontrado", canonico_id)
            return

        fotos = db.scalars(
            select(Foto).where(
                Foto.imovel_canonico_id == canonico_id,
                Foto.ativa.is_(True),
            )
        ).all()

        if not fotos:
            return

        # Pasta por canónico: property_id (Idealista) ou canonico_{id}.
        nome_pasta = canonico.property_id or f"canonico_{canonico.id}"
        pasta = _pasta_do_imovel(nome_pasta)
        logger.info(
            "[fotos] A descarregar %d fotos do imóvel %s",
            len(fotos),
            nome_pasta,
        )

        alterados = False
        with httpx.Client(follow_redirects=True, timeout=30.0, headers=HEADERS) as client:
            for foto in fotos:
                url = foto.url_original or foto.url_webp
                if not url:
                    continue

                nome = _nome_ficheiro(foto, url)
                destino = pasta / nome

                # Já existe? salta (mas atualiza caminho_local se estava null)
                if destino.exists() and destino.stat().st_size > 0:
                    novo_caminho = str(destino)
                    if foto.caminho_local != novo_caminho:
                        foto.caminho_local = novo_caminho
                        alterados = True
                    continue

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                    destino.write_bytes(resp.content)
                    foto.caminho_local = str(destino)
                    alterados = True
                    logger.info("[fotos] Guardada %s (%d bytes)", nome, len(resp.content))
                except Exception as e:
                    logger.warning("[fotos] Falha ao descarregar %s: %s", url, e)

        if alterados:
            db.commit()
            logger.info("[fotos] %d fotos do imóvel %s prontas", len(fotos), nome_pasta)

    except Exception as e:
        logger.exception("[fotos] Erro inesperado: %s", e)
    finally:
        db.close()