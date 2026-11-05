Buyers CRM — Project Context

Última actualização: 2026-11-05

1. Descrição do projecto

O Buyers CRM é um CRM pessoal desenvolvido para consultores imobiliários.

O objectivo é centralizar a captação, gestão e apresentação de imóveis a potenciais compradores, e dar ao vendedor visibilidade sobre o desempenho do imóvel que está a vender.

Funcionalidades principais:

* Captação de imóveis do Idealista, Supercasa (e brevemente
  Imovirtual, Properstar) através de userscripts Tampermonkey.
* Gestão centralizada dos imóveis.
* Versões editáveis dos imóveis por consultor.
* Gestão de clientes e compradores.
* Papéis do cliente: comprador, vendedor, ou ambos (ver §4).
* Ficha de qualificação do comprador (guião de 4 blocos), preenchida
  no CRM depois da reunião (ver §4).
* Associação de imóveis a clientes, com papel (comprador / vendedor).
* Fichas de visita a imóveis angariados, preenchidas no CRM (ver §4).
* Portal do vendedor: o cliente vendedor vê no link público as
  estatísticas do imóvel que está a vender (visitas, feedback,
  avaliações), sem ver dados pessoais dos visitantes.
* Equipas multi-consultor: um cliente pode ser pessoal (de um
  consultor) ou partilhado pela equipa; a equipa cura o link público
  do cliente, escolhe o consultor de apresentação, e vê as visitas,
  notas e interacções nos detalhes do cliente. As versões de imóvel
  continuam pessoais (ver §4).
* Geração de PDFs personalizados.
* Criação de páginas públicas com selecções de imóveis.
* Partilha de páginas através de links acessíveis por telemóvel.
* Interações cliente ↔ imóvel: interesse, pedidos de visita, pedidos
  de informação e thread de notas por imóvel.
* Estado comercial por versão de imóvel (disponível, reservado, CPCV,
  escritura marcada, vendido, saiu de mercado).

Cada consultor deve poder gerir os seus próprios clientes, imóveis,
versões editadas e documentos. Com equipas, os clientes partilhados
passam a ser geridos por todos os membros da equipa; as versões de
imóvel continuam pessoais.

2. Stack tecnológica

Backend
* Python >= 3.11 (README refere Python 3.12).
* FastAPI.
* Uvicorn.
* SQLAlchemy 2.
* Alembic.
* PostgreSQL 16.
* psycopg.
* Pydantic / pydantic-settings.
* JWT / python-jose.
* bcrypt.
* httpx.
* ReportLab.
* Pillow.
* Ruff.
* pytest.

Frontend privado
* React 19.
* TypeScript.
* Vite.
* Tailwind CSS 3.
* React Router.
* TanStack Query.
* Axios.
* shadcn/ui.
* Radix UI / Base UI.
* Lucide.

Frontend público
* React 19.
* TypeScript.
* Vite.
* Tailwind CSS.
* React Router.
* Axios.
* Lucide.
* Dockerfile próprio.
* Nginx.

Captação de imóveis
* JavaScript.
* Tampermonkey.
* Userscripts: userscript/buyers-crm.user.js (Idealista, legado),
  userscripts/buyers-crm-supercasa.user.js (Supercasa).
* Fonte de cada imóvel: tabela `imoveis_origem` (1:N com
  `imoveis_canonicos`), com UNIQUE `(fonte, id_externo)`.

3. Arquitectura funcional

O fluxo principal de captação é:

Plataformas: Idealista / Supercasa / (Imovirtual) / (Properstar)
    |
    v
Tampermonkey Userscript (1 por plataforma)
    |
    v
Backend FastAPI
    |
    v
Validação através de API Key
    |
    v
Ingestão e deduplicação
    |
    v
PostgreSQL
    |
    +--> Imóveis canónicos
    |
    +--> Histórico de alterações
    |
    +--> Versões editáveis por consultor
    |
    v
Frontend privado
    |
    +--> Gestão de clientes (com papéis e ficha de qualificação)
    |
    +--> Associação de imóveis (comprador / vendedor)
    |
    +--> Fichas de visita
    |
    +--> Geração de PDFs
    |
    +--> Criação de páginas públicas
    |
    v
Links públicos com token (por cliente)

Os dados canónicos dos imóveis devem ser preservados.

Cada consultor pode ter uma versão editável do imóvel, sem alterar os dados originais.

As alterações são controladas através do campo campos_alterados e os conflitos podem ser assinalados através de tem_conflitos.

As fotografias são armazenadas em volumes persistentes.

4. Modelo de dados

Tabelas documentadas:

* users
* consultores
* equipas
* api_keys
* clientes
* cliente_consultor
* imoveis_canonicos
* imoveis_canonicos_historico
* imoveis_origem
* fotos
* imoveis_versoes
* imoveis_versoes_clientes
* pdfs_gerados
* links_cliente
* link_imoveis
* link_acessos
* interacoes_imovel
* notas_cliente_imovel
* qualificacoes_comprador
* visitas_imovel

