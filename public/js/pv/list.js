import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';

let pvLimit = 20;
let pvList = [];
var _pvScroll = null;
globalThis.pvSearch = '';
globalThis.pvStatusFilter = '';
globalThis.pvCycleFilter = '';
globalThis.pvSortBy = 'pv.id';
globalThis.pvSortDir = 'DESC';
globalThis.pvEmailPvId = null;
globalThis.pvEmailPvData = null;
globalThis.selectedPvIds = [];

function copyOs(os) {
  if (!os || os === '-') return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(os)
      .then(() => showToast('N\u00ba OS copiado: ' + os, 'success'))
      .catch(() => fallbackCopy(os));
  } else {
    fallbackCopy(os);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('N\u00ba OS copiado: ' + text, 'success');
  } catch {
    showToast('Erro ao copiar', 'error');
  }
  document.body.removeChild(textarea);
}

function buildPvRowHtml(pv) {
  const itensCount = pv.itens_count || 0;
  const valorTotal =
    pv.valor_total != null
      ? parseFloat(pv.valor_total).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '-';

  return `
    <td class="hidden md:table-cell w-10 px-3 py-4 text-sm">
      <input type="checkbox" class="pv-checkbox rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        data-pv-id="${pv.id}">
    </td>
    <td class="px-4 py-4 text-sm font-semibold text-slate-900">${escapeHtml(pv.numero_pv)}</td>
    <td class="hidden md:table-cell px-4 py-4 text-sm text-slate-700">${pv.data ? formatDate(pv.data) : '-'}</td>
    <td class="hidden md:table-cell px-4 py-4 text-sm text-slate-700">
      <span data-action="copy-os" data-os="${escapeHtml(pv.os || '')}"
            class="cursor-pointer hover:text-blue-600 hover:underline transition"
            title="Clique para copiar">${escapeHtml(pv.os || '-')}</span>
    </td>
    <td class="hidden md:table-cell px-4 py-4 text-sm text-slate-700">${escapeHtml(pv.local)}</td>
    <td class="px-4 py-4 text-sm">${getStatusBadge(pv.worst_status)}</td>
    <td class="hidden md:table-cell px-4 py-4 text-sm text-slate-700">${itensCount} ite${itensCount !== 1 ? 'ns' : 'm'}</td>
    <td class="hidden md:table-cell px-4 py-4 text-sm font-medium text-slate-900">${valorTotal}</td>
    <td class="px-4 py-4 text-sm text-right">
      <div class="flex items-center justify-end gap-2">
        ${iconButtonHtml('edit', 'Editar', { 'data-action': 'edit', 'data-pv-id': pv.id })}
        ${iconButtonHtml('status', 'Alterar status', { 'data-action': 'status', 'data-pv-id': pv.id, 'data-pv-numero': escapeHtml(pv.numero_pv) })}
        ${iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete', 'data-pv-id': pv.id }, 'right')}
      </div>
    </td>
  `;
}

function renderPvs(list, append = false) {
  const tbody = document.getElementById('pvTableBody');
  const empty = document.getElementById('pvEmpty');

  if (!tbody) return;

  if (!append) {
    tbody.innerHTML = '';
  }

  if (pvList.length === 0 && !append) {
    empty.classList.remove('hidden');
    updateBatchButton();
    return;
  }

  empty.classList.add('hidden');

  list.forEach((pv) => {
    const tr = createPvRow(pv);
    tbody.appendChild(tr);
  });
  updateBatchButton();
}

function createPvRow(pv) {
  const tr = document.createElement('tr');
  tr.className =
    'border-b border-slate-100 hover:bg-slate-100 transition cursor-pointer';
  tr.dataset.pvId = pv.id;
  tr.innerHTML = buildPvRowHtml(pv);
  tr.addEventListener('click', function (e) {
    if (e.target.closest('.pv-checkbox')) return;
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      e.stopPropagation();
      switch (actionEl.dataset.action) {
        case 'copy-os':
          copyOs(actionEl.dataset.os);
          return;
        case 'edit':
          window.location.hash = '#/pvForm?id=' + actionEl.dataset.pvId;
          return;
        case 'status':
          openStatusModal(
            parseInt(actionEl.dataset.pvId),
            actionEl.dataset.pvNumero
          );
          return;
        case 'delete':
          deletePv(parseInt(actionEl.dataset.pvId));
          return;
      }
    }
    if (e.target.closest('button') || e.target.closest('a')) return;
    openPvItemModal(pv.id);
  });
  return tr;
}

function syncPvTable(newItems) {
  const tbody = document.getElementById('pvTableBody');
  const empty = document.getElementById('pvEmpty');
  if (!tbody) return;

  if (newItems.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    updateBatchButton();
    return;
  }

  empty.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  newItems.forEach((pv) => {
    fragment.appendChild(createPvRow(pv));
  });

  tbody.innerHTML = '';
  tbody.appendChild(fragment);
  updateBatchButton();
}

