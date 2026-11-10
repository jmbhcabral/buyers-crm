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
    ImovelVersaoCliente,
    LinkAcesso,
    LinkCliente,
    LinkImovel,
    User,
    InteracaoImovel,
    NotaClienteImovel,
    VisitaImovel,
)
from app.schemas.public import (
    ConsultorPublic,
    PublicFotoRead,
    PublicImovelDetalhe,
    PublicImovelItem,
    PublicImovelVendedorItem,
    PublicLinkInfo,
    PublicLinkResponse,
)
from app.schemas.interacao import (
    InteracaoRead, InteracoesResumo, InteresseToggle,
    NotaCreatePublic, NotaRead, PedidoCreate,
)
from app.schemas.visita_imovel import (
    EstatisticasVendedor,
    RatingsMedios,
    VisitaImovelPublic,
)
from app.security import hash_link_token
from app.services.consultor_utils import build_consultor_read


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/links", tags=["public"])
router_consultores = APIRouter(prefix="/public/consultores", tags=["public"])

def _no_cache(response: Response) -> None:
    """Obriga o browser a não cachear respostas públicas."""
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


def _resolver_imovel_no_link(
    db: DbSession, link: LinkCliente, versao_id: int
) -> tuple[ImovelVersao, str]:
    """Resolve a versão e classifica a origem no link.

    Devolve `(versao, 'comprador' | 'vendedor')`. Levanta 404 se a versão
    não pertence a este link nem por LinkImovel nem por angariação.

    É a base dos endpoints que aceitam ambos (detalhe, fotos).

    NOTA: NÃO validar `versao.consultor_id == link.consultor_id`. A
    associação (`LinkImovel` ou `ImovelVersaoCliente.papel='vendedor'`) é
    a única fonte de verdade — é o que permite que um colega de equipa
    cure o link com versões de outro consultor.
    """
    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    # 1) está no link curado do comprador?
    em_link = db.scalar(
        select(LinkImovel).where(
            LinkImovel.link_id == link.id,
            LinkImovel.imovel_versao_id == versao_id,
        )
    )
    if em_link is not None:
        return versao, "comprador"

    # 2) é angariação activa do cliente do link?
    if link.cliente.e_vendedor:
        ang = db.scalar(
            select(ImovelVersaoCliente).where(
                ImovelVersaoCliente.imovel_versao_id == versao_id,
                ImovelVersaoCliente.cliente_id == link.cliente_id,
                ImovelVersaoCliente.papel == "vendedor",
            )
        )
        if ang is not None:
            return versao, "vendedor"

    raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")


def _validar_imovel_no_link(
    db: DbSession, link: LinkCliente, versao_id: int
) -> ImovelVersao:
    """Compat — devolve só a versão. Aceita comprador e vendedor."""
    versao, _ = _resolver_imovel_no_link(db, link, versao_id)
    return versao


def _resolver_apresentacao_id(db: DbSession, link: LinkCliente) -> int:
    """Quem aparece na página pública.

    Preferência: `consultor_apresentacao_id` (escolhido pela equipa).
    Fallback: `consultor_id` (dono do link), se o campo estiver NULL
    ou se apontar para um consultor que já não existe.
    """
    if link.consultor_apresentacao_id is not None:
        if db.get(Consultor, link.consultor_apresentacao_id) is not None:
            return link.consultor_apresentacao_id
    return link.consultor_id