O perfil do consultor inclui:

* Consultor.agencia
* Consultor.foto_caminho
* foto_url
* Nome do consultor no schema ConsultorRead.
* Consultor.equipa_id (nullable) — equipa a que pertence, ou NULL.

Existem funcionalidades para carregar e remover a fotografia do consultor e um endpoint público para a apresentar.

Antes de qualquer alteração ao modelo de dados, devem ser consultados os modelos SQLAlchemy, schemas e migrações Alembic existentes.

Equipas multi-consultor
- `Equipa` — tabela `equipas` (id, nome UNIQUE, criado_em,
  atualizado_em). Sem pivot `equipa_consultores`: cada consultor tem
  uma coluna `equipa_id` e está em no máximo UMA equipa.
- `Consultor.equipa_id` (nullable FK → `equipas.id`, ON DELETE
  SET NULL). Um consultor não-admin pertence a 0 ou 1 equipa. Admin
  gere tudo independentemente.
- `Cliente.equipa_id` (nullable FK → `equipas.id`, ON DELETE
  SET NULL).
  - `NULL` → cliente **pessoal** (dono via `cliente_consultor`;
    comportamento pré-equipas).
  - `NOT NULL` → cliente **partilhado** pela equipa — todos os
    membros com `consultor.equipa_id == cliente.equipa_id` têm
    acesso.
- `ImovelVersaoCliente.criado_por_consultor_id` (nullable FK →
  `consultores.id`, ON DELETE SET NULL). Regista quem criou a
  associação cliente↔versão. Só ele (ou admin) a pode remover.
  Legacy (`NULL`) → regra recai no dono da versão.
- `LinkCliente.consultor_apresentacao_id` (nullable FK →
  `consultores.id`, ON DELETE SET NULL). Define quem aparece no
  link público. Default = dono do link (`consultor_id`); alterável
  pela equipa via `PATCH /links/{id}/apresentacao`. Validação:
  consultor activo; se o cliente é de equipa, tem de ser membro
  dessa equipa.

Matriz de acesso (centralizada em `app/services/acesso.py`):

| Operação | Regra |
|---|---|
| Ver/colaborar no cliente | admin OR (pessoal E via `cliente_consultor`) OR (equipa E `consultor.equipa_id == cliente.equipa_id`) |
| Editar/apagar cliente (dados base) | admin OR criador (`pode_editar_cliente`; criador = primeiro `cliente_consultor`) |
| Ver versão | admin OR dono OR (versão associada a cliente da minha equipa) |
| Editar/apagar versão | admin OR dono |
| Associar versão↔cliente | `pode_ver_versao` E `pode_gerir_cliente` |
| Desassociar versão↔cliente | admin OR `criado_por_consultor_id == consultor.id` OR (legacy: dono da versão) |
| Gerir link | `pode_gerir_cliente` |
| Adicionar/remover imóvel do link | `pode_gerir_link` |
| Alterar `consultor_apresentacao_id` | `pode_gerir_link` (validado: activo; mesma equipa do cliente) |
| Criar visita | `pode_ver_versao` E `pode_gerir_cliente(vendedor)` |
| Ver/editar/apagar visita | `pode_ver_versao` |

Regras de negócio:

- **"Editar cliente" é do criador; "colaborar" é da equipa.**
  `pode_editar_cliente` (admin OR criador) governa PATCH/DELETE
  do cliente. `pode_gerir_cliente` (equipa) governa tudo o resto
  (ver detalhe, associar imóveis, curar link, ver visitas/notas/
  interacções/qualificação). Isto evita que um colega mude a
  visibilidade de `equipa` para `pessoal` e retire acesso aos
  restantes membros. O criador é o primeiro consultor em
  `cliente_consultor` (ordem de `criado_em`), adicionado no mesmo
  flush da criação.
- **Versão nasce pessoal.** As versões continuam do consultor que
  as criou. Colegas da equipa podem **ver** versões associadas a
  clientes da equipa, mas não editá-las.
- **Curadoria do link pela equipa.** Qualquer membro pode
  adicionar/remover imóveis do link do cliente da equipa.
- **Bloqueio de canónico duplicado**:
  * Por cliente — o mesmo cliente só pode ter UMA versão de cada
    canónico. `POST /imoveis/{v}/clientes/{c}` devolve 409 com o
    id da versão existente.
  * Por link — o mesmo link só pode ter UMA versão de cada
    canónico. `POST /links/{id}/imoveis` devolve 409.
- **Cleanup no link ao desassociar.** `DELETE /imoveis/{v}/clientes/{c}`
  remove `LinkImovel` de todos os links do cliente que apontem
  para essa versão (evita link órfão).
- **Consultor de apresentação uniformizado no público.** Lista e
  detalhe usam o mesmo (`_resolver_apresentacao_id(link)`); antes
  divergia (lista usava o do link, detalhe o da versão).
- **Cliente muda de equipa.** `equipa_id` muda; o link segue o
  cliente (membros da equipa antiga perdem acesso; novos ganham).
  `consultor_apresentacao_id` mantém-se — se apontar para consultor
  da equipa antiga, tem de ser alterado explicitamente.

