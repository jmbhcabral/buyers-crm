// ==UserScript==
// @name         Buyers CRM - Extrator Imovirtual
// @namespace    https://buyers-crm.local
// @version      1.0.0
// @description  Envia dados de imóveis do Imovirtual para o Buyers CRM.
// @author       Tu
// @match        https://www.imovirtual.com/pt/anuncio/*
// @match        https://imovirtual.com/pt/anuncio/*
// @icon         https://statics.imovirtual.com/static/imovirtualpt2/naspersclassifieds-regional/verticalsre-atlas-web-imovirtualpt2/static/img/favicon.ico
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
    const FONTE = 'imovirtual';
    const API_BASE = 'https://crm.chanilaicastro.pt';
    const CHAVE_API_KEY = 'buyers_crm_api_key';
    const CHAVE_HISTORICO = 'buyers_crm_historico_imovirtual';

    const COR_PRIMARIA = '#007bff';
    const COR_SUCESSO = '#28a745';
    const COR_AVISO = '#ffc107';
    const COR_ERRO = '#dc3545';

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function log(...args) {
        console.log('%c[Buyers CRM · Imovirtual]', 'color:#007bff;font-weight:bold', ...args);
    }
    function warn(...args) {
        console.warn('%c[Buyers CRM · Imovirtual]', 'color:#ffc107;font-weight:bold', ...args);
    }
    function erro(...args) {
        console.error('%c[Buyers CRM · Imovirtual]', 'color:#dc3545;font-weight:bold', ...args);
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

    /** Extrai o id externo (parte após -ID) do URL. */
    function obterIdExterno() {
        const m = window.location.pathname.match(/-ID([A-Za-z0-9]+)$/);
        return m ? m[1] : null;
    }

    /** Lê o __NEXT_DATA__ (estado do Next.js). */
    function lerNextData() {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el) return null;
        try {
            return JSON.parse(el.textContent);
        } catch (e) {
            warn('__NEXT_DATA__ inválido:', e.message);
            return null;
        }
    }

    /** Normaliza um valor de atributo traduzindo enum → texto PT. */
    const TRADUCOES = {
        floor_0: '0', floor_1: '1', floor_2: '2', floor_3: '3',
        floor_4: '4', floor_5: '5', floor_6: '6', floor_7: '7',
        floor_8: '8', floor_9: '9', floor_10: '10',
        bminus: 'B-', bplus: 'B+', aplus: 'A+', a: 'A', b: 'B',
        c: 'C', d: 'D', e: 'E', f: 'F', g: 'G',
        block: 'bloco de apartamentos',
        full_ownership: 'propriedade plena',
        ready_to_use: 'pronto a habitar',
        secondary: 'usado',
        aluminium: 'alumínio',
        stove: 'fogão',
        dishwasher: 'máquina de lavar louça',
        oven: 'forno',
        anti_burglary_door: 'portas e janelas de segurança',
        two_storey: 'duplex',
    };
    function traduzir(v) {
        if (v == null) return null;
        const s = String(v);
        return TRADUCOES[s] || s;
    }

    /** Extrai a tipologia (T0..T5) do título. */
    function obterTipologia(titulo) {
        const m = (titulo || '').match(/\bT(\d+)\b/);
        return m ? `T${m[1]}` : null;
    }

    /**
     * Características "principais" a partir de `ad.attributes`.
     * Formato: { nome, valor, subtexto } — igual ao Idealista/Supercasa.
     */
    function extrairCaracteristicas(ad) {
        const a = ad.attributes || {};
        const lista = [];

        if (a.m != null) {
            lista.push({ nome: 'Área bruta', valor: String(a.m), subtexto: 'm²' });
        }
        const tipologia = obterTipologia(ad.title);
        if (tipologia) {
            lista.push({ nome: 'Tipologia', valor: tipologia, subtexto: null });
        }
        if (a.bathrooms_num != null) {
            lista.push({ nome: 'Casas de banho', valor: String(a.bathrooms_num), subtexto: null });
        }
        if (a.floor_no != null) {
            lista.push({ nome: 'Piso', valor: traduzir(a.floor_no), subtexto: null });
        }
        if (a.energy_certificate != null) {
            lista.push({ nome: 'Certificado energético', valor: traduzir(a.energy_certificate), subtexto: null });
        }
        if (a.building_type != null) {
            lista.push({ nome: 'Tipo de imóvel', valor: traduzir(a.building_type), subtexto: null });
        }
        if (a.building_ownership != null) {
            lista.push({ nome: 'Forma de propriedade', valor: traduzir(a.building_ownership), subtexto: null });
        }

        return lista;
    }

    /**
     * Características "específicas" agrupadas.
     * Formato: { grupo, itens[] } — igual ao Supercasa.
     */
    function extrairCaracteristicasEspecificas(ad) {
        const a = ad.attributes || {};
        const grupos = [];

        // Grupo "Detalhes" — a partir de topInformation
        const detalhes = [];
        (ad.topInformation || []).forEach(t => {
            if (!t.label || !t.values || t.values.length === 0) return;
            const valores = t.values
                .map(v => traduzir(String(v).split('::').pop()))
                .filter(Boolean)
                .join(', ');
            if (valores) {
                detalhes.push(`${t.label}: ${valores}${t.unit ? ' ' + t.unit : ''}`);
            }
        });
        if (detalhes.length) grupos.push({ grupo: 'Detalhes', itens: detalhes });

        // Grupo "Equipamento"
        if (Array.isArray(a.equipment_types) && a.equipment_types.length) {
            grupos.push({
                grupo: 'Equipamento',
                itens: a.equipment_types.map(traduzir).filter(Boolean),
            });
        }

        // Grupo "Segurança"
        if (Array.isArray(a.security_types) && a.security_types.length) {
            grupos.push({
                grupo: 'Segurança',
                itens: a.security_types.map(traduzir).filter(Boolean),
            });
        }

        // Grupo "Edifício e materiais"
        const edificio = [];
        if (a.windows_type) edificio.push(`Janelas: ${traduzir(a.windows_type)}`);
        if (a.building_type) edificio.push(`Tipo de imóvel: ${traduzir(a.building_type)}`);
        if (a.energy_certificate) edificio.push(`Certificado energético: ${traduzir(a.energy_certificate)}`);
        if (edificio.length) grupos.push({ grupo: 'Edifício e materiais', itens: edificio });

        return grupos;
    }

    /** Converte HTML em texto simples (para a descrição). */
    function htmlParaTexto(html) {
        if (!html) return null;
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.innerText || div.textContent || '').trim() || null;
    }

    /** Localização legível a partir das reverseGeocoding locations. */
    function extrairLocalizacao(ad) {
        const locs = ad.location?.reverseGeocoding?.locations || [];
        const nomes = [];
        for (const l of locs) {
            if (l.locationLevel === 'parish' && l.name) nomes.push(l.name);
            else if (l.locationLevel === 'council' && l.name) nomes.push(l.name);
            else if (l.locationLevel === 'district' && l.name) nomes.push(l.name);
        }
        // Dedupe consecutivo (Odivelas, Odivelas, Lisboa → Odivelas, Lisboa)
        const dedup = nomes.filter((n, i) => i === 0 || n !== nomes[i - 1]);
        return dedup.length ? dedup : null;
    }

    /** Preço formatado (o backend guarda string). */
    function extrairPreco(ad) {
        const p = ad.price?.salePrice;
        if (!p || p.value == null) return null;
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: p.currency || 'EUR' })
            .format(p.value).replace(/\u00A0/g, ' ');
    }

    /** Fotos (URL large de cada uma, dedupe por url). */
    function extrairFotos(ad) {
        const vistos = new Set();
        const lista = [];
        (ad.images || []).forEach((img, idx) => {
            const url = img.large || img.medium || img.small;
            if (!url || vistos.has(url)) return;
            vistos.add(url);
            lista.push({
                id: null,
                tag: null,
                titulo: null,
                url: url,
                urlWebp: null,
                largura: null,
                altura: null,
                posicao: idx,
                urlExterna: url,
            });
        });
        return lista;
    }

    /** Extrai o x-captcha-token (reCAPTCHA) da página, se existir. */
    function obterCaptchaToken() {
        // O Imovirtual usa reCAPTCHA v3; o token é gerado por JS.
        // Tentamos ler de inputs escondidos ou de window.grecaptcha.
        const input = document.querySelector('input[name="x-captcha-token"], input[name="captchaToken"]');
        if (input && input.value) return input.value.trim();
        return null;
    }

    /** Extrai o telefone via GraphQL (AdContactPhoneNumbers). */
    async function obterTelefone(adId) {
        const captcha = obterCaptchaToken();

        const query = `query AdContactPhoneNumbers($id: ID!, $contactIds: [ID!], $shouldIncludeOwnerAccountPhone: Boolean! = false) {\n  ad(id: $id) {\n    __typename\n    ... on Ad {\n      contacts(ids: $contactIds) @skip(if: $shouldIncludeOwnerAccountPhone) {\n        __typename\n        ... on AdContactAgent {\n          phoneNumber\n          __typename\n        }\n        ... on AdContactAssignedAgent {\n          phoneNumber\n          __typename\n        }\n        ... on AdContactPrivate {\n          phoneNumber\n          __typename\n        }\n        ... on CrossListingContact {\n          phoneNumber\n          __typename\n        }\n      }\n      ownerAccount @include(if: $shouldIncludeOwnerAccountPhone) {\n        contacts {\n          phoneNumber\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n  }\n}`;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/graphql-response+json, application/json',
        };
        if (captcha) headers['x-captcha-token'] = captcha;

        try {
            const resp = await fetch('/api/query', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    operationName: 'AdContactPhoneNumbers',
                    query,
                    variables: {
                        id: String(adId),
                        shouldIncludeOwnerAccountPhone: false,
                    },
                }),
            });

            if (!resp.ok) {
                return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                         erro: `HTTP ${resp.status}` };
            }

            const dados = await resp.json();
            const contactos = dados?.data?.ad?.contacts || [];
            const numeros = contactos
                .map(c => c.phoneNumber)
                .filter(Boolean)
                .map(n => String(n).replace(/\s/g, '').trim());

            if (numeros.length === 0) {
                return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                         erro: 'Sem telefone disponível' };
            }

            return {
                fonte: 'AJAX',
                numero: numeros[0],
                telefones: numeros.map(n => ({ number: n, formatted: n, type: null })),
                temTelemovel: false,
                erro: null,
            };
        } catch (e) {
            return { fonte: 'AJAX', numero: null, telefones: [], temTelemovel: false,
                     erro: e.message };
        }
    }

    /** Constrói o payload final. */
    async function extrairDados() {
        const idExterno = obterIdExterno();
        if (!idExterno) throw new Error('id externo não encontrado no URL');

        const next = lerNextData();
        const ad = next?.props?.pageProps?.ad;
        if (!ad) throw new Error('__NEXT_DATA__.props.pageProps.ad não encontrado');

        const adIdNumerico = ad.id;
        if (!adIdNumerico) throw new Error('ad.id numérico não encontrado');

        const caracteristicas = extrairCaracteristicas(ad);
        const caracteristicasEspecificas = extrairCaracteristicasEspecificas(ad);
        const telefone = await obterTelefone(adIdNumerico);

        return {
            fonte: FONTE,
            idExterno: idExterno,

            titulo: ad.title || null,
            preco: extrairPreco(ad),
            localizacao: extrairLocalizacao(ad),
            descricao: htmlParaTexto(ad.description),
            url: window.location.href,
            anunciante: ad.owner?.name || null,
            referenciaAnunciante: ad.referenceId || null,

            caracteristicas: caracteristicas.length ? caracteristicas : null,
            caracteristicasEspecificas: caracteristicasEspecificas.length ? caracteristicasEspecificas : null,
            plantas: null,
            videos: null,
            toursVirtuais: null,
            contagens: null,
            telefone: telefone,

            fotos: extrairFotos(ad),

            // Campos exclusivos do Imovirtual (guardados no raw_json da origem)
            imovirtual: {
                adId: adIdNumerico,
                publicId: idExterno,
                attributes: ad.attributes || null,
                topInformation: ad.topInformation || null,
                additionalInformation: ad.additionalInformation || null,
                characteristics: ad.characteristics || null,
                location: ad.location || null,
                owner: ad.owner || null,
                advertType: ad.advertType || null,
                market: ad.market || null,
                nextDataRaw: next,
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
            #buyers-crm-panel-imovirtual {
                position: fixed; top: 80px; right: 20px; z-index: 999998;
                display: flex; flex-direction: column; gap: 8px;
                font-family: system-ui, -apple-system, sans-serif;
            }
            #buyers-crm-panel-imovirtual button {
                padding: 10px 16px; border: none; border-radius: 8px;
                font-size: 13px; font-weight: bold; cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                color: white; text-align: left; min-width: 220px;
                display: flex; align-items: center; gap: 8px;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            #buyers-crm-panel-imovirtual button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            #buyers-crm-panel-imovirtual button:disabled { opacity: 0.5; cursor: not-allowed; }
            #buyers-crm-panel-imovirtual .btn-enviar { background: ${COR_PRIMARIA}; }
            #buyers-crm-panel-imovirtual .btn-enviar:hover { background: #0056b3; }
            #buyers-crm-panel-imovirtual .btn-copiar { background: #17a2b8; }
            #buyers-crm-panel-imovirtual .btn-config { background: #6c757d; }
        `;
        document.head.appendChild(style);
    }

    function criarPainel() {
        criarEstilo();

        const painel = document.createElement('div');
        painel.id = 'buyers-crm-panel-imovirtual';

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
            document.querySelector('#buyers-crm-panel-imovirtual .btn-enviar')?.click();
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
            const nextOk = document.getElementById('__NEXT_DATA__');
            const idOk = obterIdExterno();

            if (nextOk && idOk) {
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