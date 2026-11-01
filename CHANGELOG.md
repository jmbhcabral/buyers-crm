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