Origens multi-plataforma
- `ImovelOrigem` — tabela `imoveis_origem` (id, imovel_canonico_id
  FK ON DELETE CASCADE, fonte, id_externo, url, raw_json,
  extraido_em, criado_em, atualizado_em). UNIQUE `(fonte,
  id_externo)`, CHECK em `fonte`.
- `fonte` — `idealista` | `imovirtual` | `supercasa` |
  `properstar`. CHECK na BD (migração `h2i3j4k5l6m7`).
- `id_externo` — id do imóvel na plataforma. No Idealista é o
  `propertyId` do userscript (guardado como string). Nas outras,
  o id do URL.
- `imoveis_canonicos.property_id` é agora NULLABLE. Mantém-se como
  atalho para o Idealista; nas origens que não o Idealista fica
  `NULL`. O índice único aceita múltiplos `NULL` em PostgreSQL.
- `raw_json` do canónico = última captação de qualquer plataforma;
  `raw_json` de cada origem = última captação daquela plataforma.
  Auditoria por plataforma sem partir o dedup do canónico.
- O lookup do canónico é por `(fonte, id_externo)` via
  `ImovelOrigem`, com fallback para `property_id` quando a origem
  é o Idealista (retrocompatibilidade com o userscript antigo).
- Fotos: `Foto.idealista_id` continua a ser o `multimediaId` do
  Idealista; nas outras plataformas é `NULL` e a deduplicação
  faz-se por `url_original`. Pasta no disco: `{property_id}/`
  (Idealista) ou `canonico_{id}/` (outras). Nome do ficheiro:
  `{idealista_id}.{ext}` ou hash SHA-1 curto de `url_original`
  (12 chars).

Papéis do cliente e qualificação do comprador
- `Cliente.e_comprador` e `Cliente.e_vendedor` (booleanos NOT NULL,
  com CHECK `e_comprador OR e_vendedor`). Um cliente pode ser
  comprador, vendedor, ou ambos — não há dois registos por cliente.
  Backfill da migração: clientes existentes ficaram
  `e_comprador=true`.
- `QualificacaoComprador` — ficha de qualificação do comprador,
  1:1 com `Cliente` (`cliente_id` UNIQUE, `ON DELETE CASCADE`).
  Preenchida no CRM **depois da reunião**, em 4 blocos:
  disponibilidade, perfil/motivação, imóvel pretendido, financeira.
  Estado `nao_iniciada | em_preenchimento | concluida`.
  `consultor_id` aponta para `users.id` (não `consultores.id`).
- A ficha só existe para o lado comprador. `PUT` num cliente sem
  `e_comprador=true` devolve 409.
- `tem_imovel_venda` / `precisa_vender_comprar` na ficha são os
  sinalizadores do lado vendedor. Quando `tem_imovel_venda=true`, o
  formulário do CRM sugere marcar o cliente como vendedor (PATCH).
- A secção "IDENTIFICAÇÃO DO IMÓVEL SOLICITADO" do PDF de
  qualificação não duplica dados: continua coberta por LinkImovel +
  InteracaoImovel.

Associação cliente ↔ versão de imóvel
- `ImovelVersaoCliente` — pivot N:N entre `Cliente` e `ImovelVersao`.
  PK composta `(imovel_versao_id, cliente_id)`. Coluna `papel` com
  CHECK `papel IN ('comprador','vendedor')` e default `comprador`.
  Um mesmo par cliente↔versão só tem um papel (a PK composta impede
  mais).
- `criado_por_consultor_id` (FK → `consultores.id`, ON DELETE SET
  NULL) regista quem criou a associação. Só ele (ou admin) a pode
  remover; nas linhas anteriores à migração `g1h2i3j4k5l6` o campo
  é `NULL` e a regra recai no dono da versão.
- **`papel='comprador'`** — o imóvel é uma sugestão ao cliente.
  Autoriza o `LinkImovel` (o imóvel entra no link público curado).
- **`papel='vendedor'`** — o imóvel é uma angariação do cliente.
  Autoriza o registo de `VisitaImovel` para esse imóvel, e coloca-o
  automaticamente na lista "Meus Imóveis" do link público (sem
  passar pelo `LinkImovel` curado).
- **Índice único parcial** `uq_imoveis_versoes_clientes_vendedor` em
  `imovel_versao_id` WHERE `papel='vendedor'`: um imóvel só tem UM
  vendedor (angariação). Para trocar, desassociar primeiro.
- **Sync additive-only**: associar um cliente como comprador/vendedor
  promove `e_comprador` / `e_vendedor` no cliente para `true`. Nunca
  despromove. O utilizador pode desmarcar manualmente no detalhe do
  cliente.
- **Regra Q2** — imóveis que o cliente está a vender são excluídos
  da lista comprador do link público, para não aparecerem nas duas
  tabs.
