Buyers CRM — CHANGELOG

2026-11-03 — Ficha de qualificação de comprador + papéis do cliente

Backend
- Cliente ganha `e_comprador` e `e_vendedor` (booleanos NOT NULL, com
  CHECK `e_comprador OR e_vendedor`). Backfill: todos os clientes
  existentes ficam `e_comprador=true`.
- Nova tabela `qualificacoes_comprador` (1:1 com cliente via UNIQUE em
  `cliente_id`, `ON DELETE CASCADE`), com os 4 blocos do guião:
  disponibilidade, perfil/motivação, imóvel pretendido e financeira.
  Estado `nao_iniciada | em_preenchimento | concluida`.
- Migração Alembic `b8c4e2a1f9d3` (aditiva, com backfill implícito via
  `server_default`).
- Endpoints novos, autenticados e restritos ao consultor dono do
  cliente (admin acede a todos):
  * GET    /api/clientes/{id}/qualificacao-comprador
  * PUT    /api/clientes/{id}/qualificacao-comprador (upsert)
  * DELETE /api/clientes/{id}/qualificacao-comprador
  PUT devolve 409 se o cliente não estiver marcado como comprador.
- Schemas novos em `app/schemas/qualificacao_comprador.py`
  (QualificacaoCompradorRead, QualificacaoCompradorUpsert) e tipos
  Literal `UrgenciaComprador`, `EstadoDesejadoImovel`,
  `EstadoQualificacao`.
- `ClienteBase` / `ClienteCreate` / `ClienteRead` expõem
  `e_comprador`, `e_vendedor`. `ClienteRead` expõe ainda
  `qualificacao: QualificacaoCompradorRead | None`.
- Validação dos papéis em três níveis: Pydantic (create/update),
  router (PATCH, porque pode ser parcial sobre o estado atual) e
  CHECK na BD.
- `_obter_cliente_com_acesso` e `listar_clientes` passam a usar
  `selectinload(Cliente.qualificacao)` — evita N+1 ao serializar
  `ClienteRead`.

Frontend
- ClienteForm e DialogNovoCliente ganham dois checkboxes
  "Comprador" / "Vendedor" (pelo menos um obrigatório; erro visível
  se ambos ficarem off; submit desativado).
- ClienteDetalhe: a linha de baixo (antes Interações + Notas lado a
  lado) passa a `Tabs` com 3 triggers. O tab "Qualificação" só
  aparece se `e_comprador=true`, com badge de estado
  (Não iniciada / Em preenchimento / Concluída).
- Novo `QualificacaoCompradorForm` com os 4 blocos em `Card`
  separados, helpers locais (`TextField`, `SelectBool`, `SelectEnum`)
  para manter o ficheiro legível. Booleans tri-state via `<select>`
  para distinguir "não respondido" de "não". Botões "Guardar
  rascunho" (`em_preenchimento`) e "Marcar concluída" (`concluida`).
  "Apagar ficha" com confirmação.
- Ao gravar com `tem_imovel_venda=true` e `cliente.e_vendedor=false`,
  o form dispara PATCH para marcar o cliente como vendedor e mostra
  toast. É a ponte para o futuro lado vendedor.
- Novos hooks em `use-qualificacao-comprador.ts`: `useQualificacao`,
  `useUpsertQualificacao`, `useApagarQualificacao`. `useCriarCliente`
  aceita `e_comprador` / `e_vendedor` opcionais. `useAtualizarCliente`
  passa a usar `Omit<Cliente, 'id' | 'qualificacao' | 'criado_em' |
  'atualizado_em'>` como payload — evita escrita em campos gerados.
- Tipos: `Cliente` estende-se com os 3 novos campos; novos
  `QualificacaoComprador`, `QualificacaoCompradorUpsert`,
  `UrgenciaComprador`, `EstadoDesejadoImovel`, `EstadoQualificacao`.

Notas
- Fase 1. O lado vendedor fica apenas com o booleano. A associação
  vendedor↔imóvel, `VisitaImovel` (ficha de visitante preenchida no
  CRM), agregação de estatísticas e UI no link público ficam para
  fase 2 (ver TODO).
- Upsert 1:1 sem histórico. Guardar revisões fica em TODO.
- A secção "IDENTIFICAÇÃO DO IMÓVEL SOLICITADO" do PDF de
  qualificação **não** entra na ficha digital: continua coberta por
  LinkImovel + InteracaoImovel.
- Sem testes automatizados nesta fase (decisão registada em TODO).

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