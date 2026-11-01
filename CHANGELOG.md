Buyers CRM — CHANGELOG

2026-11-01 — Administração: criar consultor e alterar credenciais

Backend
- POST /api/admin/consultores — cria User + Consultor numa transação.
  Valida email único (409 se duplicado) e faz hash bcrypt da password.
  Aceita is_admin opcional para criar co-admins.
- PUT /api/admin/consultores/{consultor_id}/credenciais — admin redefine
  email e/ou password de um consultor sem exigir a password atual.
- PUT /api/me/password — o próprio utilizador altera a password; exige
  current_password, rejeita nova igual à atual.
- Novos schemas em app/schemas/admin.py
  (ConsultorAdminCreate, ConsultorAdminCredenciaisUpdate,
  PasswordChangeSelf).
- Novo router app/routers/admin_consultores.py registado em main.py.
- Testes em backend/tests/test_admin_consultores.py.

Frontend
- Admin: tab "Consultores" ganha botão "Novo consultor" e coluna
  "Ações" com diálogo de credenciais por linha.
- Perfil: novo componente FormAlterarPassword (pede password atual,
  confirmação, faz logout e redirect após sucesso).
- Hooks novos: use-admin-consultores.ts (criar, alterar credenciais)
  e useAlterarMinhaPassword em use-me.ts.
- Tipos ConsultorAdminCreate e ConsultorAdminCredenciaisUpdate.

Notas
- Sem migração Alembic: users.is_admin e users.ativo já existiam desde
  a migração inicial 66a7820b5d89.
- JWT continuam stateless: troca de password não invalida tokens já
  emitidos. O frontend força logout. Invalidação server-side fica em
  TODO (User.token_version / password_changed_at).

2026-11-01 — Notas por imóvel (fix)

Corrigido bug em que notas criadas no CRM não apareciam no modal do
cliente. Causa: o CRM enviava imovel_versao_id=null e o modal público
filtra por imóvel — logo, nunca havia match.

Alterações
- imovel_versao_id obrigatório em NotaCreateCRM e NotaCreatePublic.
- Endpoints de criação validam sempre o acesso ao imóvel (CRM) e a
  presença do imóvel no link (público).
- GET /api/public/links/{token}/notas passa a exigir imovel_versao_id.
- NotaComContexto ganha cliente_nome (usado no agrupamento por
  cliente no ImovelDetalhe).
- SecaoNotas (CRM, ClienteDetalhe) exige seleção de imóvel; thread e
  input são por imóvel.
- Novo SecaoNotasImovel no ImovelDetalhe, agrupado por cliente, com
  link direto para /clientes/{id}?imovel={versaoId}.
- ClienteDetalhe lê ?imovel= do URL e usa-o como seleção inicial.
- SecaoNotas deixou de usar useEffect para sincronizar o imóvel
  selecionado. O valor efetivo é derivado a cada render
  (userSelectedId → imovelVersaoIdInicial → imoveis[0] → null),
  eliminando renders em cascata e o warning de setState em efeito.
- Notas antigas (imovel_versao_id IS NULL) ficam visíveis num bucket
  colapsável read-only no SecaoNotas, para não perder histórico.

Nota: sem migração nova. A coluna imovel_versao_id continua nullable
para suportar registos anteriores a esta alteração.

2026-11-01 — Interações cliente ↔ imóvel

Backend
- Campo estado_imovel em ImovelVersao (disponivel, reservado, cpcv,
  escritura_marcada, vendido, saiu_mercado). Editável no CRM.
- Tabelas interacoes_imovel e notas_cliente_imovel, com índice único
  parcial (cliente_id, imovel_versao_id) para "interesse".
- Endpoints públicos: interesse, pedidos e notas por imóvel.
- Endpoints CRM: interações e notas por cliente, interações e notas
  por imóvel, atualização de estado de interação, marcação de nota
  como lida, atualização do estado do imóvel.
- Endpoint /api/dashboard/interacoes-pendentes.
- estado_imovel exposto em PublicImovelItem, PublicImovelDetalhe,
  LinkImovelRead e ImovelVersaoListItem.

Frontend público
- Badge de estado do imóvel no card e no detalhe.
- Ações Interesse / Visita / Notas com regras por estado (visita só
  em "disponível"; interesse bloqueado em vendido e saiu_mercado).
- Modais de pedido de visita e de notas.
- Sticky bar de ações em mobile no detalhe.
- Camada de estado em use-interacoes.ts com cache por token.

Frontend CRM
- Seletor de estado do imóvel no detalhe.
- Secções de interações e notas no detalhe do cliente.
- Secção de interações no detalhe do imóvel.
- Cartões de pendentes e lista de atividade recente no dashboard.
- Estado do imóvel visível na gestão de imóveis do link.

2026-11-01 — Validação de monitoring

- Confirmado, via docker inspect, que Portainer e Uptime Kuma têm
  com.centurylinklabs.watchtower.enable=true.
- Confirmado que o filtro por labels do Watchtower está operacional.

2026-11-01 — Monitoring (infra)

- Alterada a imagem do Watchtower para nickfedor/watchtower:latest.
- WATCHTOWER_LABEL_ENABLE=true, WATCHTOWER_CLEANUP=true.
- Agendamento diário às 04:00 UTC, timeout 60s.
- Labels de elegibilidade em Portainer e Uptime Kuma.
- Label de exclusão no próprio Watchtower.
- docker compose config --quiet validado.
- Confirmado o agendamento seguinte para 2026-11-02 às 04:00 UTC.
- Identificados avisos ao obter informação da imagem local
  buyers-crm-frontend-public:latest.