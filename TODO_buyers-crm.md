Buyers CRM — TODO

Última atualização: 2026-11-01

Concluído nesta ronda
- Favoritos na aplicação pública — entregue como "Interesse" na
  feature de Interações cliente ↔ imóvel. Inclui persistência por
  cliente, isolamento entre clientes, consulta no CRM e remoção.
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
- Contagem de interesses/pedidos por imóvel no gestor de links
  (requer agregação no backend).

⸻

Funcionalidades e melhorias pendentes

CRM e gestão de imóveis
- Exportar CSV de imóveis e clientes.
- Validação de formulários com react-hook-form + Zod.
- Melhorar a responsividade mobile do CRM (sidebar colapsável).
- Considerar estado_imovel como filtro na listagem de imóveis.

Aplicação pública
- Filtros e pesquisa na aplicação pública.
- Dark mode na aplicação pública.
- PWA (instalação no telemóvel).

Clientes e consultores
- Notificar o consultor quando o cliente abre o link.
- Multi-consultor com partilha.

Interações e notas
- Notificações (email/push) para novos pedidos de visita.
- Contagem de interesses/pedidos por imóvel no gestor de links.
- Rate limiting nas rotas públicas de notas/pedidos.
- Avaliar mover estado_imovel para o canónico e sincronizar por
  versão (decisão atual: vive na versão).
- Backfill das notas antigas (imovel_versao_id IS NULL): apagar,
  reassociar ou deixar no bucket legacy.

Marketing e presença online
- Landing page para o site principal.

Qualidade e manutenção
- Testes automatizados.
- Testes de integração para os endpoints de interações e notas.
- Testes do fluxo público (token → interações → notas).

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