- **Bloqueio de canónico duplicado** — o mesmo cliente não pode ter
  duas versões do mesmo canónico. `POST /imoveis/{v}/clientes/{c}`
  devolve 409 com o id da versão existente. Resolve o problema de
  duplicação no link público quando há mais do que um consultor a
  gerir o cliente.

Fichas de visita (lado vendedor)
- `VisitaImovel` — ficha de visita preenchida pelo consultor no CRM
  depois de cada visita ao imóvel angariado. `imovel_versao_id` FK
  (ON DELETE CASCADE) — se a versão desaparece, as visitas
  desaparecem.
- **Internos** (nunca saem do CRM): `visitante_nome`,
  `visitante_contacto`, `visitante_email`,
  `consultor_representante`, `notas_internas`.
- **Visíveis ao vendedor** (via `VisitaImovelPublic`): `data_visita`,
  `visitante_origem` (`agencia_externa` | `particular` |
  `cliente_proprio` | `walk_in` | `outro`), `gostou`, `nao_gostou`,
  `observacoes`, 6 ratings 1–5 (`rating_areas`,
  `rating_acabamentos`, `rating_localizacao`,
  `rating_apresentacao`, `rating_preco`, `rating_global`) e
  `compraria` (bool).
- **`agencia_nome`** existe na tabela mas **não** sai para o
  endpoint público — o nome da agência visitante é dado comercial
  interno. Só a categoria `agencia_externa` é visível.
- Ficha só pode ser criada se a versão tiver uma angariação activa
  (`papel='vendedor'`) **e** o utilizador tiver acesso ao cliente
  vendedor (`pode_gerir_cliente`). Caso contrário, 400/404.

Imóvel e versão
- `ImovelVersao.estado_imovel` — estado comercial por versão
  (disponivel | reservado | cpcv | escritura_marcada | vendido |
  saiu_mercado). Editável no CRM, exposto no frontend público.

Interações e notas
- `InteracaoImovel` — interesse / pedido de visita / pedido de info do
  cliente por imóvel. Campos `tipo` e `estado`
  (pendente | visto | concluido | cancelado). Índice único parcial em
  (cliente_id, imovel_versao_id) para tipo="interesse".
- Interesse e pedidos ficam **bloqueados** para imóveis que são
  angariações do próprio cliente (400 no backend).
- `NotaClienteImovel` — thread de mensagens cliente↔consultor,
  **sempre ancorada a um imóvel**. A coluna imovel_versao_id é, em
  prática, obrigatória a partir de 2026-11-01. Permanece nullable
  apenas para preservar registos criados antes dessa data; esses
  registos são apresentados no frontend como legacy (read-only).
  Marcação de leitura por destinatário.
- Acesso à thread (CRM): `pode_gerir_cliente` do cliente a que a
  nota está associada. Um membro da equipa vê as notas do cliente
  da equipa; versões de colegas não alargam o acesso para além
  disso.

Links públicos
- `LinkCliente` — token público associado a um cliente e a um
  consultor. Campos relevantes: `token_prefix` (indexável),
  `token_visible` (últimos caracteres mostrados na UI),
  `url_publica`, `ativo`, `expira_em`, `revogado_em`,
  `ultimo_acesso_em`, `consultor_apresentacao_id`. O link não tem
  "tipo": cliente comprador, vendedor ou ambos usam o mesmo token;
  o frontend público decide o que renderizar com base em
  `e_comprador` / `e_vendedor` devolvidos pelo backend.
- `consultor_apresentacao_id` — quem aparece no link público.
  Default = dono do link (`consultor_id`). Alterável pela equipa via
  `PATCH /links/{id}/apresentacao`; tem de ser consultor activo e,
  se o cliente é de equipa, membro dessa equipa. Se `NULL` ou
  apontar para consultor apagado, cai para `consultor_id`.
  - **`ClienteRead.posso_editar`** — calculado em `GET /clientes/{id}`,
  `POST /clientes` e `PATCH /clientes/{id}` com base em
  `pode_editar_cliente`. O frontend usa-o para desabilitar o
  `FormCliente` quando o utilizador não é o criador. Na listagem
  (`GET /clientes`) vem `True` por omissão (não há edição inline).
- Unicidade do link:
  - Cliente **pessoal** (`cliente.equipa_id IS NULL`): um link por
    par `(cliente_id, consultor_id)` — unique constraint existente.
  - Cliente **de equipa** (`cliente.equipa_id NOT NULL`): **um** link
    por cliente (independente do consultor que o criou), validado
    no router. Membros da equipa partilham o link.
- `LinkImovel` — associação N:N entre Link e ImovelVersao, com
  `ordem`. Só aceita imóveis associados ao cliente como
  **comprador**. Bloqueia duplicado de canónico: o mesmo link não
  pode ter duas versões do mesmo imóvel (409).
- `LinkAcesso` — registo de acessos ao link (user_agent, referrer,
  imovel_versao_id opcional) para analytics simples. **Não** é
  usado nas estatísticas do vendedor (só `VisitaImovel`).

5. Geração de links públicos com token

