Buyers CRM — CHANGELOG

2026-11-05 — Ingestão multi-plataforma: suporte a Supercasa

Generaliza o `/api/imoveis/ingest` para aceitar imóveis de várias
plataformas. O payload do Idealista mantém-se retrocompatível
(`fonte` ausente → assume `idealista`; `propertyId` continua a ser
usado como `id_externo`). O primeiro userscript novo é o do
Supercasa.

Backend
- Nova tabela `imoveis_origem` (migração `h2i3j4k5l6m7`), 1:N com
  `imoveis_canonicos`. UNIQUE `(fonte, id_externo)`, CHECK em
  `fonte` (`idealista` | `imovirtual` | `supercasa` | `properstar`),
  `ON DELETE CASCADE`. Backfill: cada canónico existente ganhou uma
  origem `idealista` a partir de `property_id` (9 linhas em dev;
  13 em produção à data do deploy, incluindo as captadas depois).
- `imoveis_canonicos.property_id` passa a NULLABLE. O índice único
  `ix_imoveis_canonicos_property_id` mantém-se — PostgreSQL aceita
  múltiplos NULL em índices únicos.
- `schemas/ingest.py`: novos `fonte` (default `idealista`) e
  `id_externo`; `property_id` e `FotoIngest.id` passam a opcionais;
  novo `FotoIngest.url_externa`; `model_validator` garante
  `property_id` no Idealista e `id_externo` nas outras.
  `IngestResult` ganha `fonte` e `id_externo`.
- `services/ingest.py`: lookup do canónico por
  `(fonte, id_externo)` via `ImovelOrigem`, com fallback para
  `property_id` quando a origem é o Idealista. `raw_json` do
  canónico = última captação de qualquer plataforma; `raw_json` da
  origem = última daquela plataforma. Merge campo a campo nas
  versões inalterado. Fotos: dedup por `idealista_id` (Idealista)
  ou `url_original` (outras), via chave `(tipo, valor)`.
- `services/fotos.py`: pasta por canónico (`property_id` ou
  `canonico_{id}`) e nome do ficheiro por `idealista_id` (Idealista)
  ou hash SHA-1 curto de `url_original` (outras) — estável mesmo
  que a ordem das fotos mude.
- `main.py`: CORS passa a permitir `https://supercasa.pt` e
  `https://www.supercasa.pt` no bloco de produção.

Userscripts
- Novo `userscripts/buyers-crm-supercasa.user.js`:
  * Extração principal por JSON-LD (`RealEstateListing` + `Offer` +
    `Accommodation` + `RealEstateAgent`), com fallback de DOM para
    a ref do anunciante.
  * Telefone via `POST /contact/getphone` (form-urlencoded,
    `superCasaID`, `superClientID` lido do DOM,
    `__RequestVerificationToken` da página).
  * `fonte: "supercasa"`, `idExterno` do URL (`/i(\d+)$/`),
    `propertyId` omitido.
  * Bloco `supercasa` no payload (JSON-LD cru + `superClientID`) —
    guardado no `raw_json` da origem (aceite por `extra="allow"`).
  * Painel e menu Tampermonkey idênticos ao do Idealista, com
    histórico local separado
    (`buyers_crm_historico_supercasa`).

Frontend privado / público
- **Nenhuma alteração.** Os endpoints existentes mantêm-se; só o
  schema de entrada do `/ingest` ficou mais permissivo.

Validação manual em dev e produção:
- Migração `h2i3j4k5l6m7` aplicada em dev e produção; backfill
  correcto (9 origens `idealista` em dev; 13 em produção).
- Payload do Supercasa copiado e validado (33 fotos, telefone
  `215557128`, características, JSON-LD completo).
- Preflight `OPTIONS` devolve
  `access-control-allow-origin: https://supercasa.pt`.
- Ingestão end-to-end em produção confirmada:
  * `imoveis_origem`: 1 linha `supercasa | 2342533`.
  * `imoveis_canonicos`: id=13, `property_id=NULL`, título
    "Apartamento T2 em Parque das Nações, Lisboa", preço
    "715 000,00 €", anunciante "Century 21 - Polo Central II - Filial".
  * `fotos`: 33 linhas, todas com `caminho_local` preenchido;
    ficheiros em `storage/fotos/canonico_13/` com nomes hash
    SHA-1 (tamanhos típicos ~50–80 KB).
  * `imoveis_versoes`: id=13, `consultor_id=1`, criada pelo ingest.

