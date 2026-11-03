Buyers CRM — TODO

Última atualização: 2026-11-03

Concluído nesta ronda
- Papéis do cliente (comprador / vendedor / ambos) — entregue com
  `Cliente.e_comprador` + `Cliente.e_vendedor` e CHECK
  `e_comprador OR e_vendedor`. Backfill: todos os clientes existentes
  ficaram `e_comprador=true`.
- Ficha de qualificação de comprador — entregue com tabela
  `qualificacoes_comprador` (1:1) e endpoints PUT/GET/DELETE em
  `/api/clientes/{id}/qualificacao-comprador`. Formulário em 4
  blocos no tab "Qualificação" do ClienteDetalhe.

Concluído em rondas anteriores
- Favoritos na aplicação pública — entregue como "Interesse" na
  feature de Interações cliente ↔ imóvel.
- Pedido de visita na aplicação pública — entregue via POST
  /api/public/links/{token}/imoveis/{id}/pedidos.
- Marcar imóvel como vendido/reservado — entregue via
  ImovelVersao.estado_imovel.
- Marcar visita a imóvel — entregue via interações
  (pedido_visita) + SecaoInteracoes no CRM.

Próxima tarefa — a definir

Escolher entre:
- Portal do vendedor — fase 2 (ver bloco dedicado abaixo).
- Notificações (email/push) para novos pedidos de visita.
- Filtros e pesquisa na aplicação pública.
- Contagem de interesses/pedidos por imóvel no gestor de links
  (requer agregação no backend).

⸻

Funcionalidades e melhorias pendentes

CRM e gestão de imóveis
- Exportar CSV de imóveis e clientes.
- Validação de formulários com react-hook-form + Zod.
- Melhorar a responsividade mobile do CRM (sidebar colapsável).
- Considerar estado_imovel como filtro na listagem de imóveis.
- Filtro por papel (comprador / vendedor) na listagem de clientes.
- Badge de estado da qualificação na listagem de clientes
  (hoje só aparece no detalhe).

Aplicação pública
- Filtros e pesquisa na aplicação pública.
- Dark mode na aplicação pública.
- PWA (instalação no telemóvel).

Clientes e consultores
- Notificar o consultor quando o cliente abre o link.
- Multi-consultor com partilha.
- Ficha de qualificação de vendedor (fase 2 — após modelo de
  angariação).
- Histórico de qualificações (uma linha por reunião, em vez de upsert
  1:1). Só se a prática mostrar que é necessário.
- Preencher `consultor_id` da ficha com o `Consultor` (e não o
  `User`) — hoje guarda o `user_id`. Reavaliar na fase 2, quando
  houver mais casos de uso para auditoria.

Interações e notas
- Notificações (email/push) para novos pedidos de visita.
- Contagem de interesses/pedidos por imóvel no gestor de links.
- Rate limiting nas rotas públicas de notas/pedidos.
- Avaliar mover estado_imovel para o canónico e sincronizar por
  versão (decisão atual: vive na versão).
- Backfill das notas antigas (imovel_versao_id IS NULL): apagar,
  reassociar ou deixar no bucket legacy.

Portal do vendedor — fase 2
Visão: o cliente vendedor vê no link público dele as estatísticas do
imóvel que está a vender (visualizações, visitas, feedback de
visitantes). O caso "cliente ambos" usa o mesmo link (o frontend
público decide o que renderizar com base em `e_comprador` /
`e_vendedor`).

Pré-requisitos
- Associação vendedor↔imóvel (tabela pivot `angariacoes` ou FK
  `cliente_vendedor_id` no imóvel canónico). Sem isto, o link do
  vendedor não tem imóvel para mostrar.
- Regra de workflow: o imóvel que o cliente está a vender NÃO entra
  no link dele como comprador (já é prática, falta documentar/
  validar no backend).

Tabela nova — `VisitaImovel` (ficha de visitante)
Preenchida no CRM depois de cada visita, pelo consultor. Não confundir
com `InteracaoImovel` (essa é do comprador, via link).

Campos:
- id, imovel_versao_id (FK)
- data_visita (date)
- visitante_nome (text)
- visitante_origem (enum: agencia_externa | particular |
  cliente_proprio | walk_in | outro) — a maioria é `agencia_externa`
- agencia_nome (text, nullable — preenchido se `agencia_externa`)
- visitante_contacto (text, nullable)
- feedback_rating (smallint 1–5, nullable)
- feedback_texto (text, nullable)
- interesse_demonstrado (bool, nullable)
- notas_internas (text, nullable) — NÃO visível ao vendedor
- consultor_id (FK users), criado_em

Endpoints
- CRM:
  * POST   /api/imoveis/{versao_id}/visitas
  * GET    /api/imoveis/{versao_id}/visitas
  * PATCH  /api/visitas/{id}
  * DELETE /api/visitas/{id}
- Público:
  * GET /api/public/links/{token}/estatisticas — usa o mesmo token
    do link. Agrega:
      - visualizações (de `LinkAcesso`, já existente)
      - visitas (de `VisitaImovel`)
      - feedback médio + nº de feedbacks
      - comparação com a média do consultor (opcional)
    Filtra por `link.cliente_id` e pelos imóveis associados ao
    cliente como vendedor.

Frontend público
- Seção condicional a `cliente.e_vendedor` no link (tabs "Os meus
  imóveis" / "Estatísticas do meu imóvel" quando o cliente é ambos).
- Gráfico simples de visualizações por período (últimos 7 / 30
  dias).
- Lista de visitas com feedback (sem `notas_internas`).

Frontend CRM
- Formulário de "Registar visita" no detalhe do imóvel.
- Lista de visitas no detalhe do imóvel.

Marketing e presença online
- Landing page para o site principal.

Qualidade e manutenção
- Testes automatizados (backend).
- Testes de integração para os endpoints de interações e notas.
- Testes do fluxo público (token → interações → notas).
- Testes de integração para a ficha de qualificação
  (PUT/GET/DELETE, 409 em vendedor-puro, isolamento entre
  consultores). Adiado por decisão da equipa; a ficha foi validada
  manualmente em dev.

Infraestrutura
- Validar o funcionamento do filtro por labels do Watchtower. ✅
- Investigar avisos relativos à imagem local
  buyers-crm-frontend-public:latest. ✅
- Confirmar a origem e manutenção da imagem
  nickfedor/watchtower. ✅
- Confirmar que apenas Portainer e Uptime Kuma são elegíveis
  para atualizações automáticas. ✅
- Configurar alertas no Uptime Kuma.
- Implementar backups automáticos do PostgreSQL.
- Implementar backups dos volumes persistentes.
- Configurar backups off-site (disco externo e/ou nuvem).
- Testar recuperação de backups.
- Criar script de deploy (./deploy.sh).

Administração
- Invalidação server-side de tokens após alteração de password
  (User.token_version ou password_changed_at validado em get_current_user).
- PATCH /admin/consultores/{id} com ativo (desativar sem apagar).
- Criar co-admin via UI (checkbox is_admin no diálogo de novo consultor).
- Auditoria persistente (admin_audit_log) para criação/alteração de
  credenciais.