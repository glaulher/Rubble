// public/js/scm/scm-list.js

let scmList = [];
let scmPage = 0;
let scmAllLoaded = false;
let scmLoading = false;
let lastScmHash = '';
let currentScmSearch = '';
let scmDateFrom = '';
let scmDateTo = '';
let scmSegmentFilter = '';

function initScm() {
    scmList = [];
    scmPage = 0;
    scmAllLoaded = false;
    scmLoading = false;
    lastScmHash = '';
    currentScmSearch = '';
    scmDateFrom = '';
    scmDateTo = '';
    scmSegmentFilter = '';

    const content = document.getElementById('scmContent');
    const searchInput = document.getElementById('searchInputScm');
    const importBtn = document.getElementById('importScmBtn');
    const dateFromInput = document.getElementById('scmDateFrom');
    const dateToInput = document.getElementById('scmDateTo');
    const segmentInput = document.getElementById('scmSegmentFilter');

    if (content) content.innerHTML = '';

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', debounce(() => {
            currentScmSearch = searchInput.value.toLowerCase().trim();
            resetScmState();
            loadScm();
        }, 1000));

        searchInput.addEventListener('click', () => {
            if (searchInput.value) {
                searchInput.value = '';
                currentScmSearch = '';
                resetScmState();
                loadScm();
            }
        });
    }

    if (dateFromInput) {
        dateFromInput.addEventListener('change', () => {
            scmDateFrom = dateFromInput.value;
            resetScmState();
            loadScm();
        });
    }

    if (dateToInput) {
        dateToInput.addEventListener('change', () => {
            scmDateTo = dateToInput.value;
            resetScmState();
            loadScm();
        });
    }

    let segmentDebounce;
    if (segmentInput) {
        segmentInput.addEventListener('input', () => {
            clearTimeout(segmentDebounce);
            segmentDebounce = setTimeout(() => {
                scmSegmentFilter = segmentInput.value;
                resetScmState();
                loadScm();
            }, 500);
        });
    }

    document.getElementById('scmDateFrom').value = scmDateFrom;
    document.getElementById('scmDateTo').value = scmDateTo;
    document.getElementById('scmSegmentFilter').value = scmSegmentFilter;

    fetch('/app/api/index.php?route=scm&action=segments')
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                const datalist = document.getElementById('segmentoList');
                datalist.innerHTML = '';
                res.data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    datalist.appendChild(opt);
                });
            }
        });

    if (importBtn) {
        importBtn.addEventListener('click', () => importScm());
    }

    createInfiniteScroll('scmSentinel', () => {
        if (!scmAllLoaded && !scmLoading) {
            loadScm();
        }
    });

    PollingManager.start('scm', () => loadScm(true), 30000);
    loadScm();
}

function resetScmState() {
    scmList = [];
    scmPage = 0;
    scmAllLoaded = false;
    scmLoading = false;
    const content = document.getElementById('scmContent');
    if (content) content.innerHTML = '';
}

