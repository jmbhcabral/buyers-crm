Buyers CRM — TODO

Última atualização: 2026-11-04

Concluído nesta ronda (2026-11-04)
- Fix: só o criador do cliente o pode editar ou apagar — entregue:
  * `services/acesso.py`: `e_criador_do_cliente` (primeiro
    `cliente_consultor` por `criado_em`) e `pode_editar_cliente`
    (admin OR criador).
  * `schemas/cliente.py`: `ClienteRead.posso_editar`.
  * `clientes.py`: 403 em `PATCH`/`DELETE` quando não é criador nem
    admin; `posso_editar` calculado em `obter_cliente`,
    `criar_cliente` e `atualizar_cliente`.
  * `FormCliente.tsx`: campos desabilitados, aviso visível e botão
    Guardar escondido quando `!posso_editar`; toast com `detail`
    do backend.
  * Sem migração. Sem alteração de modelo.
- Equipas multi-consultor — entregue:
  * Tabela `equipas` + `consultores.equipa_id` (1 consultor em no
    máximo 1 equipa) + `clientes.equipa_id` (NULL = pessoal,
    NOT NULL = partilhado pela equipa).
  * `imoveis_versoes_clientes.criado_por_consultor_id` — só quem
    criou a associação a pode remover; legacy recai no dono da
    versão.
  * `links_cliente.consultor_apresentacao_id` — define quem aparece
    no link público (default = dono do link). Novo endpoint
    `PATCH /links/{id}/apresentacao`.
  * Serviço `services/acesso.py` centraliza toda a autorização
    (`pode_gerir_cliente`, `pode_ver_versao`, `pode_editar_versao`,
    `pode_desassociar_versao_cliente`, `pode_gerir_link`).
  * CRUD de equipas em `/admin/equipas` + gestão de membros.
  * Regras de negócio:
    - Cliente de equipa: qualquer membro gere (clientes, links,
      visitas, notas, interacções, qualificação, dashboard).
    - Versão de imóvel: continua pessoal — só o dono edita. Colegas
      vêem versões associadas a clientes da equipa.
    - Curadoria do link: qualquer membro da equipa adiciona/remove
      imóveis.
    - Bloqueio de canónico duplicado por cliente (409) e por link
      (409).
    - Cleanup de `LinkImovel` ao desassociar cliente↔versão.
  * Frontend CRM: tab **Equipas** no Admin; selector
    **Visibilidade** (pessoal/equipa) no `FormCliente` e
    `DialogNovoCliente`; selector **Consultor de apresentação** no
    `LinkCliente` (só para clientes de equipa).
  * Frontend público: sem alterações visuais — consome
    `consultor_apresentacao` do payload.

- Portal do vendedor — entregue:
  * `ImoveisVersoesClientes.papel` (`comprador` | `vendedor`),
    com índice único parcial por imóvel quando `papel='vendedor'`.
    Substitui a tabela pivot `angariacoes` originalmente planeada
    (reutiliza o fluxo Tampermonkey existente).
  * Tabela `visitas_imovel` com os campos do PDF: data/hora,
    visitante (nome, contacto, email), consultor representante,
    origem + agência, gostou / não gostou / observações, 6 ratings
    (áreas, acabamentos, localização, apresentação, preço, global),
    compraria sim/não, notas internas.
  * Router CRM `/imoveis/{versao_id}/visitas` e `/visitas/{id}`.
  * Endpoint público
    `/public/links/{token}/imoveis-vendedor/{versao_id}/estatisticas`,
    agregando apenas `VisitaImovel` (NÃO `LinkAcesso`).
  * `PublicLinkResponse` com `e_comprador` / `e_vendedor` e lista
    `imoveis_vendedor` (filtrada por angariações).
  * Regra Q2 — imóveis que o cliente vende ficam excluídos da lista
    de comprador.
  * Frontend público: tabs `Imóveis` / `Meus Imóveis`, card
    `CardImovelVendedor` com sub-tabs `Resumo` / `Visitas`,
    detalhe público aceita angariações (`e_angariacao` esconde as
    `AcoesImovel`).
  * Frontend CRM: selector `Comprador / Vendedor` no
    `ClientesAssociados`, sync additive-only de
    `e_comprador`/`e_vendedor`, `DialogRegistarVisita`,
    `SecaoVisitas` no `ImovelDetalhe`.
  * `agencia_nome` e `consultor_representante` **nunca** visíveis
    ao vendedor. `notas_internas` idem.

