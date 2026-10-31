"""Endpoints públicos servidos pelo token do link (sem autenticação)."""

import hashlib
import logging
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import DbSession
from app.models import (
    Cliente,
    Consultor,
    Foto,
    ImovelCanonico,
    ImovelVersao,
    LinkAcesso,
    LinkCliente,
    LinkImovel,
    User,
)
from app.schemas.public import (
    ConsultorPublic,
    PublicFotoRead,
    PublicImovelDetalhe,
    PublicImovelItem,
    PublicLinkInfo,
    PublicLinkResponse,
)
from app.security import hash_link_token
from app.services.consultor_utils import build_consultor_read


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/links", tags=["public"])
router_consultores = APIRouter(prefix="/public/consultores", tags=["public"])

def _no_cache(response: Response) -> None:
    """Obriga o browser a não cachear respostas públicas.

    Essencial: se o link for revogado, o browser não deve continuar a servir
    a versão em cache. Também evita que um 410 fique cacheado e "cole" mesmo
    depois de renovar o link.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _mascarar_nome(nome: str) -> str:
    """Devolve 'Ana C.' a partir de 'Ana Costa'."""
    partes = nome.strip().split()
    if len(partes) <= 1:
        return partes[0] if partes else "Cliente"
    return f"{partes[0]} {partes[-1][0]}."


def _hash_ip(request: Request) -> str:
    """Hash do IP do cliente para analytics (sem guardar o IP em claro)."""
    ip = request.headers.get("cf-connecting-ip") or request.client.host or "unknown"
    return hashlib.sha256(ip.encode()).hexdigest()[:32]


def _obter_link_valido(db: DbSession, token: str) -> LinkCliente:
    """Valida o token e devolve o link, ou 404."""
    if not token or len(token) < 20:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link inválido")

    token_hash = hash_link_token(token)
    link = db.scalar(
        select(LinkCliente)
        .options(selectinload(LinkCliente.cliente))
        .where(LinkCliente.token_hash == token_hash)
    )
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link inválido")
    if not link.ativo:
        raise HTTPException(status.HTTP_410_GONE, "Este link já não está ativo")
    if link.expira_em < datetime.now(UTC):
        raise HTTPException(status.HTTP_410_GONE, "Este link expirou")
    return link


def _registar_acesso(
    db: DbSession,
    link: LinkCliente,
    request: Request,
    imovel_versao_id: int | None = None,
) -> None:
    """Regista um acesso (lista ou detalhe)."""
    db.add(
        LinkAcesso(
            link_id=link.id,
            imovel_versao_id=imovel_versao_id,
            ip_hash=_hash_ip(request),
            user_agent=request.headers.get("user-agent", "")[:500],
            referrer=request.headers.get("referer", "")[:500] or None,
        )
    )
    link.ultimo_acesso_em = datetime.now(UTC)
    db.commit()


def _validar_imovel_no_link(db: DbSession, link: LinkCliente, versao_id: int) -> ImovelVersao:
    """Confirma que o imóvel está no link. Senão 404."""
    existe = db.scalar(
        select(LinkImovel).where(
            LinkImovel.link_id == link.id,
            LinkImovel.imovel_versao_id == versao_id,
        )
    )
    if existe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    return versao


# ---------------------------------------------------------------------------
# GET /api/public/links/{token}
# ---------------------------------------------------------------------------
@router.get("/{token}", response_model=PublicLinkResponse)
def obter_link_publico(
    token: str,
    request: Request,
    response: Response,
    db: DbSession,
) -> PublicLinkResponse:
    """Lista os imóveis do link do cliente. Regista um acesso à lista."""
    _no_cache(response)
    link = _obter_link_valido(db, token)

    # Buscar imóveis do link (ordenados)
    rows = db.execute(
        select(LinkImovel, ImovelVersao, ImovelCanonico)
        .join(ImovelVersao, ImovelVersao.id == LinkImovel.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .where(LinkImovel.link_id == link.id)
        .order_by(LinkImovel.ordem, LinkImovel.criado_em)
    ).all()

    canonico_ids = [c.id for _, _, c in rows]
    contagem_fotos: dict[int, int] = {}
    primeira_foto: dict[int, int] = {}

    if canonico_ids:
        # 1. Contagem de fotos ativas por canónico
        contagem_fotos = dict(
            db.execute(
                select(Foto.imovel_canonico_id, func.count())
                .where(Foto.imovel_canonico_id.in_(canonico_ids), Foto.ativa.is_(True))
                .group_by(Foto.imovel_canonico_id)
            ).all()
        )

        # 2. Primeira foto (ordem menor) de cada canónico
        fotos_ordenadas = db.scalars(
            select(Foto)
            .where(Foto.imovel_canonico_id.in_(canonico_ids), Foto.ativa.is_(True))
            .order_by(Foto.imovel_canonico_id, Foto.ordem)
        ).all()
        for f in fotos_ordenadas:
            if f.imovel_canonico_id not in primeira_foto:
                primeira_foto[f.imovel_canonico_id] = f.id

    # Construir a resposta
    imoveis_out: list[PublicImovelItem] = []
    for li, v, c in rows:
        foto_id = primeira_foto.get(c.id)
        foto_url = (
            f"/api/public/links/{token}/imoveis/{li.imovel_versao_id}/fotos/{foto_id}"
            if foto_id is not None
            else None
        )
        imoveis_out.append(
            PublicImovelItem(
                imovel_versao_id=li.imovel_versao_id,
                ordem=li.ordem,
                titulo=v.titulo,
                preco=v.preco,
                localizacao=v.localizacao,
                num_fotos=contagem_fotos.get(c.id, 0),
                primeira_foto_url=foto_url,
            )
        )

    _registar_acesso(db, link, request, imovel_versao_id=None)

    return PublicLinkResponse(
        link=PublicLinkInfo(
            cliente_nome_mascarado=_mascarar_nome(link.cliente.nome),
            expira_em=link.expira_em,
        ),
        imoveis=imoveis_out,
    )

# ---------------------------------------------------------------------------
# GET /api/public/links/{token}/imoveis/{versao_id}
# ---------------------------------------------------------------------------
@router.get("/{token}/imoveis/{versao_id}", response_model=PublicImovelDetalhe)
def obter_imovel_publico(
    token: str,
    versao_id: int,
    request: Request,
    response: Response,
    db: DbSession,
) -> PublicImovelDetalhe:
    """Detalhe completo de um imóvel do link. Regista um acesso ao imóvel."""
    _no_cache(response)
    link = _obter_link_valido(db, token)
    versao = _validar_imovel_no_link(db, link, versao_id)

    canonico = db.scalar(
        select(ImovelCanonico)
        .options(selectinload(ImovelCanonico.fotos.and_(Foto.ativa.is_(True))))
        .where(ImovelCanonico.id == versao.imovel_canonico_id)
    )
    if canonico is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    fotos_out = [
        PublicFotoRead(
            id=f.id,
            ordem=f.ordem,
            url=f"/api/public/links/{token}/imoveis/{versao_id}/fotos/{f.id}",
            largura=f.largura,
            altura=f.altura,
            tag=f.tag,
            titulo=f.titulo,
        )
        for f in canonico.fotos
    ]

    _registar_acesso(db, link, request, imovel_versao_id=versao_id)

    consultor_dono = db.get(Consultor, versao.consultor_id)  # importa Consultor
    consultor_public = None
    if consultor_dono:
        user = db.get(User, consultor_dono.user_id)
        foto_url = None
        if consultor_dono.foto_caminho:
            versao = int(consultor_dono.atualizado_em.timestamp())
            foto_url = f"/api/public/consultores/{consultor_dono.id}/foto?v={versao}"

        consultor_public = ConsultorPublic(
            id=consultor_dono.id,
            nome=user.nome if user else "",
            agencia=consultor_dono.agencia,
            telefone=consultor_dono.telefone,
            foto_url=foto_url,
        )

    return PublicImovelDetalhe(
        imovel_versao_id=versao.id,
        titulo=versao.titulo or canonico.titulo,
        preco=versao.preco or canonico.preco,
        localizacao=versao.localizacao or canonico.localizacao,
        descricao=canonico.descricao,
        caracteristicas=canonico.caracteristicas,
        caracteristicas_especificas=canonico.caracteristicas_especificas,
        telefone=canonico.telefone,
        url_original=canonico.url,
        fotos=fotos_out,
        consultor=consultor_public,

    )


# ---------------------------------------------------------------------------
# GET /api/public/links/{token}/imoveis/{versao_id}/fotos/{foto_id}
# ---------------------------------------------------------------------------
@router.get("/{token}/imoveis/{versao_id}/fotos/{foto_id}")
def obter_foto_publica(
    token: str,
    versao_id: int,
    foto_id: int,
    db: DbSession,
    response: Response,
) -> FileResponse:
    """Serve o ficheiro JPEG de uma foto do imóvel do link."""
    _no_cache(response)
    link = _obter_link_valido(db, token)
    versao = _validar_imovel_no_link(db, link, versao_id)

    foto = db.get(Foto, foto_id)
    if foto is None or foto.imovel_canonico_id != versao.imovel_canonico_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada")
    if not foto.ativa:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada")
    if not foto.caminho_local:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficheiro ainda não disponível")

    caminho = Path(foto.caminho_local)
    if not caminho.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficheiro não encontrado")

    return FileResponse(
        caminho,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},  # 1 dia
    )


@router_consultores.get("/{consultor_id}/foto")
def obter_foto_consultor(
    consultor_id: int,
    db: DbSession,
) -> FileResponse:
    """Serve a foto de perfil do consultor (público — usado na app de clientes)."""

    consultor = db.get(Consultor, consultor_id)
    if consultor is None or not consultor.foto_caminho:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada")

    caminho = Path(consultor.foto_caminho)
    if not caminho.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficheiro não encontrado")

    # Cache 1 dia — a foto raramente muda
    return FileResponse(
        caminho,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )