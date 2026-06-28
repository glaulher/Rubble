// public/js/scm/scm-list.js

let scmList = [];
let scmPage = 0;
let scmAllLoaded = false;
let scmLoading = false;
let lastScmHash = '';
let currentScmSearch = '';
let scmDateFrom = '';
let scmDateTo = '';
let scmSegmentFilter = new Set();
let scmSiteFilter = new Set();
let scmStatusFilter = '';
let scmCicloFilter = '';
let scmCicloOptions = [];
let scmAllSegments = [];
let scmAllSites = [];
let segmentTodosChecked = true;
let siteTodosChecked = true;

function setupScmCicloAutocomplete() {
    var input = document.getElementById('scmCicloFilter');
    var dropdown = document.getElementById('scmCicloDropdown');
    if (!input || !dropdown) return;

    function fetchCycles() {
        fetch('/app/api/index.php?route=scm&action=cycles')
            .then(function (r) { return r.json(); })
            .then(function (result) {
                scmCicloOptions = result.data || [];
            })
            .catch(function () {
                scmCicloOptions = [];
            });
    }

    function filterOptions(query) {
        if (!query) return scmCicloOptions.slice(0, 50);
        var lower = query.toLowerCase();
        return scmCicloOptions.filter(function (c) {
            return c.toLowerCase().startsWith(lower);
        }).slice(0, 50);
    }

    function renderDropdown(options) {
        if (!options || options.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }
        var html = '';
        options.forEach(function (c) {
            html += '<div class="px-3 py-2 text-sm text-slate-700 hover:bg-sky-100 cursor-pointer" data-value="' + c + '">' + c + '</div>';
        });
        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
    }

    function hideDropdown() {
        dropdown.classList.add('hidden');
    }

    fetchCycles();

    input.addEventListener('input', function () {
        var query = this.value.trim();
        var filtered = filterOptions(query);
        renderDropdown(filtered);
    });

    input.addEventListener('click', function () {
        if (this.value !== '') {
            this.value = '';
            scmCicloFilter = '';
            resetScmState();
            loadScm();
            hideDropdown();
            return;
        }
        var filtered = filterOptions('');
        renderDropdown(filtered);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideDropdown();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            var items = dropdown.querySelectorAll('[data-value]');
            var idx = -1;
            items.forEach(function (el, i) {
                if (el.classList.contains('bg-sky-100')) idx = i;
            });
            var next = idx + 1;
            if (next < items.length) {
                items.forEach(function (el) { el.classList.remove('bg-sky-100'); });
                items[next].classList.add('bg-sky-100');
                items[next].scrollIntoView({ block: 'nearest' });
            }
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            var items = dropdown.querySelectorAll('[data-value]');
            var idx = items.length;
            items.forEach(function (el, i) {
                if (el.classList.contains('bg-sky-100')) idx = i;
            });
            var prev = idx - 1;
            if (prev >= 0) {
                items.forEach(function (el) { el.classList.remove('bg-sky-100'); });
                items[prev].classList.add('bg-sky-100');
                items[prev].scrollIntoView({ block: 'nearest' });
            }
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            var selected = dropdown.querySelector('[data-value].bg-sky-100');
            if (selected) {
                input.value = selected.dataset.value;
                scmCicloFilter = selected.dataset.value;
                hideDropdown();
                resetScmState();
                loadScm();
            }
            return;
        }
    });

    dropdown.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var target = e.target.closest('[data-value]');
        if (!target) return;
        input.value = target.dataset.value;
        scmCicloFilter = target.dataset.value;
        hideDropdown();
        resetScmState();
        loadScm();
    });

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}

