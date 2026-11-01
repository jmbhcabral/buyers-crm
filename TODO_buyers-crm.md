Buyers CRM — TODO

Última atualização: 2026-11-01

Próxima tarefa — Favoritos

Permitir que um cliente marque imóveis como favoritos na aplicação pública e que o consultor consiga consultar essa seleção no CRM.

Comportamento esperado

1. O cliente abre a página pública através do link recebido.
2. Cada imóvel apresenta um ícone de coração para adicionar/remover favoritos.
3. A aplicação guarda a preferência associada ao cliente e ao imóvel.
4. Os favoritos mantêm-se quando o cliente volta a abrir o link.
5. O consultor consegue consultar os imóveis favoritos no CRM.
6. O cliente pode retirar um imóvel dos favoritos.

Critérios de aceitação

* Adicionar um imóvel aos favoritos.
* Remover um imóvel dos favoritos.
* Persistência após atualizar ou reabrir o link.
* Consulta dos favoritos pelo consultor no CRM.
* Isolamento dos favoritos entre clientes.
* Testes das operações e permissões.

Cuidados técnicos

* Reutilizar os modelos e relações existentes.
* Identificar como o link público identifica o cliente.
* Impedir favoritos duplicados na base de dados.
* Validar no backend as permissões associadas ao link/token.
* Não depender apenas do armazenamento local do browser.

⸻

Funcionalidades e melhorias pendentes

CRM e gestão de imóveis

* Marcar imóvel como vendido/reservado.
* Marcar visitar imóvel.
* Exportar CSV de imóveis e clientes.
* Validação de formulários com react-hook-form + Zod.
* Melhorar a responsividade mobile do CRM (sidebar colapsável).

Aplicação pública

* Filtros e pesquisa na aplicação pública.
* Dark mode na aplicação pública.
* Pedido de visita na aplicação pública.
* PWA (instalação no telemóvel).

Clientes e consultores

* Notificar o consultor quando o cliente abre o link.
* Multi-consultor com partilha.

Marketing e presença online

* Landing page para o site principal.

Qualidade e manutenção

* Testes automatizados.

Infraestrutura

* Validar o funcionamento do filtro por labels do Watchtower.✅
* Investigar os avisos relativos à imagem local buyers-crm-frontend-public:latest.✅
* Confirmar a origem e manutenção da imagem nickfedor/watchtower.✅
* Confirmar que apenas Portainer e Uptime Kuma são elegíveis para actualizações automáticas.✅
* Configurar alertas no Uptime Kuma.
* Implementar backups automáticos do PostgreSQL.
* Implementar backups dos volumes persistentes.
* Configurar backups off-site (disco externo e/ou nuvem).
* Testar recuperação de backups.
* Criar script de deploy (./deploy.sh).


- [ ] Adicionar notificações (email/push) para novos pedidos de visita.
- [ ] Mostrar contagem de interesses/pedidos por imóvel no gestor de links
      (requer agregação no backend).
- [ ] Considerar "estado_imovel" como filtro na listagem de imóveis (CRM).
- [ ] Avaliar mover estado para o canónico e sincronizar por versão
      (atualmente vive na versão, decisão tomada).
- [ ] Rate limiting nas rotas públicas de notas/pedidos.