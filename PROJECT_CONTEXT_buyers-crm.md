# Buyers CRM — Project Context / Handover

> Documento de passagem de contexto preparado a 2026-11-01 a partir do repositório GitHub e do contexto das conversas anteriores.
> **Fonte de verdade:** código e histórico Git em `jmbhcabral/buyers-crm`, branch `main`.
> **Limitação:** este documento não contém o histórico completo da conversa DeepSeek. Decisões ou tarefas que não estejam no repositório ou no contexto recuperado estão assinaladas como não confirmadas.

## 1. Identificação e objectivo

**Buyers CRM** é um CRM pessoal para consultores imobiliários, destinado a:
- Captar imóveis do Idealista através de um userscript Tampermonkey.
- Manter um registo canónico partilhado dos imóveis e versões editáveis por consultor.
- Gerir compradores/clientes e associá-los a imóveis.
- Gerar documentos PDF personalizados.
- Disponibilizar páginas web públicas e personalizadas com selecções de imóveis para partilhar com clientes através de um link no telemóvel.

O projecto é usado no contexto da actividade imobiliária de Jorge e Chanilai. A ferramenta deve facilitar a pesquisa/organização de imóveis e a apresentação de selecções aos compradores.

## 2. Stack tecnológica confirmada no repositório

### Backend
- Python (imagem Docker; `pyproject.toml` declara Python >=3.11; README refere Python 3.12).
- FastAPI + Uvicorn.
- SQLAlchemy 2.0 + Alembic.
- PostgreSQL 16 + psycopg.
- Pydantic / pydantic-settings.
- JWT (`python-jose`) e bcrypt.
- httpx para downloads de fotografias.
- ReportLab + Pillow para PDFs.
- Ruff, pytest e pytest-asyncio para qualidade/testes.

### Frontend privado
- React 19, TypeScript, Vite.
- Tailwind CSS v3.
- React Router.
- TanStack Query, Axios.
- Componentes shadcn/ui / Radix / Base UI.
- Lucide icons.

### Frontend público
- Aplicação React 19 + TypeScript + Vite separada, em `frontend-public/`.
- Tailwind CSS, React Router, Axios e Lucide.
- Tem Dockerfile e configuração Nginx próprios.

### Captação
- Userscript JavaScript em `userscript/buyers-crm.user.js`, executado pelo Tampermonkey no Idealista.

### Infraestrutura
- Docker e Docker Compose.
- Compose de desenvolvimento: `docker-compose.yml`.
- Compose de produção: `docker-compose.prod.yml`.
- Volumes persistentes para PostgreSQL, fotos, PDFs e fotografias dos consultores.
- Produção configurada para integrar numa rede Docker externa `traefik-net`, com labels Traefik.

## 3. Arquitectura e componentes

### Fluxo de captação
1. O consultor abre uma página de imóvel no Idealista.
2. O userscript extrai os dados e envia-os ao backend usando `X-API-Key`.
3. O backend faz ingestão e deduplicação pelo identificador do imóvel.
4. Mantém um snapshot canónico partilhado e uma versão editável por consultor.
5. As fotografias são descarregadas em background e guardadas em storage persistente.
6. O frontend privado permite consultar, editar e associar imóveis a compradores.

### Canónico e versões editáveis
- `imoveis_canonicos`: dados de origem do Idealista, partilhados.
- `imoveis_canonicos_historico`: histórico das captações.
- `imoveis_versoes`: versão por consultor.
- `campos_alterados` (JSONB): regista os campos editados pelo consultor.
- No ingest seguinte, os campos não editados podem ser actualizados a partir do canónico.
- Se o Idealista alterar um campo que o consultor também editou, a versão deve preservar a edição e assinalar conflito (`tem_conflitos`).

### Clientes e PDFs
- Clientes/compradores podem estar associados a vários consultores.
- Imóveis/versões podem estar associados a vários clientes.
- PDFs são gerados por consultor e guardados em `pdfs_gerados`.
- As fotografias dos imóveis pertencem ao canónico; os PDFs são específicos do consultor.

