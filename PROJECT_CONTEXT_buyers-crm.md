Buyers CRM — Project Context

Última atualização: 2026-11-01

1. Descrição do projecto

O Buyers CRM é um CRM pessoal desenvolvido para consultores imobiliários.

O objectivo é centralizar a captação, gestão e apresentação de imóveis a potenciais compradores.

Funcionalidades principais:

* Captação de imóveis do Idealista através de um userscript Tampermonkey.
* Gestão centralizada dos imóveis.
* Versões editáveis dos imóveis por consultor.
* Gestão de clientes e compradores.
* Associação de imóveis a clientes.
* Geração de PDFs personalizados.
* Criação de páginas públicas com selecções de imóveis.
* Partilha de páginas através de links acessíveis por telemóvel.

Cada consultor deve poder gerir os seus próprios clientes, imóveis, versões editadas e documentos.

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
* Ficheiro principal: userscript/buyers-crm.user.js.

3. Arquitectura funcional

O fluxo principal de captação é:

Idealista
    |
    v
Tampermonkey Userscript
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
    +--> Gestão de clientes
    |
    +--> Associação de imóveis
    |
    +--> Geração de PDFs
    |
    +--> Criação de páginas públicas

Os dados canónicos dos imóveis devem ser preservados.

Cada consultor pode ter uma versão editável do imóvel, sem alterar os dados originais.

As alterações são controladas através do campo campos_alterados e os conflitos podem ser assinalados através de tem_conflitos.

As fotografias são armazenadas em volumes persistentes.

4. Modelo de dados

Tabelas documentadas:

* users
* consultores
* api_keys
* clientes
* cliente_consultor
* imoveis_canonicos
* imoveis_canonicos_historico
* fotos
* imoveis_versoes
* imoveis_versoes_clientes
* pdfs_gerados

O perfil do consultor inclui:

* Consultor.agencia
* Consultor.foto_caminho
* foto_url
* Nome do consultor no schema ConsultorRead.

Existem funcionalidades para carregar e remover a fotografia do consultor e um endpoint público para a apresentar.

Antes de qualquer alteração ao modelo de dados, devem ser consultados os modelos SQLAlchemy, schemas e migrações Alembic existentes.

- `ImovelVersao.estado_imovel` — estado comercial por versão.
- `InteracaoImovel` — interesse/pedido de visita/pedido de info do cliente
  por imóvel. `tipo` + `estado` (pendente/visto/concluido/cancelado).
- `NotaClienteImovel` — thread de mensagens cliente↔consultor, opcionalmente
  ancorada a um imóvel. Marcação de leitura por destinatário.

5. Endpoints documentados

A lista seguinte é baseada na documentação do projecto. Deve ser confirmada no código antes de qualquer alteração.

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
* Clientes.
* Imóveis.
* Ingestão de imóveis.
* Fotografias.
* Geração de PDFs.
* Dashboard.
* Administração.

Prefixo geral documentado: /api.

Esta lista não substitui a verificação dos routers existentes no código.

6. Infraestrutura de produção

O projecto está alojado num servidor doméstico Ubuntu.

Domínios

Serviço	Domínio
CRM privado	crm.chanilaicastro.pt
Páginas públicas	imoveis.chanilaicastro.pt
Site principal	chanilaicastro.pt

O site principal continua alojado na One.com/Vercel.

O CRM e as páginas públicas são servidos pelo servidor doméstico através de subdomínios independentes.

Repositório no servidor

~/projects/buyers-crm

Stacks Docker

Existem três stacks independentes:

Stack	Localização
Buyers CRM	~/projects/buyers-crm
Traefik	~/docker/traefik
Monitoring	~/docker/monitoring

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

7. Docker Compose de produção

Ficheiro:

~/projects/buyers-crm/docker-compose.prod.yml

Serviços:

Serviço	Container	Função
db	buyers_crm_db	PostgreSQL 16
backend	buyers_crm_backend	API FastAPI
frontend	buyers_crm_frontend	CRM privado
frontend-public	buyers_crm_frontend_public	Páginas públicas

Volumes persistentes:

* postgres_data
* fotos_storage
* pdfs_storage
* consultores_storage

Rede externa:

traefik-net:
  external: true

O backend executa as migrações Alembic no arranque e inicia o Uvicorn.

Os frontends são servidos através do Traefik.

8. Monitoring

Ficheiro de configuração:

~/docker/monitoring/docker-compose.yml

Serviços actualmente instalados:

Serviço	Imagem	Container
Portainer	portainer/portainer-ce:latest	portainer
Uptime Kuma	louislam/uptime-kuma:2	uptime-kuma
Watchtower	nickfedor/watchtower:latest	watchtower

Portainer

Gestão visual dos containers Docker.

Domínio previsto:

portainer.chanilaicastro.pt

Uptime Kuma

Monitorização da disponibilidade dos serviços.

Domínio previsto:

uptime.chanilaicastro.pt

Volume persistente:

uptime_kuma_data

Watchtower

Está configurado para:

* Executar verificações diárias às 04:00 UTC.
* Utilizar WATCHTOWER_CLEANUP=true.
* Utilizar WATCHTOWER_LABEL_ENABLE=true.
* Utilizar labels para seleccionar os containers elegíveis.
* Não actualizar o próprio Watchtower.

A configuração pretende permitir actualizações automáticas apenas de Portainer e Uptime Kuma.

A validação do filtro por labels ainda não está concluída.

9. Estado observado dos containers

Última verificação partilhada em 2026-11-01:

Container	Estado
portainer	Up
uptime-kuma	Up (healthy)
watchtower	Up (healthy)
buyers_crm_frontend	Up
buyers_crm_frontend_public	Up
buyers_crm_backend	Up
buyers_crm_db	Up (healthy)
traefik	Up

Este estado corresponde à última verificação conhecida e não representa uma consulta em tempo real.

10. Frontend público

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

O ficheiro de entrada correcto do Vite no frontend privado é:

frontend/index.html

Não recriar frontend/src/index.html.

11. Estrutura do repositório

Estrutura principal documentada:

buyers-crm/
├── backend/
├── frontend/
├── frontend-public/
├── userscript/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── package.json
├── README.md
├── PROJECT_CONTEXT.md
├── TODO.md
└── CHANGELOG.md

A estrutura exacta deve ser confirmada no repositório antes de alterações.

12. Regras de desenvolvimento

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
15. Não efectuar deploy, migrações de produção ou alterações DNS sem confirmação explícita.
16. Utilizar dcp para gerir a stack Buyers CRM em produção.
17. Executar testes, lint e build relevantes após alterações.
18. Documentar alterações em CHANGELOG.md e actualizar TODO.md quando aplicável.

⸻

Nota: Este documento descreve a arquitectura e o estado conhecido do projecto. As tarefas pendentes estão em TODO.md e as alterações realizadas estão em CHANGELOG.md.