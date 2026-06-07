let pvPage = 0;
let pvLimit = 20;
let pvLoading = false;
let pvAllLoaded = false;
let pvList = [];
let pvSearch = '';
let pvStatusFilter = '';
let pvCycleFilter = '';
let pvSortBy = 'pv.id';
let pvSortDir = 'DESC';
let pvEmailPvId = null;
let pvEmailPvData = null;
let selectedPvIds = [];
let lastPvHash = '';

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

async function loadPvs(isPolling) {
  if (pvLoading) return;

  if (isPolling) {
    pvLoading = true;
    try {
      let url = `/app/api/index.php?route=pv&limit=${pvLimit}&offset=0&search=${encodeURIComponent(pvSearch)}`;
      if (pvStatusFilter) url += `&status=${encodeURIComponent(pvStatusFilter)}`;
      if (pvCycleFilter) url += `&ciclo=${encodeURIComponent(pvCycleFilter)}`;
      if (pvSortBy) url += `&sort_by=${encodeURIComponent(pvSortBy)}&sort_dir=${encodeURIComponent(pvSortDir)}`;

      const response = await fetch(url);
      const result = await response.json();

      const newHash = JSON.stringify(result);
      if (newHash === lastPvHash) {
        pvLoading = false;
        return;
      }
      lastPvHash = newHash;

      const newItems = result.data || [];
      pvList = newItems;
      pvAllLoaded = newItems.length < pvLimit;
      pvPage = 1;

      syncPvTable(newItems);
      updatePvCounter(result.total, result.total_valor);
    } catch (error) {
      console.error('Erro ao carregar PVs:', error);
    } finally {
      pvLoading = false;
    }
    return;
  }

  if (pvAllLoaded) return;

  pvLoading = true;

  try {
    const offset = pvPage * pvLimit;
    let url = `/app/api/index.php?route=pv&limit=${pvLimit}&offset=${offset}&search=${encodeURIComponent(pvSearch)}`;

    if (pvStatusFilter) {
      url += `&status=${encodeURIComponent(pvStatusFilter)}`;
    }

    if (pvCycleFilter) {
      url += `&ciclo=${encodeURIComponent(pvCycleFilter)}`;
    }

    if (pvSortBy) {
      url += `&sort_by=${encodeURIComponent(pvSortBy)}&sort_dir=${encodeURIComponent(pvSortDir)}`;
    }

    const response = await fetch(url);
    const result = await response.json();

    const newItems = result.data || [];

    if (newItems.length < pvLimit) {
      pvAllLoaded = true;
    }

    pvList.push(...newItems);
    renderPvs(newItems, true);
    pvPage++;

    updatePvCounter(result.total, result.total_valor);
  } catch (error) {
    console.error('Erro ao carregar PVs:', error);
  } finally {
    pvLoading = false;
  }
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
        <div class="relative group">
          <button data-action="edit" data-pv-id="${pv.id}"
            class="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-xl transition">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">
            Editar
          </span>
        </div>
        <div class="relative group">
          <button data-action="status" data-pv-id="${pv.id}" data-pv-numero="${escapeHtml(pv.numero_pv)}"
            class="bg-amber-100 hover:bg-amber-200 text-amber-600 p-2 rounded-xl transition">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">
            Alterar status
          </span>
        </div>
        <div class="relative group">
          <button data-action="delete" data-pv-id="${pv.id}"
            class="bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <span class="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 origin-bottom-right transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">
            Excluir
          </span>
        </div>
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

  const existingRows = {};
  tbody.querySelectorAll('tr[data-pv-id]').forEach((tr) => {
    existingRows[tr.dataset.pvId] = tr;
  });

  const fragment = document.createDocumentFragment();
  newItems.forEach((pv) => {
    const existing = existingRows[pv.id];
    if (existing) {
      existing.innerHTML = buildPvRowHtml(pv);
      fragment.appendChild(existing);
    } else {
      fragment.appendChild(createPvRow(pv));
    }
  });

  tbody.innerHTML = '';
  tbody.appendChild(fragment);
  updateBatchButton();
}

function resetPvState(search, status, cycle, keepSort) {
  selectedPvIds = [];
  pvSearch = search;
  pvStatusFilter = status;
  pvCycleFilter = cycle || '';
  if (!keepSort) {
    pvSortBy = 'pv.id';
    pvSortDir = 'DESC';
  }
  pvPage = 0;
  pvAllLoaded = false;
  pvLoading = false;
  pvList = [];
  lastPvHash = '';

  const tbody = document.getElementById('pvTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pvEmpty');
  if (empty) empty.classList.add('hidden');
}