Decisões registadas
- **Opção B (origem como fonte de verdade dos campos específicos)**:
  os campos genéricos vivem no canónico; os `ad_*` do Idealista
  continuam a preencher-se (retrocompat), mas nas outras plataformas
  ficam `NULL` e o `raw_json` da origem preserva tudo.
- **`property_id` nullable em vez de sintético**: preserva a
  semântica ("id do Idealista") em vez de inventar
  `"supercasa:2342533"`.
- **Fotos sem `idealista_id`**: nome do ficheiro por hash de
  `url_original`, idempotente mesmo que a ordem mude.
- **CORS explícito por origem** (não `*`): mantém
  `allow_credentials=False`; o userscript usa `X-API-Key`, não
  cookies.

Notas
- Sem testes automatizados nesta fase (mantém-se a decisão de adiar
  testes de integração). Migração, backfill, ingestão e descarga de
  fotos validados manualmente em dev + produção.
- Imovirtual e Properstar ficam para próximas rondas (mesma
  estrutura de origem).
- `userscript/buyers-crm.user.js` (Idealista) fica intacto; a nova
  pasta é `userscripts/`.

2026-11-05 — Fix: só o criador do cliente o pode editar ou apagar

Bug: um membro da equipa podia alterar a visibilidade de um cliente de
equipa (`equipa` → `pessoal`) e retirar o acesso aos restantes membros
— incluindo ao criador. A regra anterior (`pode_gerir_cliente`) dava
edição total a qualquer membro da equipa.

Backend
- `services/acesso.py` — novas funções:
  * `e_criador_do_cliente(db, consultor, cliente)` — o criador é o
    primeiro consultor em `cliente_consultor` (ordem de `criado_em`);
    a associação é adicionada no mesmo flush da criação, pelo que
    corresponde sempre a quem criou o cliente. Admin é tratado em
    separado (`user.is_admin`).
  * `pode_editar_cliente(db, user, consultor, cliente)` — admin OR
    criador.
- `routers/clientes.py`:
  * `atualizar_cliente` e `apagar_cliente` aplicam
    `pode_editar_cliente` depois de `pode_gerir_cliente`. Devolvem
    **403** explícito quando o utilizador não é o criador nem admin.
  * Novo helper `_serialize_cliente` calcula `posso_editar` com base
    em `pode_editar_cliente`; usado por `obter_cliente`,
    `criar_cliente` e `atualizar_cliente`.
  * `listar_clientes` fica com `posso_editar=True` por omissão — não
    é crítico na listagem (sem edição inline), o detalhe devolve o
    valor real.
- `schemas/cliente.py`: `ClienteRead.posso_editar: bool = True`
  (calculado no router, não persiste).

Frontend privado
- `types/index.ts`: `Cliente.posso_editar: boolean`.
- `hooks/use-clientes.ts`: `ClienteUpdatePayload` exclui
  `posso_editar` (não é escrevível).
- `components/cliente/FormCliente.tsx`:
  * Quando `!cliente.posso_editar`, todos os campos ficam
    desabilitados, o botão Guardar desaparece e mostra-se um aviso
    "Só quem criou o cliente o pode editar."
  * O `onError` propaga o `detail` do backend no toast (defesa para
    o caso de 403 em corrida).
  * Mantém-se `pode_gerir_cliente` para as operações derivadas
    (associar imóveis, curar link, ver visitas/notas/interacções/
    qualificação) — um colega continua a colaborar no cliente, só
    não altera os dados base.

Sem migração. Sem alteração de modelo. Sem alteração no frontend
público.

Decisão registada
- **"Editar cliente" é do criador; "colaborar no cliente" é da
  equipa.** A distinção entre `pode_editar_cliente` (admin/criador)
  e `pode_gerir_cliente` (equipa) evita que um colega mude a
  visibilidade e "expulse" os restantes. Fica em TODO avaliar uma
  regra mais permissiva (ex.: colega corrige telefone mas não mexe
  na visibilidade) se a prática mostrar necessidade.

Notas
- `e_criador_do_cliente` depende da ordem de
  `cliente_consultor.criado_em`. Funciona porque a associação é
  criada no mesmo flush do cliente e nunca é removida. Se um dia
  houver remoção, promover a `clientes.criado_por_consultor_id`
  (coluna explícita) — registado em TODO.