O link público é criado no CRM (por cliente) e partilhado pelo
consultor. Com equipas, o link de um cliente de equipa é **um só**
(independente do consultor que o criou) e pode ser gerido por
qualquer membro da equipa. Cliente pessoal mantém a regra antiga
(um por par cliente↔consultor), gerido através do painel
`LinkCliente` no detalhe do cliente.

Mecânica
- O backend gera o token no momento da criação do link. O token é
  apresentado na `url_publica` devolvida ao frontend.
- Apenas o prefixo é armazenado de forma indexável (`token_prefix`)
  e os últimos caracteres ficam visíveis na UI (`token_visible`).
  O token completo nunca é reconstruído a partir da BD.
- A validação do link público faz-se pelo token recebido na rota;
  o router resolve o Link correspondente e verifica:
  * `ativo = true`;
  * `expira_em` no futuro;
  * `revogado_em IS NULL`.
  Falhas devolvem 404 (não encontrado) ou 410 (expirado/revogado).
- Um acesso é registado em `link_acessos` sempre que um endpoint
  público é servido com sucesso (lista e detalhe).
- O consultor pode revogar o link (`revogado_em`) ou deixá-lo
  expirar; um novo link pode ser gerado substituindo o anterior.

Consultor de apresentação
- `LinkCliente.consultor_apresentacao_id` define quem aparece na
  página pública (nome, agência, foto, contactos). Default = dono
  do link (`consultor_id`); alterável por qualquer membro da equipa
  do cliente via `PATCH /links/{id}/apresentacao`.
- Validação: consultor activo; se o cliente é de equipa, tem de ser
  membro dessa equipa.
- Fallback: se `consultor_apresentacao_id IS NULL` (ou aponta para
  consultor apagado), usa-se `consultor_id`.
- O backend unifica a escolha em `_resolver_apresentacao_id(link)`,
  usada tanto na lista (`GET /public/links/{token}`) como no detalhe
  (`GET /public/links/{token}/imoveis/{versao}`). Antes divergia: a
  lista mostrava o dono do link, o detalhe mostrava o dono da
  versão.

Universo de imóveis no link público
- **Comprador** (`imoveis` na resposta): imóveis do `LinkImovel`
  curados pela equipa. Filtra pela regra Q2 — exclui canónicos que
  o cliente está a vender. A curadoria é feita por qualquer membro
  da equipa (via `pode_gerir_link`); o bloqueio de canónico
  duplicado evita duplicados no link.
- **Vendedor** (`imoveis_vendedor` na resposta): imóveis cujo
  `ImovelVersaoCliente.papel='vendedor'` e
  `ImovelVersaoCliente.cliente_id = link.cliente_id`. Automático,
  não passa pelo `LinkImovel`. Cada item traz agregados das visitas
  (`num_visitas`, `rating_global_medio`, `ultima_visita_em`).
- **Detalhe e fotos** aceitam ambos (comprador ou angariação). O
  payload do detalhe traz `e_angariacao: bool` — o frontend público
  esconde as `AcoesImovel` (Interesse / Visita / Notas) quando é
  angariação.
- **`_resolver_imovel_no_link`** não valida
  `versao.consultor_id == link.consultor_id` — a associação
  (`LinkImovel` ou `ImovelVersaoCliente`) é a única fonte de verdade.
  Isto é o que permite a um colega adicionar ao link a versão de
  outro.

Endpoints (todos com prefixo `/api`)
- CRM:
  * POST   /links                                  — cria link
  * GET    /clientes/{id}/link                     — link ativo
  * POST   /links/{id}/imoveis                     — adiciona imóvel
    (tem de estar associado como **comprador**; 409 se já há versão
    desse canónico no link)
  * DELETE /links/{id}/imoveis/{versao}            — remove imóvel
  * POST   /links/{id}/revogar                     — revoga link
  * PATCH  /links/{id}/apresentacao                — define o
    consultor de apresentação
  * GET    /links/{id}/analytics                   — acessos
- Público — comprador:
  * GET    /public/links/{token}
  * GET    /public/links/{token}/imoveis/{versao}
  * GET    /public/links/{token}/interacoes
  * PUT    /public/links/{token}/imoveis/{versao}/interesse
  * POST   /public/links/{token}/imoveis/{versao}/pedidos
  * DELETE /public/links/{token}/interacoes/{id}
  * GET    /public/links/{token}/notas?imovel_versao_id=...
  * POST   /public/links/{token}/notas
  * PATCH  /public/links/{token}/notas/{id}/ler
- Público — vendedor:
  * GET    /public/links/{token}/imoveis-vendedor/{versao}/estatisticas

Notas
- O token identifica sempre um cliente. Do lado do backend, qualquer
  operação sobre notas/pedidos filtra por `link.cliente_id` — não há
  forma de um cliente aceder a dados de outro através do mesmo token.
- As estatísticas do vendedor agregam **apenas** `VisitaImovel`.
  `LinkAcesso` (visualizações do link) não entra. A secção
  `plataformas: []` está reservada para estatísticas manuais de
  portais (Idealista, Imovirtual, etc.), fase 3.