function initScm() {
    if (window._scmInitialized) {
        PollingManager.stop('scm');
        var existingContent = document.getElementById('scmContent');
        if (existingContent) existingContent.innerHTML = '';
    }
    window._scmInitialized = true;

    scmList = [];
    scmPage = 0;
    scmAllLoaded = false;
    scmLoading = false;
    lastScmHash = '';
    currentScmSearch = '';
    scmDateFrom = '';
    scmDateTo = '';
    scmSegmentFilter = new Set();
    scmSiteFilter = new Set();
    scmStatusFilter = '';
    scmCicloFilter = '';
    scmCicloOptions = [];
    scmAllSegments = [];
    scmAllSites = [];
    segmentTodosChecked = true;
    siteTodosChecked = true;

    const content = document.getElementById('scmContent');
    const searchInput = document.getElementById('searchInputScm');
    const importBtn = document.getElementById('importScmBtn');
    const dateFromInput = document.getElementById('scmDateFrom');
    const dateToInput = document.getElementById('scmDateTo');
    const statusSelect = document.getElementById('scmStatusFilter');
    const cicloInput = document.getElementById('scmCicloFilter');

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

    if (statusSelect) {
        statusSelect.value = scmStatusFilter;
        statusSelect.addEventListener('change', () => {
            scmStatusFilter = statusSelect.value;
            resetScmState();
            loadScm();
        });
    }

    document.getElementById('scmDateFrom').value = scmDateFrom;
    document.getElementById('scmDateTo').value = scmDateTo;

    initSegmentMultiSelect();
    initSiteMultiSelect();
    setupScmCicloAutocomplete();

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

function initSegmentMultiSelect() {
    const btn = document.getElementById('scmSegmentBtn');
    const dropdown = document.getElementById('scmSegmentDropdown');
    const label = document.getElementById('scmSegmentLabel');
    if (!btn || !dropdown) return;

    fetch('/app/api/index.php?route=scm&action=segments')
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                scmAllSegments = res.data || [];
                renderSegmentDropdown();
            }
        });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    updateSegmentLabel();
}

function renderSegmentDropdown() {
    const dropdown = document.getElementById('scmSegmentDropdown');
    if (!dropdown) return;

    if (!dropdown.dataset.delegated) {
        dropdown.addEventListener('change', (e) => {
            const cb = e.target.closest('.segment-check');
            if (!cb) return;
            const val = cb.dataset.value;
            if (val === '__all__') {
                segmentTodosChecked = cb.checked;
                scmSegmentFilter.clear();
            } else {
                if (cb.checked) {
                    scmSegmentFilter.add(val);
                } else {
                    if (scmSegmentFilter.size === 0) {
                        scmSegmentFilter = new Set(scmAllSegments);
                    }
                    scmSegmentFilter.delete(val);
                }
                segmentTodosChecked = scmAllSegments.length > 0 && scmAllSegments.every(seg => scmSegmentFilter.has(seg));
            }
            renderSegmentDropdown();
            updateSegmentLabel();
            resetScmState();
            loadScm();
        });
        dropdown.dataset.delegated = '1';
    }

    let html = '';

    const segmentAllChecked = segmentTodosChecked ? 'checked' : '';
    html += `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
        <input type="checkbox" class="segment-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="__all__" ${segmentAllChecked}>
        <span class="text-sm text-slate-700 font-medium">Todos</span>
    </label>`;

    scmAllSegments.forEach(seg => {
        const checked = segmentTodosChecked || scmSegmentFilter.has(seg) ? 'checked' : '';
        html += `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" class="segment-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="${escapeHtml(seg)}" ${checked}>
            <span class="text-sm text-slate-700">${escapeHtml(seg)}</span>
        </label>`;
    });

    dropdown.innerHTML = html;
}

function updateSegmentLabel() {
    const label = document.getElementById('scmSegmentLabel');
    if (!label) return;
    if (segmentTodosChecked) {
        label.textContent = 'Todos';
        label.classList.remove('text-blue-600');
    } else {
        label.textContent = `${scmSegmentFilter.size} selecionado(s)`;
        label.classList.add('text-blue-600');
    }
}

function initSiteMultiSelect() {
    const btn = document.getElementById('scmSiteBtn');
    const dropdown = document.getElementById('scmSiteDropdown');
    const label = document.getElementById('scmSiteLabel');
    if (!btn || !dropdown) return;

    fetch('/app/api/index.php?route=scm&action=sites')
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                scmAllSites = res.data || [];
                renderSiteDropdown();
            }
        });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    updateSiteLabel();
}