async function loadScm(isPolling = false) {
    if (scmLoading && !isPolling) return;
    scmLoading = true;

    try {
        const offset = isPolling ? 0 : scmPage * 20;
        let url = `/app/api/index.php?route=scm&limit=20&offset=${offset}&search=${encodeURIComponent(currentScmSearch)}`;
        if (scmDateFrom) url += `&date_from=${encodeURIComponent(scmDateFrom)}`;
        if (scmDateTo) url += `&date_to=${encodeURIComponent(scmDateTo)}`;
        if (scmSegmentFilter) url += `&segmento=${encodeURIComponent(scmSegmentFilter)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (!result.success) return;

        const newItems = result.data || [];

        if (isPolling) {
            const newHash = JSON.stringify(newItems);
            if (newHash === lastScmHash) {
                scmLoading = false;
                return;
            }
            lastScmHash = newHash;
            scmList = newItems;
            syncScmCards(newItems);
            updateScmCounter(result.total, result.total_valor);
            scmPage = 1;
            scmAllLoaded = newItems.length < 20;
            return;
        }

        scmList.push(...newItems);
        renderScm(newItems, true);
        updateScmCounter(result.total, result.total_valor);
        scmPage++;
        scmAllLoaded = newItems.length < 20;
        lastScmHash = JSON.stringify(scmList);
    } catch (error) {
        console.error('Erro ao carregar SCM:', error);
    } finally {
        scmLoading = false;
    }
}

function renderScm(items, append = false) {
    const content = document.getElementById('scmContent');
    if (!content) return;

    if (!append) content.innerHTML = '';

    const grouped = {};
    items.forEach(s => {
        const key = s.site || 'Sem Site';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
    });

    let html = '';
    for (const [site, scms] of Object.entries(grouped)) {
        html += `<div class="site-group" data-site="${escapeHtml(site)}">`;
        html += `<h2 class="text-lg font-semibold text-slate-700 mb-3">${escapeHtml(site)}</h2>`;
        html += `<div class="space-y-4">`;
        scms.forEach(s => {
            html += buildScmCardHtml(s);
        });
        html += `</div></div>`;
    }

    content.innerHTML += html;
}

function buildScmCardHtml(s) {
    const statusColors = {
        'SCM Aprovado': 'bg-emerald-100 text-emerald-700',
        'SCM Negado': 'bg-red-100 text-red-700',
        'SCM Verificado': 'bg-blue-100 text-blue-800',
        'SCM Enviado': 'bg-purple-100 text-purple-700',
    };
    const statusClass = statusColors[s.status] || 'bg-slate-100 text-slate-700';

    const pvDisplay = s.numero_pv ? `PV ${escapeHtml(s.numero_pv)}` : '';
    const equipDisplay = s.equipamento ? `${escapeHtml(s.equipamento)}` : '';
    const capDisplay = s.capacidade ? `${s.capacidade} TR` : '';
    const totalDisplay = s.total_valor ? formatCurrency(s.total_valor) : '';

    let mercadoBadge = '';
    if (s.origem && s.mercado) {
        const match = s.origem.toLowerCase() === s.mercado.toLowerCase();
        if (match) {
            mercadoBadge = `<span class="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">${escapeHtml(s.mercado)}</span>`;
        } else {
            mercadoBadge = `<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Erro no mercado</span>`;
        }
    }

    const dataDisplay = s.data ? formatDateBr(s.data) : '';
    const dataExecDisplay = s.data_execucao ? formatDateBr(s.data_execucao) : '';

    return `
    <div class="card-item bg-white rounded-xl border border-slate-200 p-4" data-scm-id="${s.id}">
        <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900">${escapeHtml(s.scm)}</h3>
            <span class="text-slate-400">—</span>
            <span class="text-sm text-slate-600">${escapeHtml(s.localidade || s.cidade || '')}</span>
            ${dataDisplay ? `<span class="text-xs text-slate-400">${dataDisplay}</span>` : ''}
            ${dataExecDisplay ? `<span class="text-xs text-slate-400">${dataExecDisplay}</span>` : ''}
            <div class="ml-auto flex items-center gap-2">
                ${pvDisplay ? `<span class="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-xl text-xs">${pvDisplay}</span>` : ''}
                ${totalDisplay ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xl text-xs">${totalDisplay}</span>` : ''}
                <span class="text-xs px-2 py-0.5 rounded-xl ${statusClass}">${escapeHtml(s.status)}</span>
                ${getUser().role === 'admin' ? `
                <div class="relative group">
                    <button class="scm-delete-btn bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition" data-delete-id="${s.id}">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <span class="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 origin-bottom-right transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Excluir</span>
                </div>` : ''}
            </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            ${equipDisplay ? `<span>${equipDisplay}</span>` : ''}
            ${capDisplay ? `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-xl text-xs">${capDisplay}</span>` : ''}
            ${mercadoBadge}
        </div>
        <div class="mt-3 flex gap-3">
            <button class="scm-toggle-btn bg-slate-200 hover:bg-slate-300 text-slate-900 px-3 py-1 rounded-xl text-sm transition-colors" data-toggle-id="${s.id}">
                Ver
            </button>
        </div>
        <div class="scm-details hidden mt-3" id="scmDet${s.id}">
            <div class="text-sm text-slate-500 italic">Carregando detalhes...</div>
        </div>
    </div>`;
}

function syncScmCards(newItems) {
    const content = document.getElementById('scmContent');
    if (!content) return;

    const existingCards = {};
    content.querySelectorAll('[data-scm-id]').forEach(card => {
        existingCards[card.dataset.scmId] = card;
    });

    const grouped = {};
    newItems.forEach(s => {
        const key = s.site || 'Sem Site';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
    });

    const seenIds = new Set();
    for (const [site, scms] of Object.entries(grouped)) {
        scms.forEach(s => {
            seenIds.add(String(s.id));
            if (existingCards[s.id]) {
                existingCards[s.id].outerHTML = buildScmCardHtml(s);
            } else {
                let group = content.querySelector(`[data-site="${site.replace(/"/g, '\\"')}"]`);
                if (!group) {
                    const div = document.createElement('div');
                    div.className = 'site-group';
                    div.dataset.site = site;
                    div.innerHTML = `<h2 class="text-lg font-semibold text-slate-700 mb-3">${escapeHtml(site)}</h2><div class="space-y-4"></div>`;
                    content.appendChild(div);
                    group = div;
                }
                group.querySelector('.space-y-4').innerHTML += buildScmCardHtml(s);
            }
        });
    }

    Object.keys(existingCards).forEach(id => {
        if (!seenIds.has(id)) {
            existingCards[id].remove();
        }
    });

    content.querySelectorAll('.site-group').forEach(group => {
        if (group.querySelectorAll('[data-scm-id]').length === 0) {
            group.remove();
        }
    });
}