6. Endpoints documentados

A lista seguinte é baseada na documentação do projecto. Deve ser
confirmada no código antes de qualquer alteração.

Autenticação
POST /auth/login
POST /auth/refresh
GET  /me

Perfil do consultor
GET    /me/consultor
PATCH  /me/consultor
PATCH  /me
POST   /me/consultor/foto
DELETE /me/consultor/foto
GET    /api/public/consultores/{id}/foto

Existem também endpoints para:
* API Keys.
* Clientes:
  * GET    /clientes            — próprios + da equipa
  * GET    /clientes/{id}       — devolve `posso_editar` calculado
  * POST   /clientes            — aceita `equipa_id` opcional (null =
    pessoal; id = cliente de equipa; validado: só a própria equipa)
  * PATCH  /clientes/{id}       — só o criador ou admin (**403** caso
    contrário); aceita `equipa_id` (idem)
  * DELETE /clientes/{id}       — só o criador ou admin (**403**)
* Imóveis:
  * GET    /imoveis?incluir_equipa=true — inclui versões de colegas
    associadas a clientes da equipa
  * Ingestão multi-plataforma (via X-API-Key):
    * POST /imoveis/ingest — payload com `fonte` (default
      `idealista`), `idExterno`, `propertyId` (obrigatório só no
      Idealista), `fotos[]` com `id` ou `urlExterna`. Devolve `acao`,
      `fonte`, `id_externo`, `imovel_canonico_id`,
      `imovel_versao_id`, contadores de fotos e versões.
* Fotografias.
* Geração de PDFs.
* Dashboard (inclui /dashboard/interacoes-pendentes; agrega
  clientes/versões/PDFs da equipa).
* Ficha de qualificação de comprador (CRM, autenticado):
  * GET    /clientes/{id}/qualificacao-comprador
  * PUT    /clientes/{id}/qualificacao-comprador  (upsert; 409 se
    o cliente não for comprador)
  * DELETE /clientes/{id}/qualificacao-comprador
* Associação cliente↔imóvel (CRM, autenticado):
  * POST   /imoveis/{versao_id}/clientes/{cliente_id}?papel=...
    (default `comprador`; 409 em conflito de papel, vendedor
    duplicado ou canónico duplicado para o mesmo cliente)
  * DELETE /imoveis/{versao_id}/clientes/{cliente_id}
    (só o criador da associação, ou admin; legacy = dono da versão;
    limpa `LinkImovel` do cliente)
  * GET    /imoveis/{versao_id}/clientes  (devolve `papel` por
    cliente)
* Fichas de visita (CRM, autenticado):
  * POST   /imoveis/{versao_id}/visitas  (400 sem angariação; 404
    sem acesso ao cliente vendedor)
  * GET    /imoveis/{versao_id}/visitas
  * PATCH  /visitas/{visita_id}
  * DELETE /visitas/{visita_id}
* Equipas (admin, sob `Depends(get_admin_user)`):
  * GET    /admin/equipas
  * POST   /admin/equipas
  * GET    /admin/equipas/{id}  (devolve membros)
  * PATCH  /admin/equipas/{id}
  * DELETE /admin/equipas/{id}  (SET NULL em consultores e clientes)
  * POST   /admin/equipas/{id}/consultores/{cid}  (409 se consultor
    já pertence a outra equipa)
  * DELETE /admin/equipas/{id}/consultores/{cid}
* Administração (todos sob `Depends(get_admin_user)`):
  * GET   /admin/stats
  * GET   /admin/consultores
  * POST  /admin/consultores
  * PUT   /admin/consultores/{id}/credenciais
  * GET   /admin/canonicos
  * GET   /admin/versoes
  * GET   /admin/historico
  * GET   /admin/pdfs
* Conta própria (qualquer utilizador autenticado):
  * PUT   /me/password
* Links públicos (ver secção 5).

Prefixo geral documentado: /api.

Esta lista não substitui a verificação dos routers existentes no
código.

7. Infraestrutura de produção

O projecto está alojado num servidor doméstico Ubuntu.

Domínios
Serviço            | Domínio
CRM privado        | crm.chanilaicastro.pt
Páginas públicas   | imoveis.chanilaicastro.pt
Site principal     | chanilaicastro.pt

O site principal continua alojado na One.com/Vercel.

O CRM e as páginas públicas são servidos pelo servidor doméstico
através de subdomínios independentes.

Repositório no servidor
~/projects/buyers-crm

Stacks Docker
Stack        | Localização
Buyers CRM   | ~/projects/buyers-crm
Traefik      | ~/docker/traefik
Monitoring   | ~/docker/monitoring

Gestão da stack Buyers CRM

Existe um alias Bash configurado em /home/jorge/.bashrc:

alias dcp="docker compose --env-file ~/projects/buyers-crm/.env.prod -f ~/projects/buyers-crm/docker-compose.prod.yml"

Utilizar sempre dcp para gerir a stack Buyers CRM em produção.