function resetPvState(search, status, cycle, keepSort) {
  globalThis.selectedPvIds = [];
  globalThis.pvSearch = search;
  globalThis.pvStatusFilter = status;
  globalThis.pvCycleFilter = cycle || '';
  if (!keepSort) {
    globalThis.pvSortBy = 'pv.id';
    globalThis.pvSortDir = 'DESC';
  }
  pvList = [];

  const tbody = document.getElementById('pvTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pvEmpty');
  if (empty) empty.classList.add('hidden');

  if (_pvScroll) _pvScroll.reset().init();
}

function setupPvSearch() {
  const searchInputPv = document.getElementById('searchInputPv');
  if (!searchInputPv) return;

  searchInputPv.addEventListener('click', function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const status = document.getElementById('statusFilter').value;
      const ciclo = document.getElementById('cicloFilter').value;
      resetPvState('', status, ciclo, true);
    }
  });

  const onSearch = debounce(function () {
    const status = document.getElementById('statusFilter').value;
    const ciclo = document.getElementById('cicloFilter').value;
    resetPvState(searchInputPv.value.toLowerCase().trim(), status, ciclo, true);
  }, 1000);

  searchInputPv.addEventListener('input', onSearch);
}

function setupPvStatusFilter() {
  const datalist = document.getElementById('statusFilterList');
  if (datalist) {
    PV_STATUSES.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.charAt(0).toUpperCase() + s.slice(1);
      datalist.appendChild(opt);
    });
  }

  const filter = document.getElementById('statusFilter');
  if (!filter) return;

  filter.addEventListener('click', function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const search = document
        .getElementById('searchInputPv')
        .value.toLowerCase()
        .trim();
      const ciclo = document.getElementById('cicloFilter').value;
      resetPvState(search, '', ciclo, true);
    }
  });

  filter.addEventListener('input', function () {
    const search = document
      .getElementById('searchInputPv')
        .value.toLowerCase()
        .trim();
    const ciclo = document.getElementById('cicloFilter').value;
    resetPvState(search, this.value, ciclo, true);
  });
}

function setupPvCycleFilter() {
  const filter = document.getElementById('cicloFilter');
  if (!filter) return;

  filter.addEventListener('click', function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const search = document
        .getElementById('searchInputPv')
        .value.toLowerCase()
        .trim();
      const status = document.getElementById('statusFilter').value;
      resetPvState(search, status, '', true);
    }
  });

  const datalist = document.getElementById('cicloFilterList');
  if (datalist) {
    generateCicloOptions().forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      datalist.appendChild(opt);
    });
  }

  filter.addEventListener('input', function () {
    const val = this.value.trim();
    if (val.length > 0 && val.length < 4) return;

    const search = document
      .getElementById('searchInputPv')
      .value.toLowerCase()
      .trim();
    const status = document.getElementById('statusFilter').value;
    resetPvState(search, status, val, true);
  });
}

function setupPvInfiniteScroll() {
  var _pvTotalValor = 0;

  _pvScroll = createInfiniteScroll({
    sentinelId: 'sentinel',
    limit: pvLimit,
    pollingInterval: 30000,
    fetchFn: function (params, opts) {
      var offset = params.offset;
      var url = '/app/api/index.php?route=pv&limit=' + pvLimit + '&offset=' + offset + '&search=' + encodeURIComponent(globalThis.pvSearch);
      if (globalThis.pvStatusFilter) url += '&status=' + encodeURIComponent(globalThis.pvStatusFilter);
      if (globalThis.pvCycleFilter) url += '&ciclo=' + encodeURIComponent(globalThis.pvCycleFilter);
      if (globalThis.pvSortBy) url += '&sort_by=' + encodeURIComponent(globalThis.pvSortBy) + '&sort_dir=' + encodeURIComponent(globalThis.pvSortDir);
      return fetch(url, opts).then(function (r) { return r.json(); }).then(function (result) {
        _pvTotalValor = result.total_valor || 0;
        return { data: result.data, total: result.total || 0 };
      });
    },
    renderFn: function (items) {
      renderPvs(items, true);
    },
    renderFullFn: function (items) {
      syncPvTable(items);
    },
    afterLoadFn: function (state) {
      updatePvCounter(state.total, _pvTotalValor);
    },
    getFilterHash: function () {
      return globalThis.pvSearch + '|' + globalThis.pvStatusFilter + '|' + globalThis.pvCycleFilter;
    },
    onError: function (err) {
      console.error('Erro ao carregar PVs:', err);
    },
  });
}

function setupPvSort() {
  document.querySelectorAll('#pvTable thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', function () {
      const col = this.dataset.sort;
      if (globalThis.pvSortBy === col) {
        globalThis.pvSortDir = globalThis.pvSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        globalThis.pvSortBy = col;
        globalThis.pvSortDir = 'ASC';
      }
      document
        .querySelectorAll('#pvTable thead th .sort-icon')
        .forEach((el) => {
          el.textContent = '';
        });
      const icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = globalThis.pvSortDir === 'ASC' ? '\u25B2' : '\u25BC';
      resetPvState(globalThis.pvSearch, globalThis.pvStatusFilter, globalThis.pvCycleFilter, true);
    });
  });
}