function updateScmCounter(total, totalValor) {
    const counter = document.getElementById('scmCounter');
    const valueEl = document.getElementById('scmTotalValue');
    if (counter) counter.textContent = total || 0;
    if (valueEl) {
        const val = parseFloat(totalValor) || 0;
        valueEl.textContent = val.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    }
}

async function deleteScm(id) {
    const confirmed = await confirmAction('Tem certeza que deseja excluir este SCM?');
    if (!confirmed) return;

    try {
        const response = await apiFetch('/app/api/index.php?route=scm', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const result = await response.json();
        if (result.success) {
            showToast('SCM excluído com sucesso', 'success');
            resetScmState();
            loadScm();
        } else {
            showToast(result.message || 'Erro ao excluir', 'error');
        }
    } catch (error) {
        showToast('Erro ao excluir SCM', 'error');
    }
}

// Event delegation for toggle and delete buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.scm-toggle-btn');
    if (btn) {
        const id = btn.dataset.toggleId;
        const details = document.getElementById(`scmDet${id}`);
        if (details) {
            details.classList.toggle('hidden');
            if (!details.classList.contains('hidden') && !details.dataset.loaded) {
                loadScmDetails(id);
            }
        }
    }

    const deleteBtn = e.target.closest('.scm-delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.deleteId;
        deleteScm(id);
    }
});

async function loadScmDetails(id) {
    const details = document.getElementById(`scmDet${id}`);
    if (!details) return;

    try {
        const response = await fetch(`/app/api/index.php?route=scm&action=getById&id=${id}`);
        const result = await response.json();
        if (!result.success || !result.data) {
            details.innerHTML = '<div class="text-sm text-red-500">Erro ao carregar detalhes</div>';
            return;
        }

        const s = result.data;
        const items = s.items || [];

        let html = '';

        if (s.obs) {
            html += `<div class="mb-2 text-sm text-slate-600"><strong>Obs:</strong> ${escapeHtml(s.obs)}</div>`;
        }

        if (items.length > 0) {
            html += `<div class="overflow-x-auto">`;
            html += `<table class="w-full text-sm">`;
            html += `<thead><tr class="border-b border-slate-200">`;
            html += `<th class="text-left py-1 px-2 text-slate-500">SERVIÇO</th>`;
            html += `<th class="text-left py-1 px-2 text-slate-500">UNIDADE</th>`;
            html += `<th class="text-right py-1 px-2 text-slate-500">VALOR</th>`;
            html += `<th class="text-right py-1 px-2 text-slate-500">Qtd.</th>`;
            html += `<th class="text-right py-1 px-2 text-slate-500">SUBTOTAL</th>`;
            html += `</tr></thead><tbody>`;
            items.forEach(item => {
                html += `<tr class="border-b border-slate-100">`;
                html += `<td class="py-1 px-2">${escapeHtml(item.servico || '')}</td>`;
                html += `<td class="py-1 px-2">${escapeHtml(item.unidade || '')}</td>`;
                html += `<td class="py-1 px-2 text-right">${formatCurrency(item.valor)}</td>`;
                html += `<td class="py-1 px-2 text-right">${parseFloat(item.qtde_execucao || 0).toFixed(3)}</td>`;
                html += `<td class="py-1 px-2 text-right">${formatCurrency(item.subtotal_execucao)}</td>`;
                html += `</tr>`;
            });
            html += `</tbody></table>`;
            html += `</div>`;
        } else {
            html += `<div class="text-sm text-slate-400 italic">Nenhum item registrado</div>`;
        }

        details.innerHTML = html;
        details.dataset.loaded = 'true';
    } catch (error) {
        details.innerHTML = '<div class="text-sm text-red-500">Erro ao carregar detalhes</div>';
    }
}

function formatCurrency(value) {
    const val = parseFloat(value) || 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(date) {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