Exemplos:
dcp ps
dcp logs -f backend
dcp up -d
dcp down
dcp restart backend

Não criar scripts alternativos para substituir este alias.

7.1. Ambiente de desenvolvimento

Em desenvolvimento, apenas a base de dados e o backend correm em
Docker. Os dois frontends correm no host, através do Vite dev server.

Serviços em Docker (dev)
Ficheiro: ~/projects/buyers-crm/docker-compose.yml

Serviço   | Container            | Função
db        | buyers_crm_db        | PostgreSQL 16
backend   | buyers_crm_backend   | API FastAPI (uvicorn --reload)

Portas expostas:
- backend: ${BACKEND_PORT:-8000}:8000 (por omissão, 8000)
- db: sem port mapping para o host (só acessível pela rede do compose)

Não há profiles no docker-compose.yml — os dois serviços sobem sempre.

Serviços no host (dev)
Serviço         | Como arrancar                       | Porta
frontend        | cd frontend && pnpm dev             | 5173
frontend-public | cd frontend-public && pnpm dev      | 5174

Os dois frontends declaram `packageManager` em package.json (pnpm).
Os respectivos vite.config.ts definem `server.host: true` (aceita
ligações da rede local) e `server.port` (5173 / 5174). Portanto,
ambos podem estar a correr ao mesmo tempo sem colidir.

Ligação frontend → backend em dev
- Os dois frontends usam `baseURL: '/api'` (relativo) em
  src/lib/api.ts.
- Os respectivos vite.config.ts fazem proxy de `/api` para
  http://localhost:8000 (changeOrigin: true).
- Não há .env nos frontends. A base URL do backend nunca aparece no
  código do cliente; fica sempre atrás do proxy Vite em dev, e atrás
  do Traefik em prod.
- O backend em dev aceita CORS de qualquer origem (settings.is_dev),
  mas o proxy torna o CORS irrelevante em dev.

Comandos úteis (dev)
docker compose up -d db backend   # arranca backend + db
docker compose exec -T backend pytest -q
docker compose logs -f backend
docker compose exec -T backend alembic upgrade head
cd frontend && pnpm dev           # Vite em 5173
cd frontend-public && pnpm dev    # Vite em 5174

Notas
- O backend executa as migrações Alembic no arranque (ver §8). Em
  dev, isso significa que um simples `docker compose up -d backend`
  aplica migrações pendentes.
- O volume do código do backend está montado no container, por isso
  edições aos ficheiros em backend/ são apanhadas pelo --reload sem
  rebuild.
- Edições ao código dos frontends são apanhadas pelo HMR do Vite,
  sem rebuild.

8. Docker Compose de produção

Ficheiro: ~/projects/buyers-crm/docker-compose.prod.yml

Serviços
Serviço           | Container                   | Função
db                | buyers_crm_db               | PostgreSQL 16
backend           | buyers_crm_backend          | API FastAPI
frontend          | buyers_crm_frontend         | CRM privado
frontend-public   | buyers_crm_frontend_public  | Páginas públicas

Volumes persistentes
* postgres_data
* fotos_storage
* pdfs_storage
* consultores_storage

Rede externa
traefik-net:
  external: true

O backend executa as migrações Alembic no arranque e inicia o Uvicorn.
Os frontends são servidos através do Traefik.

9. Monitoring

Ficheiro de configuração: ~/docker/monitoring/docker-compose.yml

Serviços actualmente instalados
Serviço      | Imagem                          | Container
Portainer    | portainer/portainer-ce:latest   | portainer
Uptime Kuma  | louislam/uptime-kuma:2          | uptime-kuma
Watchtower   | nickfedor/watchtower:latest     | watchtower

Portainer
Gestão visual dos containers Docker.
Domínio previsto: portainer.chanilaicastro.pt

Uptime Kuma
Monitorização da disponibilidade dos serviços.
Domínio previsto: uptime.chanilaicastro.pt
Volume persistente: uptime_kuma_data

Watchtower
Está configurado para:
* Executar verificações diárias às 04:00 UTC.
* Utilizar WATCHTOWER_CLEANUP=true.
* Utilizar WATCHTOWER_LABEL_ENABLE=true.
* Utilizar labels para seleccionar os containers elegíveis.
* Não actualizar o próprio Watchtower.

A configuração permite actualizações automáticas apenas de Portainer
e Uptime Kuma.

A validação do filtro por labels ficou concluída em 2026-11-01.

10. Estado observado dos containers

Última verificação partilhada em 2026-11-01:

Container                    | Estado
portainer                    | Up
uptime-kuma                  | Up (healthy)
watchtower                   | Up (healthy)
buyers_crm_frontend          | Up
buyers_crm_frontend_public   | Up
buyers_crm_backend           | Up
buyers_crm_db                | Up (healthy)
traefik                      | Up

Este estado corresponde à última verificação conhecida e não
representa uma consulta em tempo real.

11. Frontend público

O frontend público é uma aplicação independente do CRM privado.