function renderSiteDropdown() {
    const dropdown = document.getElementById('scmSiteDropdown');
    if (!dropdown) return;

    if (!dropdown.dataset.delegated) {
        dropdown.addEventListener('change', (e) => {
            const cb = e.target.closest('.site-check');
            if (!cb) return;
            const val = cb.dataset.value;
            if (val === '__all__') {
                siteTodosChecked = cb.checked;
                scmSiteFilter.clear();
            } else {
                if (cb.checked) {
                    scmSiteFilter.add(val);
                } else {
                    if (scmSiteFilter.size === 0) {
                        scmSiteFilter = new Set(scmAllSites);
                    }
                    scmSiteFilter.delete(val);
                }
                siteTodosChecked = scmAllSites.length > 0 && scmAllSites.every(site => scmSiteFilter.has(site));
            }
            renderSiteDropdown();
            updateSiteLabel();
            resetScmState();
            loadScm();
        });
        dropdown.dataset.delegated = '1';
    }

    let html = '';
    const siteAllChecked = siteTodosChecked ? 'checked' : '';
    html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">';
    html += '<input type="checkbox" class="site-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="__all__" ' + siteAllChecked + '>';
    html += '<span class="text-sm text-slate-700 font-medium">Todos</span>';
    html += '</label>';

    scmAllSites.forEach(site => {
        const checked = siteTodosChecked || scmSiteFilter.has(site) ? 'checked' : '';
        html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">';
        html += '<input type="checkbox" class="site-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="' + escapeHtml(site) + '" ' + checked + '>';
        html += '<span class="text-sm text-slate-700">' + escapeHtml(site) + '</span>';
        html += '</label>';
    });

    dropdown.innerHTML = html;
}

function updateSiteLabel() {
    const label = document.getElementById('scmSiteLabel');
    if (!label) return;
    if (siteTodosChecked) {
        label.textContent = 'Todos';
        label.classList.remove('text-blue-600');
    } else {
        label.textContent = scmSiteFilter.size + ' selecionado(s)';
        label.classList.add('text-blue-600');
    }
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
        if (scmSegmentFilter.size > 0) url += `&segmento=${encodeURIComponent([...scmSegmentFilter].join(','))}`;
        if (scmSiteFilter.size > 0) url += `&sites=${encodeURIComponent([...scmSiteFilter].join(','))}`;
        if (scmStatusFilter) url += `&status=${encodeURIComponent(scmStatusFilter)}`;
        if (scmCicloFilter) url += `&ciclo=${encodeURIComponent(scmCicloFilter)}`;
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

    content.insertAdjacentHTML('beforeend', html);
}

function buildScmCardHtml(s) {
    const statusColors = {
        'SCM aprovado': 'bg-emerald-100 text-emerald-700',
        'SCM negado': 'bg-red-100 text-red-700',
        'SCM verificado': 'bg-blue-100 text-blue-800',
        'SCM enviado': 'bg-purple-100 text-purple-700',
    };
    const statusClass = statusColors[s.status] || 'bg-slate-100 text-slate-700';

    const pvDisplay = s.numero_pv ? `PV ${escapeHtml(s.numero_pv)}` : '';
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

    let segmentoBadge = '';
    const atividadeLower = (s.atividade || '').toLowerCase();
    const segmentoLower = (s.segmento || '').toLowerCase();
    const isCorretiva = atividadeLower.includes('manutenção corretiva') || atividadeLower.includes('corretiva de chiller');
    const isPreventiva = segmentoLower.includes('preventiva on going') || segmentoLower.includes('preventiva sob demanda');
    if (isCorretiva && isPreventiva) {
        segmentoBadge = `<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Erro no segmento</span>`;
    }

    const dataDisplay = s.data ? formatDateBr(s.data) : '';
    const dataExecDisplay = s.data_execucao ? formatDateBr(s.data_execucao) : '';

    return `
    <div class="card-item bg-white rounded-xl border border-slate-200 p-4" data-scm-id="${s.id}">
        <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900">${escapeHtml(s.scm)}</h3>
            <span class="text-slate-400">—</span>
            ${mercadoBadge ? `<span class="text-sm">${mercadoBadge}</span>` : '<span></span>'}
            ${s.atividade ? `<span class="text-xs text-slate-500">${escapeHtml(s.atividade.replace(/(?:^|\s)\S+/g, function(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }))}</span>` : ''}
            ${dataDisplay ? `<span class="text-xs text-slate-400">Criação: ${dataDisplay}</span>` : ''}
            ${dataExecDisplay ? `<span class="text-xs text-slate-400">Execução: ${dataExecDisplay}</span>` : ''}
            <div class="ml-auto flex items-center gap-2">
                ${pvDisplay ? `<span class="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-xl text-xs">${pvDisplay}</span>` : ''}
                ${totalDisplay ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xl text-xs">${totalDisplay}</span>` : ''}
                <span class="text-xs px-2 py-0.5 rounded-xl ${statusClass}">${escapeHtml(s.status)}</span>
                ${getUser().role === 'admin' ? `
                ${iconButtonHtml('delete', 'Excluir', { 'class': 'scm-delete-btn', 'data-delete-id': s.id }, 'right')}` : ''}
            </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            ${segmentoBadge}
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
                group.querySelector('.space-y-4').insertAdjacentHTML('beforeend', buildScmCardHtml(s));
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
    var scm = scmList.find(function(s) { return s.id === id; });
    var scmName = scm ? scm.scm : '';
    const confirmed = await confirmDelete('Excluir SCM', 'Tem certeza que deseja excluir o SCM', scmName);
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