### Página pública
O repositório contém agora `frontend-public/`, uma aplicação distinta do CRM privado. O Compose de produção define:
- CRM privado em `crm.chanilaicastro.pt`.
- Páginas públicas em `imoveis.chanilaicastro.pt`.
- O frontend público encaminha `/api` para o serviço do backend através do Traefik (`crm-api`).

**Objectivo operacional já discutido:** páginas de imóveis personalizadas, acessíveis através de links partilháveis no telemóvel, idealmente com validade limitada. A implementação exacta de expiração/links temporários deve ser confirmada no código backend antes de se assumir que está concluída.

## 4. Modelo de dados descrito no README

Tabelas/modelos documentados:
- `users` — autenticação (admin e consultores).
- `consultores` — perfil profissional, relação 1:1 com user.
- `api_keys` — chaves de autenticação do userscript.
- `clientes` — compradores.
- `cliente_consultor` — associação N:N entre clientes e consultores.
- `imoveis_canonicos` — snapshot partilhado do Idealista.
- `imoveis_canonicos_historico` — histórico de captações.
- `fotos` — fotografias associadas ao canónico.
- `imoveis_versoes` — cópia editável por consultor.
- `imoveis_versoes_clientes` — associação N:N entre versões e clientes.
- `pdfs_gerados` — PDFs por consultor.

O README e commits recentes indicam evolução do perfil do consultor com:
- `Consultor.agencia`.
- `Consultor.foto_caminho`.
- `foto_url` e nome expostos em `ConsultorRead`.
- Upload/remoção de foto e endpoint público para servir a foto.

Confirmar sempre os modelos e migrações actuais antes de alterar a base de dados.

## 5. Estrutura principal do repositório

```text
buyers-crm/
├── .env.example
├── .env.prod.example
├── Makefile
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── deps.py
│   │   ├── middleware.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   └── storage/
│   └── scripts/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
├── frontend-public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
└── userscript/
    └── buyers-crm.user.js
```

A estrutura interna completa de `backend/app`, `frontend/src` e `frontend-public/src` deve ser consultada directamente no repositório, pois pode evoluir.

## 6. Endpoints documentados no README

Prefixo geral: `/api`.

- Autenticação: `POST /auth/login`, `POST /auth/refresh`, `GET /me`.
- Perfil: `GET/PATCH /me/consultor`.
- API keys: `GET/POST /me/api-keys`, `DELETE /me/api-keys/{id}`.
- Clientes: `GET/POST /clientes`, `GET/PATCH/DELETE /clientes/{id}`.
- Imóveis: `GET/POST /imoveis`, `GET/PATCH/DELETE /imoveis/{id}`.
- Ingest: `POST /imoveis/ingest` (usa `X-API-Key`).
- Fotos: `GET /imoveis/{id}/fotos/{foto_id}`.
- PDF: `POST /imoveis/{id}/pdf?cliente_id=X`.
- PDFs: `GET/DELETE /pdfs`, `GET /pdfs/{id}`.
- Dashboard: `/dashboard/stats`, `/dashboard/imoveis-recentes`, `/dashboard/pdfs-recentes`.
- Admin: `/admin/stats`, `/admin/consultores`, `/admin/canonicos`, `/admin/versoes`, `/admin/historico`, `/admin/pdfs`.

Commits recentes acrescentaram/alteraram endpoints de perfil:
- `GET /api/me/consultor`.
- `PATCH /api/me` para actualizar o nome do user.
- `POST /api/me/consultor/foto`.
- `DELETE /api/me/consultor/foto`.
- `GET /api/public/consultores/{id}/foto`.

Esta lista é documental; confirmar os routers actuais para saber o estado exacto.

## 7. Configuração e comandos

