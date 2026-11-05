// ==UserScript==
// @name         Buyers CRM - Extrator Supercasa
// @namespace    https://buyers-crm.local
// @version      1.0.1
// @description  Envia dados de imóveis do Supercasa para o Buyers CRM.
// @author       Tu
// @match        https://supercasa.pt/venda-*/*
// @match        https://supercasa.pt/arrendar-*/*
// @icon         https://supercasa.pt/Images/favicon.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ============================================
    // CONFIG
    // ============================================
    const FONTE = 'supercasa';
    const API_BASE = 'https://crm.chanilaicastro.pt';
    const CHAVE_API_KEY = 'buyers_crm_api_key';
    const CHAVE_HISTORICO = 'buyers_crm_historico_supercasa';

    const COR_PRIMARIA = '#007bff';
    const COR_SUCESSO = '#28a745';
    const COR_AVISO = '#ffc107';
    const COR_ERRO = '#dc3545';

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function log(...args) {
        console.log('%c[Buyers CRM · Supercasa]', 'color:#007bff;font-weight:bold', ...args);
    }
    function warn(...args) {
        console.warn('%c[Buyers CRM · Supercasa]', 'color:#ffc107;font-weight:bold', ...args);
    }
    function erro(...args) {
        console.error('%c[Buyers CRM · Supercasa]', 'color:#dc3545;font-weight:bold', ...args);
    }

    function notificar(mensagem, cor = COR_PRIMARIA, duracao = 4000) {
        const el = document.createElement('div');
        el.textContent = mensagem;
        el.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            z-index: 999999; padding: 12px 24px; background: ${cor}; color: white;
            border-radius: 8px; font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
        `;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.style.opacity = '1');
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, duracao);
    }

    // ============================================
    // API KEY
    // ============================================
    function obterApiKey() {
        let key = GM_getValue(CHAVE_API_KEY, null);
        if (!key) {
            key = prompt('Cola a tua API key do Buyers CRM:\n(bcr_...)');
            if (key) {
                GM_setValue(CHAVE_API_KEY, key.trim());
                notificar('✅ API key guardada', COR_SUCESSO);
            }
        }
        return key;
    }

    function configurarApiKey() {
        const nova = prompt('Nova API key (deixa vazio para cancelar):',
                            GM_getValue(CHAVE_API_KEY, ''));
        if (nova !== null && nova.trim()) {
            GM_setValue(CHAVE_API_KEY, nova.trim());
            notificar('✅ API key atualizada', COR_SUCESSO);
        }
    }

    // ============================================
    // EXTRAÇÃO
    // ============================================

    /** Extrai o id externo (i<num>) do URL. */
    function obterIdExterno() {
        const m = window.location.pathname.match(/(?:^|\/)(?:[a-z]{2}-[a-z]{2}\/)?(?:venda|arrendar)-[^/]+\/i(\d+)$/);
        return m ? m[1] : null;
    }

    /** Lê o JSON-LD (RealEstateListing + Offer + Accommodation + RealEstateAgent). */
    function lerJsonLd() {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
            try {
                const dados = JSON.parse(s.textContent);
                const graph = dados['@graph'] || (Array.isArray(dados) ? dados : [dados]);
                const listing = graph.find(n => n['@type'] === 'RealEstateListing');
                const offer = graph.find(n => n['@type'] === 'Offer');
                const acc = graph.find(n => n['@type'] === 'Accommodation');
                const agent = graph.find(n => n['@type'] === 'RealEstateAgent');
                if (listing || acc) {
                    return { listing, offer, acc, agent, raw: dados };
                }
            } catch (e) {
                warn('JSON-LD inválido:', e.message);
            }
        }
        return null;
    }

    /** Extrai a ref do anunciante do DOM (não está no JSON-LD). */
    function obterReferenciaAnunciante() {
        const el = document.querySelector('.property-summary__ref span');
        if (!el) return null;
        // "Ref: SuperCasa C0492-00209" → "C0492-00209"
        const txt = el.textContent.trim();
        const m = txt.match(/^Ref:\s*(?:SuperCasa\s+)?(.+)$/i);
        return m ? m[1].trim() : txt;
    }

    /**
     * Descrição real do imóvel (DOM).
     *
     * O JSON-LD do Supercasa mete no `Accommodation.description` um
     * resumo gerado ("<tipo> <tipologia> Área bruta N m², ..."), não
     * o texto do anunciante. O texto completo vive em
     * `#description p.text-base` no DOM (o botão "Ler mais" só
     * esconde visualmente; o innerText devolve tudo).
     *
     * Fallback para o JSON-LD se o DOM não tiver o bloco.
     */
    function obterDescricao(jsonLd) {
        const el = document.querySelector('#description p.text-base, .detail__description-text p');
        if (el) {
            const txt = (el.innerText || el.textContent || '').trim();
            if (txt) return txt;
        }
        return jsonLd?.acc?.description || null;
    }

    /** Extrai as características específicas dos blocos h3 + ul. */
    function obterCaracteristicasEspecificas() {
        const blocos = [];
        document.querySelectorAll('.detail__feature-list .o-container-feature-gray').forEach(bloco => {
            const titulo = bloco.querySelector('h3')?.textContent.trim();
            const itens = Array.from(bloco.querySelectorAll('li'))
                .map(li => li.textContent.trim())
                .filter(Boolean);
            if (titulo && itens.length) {
                blocos.push({ grupo: titulo, itens });
            }
        });
        return blocos;
    }

    /** Extrai o superClientID (id do anunciante) do DOM. */
    function obterSuperClientID() {
        // 1. Input hidden do formulário de contacto
        const input = document.querySelector('input[name="SuperClientID"]');
        if (input && input.value) return input.value.trim();

        // 2. Link da agência: /pro/<slug>-<id>
        const link = document.querySelector('a[href^="/pro/"]');
        if (link) {
            const m = link.getAttribute('href').match(/-(\d+)$/);
            if (m) return m[1];
        }

        // 3. onclick="Contact.showPhone(this, '/contact/getphone', <scid>, <clientid>, ...)"
        const botao = document.querySelector('[onclick*="/contact/getphone"]');
        if (botao) {
            const m = botao.getAttribute('onclick').match(/getphone'[^)]*?,\s*\d+\s*,\s*(\d+)/);
            if (m) return m[1];
        }

        return null;
    }

    /** Extrai o __RequestVerificationToken da página. */
    function obterToken() {
        const inputs = document.querySelectorAll('input[name="__RequestVerificationToken"]');
        for (const i of inputs) {
            if (i.value) return i.value;
        }
        return null;
    }

    /** Extrai o telefone do anunciante via AJAX. */
    async function obterTelefone(idExterno) {
        const superClientID = obterSuperClientID();
        const token = obterToken();

        if (!superClientID) {
            return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                     erro: 'superClientID não encontrado' };
        }
        if (!token) {
            return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                     erro: '__RequestVerificationToken não encontrado' };
        }

        try {
            const body = new URLSearchParams({
                superCasaID: idExterno,
                superClientID: superClientID,
                sectionID: '3',
                personID: '',
                __RequestVerificationToken: token,
            });

            const resp = await fetch('/contact/getphone', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*',
                },
                body: body.toString(),
            });

            if (!resp.ok) {
                return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                         erro: `HTTP ${resp.status}` };
            }

            const dados = await resp.json();
            if (!dados.success || !dados.phone) {
                return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                         erro: dados.action || 'Sem telefone disponível' };
            }

            const num = String(dados.phone).replace(/\s/g, '').trim();
            return {
                fonte: 'AJAX',
                numero: num,
                telefones: [{ number: num, formatted: num, type: null }],
                temTelemovel: false,
                erro: null,
            };
        } catch (e) {
            return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                     erro: e.message };
        }
    }

    /** Extrai as fotos do JSON-LD (image[]) + fallbacks do DOM. */
    function extrairFotos(jsonLd) {
        const urls = new Set();

        // 1. JSON-LD (imagens em Z720x540 — servem para download)
        if (jsonLd?.acc?.image) {
            const imgs = Array.isArray(jsonLd.acc.image) ? jsonLd.acc.image : [jsonLd.acc.image];
            imgs.forEach(u => u && urls.add(u));
        }

        // 2. Fallback: DOM (detail__photo com src ou data-src)
        if (urls.size === 0) {
            document.querySelectorAll('.detail__photo img').forEach(img => {
                const u = img.getAttribute('src') || img.getAttribute('data-src');
                if (u && u.startsWith('https://imagens.supercasa.pt/')) urls.add(u);
            });
        }

        return Array.from(urls).map((url, idx) => ({
            id: null,
            tag: null,
            titulo: null,
            url: url,
            urlWebp: url.replace(/\.jpg$/, '.jpg.webp'),
            largura: null,
            altura: null,
            posicao: idx,
            urlExterna: url,
        }));
    }

    /** Constrói o payload final. */
    async function extrairDados() {
        const idExterno = obterIdExterno();
        if (!idExterno) throw new Error('id externo não encontrado no URL');

        const jsonLd = lerJsonLd();
        if (!jsonLd) throw new Error('JSON-LD não encontrado');

        const { listing, offer, acc, agent, raw } = jsonLd;

        // Localização (monta lista legível a partir do JSON-LD)
        const localizacao = [];
        const addr = acc?.availableAtOrFrom?.address;
        if (addr) {
            if (addr.addressNeighborhood) localizacao.push(addr.addressNeighborhood);
            if (addr.addressLocality) localizacao.push(addr.addressLocality);
            if (addr.addressRegion) localizacao.push(addr.addressRegion);
            if (addr.addressCountry) localizacao.push(addr.addressCountry);
        }

        // Características a partir do JSON-LD (tipologia, área, quartos, etc.)
        const caracteristicas = [];
        if (acc?.floorSize) {
            caracteristicas.push({ nome: 'Área', valor: `${acc.floorSize.value} ${acc.floorSize.unitCode}` });
        }
        if (acc?.numberOfBedrooms != null) {
            caracteristicas.push({ nome: 'Quartos', valor: String(acc.numberOfBedrooms) });
        }
        if (acc?.numberOfBathroomsTotal != null) {
            caracteristicas.push({ nome: 'Casas de banho', valor: String(acc.numberOfBathroomsTotal) });
        }
        if (acc?.floorLevel) {
            caracteristicas.push({ nome: 'Piso', valor: String(acc.floorLevel) });
        }
        if (acc?.yearBuilt) {
            caracteristicas.push({ nome: 'Ano de construção', valor: String(acc.yearBuilt) });
        }
        if (acc?.name) {
            caracteristicas.push({ nome: 'Nome', valor: acc.name });
        }

        // Preço: formatar como string com "€" (o backend guarda String)
        const precoNum = offer?.price;
        const preco = precoNum != null
            ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
                .format(precoNum).replace(/\u00A0/g, ' ')
            : null;

        // Telefone (AJAX)
        const telefone = await obterTelefone(idExterno);

        // Fotos
        const fotos = extrairFotos(jsonLd);

        // Características específicas (DOM)
        const caracteristicasEspecificas = obterCaracteristicasEspecificas();

        return {
            fonte: FONTE,
            idExterno: idExterno,

            titulo: acc?.name || listing?.name || document.title,
            preco: preco,
            localizacao: localizacao.length ? localizacao : null,
            descricao: obterDescricao(jsonLd),
            url: window.location.href,
            anunciante: agent?.name || null,
            referenciaAnunciante: obterReferenciaAnunciante(),

            caracteristicas: caracteristicas.length ? caracteristicas : null,
            caracteristicasEspecificas: caracteristicasEspecificas.length ? caracteristicasEspecificas : null,
            plantas: null,
            videos: null,
            toursVirtuais: null,
            contagens: null,
            telefone: telefone,

            fotos: fotos,

            // Campos exclusivos do Supercasa (guardados no raw_json da origem)
            supercasa: {
                superClientID: obterSuperClientID(),
                listing: listing || null,
                offer: offer || null,
                acc: acc || null,
                agent: agent || null,
                raw: raw,
            },

            extraidoEm: new Date().toISOString(),
        };
    }

    // ============================================
    // ENVIO PARA O BACKEND
    // ============================================
    async function enviarParaServidor() {
        const apiKey = obterApiKey();
        if (!apiKey) {
            notificar('❌ API key em falta', COR_ERRO);
            return;
        }

        notificar('⏳ A extrair e enviar...', COR_PRIMARIA);

        try {
            const dados = await extrairDados();

            if (!dados.idExterno) {
                throw new Error('idExterno não encontrado');
            }

            const resp = await fetch(`${API_BASE}/api/imoveis/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify(dados),
            });

            if (!resp.ok) {
                const erroTxt = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${erroTxt.substring(0, 200)}`);
            }

            const resultado = await resp.json();
            log('Resultado:', resultado);

            // Guardar no histórico local
            const hist = GM_getValue(CHAVE_HISTORICO, []);
            hist.unshift({
                idExterno: dados.idExterno,
                resultado,
                em: new Date().toISOString(),
            });
            GM_setValue(CHAVE_HISTORICO, hist.slice(0, 50));

            // Notificação
            const acao = resultado.acao;
            if (acao === 'criado') {
                notificar(`✅ Imóvel criado (${resultado.fotos_novas} fotos)`, COR_SUCESSO, 5000);
            } else if (acao === 'atualizado') {
                notificar(
                    `🔄 Atualizado — ${resultado.versoes_sincronizadas} versões sincronizadas, ${resultado.versoes_com_conflito} com conflitos`,
                    resultado.versoes_com_conflito > 0 ? COR_AVISO : COR_SUCESSO,
                    6000
                );
            } else if (acao === 'versao_criada') {
                notificar('✅ Versão criada para ti (canónico já existia)', COR_SUCESSO);
            } else {
                notificar('ℹ️ Sem alterações', COR_PRIMARIA);
            }
        } catch (e) {
            erro('Erro ao enviar:', e);
            notificar(`❌ ${e.message}`, COR_ERRO, 8000);
        }
    }

    function copiarJSON() {
        extrairDados().then(dados => {
            navigator.clipboard.writeText(JSON.stringify(dados, null, 2))
                .then(() => notificar('📋 JSON copiado!', COR_SUCESSO))
                .catch(() => notificar('❌ Falha ao copiar', COR_ERRO));
        }).catch(e => {
            erro('Erro ao extrair:', e);
            notificar(`❌ ${e.message}`, COR_ERRO, 8000);
        });
    }

    function verHistorico() {
        const hist = GM_getValue(CHAVE_HISTORICO, []);
        if (hist.length === 0) {
            alert('Sem histórico.');
            return;
        }
        const texto = hist.map(h =>
            `${h.em.slice(0, 19)}  idExterno=${h.idExterno}  →  ${h.resultado.acao}`
        ).join('\n');
        alert(`Histórico (últimos ${hist.length}):\n\n${texto}`);
    }

    // ============================================
    // UI
    // ============================================
    function criarEstilo() {
        const style = document.createElement('style');
        style.textContent = `
            #buyers-crm-panel-supercasa {
                position: fixed; top: 80px; right: 20px; z-index: 999998;
                display: flex; flex-direction: column; gap: 8px;
                font-family: system-ui, -apple-system, sans-serif;
            }
            #buyers-crm-panel-supercasa button {
                padding: 10px 16px; border: none; border-radius: 8px;
                font-size: 13px; font-weight: bold; cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                color: white; text-align: left; min-width: 220px;
                display: flex; align-items: center; gap: 8px;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            #buyers-crm-panel-supercasa button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            #buyers-crm-panel-supercasa button:disabled { opacity: 0.5; cursor: not-allowed; }
            #buyers-crm-panel-supercasa .btn-enviar { background: ${COR_PRIMARIA}; }
            #buyers-crm-panel-supercasa .btn-enviar:hover { background: #0056b3; }
            #buyers-crm-panel-supercasa .btn-copiar { background: #17a2b8; }
            #buyers-crm-panel-supercasa .btn-config { background: #6c757d; }
        `;
        document.head.appendChild(style);
    }

    function criarPainel() {
        criarEstilo();

        const painel = document.createElement('div');
        painel.id = 'buyers-crm-panel-supercasa';

        const btnEnviar = document.createElement('button');
        btnEnviar.className = 'btn-enviar';
        btnEnviar.innerHTML = '<span>📤 Enviar para Servidor</span>';

        const btnCopiar = document.createElement('button');
        btnCopiar.className = 'btn-copiar';
        btnCopiar.innerHTML = '<span>📋 Copiar JSON</span>';

        const btnConfig = document.createElement('button');
        btnConfig.className = 'btn-config';
        btnConfig.innerHTML = '<span>⚙️ Configurar API Key</span>';

        painel.appendChild(btnEnviar);
        painel.appendChild(btnCopiar);
        painel.appendChild(btnConfig);
        document.body.appendChild(painel);

        btnEnviar.addEventListener('click', async () => {
            btnEnviar.disabled = true;
            try { await enviarParaServidor(); }
            finally { btnEnviar.disabled = false; }
        });

        btnCopiar.addEventListener('click', copiarJSON);
        btnConfig.addEventListener('click', configurarApiKey);

        return painel;
    }

    // ============================================
    // MENU TAMPERMONKEY
    // ============================================
    function registarMenus() {
        GM_registerMenuCommand('📤 Enviar este imóvel', () => {
            document.querySelector('#buyers-crm-panel-supercasa .btn-enviar')?.click();
        });
        GM_registerMenuCommand('⚙️ Configurar API Key', configurarApiKey);
        GM_registerMenuCommand('📜 Ver histórico', verHistorico);
        GM_registerMenuCommand('🗑️ Limpar histórico', () => {
            if (confirm('Limpar histórico?')) {
                GM_deleteValue(CHAVE_HISTORICO);
                notificar('🗑️ Histórico limpo', COR_AVISO);
            }
        });
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    function esperarPaginaPronta() {
        let tentativas = 0;
        const maxTentativas = 40; // 20s

        const intervalo = setInterval(() => {
            tentativas++;
            const jsonLdOk = document.querySelector('script[type="application/ld+json"]');
            const idOk = obterIdExterno();

            if (jsonLdOk && idOk) {
                clearInterval(intervalo);
                log('✅ Página pronta');
                try {
                    criarPainel();
                    registarMenus();
                    log('✅ Painel criado');
                } catch (e) {
                    erro('Erro ao criar painel:', e);
                }
            } else if (tentativas >= maxTentativas) {
                clearInterval(intervalo);
                warn('⚠️ Timeout — a criar painel mesmo assim');
                try {
                    criarPainel();
                    registarMenus();
                } catch (e) {
                    erro('Erro ao criar painel:', e);
                }
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', esperarPaginaPronta);
    } else {
        esperarPaginaPronta();
    }
})();