- Sem testes automatizados nesta fase (mantém-se a decisão de adiar
  testes de integração). Fluxo validado manualmente em dev: A
  (criador) edita; B (colega) recebe 403 no PATCH/DELETE; admin
  edita; B continua a ver tudo e a colaborar.

2026-11-04 — Equipas multi-consultor

Backend
- Nova tabela `equipas` (id, nome UNIQUE, criado_em, atualizado_em).
  Migração Alembic `g1h2i3j4k5l6` (aditiva).
- `consultores.equipa_id` (nullable FK → `equipas.id`, ON DELETE SET NULL).
  Um consultor está em no máximo UMA equipa (coluna única = garantia;
  sem pivot `equipa_consultores`).
- `clientes.equipa_id` (nullable FK → `equipas.id`, ON DELETE SET NULL).
  - `NULL` → cliente **pessoal** (comportamento pré-equipas; dono via
    `cliente_consultor`).
  - `NOT NULL` → cliente **partilhado** pela equipa.
- `imoveis_versoes_clientes.criado_por_consultor_id` (nullable FK →
  `consultores.id`, ON DELETE SET NULL). Regista quem criou a
  associação — só ele (ou admin) a pode remover. Backfill: dono da
  versão na altura da migração; nas linhas antigas (NULL) a regra
  recai no dono da versão.
- `links_cliente.consultor_apresentacao_id` (nullable FK →
  `consultores.id`, ON DELETE SET NULL). Define quem aparece no
  link público. Default = dono do link; alterável pela equipa.
  Backfill: `consultor_apresentacao_id = consultor_id`.
- Novo serviço `app/services/acesso.py`:
  `pode_gerir_cliente`, `pode_editar_versao`, `pode_ver_versao`,
  `pode_desassociar_versao_cliente`, `pode_gerir_link`,
  `resolver_consultor_apresentacao`. Todos os routers passam a usá-lo
  em vez de comparar `consultor_id` diretamente.
- Nova matriz de acesso:
  * **Cliente pessoal** (`equipa_id IS NULL`): dono via
    `cliente_consultor` (comportamento antigo).
  * **Cliente de equipa** (`equipa_id NOT NULL`): qualquer membro da
    equipa gere (clientes, links, visitas, notas, interacções,
    qualificação, dashboard).
  * **Versão de imóvel**: continua **estritamente pessoal** — só o
    dono a edita/apaga. Um membro da equipa pode **ver** versões de
    colegas quando estão associadas a clientes da equipa
    (`pode_ver_versao`), mas não editá-las.
- Regras novas nas associações cliente↔versão:
  * `POST /api/imoveis/{v}/clientes/{c}` — bloqueio **409** quando o
    cliente já tem uma versão desse canónico (evita duplicado no link
    público e ambiguidade de "qual versão representa o imóvel").
    Mantém-se o 409 do vendedor único.
  * `DELETE /api/imoveis/{v}/clientes/{c}` — só o consultor que criou
    a associação (ou admin) remove; legacy recai no dono da versão.
    Limpa `LinkImovel` de todos os links do cliente para o imóvel
    sair do público (evita link órfão).
- Regras novas no link público:
  * `POST /api/links/{id}/imoveis` — bloqueio **409** por canónico
    (dois colegas não podem adicionar versões diferentes do mesmo
    imóvel ao mesmo link).
  * Novo `PATCH /api/links/{id}/apresentacao` para escolher o
    consultor de apresentação. Validação: consultor activo; se o
    cliente é de equipa, tem de ser membro dessa equipa.
  * `GET /api/links/cliente/{id}` devolve o link da equipa (não do
    consultor autenticado) quando `cliente.equipa_id NOT NULL`.
  * `POST /api/links` — unicidade: cliente de equipa tem **um** link
    (independente do consultor); cliente pessoal mantém
    `(cliente_id, consultor_id)`.
- `GET /api/public/links/{token}` e `.../imoveis/{versao_id}`:
  * Removido o check `versao.consultor_id == link.consultor_id` do
    `_resolver_imovel_no_link` — a associação
    (`LinkImovel`/`ImovelVersaoCliente`) é a única fonte de verdade.
    Isto permite que a equipa cure o link com versões de colegas.
  * Consultor mostrado no público unificado em
    `_resolver_apresentacao_id(link)` = `consultor_apresentacao_id` com
    fallback para `consultor_id`. Antes divergia (lista usava o do
    link, detalhe usava o da versão).
  * `imoveis_vendedor`: removido o filtro
    `ImovelVersao.consultor_id == link.consultor_id` (a validação
    passa a ser só `ImovelVersaoCliente.papel='vendedor'` +
    `cliente_id`).
  * `imoveis-vendedor/{versao_id}/estatisticas`: removido o mesmo
    check de dono — a validação é só "é angariação activa do cliente
    do link".