O trabalho recente nesta área incluiu:
* Header responsivo.
* Fotografia do consultor.
* Nome e agência do consultor.
* Contactos telefónicos e email.
* Thumbnails dos imóveis.
* Favicon.
* Open Graph metadata.
* Imagem de partilha.
* Cache-busting da fotografia do consultor.
* Badge de estado do imóvel.
* Ações Interesse / Visita / Notas por imóvel.
* Modais de pedido de visita e de notas.
* Sticky bar de ações em mobile no detalhe.
* **Portal do vendedor**:
  * Tabs `Imóveis` / `Meus Imóveis` quando o cliente é ambos
    (`e_comprador && e_vendedor`). Tab única directa caso contrário.
  * Card `CardImovelVendedor` com sub-tabs `Resumo` / `Visitas`,
    carregando as estatísticas on-demand.
  * Detalhe público aceita angariações (`e_angariacao`) e esconde
    as `AcoesImovel` nesse caso.
  * Foto de capa dos imóveis angariados servida pela rota de fotos
    pública (validador aceita LinkImovel e angariação).
  * `agencia_nome` e `consultor_representante` **nunca** aparecem ao
    vendedor.
* **Equipas multi-consultor** (sem alterações visuais):
  * O payload passa a servir `consultor_apresentacao` em vez do
    dono do link (lista e detalhe uniformizados).
  * A UI não muda — o `ConsultorPublic` (nome, agência, foto,
    contactos) é o mesmo, apenas escolhido pela equipa.

O ficheiro de entrada correcto do Vite no frontend privado é:
frontend/index.html

Não recriar frontend/src/index.html.

12. Estrutura do repositório

A estrutura de pastas e ficheiros é mantida em
PROJECT_STRUCTURE.txt na raiz do repositório. É a **fonte
canónica**; este documento não a duplica. Antes de qualquer
alteração estrutural (criar/mover/apagar pastas ou ficheiros),
consultar esse ficheiro em vez de confiar em memória.

Para regenerar:
tree -a -L 6 \\
  -I 'node_modules|dist|build|.git|.venv|venv|__pycache__|.pytest_cache|.mypy_cache|.ruff_cache|.next|coverage|.cache|.turbo|.vite|vendor|*.pyc|*.log|.DS_Store' \\
  > PROJECT_STRUCTURE.txt

Notas sobre o comando:
- `-a` inclui ficheiros ocultos (.env, .gitignore, etc.).
- `-L 6` limita a profundidade a 6 níveis — suficiente para a
  estrutura actual; se um dia houver paths mais fundos, subir o
  valor.
- O `-I` exclui pastas/ficheiros gerados (dependências,
  caches, builds, logs, bytecode).
- `tree` é o binário do sistema (`apt install tree` em Ubuntu).

Topo do repositório (resumo):

buyers-crm/
├── backend/           — API FastAPI + Alembic + scripts
├── frontend/          — CRM privado (React + Vite)
├── frontend-public/   — Páginas públicas (React + Vite)
├── userscript/        — Userscript Tampermonkey (Idealista, legado)
├── userscripts/       — Userscripts multi-plataforma (Supercasa)
├── help commands/     — Notas de apoio ao desenvolvimento
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── package.json
├── README.md
├── PROJECT_CONTEXT_buyers-crm.md
├── PROJECT_STRUCTURE.txt
├── TODO_buyers-crm.md
└── CHANGELOG.md

A árvore detalhada (263 ficheiros, 43 diretórios à data de
2026-11-05) está em PROJECT_STRUCTURE.txt. Actualizar esse
ficheiro quando a estrutura mudar de forma significativa —
idealmente na mesma alteração que introduz o novo ficheiro/pasta.

13. Regras de desenvolvimento

1. Analisar primeiro, implementar depois.
2. Explicar as decisões técnicas passo a passo.
3. Não reescrever funcionalidades sem necessidade.
4. Não alterar a arquitectura sem justificação.
5. Inspeccionar ficheiros e tipos reais antes de editar.
6. Utilizar TypeScript correctamente tipado.
7. Evitar any.
8. Manter backend, frontend privado e frontend público separados.
9. Utilizar Alembic para alterações ao modelo de dados.
10. Proteger endpoints privados com autenticação e autorização.
11. Expor apenas os dados mínimos necessários nos endpoints públicos.
12. Nunca incluir credenciais reais em commits.
13. Utilizar .env local e manter .env.example sem segredos.
14. Não executar operações destrutivas sem confirmação.
15. Não efectuar deploy, migrações de produção ou alterações DNS
    sem confirmação explícita.
16. Utilizar dcp para gerir a stack Buyers CRM em produção.
17. Executar testes, lint e build relevantes após alterações.
18. Documentar alterações em CHANGELOG.md e actualizar TODO.md
    quando aplicável.

⸻

Nota: Este documento descreve a arquitectura e o estado conhecido do
projecto. A estrutura detalhada de ficheiros está em
PROJECT_STRUCTURE.txt. As tarefas pendentes estão em TODO.md e as
alterações realizadas estão em CHANGELOG.md.