### Desenvolvimento
Pré-requisitos documentados:
- Docker / Docker Compose.
- Node.js 20+ e pnpm.
- Tampermonkey no browser.

Configuração inicial:
```bash
git clone https://github.com/jmbhcabral/buyers-crm.git ~/projects/buyers-crm
cd ~/projects/buyers-crm
cp .env.example .env
```

Gerar segredo JWT:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Arranque:
```bash
docker compose up -d
docker compose logs -f backend
docker compose exec backend alembic upgrade head
```

Frontend privado:
```bash
cd frontend
pnpm install
pnpm dev
```

Comandos Makefile:
```bash
make up
make down
make logs
make rebuild
make migrate
make revision m="descricao"
make seed
make shell
make psql
make fmt
make lint
make test
```

Builds dos frontends:
```bash
cd frontend && pnpm build
cd frontend-public && pnpm build
```

### Produção
`docker-compose.prod.yml` assume:
- `.env` de produção baseado em `.env.prod.example`.
- Rede Docker externa `traefik-net` já criada e Traefik operacional.
- Backend, frontend privado e frontend público.
- Hostnames `crm.chanilaicastro.pt` e `imoveis.chanilaicastro.pt`.
- Migrações Alembic executadas no arranque do backend.
- Volumes persistentes `postgres_data`, `fotos_storage`, `pdfs_storage`, `consultores_storage`.

**Não executar comandos de produção nem alterar DNS/Traefik sem confirmar primeiro o estado do servidor e o plano de deploy.**

## 8. Estado e alterações recentes observáveis no Git

Branch por omissão: `main`. Repositório público, não arquivado.

Últimos commits observados (UTC):
- `db40b017` — 2026-11-01 04:23 — `fix: index.html em frontend/src apagado`.
- `37b42430` — 2026-11-01 03:53 — `chore: adicionar link no index,html`.
- `a2767a65` — 2026-11-01 03:12 — `feat(public): OG image completa + meta tags OG no index.html`.
- `a31800c5` — 2026-11-01 00:21 — `feat(public): header responsivo + ícones de telefone/email com links`.
- `2cd72cb5` — 2026-10-31 23:48 — `feat(public): header duplicado + foto maior + contactos do consultor`.
- `300cb040` — 2026-10-31 23:38 — `feat: foto do consultor no header público + thumbnails na lista de imóveis`.
- `8d217e42` — 2026-10-31 22:51 — alinhamento do avatar no perfil.
- `aa443c76` — 2026-10-31 22:45 — cache-busting no URL da foto.
- `bb2b3094` — 2026-10-31 22:28 — perfil do consultor com agência, nome e foto, endpoints e volume Docker persistente.

O último commit corrigiu o `index.html`: o ficheiro Vite deve estar em `frontend/index.html`, não em `frontend/src/index.html`. O commit mais recente modificou o primeiro e removeu o segundo. Não recriar `frontend/src/index.html`.

### Último foco de desenvolvimento inferido
A actividade mais recente está concentrada na experiência das páginas públicas:
- Cabeçalho responsivo.
- Foto e contactos do consultor.
- Ícones telefone/email com links.
- Miniaturas de imóveis.
- Imagem Open Graph e metadados para partilha em redes sociais/mensagens.
- Correcção do `index.html` do frontend privado.

Isto é inferido pelos títulos/diffs dos commits; não confirma que todos os comportamentos foram testados em produção.

## 9. Contexto de produto e restrições previamente definidas