- CRUD de equipas em `/api/admin/equipas` (todos sob
  `Depends(get_admin_user)`):
  * `GET    /admin/equipas`
  * `POST   /admin/equipas`
  * `GET    /admin/equipas/{id}`  (devolve membros)
  * `PATCH  /admin/equipas/{id}`
  * `DELETE /admin/equipas/{id}`  (SET NULL em consultores e clientes)
  * `POST   /admin/equipas/{id}/consultores/{cid}` (409 se consultor
    já pertence a outra equipa)
  * `DELETE /admin/equipas/{id}/consultores/{cid}`
- `POST /admin/consultores` mantém-se; a atribuição de equipa faz-se
  via `/admin/equipas`. `ConsultorRead`/`ConsultorComUser` passam a
  expor `equipa_id`.
- `GET /api/clientes`, `POST /api/clientes`, `PATCH /api/clientes/{id}`
  passam a aceitar `equipa_id` (`null` = pessoal; `id` = equipa).
  Validação: só a própria equipa (admin pode atribuir a qualquer).
- `GET /api/imoveis` ganha `?incluir_equipa=true` — inclui versões de
  colegas que estejam associadas a clientes da equipa do consultor.
- `GET /api/dashboard/*` passa a agregar clientes/versões da equipa
  (helpers `_cliente_filter`, `_versao_filter`, `_pdf_filter`).
- `visitas.py`: `_validar_angariacao` passa a validar acesso ao
  **cliente vendedor** (não só à versão). Um membro da equipa não
  cria visitas em versões angariadas a clientes a que não tem acesso.

Frontend privado
- Novo `hooks/use-equipas.ts` (CRUD admin + `useEquipasDisponiveis`).
  `useEquipasDisponiveis` lê `consultor.equipa_id` do `AuthContext`
  (`useAuth`), não faz query a `/me`.
- `pages/Admin.tsx`: nova tab **Equipas** com:
  * tabela (nome, nº consultores, nº clientes, data);
  * diálogo "Nova equipa";
  * diálogo "Gerir membros" (lista + selector de consultor para
    adicionar + botão remover).
- `components/cliente/FormCliente.tsx`: novo selector
  **Visibilidade** (`Só para mim (pessoal)` vs `Equipa: {nome}`).
  - Admin vê todas as equipas.
  - Consultor vê só a sua, com label "Minha Equipa".
  - Cliente `equipa_id` acompanha o `PATCH /clientes/{id}`.
- `components/cliente/DialogNovoCliente.tsx`: mesmo selector.
- `components/cliente/LinkCliente.tsx`: novo bloco
  **Consultor de apresentação** (só quando `cliente.equipa_id NOT NULL`):
  - Select com consultores da mesma equipa (via `GET /consultores`
    filtrado por `equipa_id`);
  - mutation `useAlterarApresentacaoLink` (sem reload forçado);
  - Badge "equipa" no header do card.
- `hooks/use-links.ts`: novo `useAlterarApresentacaoLink`
  (`PATCH /links/{id}/apresentacao`). `useCriarLink` aceita
  `consultor_apresentacao_id` opcional.
- `hooks/use-clientes.ts`: `useCriarCliente` aceita `equipa_id`
  opcional (`useAtualizarCliente` já o aceitava por derivar de
  `Cliente`).
- `hooks/use-me.ts`: mutações passam a usar `refreshUser()` do
  `AuthContext` em vez de `invalidateQueries(['consultor','me'])`
  (que não era uma query key real).
- `types/index.ts`: `Consultor.equipa_id`, `Cliente.equipa_id`,
  `Link.consultor_apresentacao_id`, novos `Equipa`, `EquipaComMembros`,
  `ConsultorMembro`, `EquipaCreate`, `EquipaUpdate`, e
  `ConsultorComUser` (para o `LinkCliente` ter `nome`/`email`).

Frontend público
- **Nenhuma alteração.** O backend passa a servir o
  `consultor_apresentacao` em vez do dono do link. O payload
  mantém-se igual.

