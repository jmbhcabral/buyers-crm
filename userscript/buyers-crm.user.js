// ==UserScript==
// @name         Buyers CRM - Extrator de Imóveis
// @namespace    https://buyers-crm.local
// @version      2.0.0
// @description  Envia dados de imóveis do Idealista para o Buyers CRM.
// @author       Tu
// @match        https://www.idealista.pt/imovel/*
// @icon         https://www.idealista.pt/favicon.ico
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
    const API_BASE = 'http://localhost:8000';   // <-- muda em produção
    const CHAVE_API_KEY = 'buyers_crm_api_key';
    const CHAVE_HISTORICO = 'buyers_crm_historico';

    const COR_PRIMARIA = '#007bff';
    const COR_SUCESSO = '#28a745';
    const COR_AVISO = '#ffc107';
    const COR_ERRO = '#dc3545';

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function log(...args) {
        console.log('%c[Buyers CRM]', 'color:#007bff;font-weight:bold', ...args);
    }
    function warn(...args) {
        console.warn('%c[Buyers CRM]', 'color:#ffc107;font-weight:bold', ...args);
    }
    function erro(...args) {
        console.error('%c[Buyers CRM]', 'color:#dc3545;font-weight:bold', ...args);
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
    // EXTRAÇÃO (idêntica ao original)
    // ============================================
    async function obterTelefone(adId) {
        try {
            const telEl = document.querySelector(
                '.hidden-contact-phones_formatted-phone, .phone-number[href^="tel:"], a[href^="tel:"]'
            );
            if (telEl) {
                const href = telEl.getAttribute('href') || telEl.innerText || '';
                const match = href.match(/(\+?\d[\d\s]{7,})/);
                if (match) {
                    const num = match[1].replace(/\s/g, '').trim();
                    return {
                        fonte: 'DOM', numero: num,
                        telefones: [{ number: num, formatted: num, type: null }],
                        temTelemovel: false, erro: null,
                    };
                }
            }
        } catch (e) { /* ignora */ }

        try {
            const url = `/pt/ajax/ads/${adId}/contact-phones`;
            const resposta = await fetch(url, {
                method: 'GET', credentials: 'include',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!resposta.ok) {
                return { fonte: 'AJAX', numero: null, telefones: [],
                         temTelemovel: false, erro: `HTTP ${resposta.status}` };
            }
            const texto = await resposta.text();
            let dados;
            try { dados = JSON.parse(texto); }
            catch (e) {
                return { fonte: 'AJAX', numero: null, telefones: [],
                         temTelemovel: false, erro: 'Resposta não é JSON' };
            }
            const normalizar = (p) => {
                if (!p) return null;
                if (typeof p === 'string') return { number: p, formatted: p, type: null };
                if (typeof p === 'object') {
                    return {
                        number: p.number ?? null,
                        formatted: p.formatted ?? p.number ?? null,
                        type: p.type ?? null,
                    };
                }
                return null;
            };
            const t1 = normalizar(dados?.phone1);
            const t2 = normalizar(dados?.phone2);
            const telefones = [t1, t2].filter(Boolean);
            const temTelemovel = telefones.some(t => t.type === 'MOBILE');
            return {
                fonte: 'AJAX',
                numero: telefones[0]?.number || null,
                telefones, temTelemovel,
                erro: telefones.length ? null : 'Sem telefone disponível',
            };
        } catch (err) {
            return { fonte: 'AJAX', numero: null, telefones: [],
                     temTelemovel: false, erro: err.message };
        }
    }

    async function extrairDados() {
        const dados = {};

        if (typeof config !== 'undefined') {
            dados.propertyId = config.propertyId ?? null;
            dados.adExternalReference = config.adExternalReference ?? null;
            dados.adCommercialName = config.adCommercialName ?? null;
            dados.adProfessionalName = config.adProfessionalName ?? null;
        }

        if (typeof adDetail !== 'undefined' && adDetail) {
            dados.titulo = adDetail.headerTitle ?? null;
            dados.caracteristicas = (adDetail.headerFeatures || [])
                .filter(f => f)
                .map(f => ({
                    nome: f?.featureName ?? null,
                    valor: f?.text ?? null,
                    subtexto: f?.subText ?? null,
                }));
        } else {
            dados.titulo = null;
            dados.caracteristicas = [];
        }

        if (typeof adMultimediasInfo !== 'undefined' && adMultimediasInfo) {
            const info = adMultimediasInfo;
            dados.fotos = (info.picturesWithoutPlans || []).filter(p => p).map(p => ({
                id: p.multimediaId ?? null,
                tag: p.tag ?? null,
                titulo: p.title ?? null,
                url: p.imageDataService ?? null,
                urlWebp: p.imageDataServiceWebp ?? null,
                largura: p.width ?? null,
                altura: p.height ?? null,
                posicao: p.absolutePosition ?? null,
            }));
            dados.plantas = (info.plans || []).filter(p => p).map(p => ({
                id: p.multimediaId ?? null,
                tag: p.tag ?? null,
                url: p.imageDataService ?? null,
                urlWebp: p.imageDataServiceWebp ?? null,
                largura: p.width ?? null,
                altura: p.height ?? null,
            }));
            dados.videos = (info.videos || []).filter(v => v).map(v => ({
                src: v.src ?? null, hdSrc: v.hdSrc ?? null,
                thumbnail: v.thumbnail ?? null,
                feitoPeloIdealista: v.isMadeByIdealista ?? false,
            }));
            dados.toursVirtuais = (info.virtualTour360 || []).filter(t => t).map(t => ({
                url: t.url ?? null, thumbnail: t.thumbnail ?? null,
                feitoPeloIdealista: t.madeByIdealista ?? false,
            }));
            dados.contagens = info.fakeAnchorsObject || {};
        } else {
            dados.fotos = [];
            dados.plantas = [];
            dados.videos = [];
            dados.toursVirtuais = [];
            dados.contagens = {};
        }

        const descricaoEl = document.querySelector('.comment p');
        dados.descricao = descricaoEl?.innerText.trim() ?? null;

        const featuresEspecificas = [];
        document.querySelectorAll('.details-property_features ul li').forEach(li => {
            const t = li?.innerText?.trim();
            if (t) featuresEspecificas.push(t);
        });
        dados.caracteristicasEspecificas = featuresEspecificas;

        const precoEl = document.querySelector('.info-data-price');
        dados.preco = precoEl?.innerText.trim() ?? null;

        const localizacao = [];
        document.querySelectorAll('#headerMap .header-map-list').forEach(li => {
            const t = li?.innerText?.trim();
            if (t) localizacao.push(t);
        });
        dados.localizacao = localizacao;

        const refEl = document.querySelector('.ad-reference-container .txt-ref');
        dados.referenciaAnunciante = refEl?.innerText.trim() ?? dados.propertyId?.toString() ?? null;

        const anuncianteEl = document.querySelector('.about-advertiser-name');
        dados.anunciante = anuncianteEl?.innerText.trim() ?? null;

        dados.telefone = { fonte: null, numero: null, telefones: [], temTelemovel: false, erro: null };
        if (dados.propertyId) {
            dados.telefone = await obterTelefone(dados.propertyId);
        } else {
            dados.telefone.erro = 'propertyId em falta';
        }

        dados.url = window.location.href;
        dados.extraidoEm = new Date().toISOString();

        return dados;
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

            if (!dados.propertyId) {
                throw new Error('propertyId não encontrado');
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
            hist.unshift({ propertyId: dados.propertyId, resultado, em: new Date().toISOString() });
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
        });
    }

    function verHistorico() {
        const hist = GM_getValue(CHAVE_HISTORICO, []);
        if (hist.length === 0) {
            alert('Sem histórico.');
            return;
        }
        const texto = hist.map(h =>
            `${h.em.slice(0, 19)}  propertyId=${h.propertyId}  →  ${h.resultado.acao}`
        ).join('\n');
        alert(`Histórico (últimos ${hist.length}):\n\n${texto}`);
    }

    // ============================================
    // UI
    // ============================================
    function criarEstilo() {
        const style = document.createElement('style');
        style.textContent = `
            #buyers-crm-panel {
                position: fixed; top: 80px; right: 20px; z-index: 999998;
                display: flex; flex-direction: column; gap: 8px;
                font-family: system-ui, -apple-system, sans-serif;
            }
            #buyers-crm-panel button {
                padding: 10px 16px; border: none; border-radius: 8px;
                font-size: 13px; font-weight: bold; cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                color: white; text-align: left; min-width: 220px;
                display: flex; align-items: center; gap: 8px;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            #buyers-crm-panel button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            #buyers-crm-panel button:disabled { opacity: 0.5; cursor: not-allowed; }
            #buyers-crm-panel .btn-enviar { background: ${COR_PRIMARIA}; }
            #buyers-crm-panel .btn-enviar:hover { background: #0056b3; }
            #buyers-crm-panel .btn-copiar { background: #17a2b8; }
            #buyers-crm-panel .btn-config { background: #6c757d; }
        `;
        document.head.appendChild(style);
    }

    function criarPainel() {
        criarEstilo();

        const painel = document.createElement('div');
        painel.id = 'buyers-crm-panel';

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
            document.querySelector('#buyers-crm-panel .btn-enviar')?.click();
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
            const configOk = typeof config !== 'undefined' && config.propertyId;
            const adDetailOk = typeof adDetail !== 'undefined';

            if (configOk || adDetailOk) {
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