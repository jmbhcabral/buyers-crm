Buyers CRM — TODO

Última atualização: 2026-11-01

Progresso

* Foto, nome, agência e contactos do consultor no cabeçalho público.
* Thumbnail real na lista de imóveis do CRM.
* Favicon e Open Graph na aplicação pública.
* Marcar imóvel como favorito (cliente → consultor vê).
* Notificar o consultor quando o cliente abre o link.
* Pedido de visita na aplicação pública.
* Exportar CSV de imóveis e clientes.
* Filtros e pesquisa na aplicação pública.
* Marcar imóvel como vendido/reservado.
* Validação de formulários com react-hook-form + Zod.
* Melhorar a responsividade mobile do CRM (sidebar colapsável).
* Dark mode na aplicação pública.
* Testes automatizados.
* Backups off-site (disco externo e/ou nuvem).
* Script de deploy (./deploy.sh).
* Multi-consultor com partilha.
* Landing page para o site principal.
* PWA (instalação no telemóvel).

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