Concluído em rondas anteriores
- Papéis do cliente (comprador / vendedor / ambos) — entregue com
  `Cliente.e_comprador` + `Cliente.e_vendedor` e CHECK
  `e_comprador OR e_vendedor`. Backfill: todos os clientes existentes
  ficaram `e_comprador=true`.
- Ficha de qualificação de comprador — entregue com tabela
  `qualificacoes_comprador` (1:1) e endpoints PUT/GET/DELETE em
  `/api/clientes/{id}/qualificacao-comprador`. Formulário em 4
  blocos no tab "Qualificação" do ClienteDetalhe.
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
- Notificações (email/push) para novos pedidos de visita.
- Filtros e pesquisa na aplicação pública.
- Estatísticas manuais de plataformas imobiliárias (ver Fase 3).
- Contagem de interesses/pedidos por imóvel no gestor de links
  (requer agregação no backend).
- Testes de integração das visitas + estatísticas + equipas.

⸻

Funcionalidades e melhorias pendentes

CRM e gestão de imóveis
- Exportar CSV de imóveis e clientes.
- Validação de formulários com react-hook-form + Zod.
- Melhorar a responsividade mobile do CRM (sidebar colapsável).
- Considerar estado_imovel como filtro na listagem de imóveis.
- Filtro por papel (comprador / vendedor) na listagem de clientes.
- Filtro por visibilidade (pessoal / equipa) na listagem de clientes.
- Badge de estado da qualificação na listagem de clientes
  (hoje só aparece no detalhe).
- Badge de equipa na listagem de clientes (indicação visual de
  visibilidade).
- UI dedicada de angariações (lista / gestão centralizada). Hoje só
  se vê o papel na secção "Clientes associados" do detalhe do
  imóvel.

Aplicação pública
- Filtros e pesquisa na aplicação pública.
- Dark mode na aplicação pública.
- PWA (instalação no telemóvel).
- Gráfico de visitas por período (últimos 7/30 dias) no card do
  vendedor — hoje só há listas e médias.

Clientes e consultores
- Notificar o consultor quando o cliente abre o link.
- **Equipas — follow-ups:**
  * Mostrar nome da equipa no selector do `FormCliente` para
    consultores não-admin (hoje mostra "Minha Equipa" genérico;
    requer endpoint `GET /api/equipas/minha`).
  * Mostrar nome da equipa no `LinkCliente` e no badge do detalhe
    do cliente.
  * Notificar membros da equipa quando um colega altera o link ou
    adiciona cliente.
  * Histórico de mudanças de equipa de um cliente.
  * `notas_internas` de versões de colegas: decidir se devem ser
    mascaradas em `_build_detalhe` para não-donos.
  * UI de "consultores da equipa" no detalhe da equipa (hoje
    admin-only no diálogo de gestão).
      * **Regra de edição do cliente — alternativa B.** Hoje é
    tudo-ou-nada: só o criador edita qualquer campo. Se a prática
    mostrar necessidade, permitir a membros da equipa corrigir
    campos menos sensíveis (telefone, email, notas) mantendo a
    restrição apenas em `equipa_id` e nos papéis. É ajustar
    `pode_editar_cliente` para permitir campos não-sensíveis e
    deixar a validação da visibilidade num check à parte no router.
  * **`criado_por_consultor_id` no `Cliente`.** `e_criador_do_cliente`
    depende implicitamente de `cliente_consultor` (ordem de
    `criado_em`). Funciona porque a associação é criada no mesmo
    flush e nunca é removida. Se um dia houver remoção de
    consultores do cliente, promover a coluna explícita
    `clientes.criado_por_consultor_id` (nullable FK →
    `consultores.id`) e migrar com base no primeiro
    `cliente_consultor`.
- Ficha de qualificação de vendedor (após modelo de angariação
  consolidado).