def _build_consultor_public(db: DbSession, consultor_id: int) -> ConsultorPublic | None:
    """Constrói o ConsultorPublic (com foto cache-busted e email)."""
    consultor = db.get(Consultor, consultor_id)
    if consultor is None:
        return None
    user = db.get(User, consultor.user_id)

    foto_url = None
    if consultor.foto_caminho:
        versao = int(consultor.atualizado_em.timestamp())
        foto_url = f"/api/public/consultores/{consultor.id}/foto?v={versao}"

    return ConsultorPublic(
        id=consultor.id,
        nome=user.nome if user else "",
        email=user.email if user else None,
        agencia=consultor.agencia,
        telefone=consultor.telefone,
        foto_url=foto_url,
    )


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

    # Universo comprador: LinkImovel curado
    rows = db.execute(
        select(LinkImovel, ImovelVersao, ImovelCanonico)
        .join(ImovelVersao, ImovelVersao.id == LinkImovel.imovel_versao_id)
        .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
        .where(LinkImovel.link_id == link.id)
        .order_by(LinkImovel.ordem, LinkImovel.criado_em)
    ).all()

    # Q2 — excluir da lista de comprador os imóveis que este cliente vende
    canonico_ids_vendedor: set[int] = set(
        db.scalars(
            select(ImovelVersao.imovel_canonico_id)
            .join(
                ImovelVersaoCliente,
                ImovelVersaoCliente.imovel_versao_id == ImovelVersao.id,
            )
            .where(
                ImovelVersaoCliente.cliente_id == link.cliente_id,
                ImovelVersaoCliente.papel == "vendedor",
            )
        ).all()
    )

    canonico_ids = [c.id for _, _, c in rows]
    contagem_fotos: dict[int, int] = {}
    primeira_foto: dict[int, int] = {}

    if canonico_ids:
        contagem_fotos = dict(
            db.execute(
                select(Foto.imovel_canonico_id, func.count())
                .where(Foto.imovel_canonico_id.in_(canonico_ids), Foto.ativa.is_(True))
                .group_by(Foto.imovel_canonico_id)
            ).all()
        )
        fotos_ordenadas = db.scalars(
            select(Foto)
            .where(Foto.imovel_canonico_id.in_(canonico_ids), Foto.ativa.is_(True))
            .order_by(Foto.imovel_canonico_id, Foto.ordem)
        ).all()
        for f in fotos_ordenadas:
            if f.imovel_canonico_id not in primeira_foto:
                primeira_foto[f.imovel_canonico_id] = f.id

    imoveis_out: list[PublicImovelItem] = []
    for li, v, c in rows:
        if c.id in canonico_ids_vendedor:
            continue
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
                estado_imovel=v.estado_imovel,
            )
        )

    # Universo vendedor: angariações
    imoveis_vendedor_out: list[PublicImovelVendedorItem] = []
    if link.cliente.e_vendedor:
        vendedor_rows = db.execute(
            select(ImovelVersao, ImovelCanonico)
            .join(ImovelCanonico, ImovelCanonico.id == ImovelVersao.imovel_canonico_id)
            .join(
                ImovelVersaoCliente,
                ImovelVersaoCliente.imovel_versao_id == ImovelVersao.id,
            )
            .where(
                ImovelVersaoCliente.cliente_id == link.cliente_id,
                ImovelVersaoCliente.papel == "vendedor",
            )
            .order_by(ImovelVersao.atualizado_em.desc())
        ).all()

        vendedor_versao_ids = [v.id for v, _ in vendedor_rows]

        stats_por_versao: dict[int, dict] = {}
        if vendedor_versao_ids:
            stat_rows = db.execute(
                select(
                    VisitaImovel.imovel_versao_id,
                    func.count(VisitaImovel.id).label("n"),
                    func.avg(VisitaImovel.rating_global).label("rg"),
                    func.max(VisitaImovel.data_visita).label("ultima"),
                )
                .where(VisitaImovel.imovel_versao_id.in_(vendedor_versao_ids))
                .group_by(VisitaImovel.imovel_versao_id)
            ).all()
            for versao_id_, n_, rg_, ultima_ in stat_rows:
                stats_por_versao[versao_id_] = {
                    "n": int(n_),
                    "rg": float(rg_) if rg_ is not None else None,
                    "ultima": ultima_,
                }

        canonico_ids_vend = [c.id for _, c in vendedor_rows]
        contagem_fotos_v: dict[int, int] = {}
        primeira_foto_v: dict[int, int] = {}
        if canonico_ids_vend:
            contagem_fotos_v = dict(
                db.execute(
                    select(Foto.imovel_canonico_id, func.count())
                    .where(
                        Foto.imovel_canonico_id.in_(canonico_ids_vend),
                        Foto.ativa.is_(True),
                    )
                    .group_by(Foto.imovel_canonico_id)
                ).all()
            )
            fotos_ordenadas_v = db.scalars(
                select(Foto)
                .where(
                    Foto.imovel_canonico_id.in_(canonico_ids_vend),
                    Foto.ativa.is_(True),
                )
                .order_by(Foto.imovel_canonico_id, Foto.ordem)
            ).all()
            for f in fotos_ordenadas_v:
                if f.imovel_canonico_id not in primeira_foto_v:
                    primeira_foto_v[f.imovel_canonico_id] = f.id

        for idx, (v, c) in enumerate(vendedor_rows):
            foto_id = primeira_foto_v.get(c.id)
            foto_url = (
                f"/api/public/links/{token}/imoveis/{v.id}/fotos/{foto_id}"
                if foto_id is not None
                else None
            )
            st = stats_por_versao.get(v.id, {})
            imoveis_vendedor_out.append(
                PublicImovelVendedorItem(
                    imovel_versao_id=v.id,
                    ordem=idx,
                    titulo=v.titulo,
                    preco=v.preco,
                    localizacao=v.localizacao,
                    num_fotos=contagem_fotos_v.get(c.id, 0),
                    primeira_foto_url=foto_url,
                    estado_imovel=v.estado_imovel,
                    num_visitas=st.get("n", 0),
                    rating_global_medio=st.get("rg"),
                    ultima_visita_em=st.get("ultima"),
                )
            )

    consultor_public = _build_consultor_public(db, _resolver_apresentacao_id(db, link))

    _registar_acesso(db, link, request, imovel_versao_id=None)

    return PublicLinkResponse(
        link=PublicLinkInfo(
            cliente_nome_mascarado=_mascarar_nome(link.cliente.nome),
            expira_em=link.expira_em,
            e_comprador=link.cliente.e_comprador,
            e_vendedor=link.cliente.e_vendedor,
        ),
        imoveis=imoveis_out,
        imoveis_vendedor=imoveis_vendedor_out,
        consultor=consultor_public,
    )


