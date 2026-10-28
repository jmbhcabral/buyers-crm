# Buyers CRM

CRM pessoal para captação de imóveis do [Idealista](https://www.idealista.pt), gestão de clientes (compradores) e geração de PDFs personalizados.

## O que faz

- **Captação automática** de imóveis do Idealista via userscript (Tampermonkey)
- **Snapshot canónico** partilhado + **versões editáveis** por consultor
- **Merge inteligente**: quando o Idealista muda um imóvel, cada consultor mantém as suas edições e vê os conflitos
- **Download automático** de fotos em background
- **Gestão de clientes** (compradores) com associação N:N a imóveis
- **Geração de PDFs** personalizados (nome do cliente, contactos do consultor, galeria de fotos)
- **Histórico de PDFs** com download e gestão
- **Painel de admin** com auditoria completa

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic |
| Base de dados | PostgreSQL 16 |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v3, shadcn/ui (Base UI) |
| HTTP client | axios + TanStack Query |
| PDF | reportlab + Pillow |
| Userscript | Tampermonkey |
| Infra | Docker + Docker Compose |

## Arquitetura

O userscript corre no Idealista no browser, extrai os dados do imóvel, e envia para o backend com X-API-Key. O backend faz o ingest, sincroniza o canónico, faz merge nas versões de cada consultor, e dispara o download das fotos em background. O frontend React consome a API e gera PDFs personalizados.

### Modelo de dados

- users — login (admin + consultores)
- consultores — perfil profissional (1:1 com user)
- api_keys — para o userscript
- clientes — compradores
- cliente_consultor — N:N entre clientes e consultores
- imoveis_canonicos — snapshot do Idealista (partilhado)
- imoveis_canonicos_historico — histórico de captações
- fotos — pertencem ao canónico
- imoveis_versoes — cópia editável por consultor
- imoveis_versoes_clientes — N:N entre versões e clientes
- pdfs_gerados — PDFs gerados por consultor

**Decisões de arquitetura:**

- **Canónico vs versão**: um imóvel pode ser captado por vários consultores. Cada um tem a sua versão editável, mas o snapshot canónico é partilhado. Se o Idealista mudar, todos ficam a saber; cada um decide o que fazer com as suas edições.
- **Merge por campo**: cada versão guarda campos_alterados (JSONB). No ingest seguinte, o backend só atualiza os campos que o consultor não tocou, e marca tem_conflitos=true nos que ele tocou e o Idealista também mudou.
- **Fotos no canónico, PDFs por consultor**: as fotos são iguais para todos (vêm do Idealista); os PDFs são gerados por consultor e ficam isolados.

## Instalação

### Pré-requisitos

- macOS (testado em Mac Pro) ou Linux
- Docker Desktop (inclui docker e docker compose)
- Node.js 20+ e pnpm (npm install -g pnpm)
- Tampermonkey no browser (Chrome, Firefox ou Edge)

### 1. Clonar e configurar

    git clone <repo-url> ~/projects/buyers-crm
    cd ~/projects/buyers-crm
    cp .env.example .env

    # Gerar um JWT_SECRET forte
    python3 -c "import secrets; print(secrets.token_urlsafe(64))"
    # Cola o output em JWT_SECRET=... no .env

### 2. Arrancar o backend + base de dados

    docker compose up -d
    docker compose logs -f backend

Espera por Application startup complete.

Aplica as migrações:

    docker compose exec backend alembic upgrade head

Popula com dados de teste:

    docker compose exec backend python -m scripts.seed

**Atenção:** guarda a API key em claro que aparece no output do seed. Só aparece uma vez. Se a perderes, cria outra no frontend em /perfil.

### 3. Arrancar o frontend

    cd frontend
    pnpm install
    pnpm dev

Abre http://localhost:5173.

**Credenciais (seed):**

| Role | Email | Password |
|---|---|---|
| Admin | admin@buyers-crm.pt | admin |
| Consultor | jorge@buyers-crm.pt | jorge |
| Consultor | maria@buyers-crm.pt | maria |

### 4. Instalar o userscript

1. Abre o Tampermonkey, Dashboard, novo script
2. Copia o conteúdo de userscript/buyers-crm.user.js
3. Cmd+S para guardar
4. Vai a um imóvel do Idealista (https://www.idealista.pt/imovel/...)
5. Clica em "Configurar API Key" e cola a chave do seed (ou uma nova que cries em /perfil)
6. Clica em "Enviar para Servidor"

O imóvel aparece na lista em /imoveis.

## Estrutura do projeto

    buyers-crm/
    ├── docker-compose.yml
    ├── .env.example
    ├── Makefile
    ├── backend/
    │   ├── Dockerfile
    │   ├── pyproject.toml
    │   ├── alembic/
    │   │   ├── env.py
    │   │   └── versions/
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
    │   │   │   ├── ingest.py
    │   │   │   ├── fotos.py
    │   │   │   ├── pdf.py
    │   │   │   └── pdf_storage.py
    │   │   └── storage/
    │   │       ├── fotos/
    │   │       └── pdfs/
    │   └── scripts/
    │       ├── seed.py
    │       └── smoke_test.py
    ├── frontend/
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── tailwind.config.js
    │   ├── components.json
    │   └── src/
    │       ├── App.tsx
    │       ├── main.tsx
    │       ├── components/
    │       │   ├── ui/
    │       │   ├── layout/
    │       │   ├── imovel/
    │       │   ├── cliente/
    │       │   └── perfil/
    │       ├── pages/
    │       │   ├── Login.tsx
    │       │   ├── Dashboard.tsx
    │       │   ├── Imoveis.tsx
    │       │   ├── ImovelDetalhe.tsx
    │       │   ├── Clientes.tsx
    │       │   ├── ClienteDetalhe.tsx
    │       │   ├── Pdfs.tsx
    │       │   ├── Perfil.tsx
    │       │   └── Admin.tsx
    │       ├── hooks/
    │       ├── lib/
    │       │   ├── api.ts
    │       │   ├── auth.tsx
    │       │   ├── use-auth.ts
    │       │   └── toast.ts
    │       └── types/
    └── userscript/
        └── buyers-crm.user.js

## Comandos úteis

Backend + DB:

    make up              # docker compose up -d
    make down            # docker compose down
    make logs            # logs do backend
    make shell           # shell no container do backend
    make psql            # psql na BD
    make migrate         # alembic upgrade head
    make revision m="..." # nova migração
    make seed            # popula com dados de teste

Frontend:

    cd frontend
    pnpm dev             # dev server (hot reload)
    pnpm build           # build de produção
    pnpm preview         # preview do build

Backup:

    docker compose exec -T db pg_dump -U buyers buyers_crm > backup_$(date +%Y%m%d).sql

## Fluxo de utilização

1. **Captar imóvel:** vais ao Idealista, clicas no userscript, o imóvel aparece em /imoveis
2. **Editar:** clicas em "Ver", ajustas título, preço, descrição, notas
3. **Adicionar cliente:** em /clientes, "Novo cliente"
4. **Associar:** no detalhe do imóvel, "Clientes interessados", escolhes cliente
5. **Gerar PDF:** no detalhe do imóvel, escolhes cliente, "Gerar PDF". Aparece em /pdfs e descarrega automaticamente
6. **Auditar:** em /admin (só admin), histórico de captações, PDFs, versões por consultor

## Endpoints principais

Todos em /api:

- Auth: POST /auth/login, POST /auth/refresh, GET /me
- Perfil: GET/PATCH /me/consultor
- API keys: GET/POST /me/api-keys, DELETE /me/api-keys/{id}
- Clientes: GET/POST /clientes, GET/PATCH/DELETE /clientes/{id}
- Imóveis: GET/POST /imoveis, GET/PATCH/DELETE /imoveis/{id}
- Ingest: POST /imoveis/ingest (X-API-Key)
- Fotos: GET /imoveis/{id}/fotos/{foto_id}
- PDF: POST /imoveis/{id}/pdf?cliente_id=X
- PDFs: GET/DELETE /pdfs, GET /pdfs/{id}
- Dashboard: GET /dashboard/stats, /imoveis-recentes, /pdfs-recentes
- Admin: GET /admin/stats, /consultores, /canonicos, /versoes, /historico, /pdfs
- Docs: GET /docs (só em dev)

Documentação interativa: http://localhost:8000/docs

## Notas técnicas

### CORS e Private Network Access

O Chrome bloqueia pedidos de sites públicos (https://www.idealista.pt) para servidores locais (http://localhost:8000). O backend tem um PrivateNetworkAccessMiddleware que envia o header Access-Control-Allow-Private-Network: true.

Em produção com HTTPS (servidor real), este middleware pode ser removido.

### Dedup e merge no ingest

Quando o userscript envia um imóvel:

1. Se o property_id é novo, cria canónico + versão + fotos
2. Se o raw_json é idêntico, não faz nada (mas cria versão para novos consultores)
3. Se o raw_json é diferente, atualiza canónico, guarda histórico, e faz merge:
   - Campos não editados pelo consultor: copia do canónico
   - Campos editados pelo consultor: mantém a edição, marca conflito se o Idealista também mudou

### PDFs persistentes

Cada PDF é guardado em /app/storage/pdfs/{consultor_id}/ (volume Docker) e registado na tabela pdfs_gerados. Se gerares novamente para o mesmo imóvel+cliente, o anterior é substituído (não acumula).

### Datas em UTC

Todas as datas no backend são timezone-aware (UTC). O frontend converte para o fuso local do browser.

## Troubleshooting

### Porta 5432/5434 ocupada

    lsof -i :5432

Se houver outro Postgres, muda POSTGRES_PORT no .env para 5433.

### Backend não arranca

    docker compose logs --tail=50 backend

Causas comuns:
- .env sem JWT_SECRET ou DATABASE_URL
- Migração pendente (alembic upgrade head)
- Modelo novo sem import no models/__init__.py

### Frontend não abre

    cd frontend
    pnpm install
    pnpm dev

Se a porta 5173 estiver ocupada: pnpm dev --port 5174.

### Userscript não envia

1. Confirma que o backend está em localhost:8000 (vê docker compose ps)
2. No Tampermonkey, verifica se o script está ativo e associado a idealista.pt
3. Abre o DevTools, Console, vê o erro
4. Verifica a API key em /perfil (deve estar ativa)

### Fotos não aparecem

Os downloads correm em background. Espera 5-10s depois do ingest. Depois:

    docker compose exec backend ls -la /app/storage/fotos/

Se a pasta estiver vazia, vê os logs do backend (grep "fotos").

## Roadmap

- Validação de forms com react-hook-form + zod
- Responsividade mobile (sidebar colapsável)
- Thumbnails reais na lista de imóveis
- Pesquisa por localização/preço
- Export CSV de imóveis/clientes
- Testes automatizados (pytest + vitest)
- Deploy em produção com HTTPS

## Licença

Uso pessoal. Não distribuir sem autorização.