Decisões registadas
- **Versão nasce pessoal**. As versões continuam do consultor que as
  criou. Só se partilha o **cliente**. Isto evita versões da equipa em
  paralelo com versões pessoais, e elimina o problema de dedupe de
  canónicos no link (a associação ao cliente resolve-o antes).
- **Um consultor em no máximo uma equipa**. Coluna `equipa_id` em vez
  de pivot. Simples; se um dia for preciso pertença múltipla,
  promove-se a pivot.
- **Curadoria do link pela equipa**, **edição da versão só pelo
  dono**. Coerente com a regra "cliente é da equipa, versão é do
  consultor".
- **Desassociar: só quem criou**. Um colega pode adicionar versões
  ao link do cliente, mas não pode remover a associação
  cliente↔versão que o outro criou. Admin pode.
- **Bloqueio de canónico duplicado** (dois pontos: associação
  cliente↔versão e link). Mensagem 409 explícita com o id da versão
  existente.
- **Cliente muda de equipa**: `equipa_id` muda, o link segue o
  cliente (`pode_gerir_link` deriva de `pode_gerir_cliente`).
  Membros da equipa antiga perdem acesso; novos ganham.
- **`notas_internas`** de uma versão são visíveis a membros da equipa
  que vejam essa versão (via `pode_ver_versao`). Se um dia se quiser
  esconder ao colega, mascara-se em `_build_detalhe` — decisão adiada
  por não haver procura.
- **Admin não pertence a equipa por omissão**, mas pode gerir tudo.

Notas
- Sem testes automatizados nesta fase (mantém-se a decisão de adiar
  testes de integração). Migração, modelo, relationships, OpenAPI e
  fluxo end-to-end (curl + BD) validados manualmente em dev.
- Race condition conhecida: dois membros da mesma equipa a criar link
  ao mesmo tempo para o mesmo cliente → dois links. Aceitável para
  MVP; resolve-se com `SELECT ... FOR UPDATE` no cliente se aparecer.
- A migração `g1h2i3j4k5l6` correu em dev com backfill correcto:
  `equipas` vazia, `links_cliente.consultor_apresentacao_id = consultor_id`,
  `imoveis_versoes_clientes.criado_por_consultor_id` = dono da versão.

2026-11-04 — Portal do vendedor: angariações, fichas de visita e estatísticas

Backend
- Nova coluna `ImoveisVersoesClientes.papel` (`comprador` | `vendedor`,
  NOT NULL, default `comprador`, CHECK `papel IN ('comprador','vendedor')`).
  Migração Alembic `d4e5f6a7b8c9`, com backfill implícito via
  `server_default`. Isto substitui a tabela pivot `angariacoes` que
  estava planeada no TODO: o fluxo existente do Tampermonkey
  (`ImovelVersao` do consultor + associação `ImovelVersaoCliente`) já
  serve os dois papéis. A PK composta `(imovel_versao_id, cliente_id)`
  mantém-se — logo, o mesmo par cliente↔versão só tem um papel.
- Índice único parcial `uq_imoveis_versoes_clientes_vendedor`
  (`imovel_versao_id`) WHERE `papel='vendedor'`. Migração Alembic
  `e6f7a8b9c0d1`. Um imóvel só pode ter UM vendedor (angariação).
- Nova tabela `visitas_imovel` (migração Alembic `f7a8b9c0d1e2`):
  fichas de visita preenchidas pelo consultor no CRM. Campos:
  `imovel_versao_id` (FK ON DELETE CASCADE), `data_visita` (datetime
  tz), internos (`visitante_nome`, `visitante_contacto`,
  `visitante_email`, `consultor_representante`, `notas_internas`),
  visíveis ao vendedor (`visitante_origem` enum, `agencia_nome`,
  `gostou`, `nao_gostou`, `observacoes`, 6 ratings 1–5: áreas,
  acabamentos, localização, apresentação, preço, global, e `compraria`
  boolean). CHECKs de origem e de ratings.
- Modelo `VisitaImovel` + relationship `ImovelVersao.visitas`.
- Router CRM novo `app/routers/visitas.py`, registado em `main.py`:
  * POST   /api/imoveis/{versao_id}/visitas
  * GET    /api/imoveis/{versao_id}/visitas
  * PATCH  /api/visitas/{id}
  * DELETE /api/visitas/{id}
  POST valida que a versão tem uma angariação activa (`papel='vendedor'`)
  e devolve 400 com mensagem explícita caso contrário.