- O CRM está actualmente desenvolvido no Mac e existe intenção de o instalar num Ubuntu Server doméstico.
- O objectivo é servir as ferramentas e as páginas públicas a partir do servidor de casa, acessíveis mesmo quando o utilizador está fora.
- O site principal `chanilaicastro.pt` deve continuar alojado na One.com/Vercel e não pode sofrer interrupções.
- A aplicação CRM e as páginas públicas devem usar subdomínios separados.
- Foi considerada a utilização de Cloudflare DNS/Tunnel para publicar os subdomínios sem expor o IP doméstico nem abrir portas no router.
- A intenção discutida para as páginas públicas é permitir enviar ao cliente um link com uma selecção de imóveis, acessível no telemóvel e possivelmente com prazo de validade.
- A captação de imóveis é feita a partir do Idealista/Casafari; o fluxo actual documentado no README é o userscript Tampermonkey para Idealista.
- O utilizador usa iPhone e a esposa usa Android. Foi discutida a necessidade de tornar a captação utilizável em browsers/dispositivos diferentes; não assumir que uma solução de userscript Tampermonkey funciona nativamente em todos os browsers móveis.

## 10. Roadmap documentado no README

- Validação de formulários com react-hook-form + zod.
- Melhorar responsividade mobile (sidebar colapsável).
- Miniaturas reais na lista de imóveis.
- Pesquisa por localização/preço.
- Exportação CSV de imóveis/clientes.
- Testes automatizados (pytest + vitest).
- Deploy em produção com HTTPS.

Nota: parte deste roadmap pode já ter sido implementada desde a escrita do README. Em particular, commits recentes referem miniaturas na lista e existe uma configuração de produção com Traefik. Verificar o código antes de tratar estas tarefas como pendentes.

## 11. Pontos que exigem verificação antes de continuar

1. Inspeccionar `frontend-public/src` para documentar as rotas e o fluxo exacto de partilha pública.
2. Inspeccionar os routers e schemas backend relacionados com páginas públicas, tokens/links e expiração.
3. Confirmar se os links públicos têm validade limitada ou se essa funcionalidade ainda está por implementar.
4. Verificar o estado real dos testes e executar lint/build antes de grandes alterações.
5. Verificar o estado do servidor Ubuntu, Docker, Traefik e Cloudflare Tunnel antes de qualquer deploy.
6. Rever a discrepância entre README e implementação recente, actualizando a documentação quando o comportamento estiver confirmado.
7. Confirmar se o utilizador tem alterações locais não enviadas para Git; o repositório remoto apenas mostra commits publicados.

## 12. Regras de engenharia para futuras sessões

- Trabalhar como Senior Software Engineer: analisar primeiro, explicar decisões e implementar passo a passo.
- Não reescrever funcionalidades existentes sem necessidade.
- Não alterar a arquitectura sem justificar impacto e benefícios.
- Antes de editar, inspeccionar os ficheiros reais e os tipos/interfaces existentes.
- Manter TypeScript tipado; evitar `any`.
- Preservar separação entre backend, frontend privado e frontend público.
- Criar/alterar migrações Alembic quando o modelo de dados mudar; não editar a base de dados manualmente como substituto de migrações.
- Considerar autenticação e autorização em todos os endpoints privados; endpoints públicos devem expor apenas os dados necessários.
- Nunca incluir segredos reais em commits. Usar `.env` local e manter `.env.example` sem credenciais.
- Não executar alterações destrutivas, deploy, migrações em produção ou alterações DNS sem confirmação explícita.
- Após cada alteração: executar os testes/lint/build relevantes, resumir ficheiros alterados e sugerir uma mensagem de commit.
- Actualizar `PROJECT_CONTEXT.md`, `TODO.md` e `CHANGELOG.md` quando o estado do projecto mudar de forma relevante.

## 13. Instrução inicial para o próximo assistente

Começa por ler este documento e inspeccionar o estado actual da branch `main` no repositório `https://github.com/jmbhcabral/buyers-crm`.

Não assumas que o README está totalmente actualizado. Compara-o com o código, especialmente `frontend-public`, os endpoints públicos e a configuração de produção.

Primeiro apresenta:
1. O que está efectivamente implementado.
2. O que parece estar em desenvolvimento.
3. O que está por confirmar.
4. O próximo passo técnico recomendado.

Não alteres ficheiros nem faças commits até receberes instruções.