- Histórico de qualificações (uma linha por reunião, em vez de
  upsert 1:1). Só se a prática mostrar que é necessário.
- Preencher `consultor_id` da ficha com o `Consultor` (e não o
  `User`) — hoje guarda o `user_id`. Reavaliar, quando houver mais
  casos de uso para auditoria.

Interações e notas
- Notificações (email/push) para novos pedidos de visita.
- Contagem de interesses/pedidos por imóvel no gestor de links.
- Rate limiting nas rotas públicas de notas/pedidos.
- Avaliar mover estado_imovel para o canónico e sincronizar por
  versão (decisão atual: vive na versão).
- Backfill das notas antigas (imovel_versao_id IS NULL): apagar,
  reassociar ou deixar no bucket legacy.

Portal do vendedor — fase 3 (follow-ups)

Estatísticas manuais de plataformas
- Objectivo: além das visitas, o vendedor quer ver o desempenho do
  imóvel no Idealista, Imovirtual, etc. **Sem scraping** — o
  consultor insere os números manualmente no CRM.
- Tabela nova `estatisticas_plataforma` (versao_id, plataforma enum,
  data, visualizacoes, contactos, ...).
- Endpoints CRM para inserir/editar.
- Extensão do endpoint público de estatísticas para incluir a
  secção `plataformas` (o placeholder `plataformas: []` já existe
  na resposta).
- Frontend público: nova sub-tab no card do vendedor (`Plataformas`)
  quando houver dados.

Histórico de angariações
- Hoje `ImovelVersaoCliente.papel` não tem `data_inicio` /
  `data_fim`. Se a prática mostrar necessidade, promover a tabela
  pivot `angariacoes` com `data_inicio`, `data_fim`, `estado`.
- Migração dos pares `papel='vendedor'` existentes para a nova
  estrutura, preservando os pares `comprador`.

Mesmo par cliente↔versão com dois papéis
- Hoje a PK composta `(imovel_versao_id, cliente_id)` impede.
  Cenário raro (cliente compra imóvel que ele próprio vende).
  Só promover `papel` a parte da PK se aparecer na prática.

Frontend público (extensões)
- Página de detalhe do imóvel angariado com botão "Ver estatísticas"
  no fundo (hoje o detalhe mostra o aviso "ver no card da lista",
  que é pouco natural).

Qualidade e manutenção
- Testes automatizados (backend).
- Testes de integração para os endpoints de interações e notas.
- Testes do fluxo público (token → interações → notas).
- Testes de integração para a ficha de qualificação
  (PUT/GET/DELETE, 409 em vendedor-puro, isolamento entre
  consultores). Adiado por decisão da equipa; a ficha foi validada
  manualmente em dev.
- **Testes de integração para o portal do vendedor** (fase 2):
  - Criação de visita (201) e bloqueio 400 sem angariação activa.
  - Estatísticas públicas (num_visitas, ratings_medios,
    compraria_sim/nao).
  - Sync additive-only de `e_comprador` / `e_vendedor`.
  - Regra Q2 (imóvel angariado não aparece na lista comprador).
  - Exclusão de `agencia_nome` / `consultor_representante` /
    `notas_internas` no payload público.
  Adiado por decisão da equipa; validado manualmente em dev.
- **Testes de integração para equipas:**
  - Consultor fora da equipa recebe 404 em clientes/links/versões
    da equipa.
  - `pode_gerir_cliente` (pessoal vs equipa) — matriz completa.
  - `pode_ver_versao` (dono vs colega via cliente da equipa).
  - `pode_desassociar_versao_cliente` (criador vs outro; legacy =
    dono da versão).
  - Bloqueio 409 de canónico duplicado (associação e link).
  - Cleanup de `LinkImovel` ao desassociar.
  - Unicidade de link por cliente de equipa.
  - `PATCH /links/{id}/apresentacao` (validação de equipa).
  - Migração: backfill de `consultor_apresentacao_id` e
    `criado_por_consultor_id`.
  Adiado por decisão da equipa; migração + fluxo validados
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
  credenciais e alterações de equipa.
- UI de equipas: editar nome + reordenar membros + indicar
  "consultor principal" da equipa (hoje só nome + membros).