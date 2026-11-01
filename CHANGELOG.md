Buyers CRM — CHANGELOG

2026-11-01

Infraestrutura — Monitoring

* Alterada a imagem do Watchtower para nickfedor/watchtower:latest.
* Configurado WATCHTOWER_LABEL_ENABLE=true.
* Configurado WATCHTOWER_CLEANUP=true.
* Configurado agendamento diário às 04:00 UTC.
* Configurado timeout de 60 segundos.
* Adicionadas labels de elegibilidade ao Portainer e Uptime Kuma.
* Adicionada label de exclusão ao próprio Watchtower.
* Validada a sintaxe do Docker Compose com docker compose config --quiet.
* Reiniciados os containers Portainer, Uptime Kuma e Watchtower.
* Confirmado que os três containers arrancaram.
* Confirmado que Uptime Kuma e Watchtower apresentam estado healthy.

Diagnóstico

* Consultados os logs do Watchtower.
* Confirmada a versão apresentada nos logs: 1.23.2.
* Confirmado o agendamento seguinte para 2026-11-02 às 04:00 UTC.
* Identificados avisos ao tentar obter informação da imagem local buyers-crm-frontend-public:latest.

Nota: O funcionamento efectivo do filtro por labels e a origem/manutenção da imagem Watchtower continuam por validar. Consultar TODO.md.

2026-11-01 — Validação

* Confirmado, via docker inspect, que Portainer e Uptime Kuma têm
  com.centurylinklabs.watchtower.enable=true.
* Confirmado que o filtro por labels do Watchtower está operacional
  conforme pretendido.


## [Unreleased] — Interações cliente ↔ imóvel

### Added
- Campo `estado_imovel` em `ImovelVersao` (disponivel, reservado, cpcv,
  escritura_marcada, vendido, saiu_mercado). Editável no CRM.
- Tabelas `interacoes_imovel` e `notas_cliente_imovel`.
- Endpoints públicos:
  - GET    /api/public/links/{token}/interacoes
  - PUT    /api/public/links/{token}/imoveis/{id}/interesse
  - POST   /api/public/links/{token}/imoveis/{id}/pedidos
  - DELETE /api/public/links/{token}/interacoes/{id}
  - GET    /api/public/links/{token}/notas
  - POST   /api/public/links/{token}/notas
  - PATCH  /api/public/links/{token}/notas/{id}/ler
- Endpoints CRM:
  - GET/POST /api/clientes/{id}/interacoes, /notas
  - GET/POST /api/imoveis/{id}/interacoes, /notas
  - PATCH    /api/interacoes/{id}
  - PATCH    /api/notas/{id}/ler
  - PATCH    /api/imoveis/{id}/estado
  - GET      /api/dashboard/interacoes-pendentes
- Frontend público: badge de estado, botões Interesse/Visita/Notas nos cards
  e no detalhe, modal de pedido de visita, thread de notas.
- Frontend CRM: selector de estado no detalhe do imóvel, secções de
  interações e notas no detalhe do cliente, cartões de pendentes no dashboard.

### Changed
- `PublicImovelItem`, `PublicImovelDetalhe`, `LinkImovelRead` e
  `ImovelVersaoListItem` incluem `estado_imovel`.