- Schemas novos em `app/schemas/visita_imovel.py`: `VisitaImovelBase`,
  `Create`, `Update`, `Read` (CRM, todos os campos), `VisitaImovelPublic`
  (só campos visíveis ao vendedor), `RatingsMedios`, `EstatisticasVendedor`.
- `POST /api/imoveis/{versao_id}/clientes/{cliente_id}` passa a aceitar
  `?papel=comprador|vendedor` (default `comprador`). Comportamento:
  * Já associado com o mesmo papel → 204 (idempotente).
  * Já associado com papel diferente → 409 (desassociar primeiro).
  * Tentar `papel=vendedor` num imóvel que já tem vendedor → 409.
  * Associar promove `Cliente.e_comprador` / `e_vendedor` para `true`
    (additive-only: nunca despromove; o utilizador pode desmarcar
    manualmente no detalhe do cliente).
- `GET /api/imoveis/{versao_id}/clientes` passa a devolver `papel`.
- `POST /api/links/{id}/imoveis` passa a exigir que a versão esteja
  associada ao cliente **como comprador** — os imóveis de angariação
  entram no link automaticamente pela lista "Meus Imóveis", não pelo
  `LinkImovel` curado.
- `GET /api/public/links/{token}` estendido:
  * Devolve `link.e_comprador` e `link.e_vendedor`.
  * Nova lista `imoveis_vendedor` com `num_visitas`,
    `rating_global_medio`, `ultima_visita_em` — calculada a partir de
    `VisitaImovel` (NÃO de `LinkAcesso`).
  * A lista `imoveis` (comprador) exclui os canónicos que o cliente
    está a vender (regra Q2). Sem esta exclusão, o mesmo imóvel
    apareceria nas duas tabs.
- Novo helper `_resolver_imovel_no_link` em `public.py` que aceita
  tanto `LinkImovel` (comprador) como `ImovelVersaoCliente.papel='vendedor'`.
  Usado em `obter_imovel_publico`, `obter_foto_publica`,
  `toggle_interesse` e `criar_pedido_publico`.
- `GET /api/public/links/{token}/imoveis/{versao_id}` agora aceita
  angariações e devolve `e_angariacao: bool` no payload.
- `toggle_interesse` e `criar_pedido_publico` devolvem 400 quando o
  imóvel é uma angariação do próprio cliente (não faz sentido o
  vendedor pôr interesse no imóvel que ele vende).
- Novo endpoint público `GET /api/public/links/{token}/imoveis-vendedor/{versao_id}/estatisticas`.
  Validação: a versão tem de ser angariação activa do cliente do link.
  Devolve: `num_visitas`, `rating_global_medio`, `ratings_medios`
  (6 médias), `compraria_sim`, `compraria_nao`, lista de `visitas`
  (payload `VisitaImovelPublic`) e `plataformas: []` (placeholder fase 3).
  **Nunca inclui** `visitante_nome`, `visitante_contacto`,
  `visitante_email`, `consultor_representante`, `notas_internas`
  nem `agencia_nome`.
- `PublicImovelDetalhe` ganha `e_angariacao: bool`.
- `VisitaImovelPublic` — `agencia_nome` foi **removido** (a agência
  visitante nunca aparece ao vendedor; só o tipo `agencia_externa`
  no `visitante_origem`).

Frontend público
- `types.ts`: `PublicLinkInfo` com `e_comprador`/`e_vendedor`;
  novo `PublicImovelVendedorItem`; `PublicLinkResponse.imoveis_vendedor`;
  `PublicImovelDetalhe.e_angariacao`; bloco "Portal do vendedor"
  (`VisitanteOrigem`, `VisitaPublic`, `RatingsMedios`,
  `EstatisticasVendedor`).
- `ListaPage.tsx`: quando o cliente é ambos, tabs `Imóveis` / `Meus
  Imóveis`. Se só é comprador ou só vendedor, tab única directa (sem
  tab bar).
- Novo `CardImovelVendedor.tsx`:
  * Topo igual ao `CardImovel` (foto, título, localização, preço,
    badge estado), mas clicável para `/s/{token}/imovel/{versao_id}`
    (o detalhe já aceita angariações).
  * Sub-tabs `Resumo` / `Visitas (N)`. `Resumo` mostra nº de visitas,
    avaliação média e última visita. `Visitas` carrega on-demand via
    endpoint de estatísticas — inclui sumário (visitas / compraria sim /
    compraria não / média global) e a lista de visitas (data, origem,
    compraria, 6 ratings, gostou, não gostou, observações). Sem
    `agencia_nome`, sem dados internos.