function setupPvSearch() {
  const searchInputPv = document.getElementById('searchInputPv');
  if (!searchInputPv) return;

  searchInputPv.addEventListener('click', async function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const status = document.getElementById('statusFilter').value;
      const ciclo = document.getElementById('cicloFilter').value;
      resetPvState('', status, ciclo, true);
      await loadPvs();
    }
  });

  const onSearch = debounce(async () => {
    const status = document.getElementById('statusFilter').value;
    const ciclo = document.getElementById('cicloFilter').value;
    resetPvState(searchInputPv.value.toLowerCase().trim(), status, ciclo, true);
    await loadPvs();
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

  filter.addEventListener('click', async function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const search = document
        .getElementById('searchInputPv')
        .value.toLowerCase()
        .trim();
      const ciclo = document.getElementById('cicloFilter').value;
      resetPvState(search, '', ciclo, true);
      await loadPvs();
    }
  });

  filter.addEventListener('input', async function () {
    const search = document
      .getElementById('searchInputPv')
      .value.toLowerCase()
      .trim();
    const ciclo = document.getElementById('cicloFilter').value;
    resetPvState(search, this.value, ciclo, true);
    await loadPvs();
  });
}

function setupPvCycleFilter() {
  const filter = document.getElementById('cicloFilter');
  if (!filter) return;

  filter.addEventListener('click', async function () {
    if (this.value.trim() !== '') {
      this.value = '';
      const search = document
        .getElementById('searchInputPv')
        .value.toLowerCase()
        .trim();
      const status = document.getElementById('statusFilter').value;
      resetPvState(search, status, '', true);
      await loadPvs();
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

  filter.addEventListener('input', async function () {
    const val = this.value.trim();
    if (val.length > 0 && val.length < 4) return;

    const search = document
      .getElementById('searchInputPv')
      .value.toLowerCase()
      .trim();
    const status = document.getElementById('statusFilter').value;
    resetPvState(search, status, val, true);
    await loadPvs();
  });
}

function setupPvInfiniteScroll() {
  createInfiniteScroll('sentinel', () => loadPvs());
}

function setupPvSort() {
  document.querySelectorAll('#pvTable thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', function () {
      const col = this.dataset.sort;
      if (pvSortBy === col) {
        pvSortDir = pvSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        pvSortBy = col;
        pvSortDir = 'ASC';
      }
      document
        .querySelectorAll('#pvTable thead th .sort-icon')
        .forEach((el) => {
          el.textContent = '';
        });
      const icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = pvSortDir === 'ASC' ? '\u25B2' : '\u25BC';
      resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
      loadPvs();
    });
  });
}

function updateBatchButton() {
  const batchBtn = document.getElementById('batchEmailBtn');
  const selectedCountEl = document.getElementById('selectedCount');
  if (!batchBtn || !selectedCountEl) return;
  const count = selectedPvIds.length;
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
      if (!selectedPvIds.includes(id)) selectedPvIds.push(id);
    } else {
      selectedPvIds = selectedPvIds.filter((v) => v !== id);
    }
    updateBatchButton();
  });

  selectAll.addEventListener('change', function () {
    const checked = this.checked;
    document.querySelectorAll('.pv-checkbox').forEach((cb) => {
      cb.checked = checked;
      const id = parseInt(cb.dataset.pvId);
      if (checked) {
        if (!selectedPvIds.includes(id)) selectedPvIds.push(id);
      } else {
        selectedPvIds = selectedPvIds.filter((v) => v !== id);
      }
    });
    updateBatchButton();
  });

  batchBtn.addEventListener('click', async function () {
    if (selectedPvIds.length === 0) return;
    try {
      const ids = selectedPvIds.join(',');
      const res = await fetch(
        `/app/api/index.php?route=pv&action=list-by-ids&ids=${ids}`
      );
      const result = await res.json();
      if (result.success && result.data) {
        openPvEmailModal({
          batch: true,
          pvs: result.data.pvs,
          ids: selectedPvIds.slice(),
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
  pvPage = 0;
  pvAllLoaded = false;
  pvLoading = false;
  pvList = [];
  selectedPvIds = [];
  lastPvHash = '';

  const tbody = document.getElementById('pvTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pvEmpty');
  if (empty) empty.classList.add('hidden');

  const searchInputPv = document.getElementById('searchInputPv');
  if (searchInputPv) searchInputPv.value = pvSearch;

  const statusFilterInput = document.getElementById('statusFilter');
  if (statusFilterInput) statusFilterInput.value = pvStatusFilter;

  const cicloFilterInput = document.getElementById('cicloFilter');
  if (cicloFilterInput) cicloFilterInput.value = pvCycleFilter;

  setupPvSearch();
  setupPvStatusFilter();
  setupPvCycleFilter();
  setupPvSort();
  setupPvInfiniteScroll();
  setupPvCheckboxes();

  document.querySelector('[data-action="navigate-pv-form"]')
    ?.addEventListener('click', function () { window.location.hash = '#/pvForm'; });
  document.querySelector('[data-action="confirm-delete"]')
    ?.addEventListener('click', confirmDelete);
  document.querySelector('[data-action="close-delete-modal"]')
    ?.addEventListener('click', closeDeleteModal);
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

  PollingManager.start('pv', function () { loadPvs(true); }, 30000);

  loadPvs();
}