// Event delegation for toggle, delete buttons, and dropdown closing
if (!document._scmGlobalListener) {
    document._scmGlobalListener = (e) => {
        // Toggle details
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
            return;
        }

        // Delete button
        const deleteBtn = e.target.closest('.scm-delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.deleteId;
            deleteScm(id);
            return;
        }

        // Close dropdowns when clicking outside
        ['scmSegmentBtn', 'scmSiteBtn'].forEach(id => {
            const btnEl = document.getElementById(id);
            const dropdownId = id === 'scmSegmentBtn' ? 'scmSegmentDropdown' : 'scmSiteDropdown';
            const dropdownEl = document.getElementById(dropdownId);
            if (dropdownEl && !dropdownEl.classList.contains('hidden') &&
                !btnEl?.contains(e.target) && !dropdownEl.contains(e.target)) {
                dropdownEl.classList.add('hidden');
            }
        });
    };
    document.addEventListener('click', document._scmGlobalListener);
}

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
            html += `<div class="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-3">`;
            html += `<span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observação</span>`;
            html += `<p class="text-sm text-slate-700 mt-1">${escapeHtml(s.obs)}</p>`;
            html += `</div>`;
        }

        if (items.length > 0) {
            html += `<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">`;
            html += `<div class="overflow-x-auto">`;
            html += `<table class="w-full">`;
            html += `<thead><tr class="bg-slate-50 border-b border-slate-200">`;
            html += `<th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Serviço</th>`;
            html += `<th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Unidade</th>`;
            html += `<th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor</th>`;
            html += `<th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Qtd.</th>`;
            html += `<th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Subtotal</th>`;
            html += `</tr></thead><tbody>`;

            let totalGeral = 0;
            items.forEach(item => {
                const subtotal = parseFloat(item.subtotal_execucao) || 0;
                totalGeral += subtotal;
                html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">`;
                html += `<td class="px-4 py-2.5 text-sm text-slate-700">${escapeHtml(item.servico || '')}</td>`;
                html += `<td class="px-4 py-2.5 text-sm text-slate-700">${escapeHtml(item.unidade || '')}</td>`;
                html += `<td class="px-4 py-2.5 text-sm text-right font-medium text-slate-900">${formatCurrency(item.valor)}</td>`;
                html += `<td class="px-4 py-2.5 text-sm text-right text-slate-700">${parseFloat(item.qtde_execucao || 0).toFixed(3)}</td>`;
                html += `<td class="px-4 py-2.5 text-sm text-right font-medium text-slate-900">${formatCurrency(subtotal)}</td>`;
                html += `</tr>`;
            });

            html += `</tbody>`;
            html += `<tfoot><tr class="border-t-2 border-slate-200 bg-slate-50">`;
            html += `<td colspan="4" class="px-4 py-2.5 text-sm font-bold text-slate-900">Total</td>`;
            html += `<td class="px-4 py-2.5 text-sm text-right font-bold text-slate-900">${formatCurrency(totalGeral)}</td>`;
            html += `</tr></tfoot>`;
            html += `</table>`;
            html += `</div></div>`;
        } else {
            html += `<div class="text-sm text-slate-400 italic text-center py-4">Nenhum item registrado</div>`;
        }

        details.innerHTML = html;
        details.dataset.loaded = 'true';
    } catch (error) {
        details.innerHTML = '<div class="text-sm text-red-500">Erro ao carregar detalhes</div>';
    }
}

function formatDateBr(date) {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