# ---------------------------------------------------------------------------
# GET /api/public/links/{token}/imoveis-vendedor/{versao_id}/estatisticas
# ---------------------------------------------------------------------------
@router.get(
    "/{token}/imoveis-vendedor/{versao_id}/estatisticas",
    response_model=EstatisticasVendedor,
)
def obter_estatisticas_vendedor(
    token: str,
    versao_id: int,
    response: Response,
    db: DbSession,
) -> EstatisticasVendedor:
    """Estatísticas do imóvel angariado, visíveis ao vendedor."""
    _no_cache(response)
    link = _obter_link_valido(db, token)

    # Validação: só angariações do próprio cliente
    versao = db.get(ImovelVersao, versao_id)
    if versao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")
    ang = db.scalar(
        select(ImovelVersaoCliente).where(
            ImovelVersaoCliente.imovel_versao_id == versao_id,
            ImovelVersaoCliente.cliente_id == link.cliente_id,
            ImovelVersaoCliente.papel == "vendedor",
        )
    )
    if ang is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado")

    visitas = db.scalars(
        select(VisitaImovel)
        .where(VisitaImovel.imovel_versao_id == versao_id)
        .order_by(VisitaImovel.data_visita.desc())
    ).all()

    def _avg(vals: list[int]) -> float | None:
        return sum(vals) / len(vals) if vals else None

    ratings_medios = RatingsMedios(
        areas=_avg([v.rating_areas for v in visitas]),
        acabamentos=_avg([v.rating_acabamentos for v in visitas]),
        localizacao=_avg([v.rating_localizacao for v in visitas]),
        apresentacao=_avg([v.rating_apresentacao for v in visitas]),
        preco=_avg([v.rating_preco for v in visitas]),
        global_=_avg([v.rating_global for v in visitas]),
    )

    return EstatisticasVendedor(
        imovel_versao_id=versao_id,
        num_visitas=len(visitas),
        rating_global_medio=ratings_medios.global_,
        ratings_medios=ratings_medios,
        compraria_sim=sum(1 for v in visitas if v.compraria),
        compraria_nao=sum(1 for v in visitas if not v.compraria),
        visitas=[VisitaImovelPublic.model_validate(v) for v in visitas],
        plataformas=[],
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
    versao, origem = _resolver_imovel_no_link(db, link, versao_id)

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

    consultor_public = _build_consultor_public(db, _resolver_apresentacao_id(db, link))

    return PublicImovelDetalhe(
        imovel_versao_id=versao.id,
        titulo=versao.titulo or canonico.titulo,
        preco=versao.preco or canonico.preco,
        localizacao=versao.localizacao or canonico.localizacao,
        descricao=versao.descricao or canonico.descricao,
        caracteristicas=canonico.caracteristicas,
        caracteristicas_especificas=canonico.caracteristicas_especificas,
        telefone=canonico.telefone,
        url_original=canonico.url,
        fotos=fotos_out,
        consultor=consultor_public,
        estado_imovel=versao.estado_imovel,
        e_angariacao=(origem == "vendedor"),
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
    """Serve o ficheiro JPEG de uma foto do imóvel do link.

    Aceita tanto imóveis do link (comprador) como angariações (vendedor).
    """
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
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router_consultores.get("/{consultor_id}/foto")
def obter_foto_consultor(
    consultor_id: int,
    db: DbSession,
) -> FileResponse:
    """Serve a foto de perfil do consultor (público)."""

    consultor = db.get(Consultor, consultor_id)
    if consultor is None or not consultor.foto_caminho:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada")

    caminho = Path(consultor.foto_caminho)
    if not caminho.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficheiro não encontrado")

    return FileResponse(
        caminho,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ---------------------------------------------------------------------------
# GET /api/public/links/{token}/interacoes
# ---------------------------------------------------------------------------
@router.get("/{token}/interacoes", response_model=InteracoesResumo)
def obter_interacoes_publicas(
    token: str,
    response: Response,
    db: DbSession,
) -> InteracoesResumo:
    _no_cache(response)
    link = _obter_link_valido(db, token)

    interacoes = db.scalars(
        select(InteracaoImovel).where(InteracaoImovel.cliente_id == link.cliente_id)
    ).all()

    interesses = [i.imovel_versao_id for i in interacoes if i.tipo == "interesse"]
    pedidos = [
        InteracaoRead.model_validate(i)
        for i in interacoes
        if i.tipo in ("pedido_visita", "pedido_info")
        and i.estado in ("pendente", "visto")
    ]

    # Notas não lidas visíveis ao cliente: só notas ancoradas a um imóvel
    # (imovel_versao_id IS NOT NULL). As notas legacy (NULL) vivem num
    # bucket read-only no CRM e não podem ser abertas/marcadas pelo
    # cliente — não devem contribuir para o badge de "novas".
    notas_nao_lidas = db.scalar(
        select(func.count()).select_from(NotaClienteImovel).where(
            NotaClienteImovel.cliente_id == link.cliente_id,
            NotaClienteImovel.autor_tipo == "consultor",
            NotaClienteImovel.lida_pelo_destinatario.is_(False),
            NotaClienteImovel.imovel_versao_id.is_not(None),
        )
    ) or 0

    # Notas não lidas por imóvel. O total em `notas_nao_lidas` continua
    # a ser o agregado do cliente; o `por_imovel` passa a incluir a
    # contagem por imóvel para o frontend poder pintar o badge só no
    # imóvel certo (bug: aparecia em todos).
    notas_nao_lidas_por_imovel: dict[int, int] = dict(
        db.execute(
            select(
                NotaClienteImovel.imovel_versao_id,
                func.count(),
            )
            .where(
                NotaClienteImovel.cliente_id == link.cliente_id,
                NotaClienteImovel.autor_tipo == "consultor",
                NotaClienteImovel.lida_pelo_destinatario.is_(False),
                NotaClienteImovel.imovel_versao_id.is_not(None),
            )
            .group_by(NotaClienteImovel.imovel_versao_id)
        ).all()
    )

    por_imovel: dict[int, dict[str, int]] = {}
    for i in interacoes:
        d = por_imovel.setdefault(
            i.imovel_versao_id,
            {"interesse": 0, "pedidos": 0, "notas_nao_lidas": 0},
        )
        if i.tipo == "interesse":
            d["interesse"] = 1
        elif i.estado in ("pendente", "visto"):
            d["pedidos"] += 1

    # Injectar as notas não lidas por imóvel no agregado.
    for versao_id_, n_ in notas_nao_lidas_por_imovel.items():
        d = por_imovel.setdefault(
            versao_id_,
            {"interesse": 0, "pedidos": 0, "notas_nao_lidas": 0},
        )
        d["notas_nao_lidas"] = int(n_)

    return InteracoesResumo(
        interesses=interesses,
        pedidos=pedidos,
        notas_nao_lidas=notas_nao_lidas,
        por_imovel=por_imovel,
    )


# ---------------------------------------------------------------------------
# PUT /api/public/links/{token}/imoveis/{versao_id}/interesse
# ---------------------------------------------------------------------------
@router.put("/{token}/imoveis/{versao_id}/interesse", status_code=status.HTTP_204_NO_CONTENT)
def toggle_interesse(
    token: str,
    versao_id: int,
    payload: InteresseToggle,
    db: DbSession,
) -> None:
    link = _obter_link_valido(db, token)
    _versao, origem = _resolver_imovel_no_link(db, link, versao_id)

    # Um vendedor não põe interesse no imóvel que ele próprio vende.
    if origem == "vendedor":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Este imóvel está em angariação — não pode ser marcado como interesse.",
        )

    existente = db.scalar(
        select(InteracaoImovel).where(
            InteracaoImovel.cliente_id == link.cliente_id,
            InteracaoImovel.imovel_versao_id == versao_id,
            InteracaoImovel.tipo == "interesse",
        )
    )
    if payload.ativo and existente is None:
        db.add(InteracaoImovel(
            cliente_id=link.cliente_id,
            imovel_versao_id=versao_id,
            tipo="interesse",
            estado="pendente",
        ))
        db.commit()
    elif not payload.ativo and existente is not None:
        db.delete(existente)
        db.commit()


# ---------------------------------------------------------------------------
# POST /api/public/links/{token}/imoveis/{versao_id}/pedidos
# ---------------------------------------------------------------------------
@router.post(
    "/{token}/imoveis/{versao_id}/pedidos",
    response_model=InteracaoRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_pedido_publico(
    token: str,
    versao_id: int,
    payload: PedidoCreate,
    db: DbSession,
) -> InteracaoRead:
    link = _obter_link_valido(db, token)
    _versao, origem = _resolver_imovel_no_link(db, link, versao_id)

    if origem == "vendedor":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Este imóvel está em angariação — não aceita pedidos de comprador.",
        )

    if payload.tipo not in ("pedido_visita", "pedido_info"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tipo de pedido inválido"
        )

    interacao = InteracaoImovel(
        cliente_id=link.cliente_id,
        imovel_versao_id=versao_id,
        tipo=payload.tipo,
        estado="pendente",
        payload=payload.payload,
    )
    db.add(interacao)
    db.commit()
    db.refresh(interacao)
    return InteracaoRead.model_validate(interacao)


# ---------------------------------------------------------------------------
# DELETE /api/public/links/{token}/interacoes/{interacao_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{token}/interacoes/{interacao_id}", status_code=status.HTTP_204_NO_CONTENT,
)
def cancelar_interacao_publica(
    token: str,
    interacao_id: int,
    db: DbSession,
) -> None:
    link = _obter_link_valido(db, token)
    interacao = db.get(InteracaoImovel, interacao_id)
    if interacao is None or interacao.cliente_id != link.cliente_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interação não encontrada")
    if interacao.estado not in ("pendente", "visto"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Já não pode ser cancelada"
        )
    db.delete(interacao)
    db.commit()


# ---------------------------------------------------------------------------
# GET /api/public/links/{token}/notas
# ---------------------------------------------------------------------------
@router.get("/{token}/notas", response_model=list[NotaRead])
def listar_notas_publicas(
    token: str,
    response: Response,
    db: DbSession,
    imovel_versao_id: int,
) -> list[NotaRead]:
    _no_cache(response)
    link = _obter_link_valido(db, token)
    _validar_imovel_no_link(db, link, imovel_versao_id)
    stmt = (
        select(NotaClienteImovel)
        .where(
            NotaClienteImovel.cliente_id == link.cliente_id,
            NotaClienteImovel.imovel_versao_id == imovel_versao_id,
        )
        .order_by(NotaClienteImovel.criado_em)
    )
    return [NotaRead.model_validate(n) for n in db.scalars(stmt).all()]


# ---------------------------------------------------------------------------
# POST /api/public/links/{token}/notas
# ---------------------------------------------------------------------------
@router.post(
    "/{token}/notas", response_model=NotaRead, status_code=status.HTTP_201_CREATED,
)
def criar_nota_publica(
    token: str,
    payload: NotaCreatePublic,
    db: DbSession,
) -> NotaRead:
    link = _obter_link_valido(db, token)
    _validar_imovel_no_link(db, link, payload.imovel_versao_id)

    nota = NotaClienteImovel(
        cliente_id=link.cliente_id,
        imovel_versao_id=payload.imovel_versao_id,
        autor_tipo="cliente",
        conteudo=payload.conteudo,
        lida_pelo_destinatario=False,
    )
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return NotaRead.model_validate(nota)


# ---------------------------------------------------------------------------
# PATCH /api/public/links/{token}/notas/{nota_id}/ler
# ---------------------------------------------------------------------------
@router.patch("/{token}/notas/{nota_id}/ler", status_code=status.HTTP_204_NO_CONTENT)
def marcar_nota_lida_publica(
    token: str,
    nota_id: int,
    db: DbSession,
) -> None:
    link = _obter_link_valido(db, token)
    nota = db.get(NotaClienteImovel, nota_id)
    if nota is None or nota.cliente_id != link.cliente_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nota não encontrada")
    if nota.autor_tipo == "consultor":
        nota.lida_pelo_destinatario = True
        db.commit()