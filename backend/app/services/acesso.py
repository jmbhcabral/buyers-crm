"""Helpers de autorização.

Todo o acesso a clientes, versões e links passa por aqui, para manter a
regra num só sítio. Qualquer router que precise de validar acesso deve
usar estas funções em vez de comparar `consultor_id` diretamente.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Cliente,
    ClienteConsultor,
    Consultor,
    ImovelVersao,
    ImovelVersaoCliente,
    LinkCliente,
    User,
)


# ---------------------------------------------------------------------------
# Cliente
# ---------------------------------------------------------------------------
def cliente_e_pessoal(cliente: Cliente) -> bool:
    return cliente.equipa_id is None


def cliente_e_de_equipa(cliente: Cliente) -> bool:
    return cliente.equipa_id is not None


def _consultor_associado_ao_cliente_pessoal(
    db: Session, cliente_id: int, consultor_id: int
) -> bool:
    return db.scalar(
        select(ClienteConsultor).where(
            ClienteConsultor.cliente_id == cliente_id,
            ClienteConsultor.consultor_id == consultor_id,
        )
    ) is not None


def pode_gerir_cliente(
    db: Session,
    user: User,
    consultor: Consultor | None,
    cliente: Cliente,
) -> bool:
    """Quem pode listar/editar/apagar o cliente e tudo o que lhe está
    associado (links, visitas, notas, interacções, qualificação).

    - Admin: qualquer cliente.
    - Cliente pessoal: consultor associado via `cliente_consultor`.
    - Cliente de equipa: qualquer membro da equipa do cliente.
    """
    if user.is_admin:
        return True
    if consultor is None:
        return False
    if cliente.equipa_id is None:
        return _consultor_associado_ao_cliente_pessoal(db, cliente.id, consultor.id)
    return consultor.equipa_id == cliente.equipa_id


# ---------------------------------------------------------------------------
# Versão de imóvel
# ---------------------------------------------------------------------------
def pode_editar_versao(
    user: User,
    consultor: Consultor | None,
    versao: ImovelVersao,
) -> bool:
    """Editar/apagar a versão. Versões continuam estritamente pessoais."""
    if user.is_admin:
        return True
    return consultor is not None and versao.consultor_id == consultor.id


def pode_ver_versao(
    db: Session,
    user: User,
    consultor: Consultor | None,
    versao: ImovelVersao,
) -> bool:
    """Ver a versão (para consultar, associar a um cliente ou incluir
    num link público).

    - Dono da versão (ou admin) → sim.
    - Membro da equipa do cliente a que a versão está associada → sim.
    - Caso contrário → não.
    """
    if pode_editar_versao(user, consultor, versao):
        return True
    if consultor is None or consultor.equipa_id is None:
        return False
    return db.scalar(
        select(ImovelVersaoCliente)
        .join(Cliente, Cliente.id == ImovelVersaoCliente.cliente_id)
        .where(
            ImovelVersaoCliente.imovel_versao_id == versao.id,
            Cliente.equipa_id == consultor.equipa_id,
        )
    ) is not None


def pode_desassociar_versao_cliente(
    user: User,
    consultor: Consultor | None,
    assoc: ImovelVersaoCliente,
    versao: ImovelVersao,
) -> bool:
    """Só quem criou a associação (ou admin) a pode desassociar.

    Legacy: associações anteriores à migração têm
    `criado_por_consultor_id=NULL`; nesse caso a regra recai no dono da
    versão (comportamento pré-equipas).
    """
    if user.is_admin:
        return True
    if consultor is None:
        return False
    if assoc.criado_por_consultor_id is None:
        return versao.consultor_id == consultor.id
    return assoc.criado_por_consultor_id == consultor.id


# ---------------------------------------------------------------------------
# Link público
# ---------------------------------------------------------------------------
def pode_gerir_link(
    db: Session,
    user: User,
    consultor: Consultor | None,
    link: LinkCliente,
    cliente: Cliente,
) -> bool:
    """Gerir o link (criar/renovar/revogar/adicionar imóveis/escolher
    consultor de apresentação). Deriva sempre do acesso ao cliente —
    o link segue o cliente, não o consultor que o criou.
    """
    return pode_gerir_cliente(db, user, consultor, cliente)


def resolver_consultor_apresentacao(
    db: Session, link: LinkCliente
) -> Consultor | None:
    """Consultor a mostrar no público.

    Preferência: `consultor_apresentacao_id`. Fallback: `consultor_id`
    (dono original do link). Pode devolver `None` se ambos apontarem
    para consultores apagados — o endpoint público trata `None`.
    """
    alvo_id = link.consultor_apresentacao_id or link.consultor_id
    return db.get(Consultor, alvo_id)