function updateBatchButton() {
  const batchBtn = document.getElementById('batchEmailBtn');
  const selectedCountEl = document.getElementById('selectedCount');
  if (!batchBtn || !selectedCountEl) return;
  const count = globalThis.selectedPvIds.length;
  if (count > 0) {
    batchBtn.classList.remove('hidden');
    selectedCountEl.textContent = count;
  } else {
    batchBtn.classList.add('hidden');
  }
}

function setupPvCheckboxes() {
  const selectAll = document.getElementById('selectAllPv');
  const batchBtn = document.getElementById('batchEmailBtn');
  const pvTableBody = document.getElementById('pvTableBody');
  const selectedCountEl = document.getElementById('selectedCount');
  if (!selectAll || !batchBtn || !pvTableBody || !selectedCountEl) return;

  pvTableBody.addEventListener('change', function (e) {
    const cb = e.target.closest('.pv-checkbox');
    if (!cb) return;
    const id = parseInt(cb.dataset.pvId);
    if (cb.checked) {
      if (!globalThis.selectedPvIds.includes(id)) globalThis.selectedPvIds.push(id);
    } else {
      globalThis.selectedPvIds = globalThis.selectedPvIds.filter((v) => v !== id);
    }
    updateBatchButton();
  });

  selectAll.addEventListener('change', function () {
    const checked = this.checked;
    document.querySelectorAll('.pv-checkbox').forEach((cb) => {
      cb.checked = checked;
      const id = parseInt(cb.dataset.pvId);
      if (checked) {
        if (!globalThis.selectedPvIds.includes(id)) globalThis.selectedPvIds.push(id);
      } else {
        globalThis.selectedPvIds = globalThis.selectedPvIds.filter((v) => v !== id);
      }
    });
    updateBatchButton();
  });

  batchBtn.addEventListener('click', async function () {
    if (globalThis.selectedPvIds.length === 0) return;
    try {
      const ids = globalThis.selectedPvIds.join(',');
      const res = await fetch(
        `/app/api/index.php?route=pv&action=list-by-ids&ids=${ids}`
      );
      const result = await res.json();
      if (result.success && result.data) {
        openPvEmailModal({
          batch: true,
          pvs: result.data.pvs,
          ids: globalThis.selectedPvIds.slice(),
        });
      } else {
        showToast('Erro ao carregar PVs selecionadas', 'error');
      }
    } catch (err) {
      showToast('Erro ao carregar PVs', 'error');
      console.error(err);
    }
  });

  updateBatchButton();
}

function initPv() {
  pvList = [];
  globalThis.selectedPvIds = [];

  const tbody = document.getElementById('pvTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pvEmpty');
  if (empty) empty.classList.add('hidden');

  const searchInputPv = document.getElementById('searchInputPv');
  if (searchInputPv) searchInputPv.value = globalThis.pvSearch;

  const statusFilterInput = document.getElementById('statusFilter');
  if (statusFilterInput) statusFilterInput.value = globalThis.pvStatusFilter;

  const cicloFilterInput = document.getElementById('cicloFilter');
  if (cicloFilterInput) cicloFilterInput.value = globalThis.pvCycleFilter;

  setupPvSearch();
  setupPvStatusFilter();
  setupPvCycleFilter();
  setupPvSort();
  if (_pvScroll) _pvScroll.destroy();
  setupPvInfiniteScroll();
  setupPvCheckboxes();

  document.querySelector('[data-action="navigate-pv-form"]')
    ?.addEventListener('click', function () { window.location.hash = '#/pvForm'; });
  document.querySelector('[data-action="generate-pv-csv"]')
    ?.addEventListener('click', generatePvCSV);
  document.querySelector('[data-action="download-pv-pdf"]')
    ?.addEventListener('click', downloadPvPdf);
  document.querySelector('[data-action="open-email-modal"]')
    ?.addEventListener('click', function () { openPvEmailModal(); });
  document.querySelector('[data-action="close-pv-item-modal"]')
    ?.addEventListener('click', closePvItemModal);
  document.querySelector('[data-action="send-pv-email"]')
    ?.addEventListener('click', sendPvEmail);
  document.querySelector('[data-action="close-email-modal"]')
    ?.addEventListener('click', closePvEmailModal);
  document.querySelector('[data-action="confirm-status"]')
    ?.addEventListener('click', confirmStatusChange);
  document.querySelector('[data-action="close-status-modal"]')
    ?.addEventListener('click', closeStatusModal);

  if (_pvScroll) _pvScroll.init();
}

globalThis.resetPvState = resetPvState;
globalThis.initPv = initPv;