- Novo hook `use-estatisticas-vendedor.ts` (on-demand, cache em state
  local, compatível com `react-hooks/set-state-in-effect`).
- `DetalhePage.tsx`: quando `data.e_angariacao === true`, os
  `AcoesImovel` (Interesse / Visita / Notas) ficam escondidos e
  mostra-se um aviso "Este imóvel está em angariação...".

Frontend privado
- `ClientesAssociados.tsx`: novo selector `Comprador / Vendedor` ao
  lado do selector de cliente. Badge em cada cliente listado
  (`Comprador` = outline, `Vendedor` = secondary). Título mostra
  divisão `X compradores · Y vendedores`. Mensagem de erro extrai
  `detail` do backend (para o 409).
- `use-mutations-imovel.ts`: `useAssociarCliente` passa a receber
  `{ clienteId, papel }`. `onSuccess` invalida `['cliente', id]` e
  `['clientes']` (prefix matching apanha também `['cliente', id, 'imoveis']`),
  para o detalhe do cliente reflectir o sync additive-only.
- Novo `DialogRegistarVisita.tsx` (Dialog Radix) com todos os campos
  do PDF: data/hora, origem, agência (só se externa), nome do colega
  representante, dados do visitante, gostou / não gostou /
  observações, 6 ratings 1–5, compraria (Switch), notas internas
  (colapsável visualmente).
- Novo `SecaoVisitas.tsx` no `ImovelDetalhe` — lista de visitas com
  todas as informações, notas internas em fundo amarelo, botão apagar
  com `window.confirm`.
- Novo hook `use-visitas-imovel.ts` (`useVisitasImovel`,
  `useCriarVisita`, `useAtualizarVisita`, `useApagarVisita`).
- `ImovelDetalhe.tsx`: novo `Card` "Visitas" no fim, depois de
  "Notas com clientes".

Decisões registadas
- **Estatísticas do vendedor contam apenas `VisitaImovel`** — não
  `LinkAcesso`. Alteração de plano em relação ao TODO inicial, onde
  estava previsto agregar visualizações do link. Se um dia fizer
  sentido reintroduzir visualizações, é uma extensão do endpoint
  actual.
- **Angariações no link público via `ImovelVersaoCliente.papel`**,
  em vez da tabela pivot `angariacoes` originalmente planeada. O
  fluxo Tampermonkey + associação de imóveis já fazia 90% do
  trabalho; só faltava o papel. Trade-off: sem histórico de
  angariações (data de início/fim). Fase 3 se necessário.
- **Sync additive-only de papéis do cliente**. Associar como
  vendedor/comprador promove `e_vendedor` / `e_comprador` no cliente,
  mas nunca despromove. O utilizador pode desmarcar manualmente no
  detalhe do cliente.
- **Detalhe público aceita angariações**. Necessário para o card do
  vendedor poder ser clicável (e o vendedor consultar as fotos /
  descrição do próprio imóvel). `AcoesImovel` fica escondido via
  `e_angariacao=true`.
- **`agencia_nome` invisível ao vendedor**. O nome da agência
  visitante é dado comercial interno. O vendedor vê só
  `visitante_origem='agencia_externa'`.
- **`consultor_representante` invisível ao vendedor** (nome do
  colega consultor). Fica só no CRM.
- **Um vendedor por versão de imóvel** (índice único parcial). Para
  trocar de vendedor, desassociar primeiro.
- **PK composta de `imoveis_versoes_clientes` mantém-se** — o mesmo
  par cliente↔versão só tem um papel. Casos em que o mesmo cliente
  compra um imóvel que ele próprio vende ficam fora do âmbito desta
  fase (fase 3 se a prática mostrar necessidade).

Notas
- Sem testes automatizados nas visitas / estatísticas / angariações
  nesta fase (mantém-se a decisão de adiar testes de integração). A
  migração, o modelo, os relationships, o OpenAPI e o fluxo
  end-to-end (curl + BD) foram validados manualmente em dev.
- `VisitaImovelPublic` herda só os campos visíveis ao vendedor;
  não herda de `VisitaImovelBase` para evitar fugas se um dia se
  acrescentar um campo interno à base.

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