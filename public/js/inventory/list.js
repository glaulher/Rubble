import { createInfiniteScroll } from '/public/js/components/infinite-scroll.js';
import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { getUser } from '/public/js/core/auth.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { downloadCSV } from '/public/js/utils/csv.js';

let inventoryList = [];
let inventorySearch = '';
let inventoryStatus = '';
let inventoryCategory = '';
let inventoryLimit = 20;
var _inventoryScroll = null;

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return String(dateStr);
}

export function getCategoryBadge(category) {
  switch (category) {
    case 'veiculo':
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">' +
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>' +
        'Veículo</span>';
    case 'ferramenta':
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">' +
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>' +
        'Ferramenta</span>';
    case 'celular_ti':
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">' +
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>' +
        'Celular / TI</span>';
    case 'equipamento':
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50">' +
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' +
        'Equipamento</span>';
    case 'outros':
    default:
      return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">' +
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
        'Outros</span>';
  }
}

export function getStatusBadge(status) {
  if (status === 'devolvido') {
    return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">' +
      '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>' +
      'Devolvido</span>';
  }
  return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">' +
    '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>' +
    'Em posse</span>';
}

export async function initInventoryList() {
  inventoryList = [];
  inventorySearch = '';
  inventoryStatus = '';
  inventoryCategory = '';

  const searchInput = document.getElementById('inventorySearchInput');
  if (searchInput) searchInput.value = '';

  const statusSelect = document.getElementById('inventoryStatusFilter');
  if (statusSelect) statusSelect.value = '';

  const categorySelect = document.getElementById('inventoryCategoryFilter');
  if (categorySelect) categorySelect.value = '';

  const pillGroup = document.getElementById('inventoryStatusPills');
  if (pillGroup) {
    const buttons = pillGroup.querySelectorAll('.status-pill');
    buttons.forEach((btn) => {
      const isSelected = (btn.dataset.status || '') === '';
      if (isSelected) {
        btn.className = 'status-pill px-3 py-1.5 rounded-lg transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold cursor-pointer';
      } else {
        btn.className = 'status-pill px-3 py-1.5 rounded-lg transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      }
    });
  }

  const btnNew = document.querySelector('[data-action="navigate-inventory-form"]');
  if (btnNew) {
    btnNew.removeEventListener('click', navigateInventoryForm);
    btnNew.addEventListener('click', navigateInventoryForm);
  }

  const csvBtn = document.querySelector('[data-action="generate-csv"]') || document.getElementById('btnInventoryCsv');
  if (csvBtn) {
    csvBtn.removeEventListener('click', exportInventoryCsv);
    csvBtn.addEventListener('click', exportInventoryCsv);
  }

  const tbody = document.getElementById('inventoryTableBody');
  if (tbody && !tbody._listenerAttached) {
    tbody._listenerAttached = true;
    tbody.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset.id, 10);
      if (!id) return;
      switch (btn.dataset.action) {
        case 'edit':
          editInventoryItem(id);
          break;
        case 'delete':
          deleteInventoryItem(id);
          break;
      }
    });
  }

  if (_inventoryScroll) {
    _inventoryScroll.destroy();
  }

  _inventoryScroll = createInfiniteScroll({
    sentinelId: 'sentinel',
    limit: inventoryLimit,
    fetchFn: async function (params, opts) {
      let url = '/app/api/index.php?route=inventory&limit=' + params.limit + '&offset=' + params.offset;
      if (inventorySearch) {
        url += '&search=' + encodeURIComponent(inventorySearch);
      }
      if (inventoryStatus) {
        url += '&status=' + encodeURIComponent(inventoryStatus);
      }
      if (inventoryCategory) {
        url += '&categoria=' + encodeURIComponent(inventoryCategory);
      }
      try {
        const response = await fetch(url, opts);
        const result = await response.json();
        if (!result.success) {
          showToast('Erro ao carregar inventário', 'error');
          return { data: [], total: 0 };
        }
        return { data: result.data || [], total: result.total || 0 };
      } catch (e) {
        showToast('Erro ao carregar inventário', 'error');
        return { data: [], total: 0 };
      }
    },
    renderFn: function () {
      var state = _inventoryScroll ? _inventoryScroll.getState() : null;
      inventoryList = (state && Array.isArray(state.data)) ? state.data : [];
      renderInventory();
    },
    onError: function () {
      showToast('Erro ao carregar inventário', 'error');
    }
  });

  if (_inventoryScroll) {
    _inventoryScroll.init();
  }

  setupInventorySearch();
  setupInventoryFilters();
}

export function navigateInventoryForm() {
  window.location.hash = '#/inventoryForm';
}

export function editInventoryItem(id) {
  window.location.hash = '#/inventoryForm?id=' + id;
}

export function renderInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  const empty = document.getElementById('inventoryEmpty');
  const counter = document.getElementById('inventoryCounter');
  const counterLabel = document.getElementById('inventoryCounterLabel');

  if (!tbody) return;

  if (!Array.isArray(inventoryList)) {
    inventoryList = [];
  }

  const inPossession = inventoryList.filter((item) => item.status === 'em_posse').length;
  if (counter) {
    counter.textContent = String(inPossession);
  }
  if (counterLabel) {
    counterLabel.textContent = inPossession === 1 ? 'em campo' : 'em campo';
  }

  if (inventoryList.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : '';
  const canDelete = !userRole || ['admin', 'coordenador', 'supervisor'].includes(userRole);

  tbody.innerHTML = inventoryList
    .map(function (item) {
      const categoryBadge = getCategoryBadge(item.categoria);
      const statusBadge = getStatusBadge(item.status);
      const dataRetirada = formatDate(item.data_retirada);
      const dataDevolucao = formatDate(item.data_devolucao);

      let actions =
        '<div class="flex items-center justify-end gap-2">' +
        iconButtonHtml('edit', 'Editar', { 'data-action': 'edit', 'data-id': item.id });
      if (canDelete) {
        actions += iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete', 'data-id': item.id }, 'right');
      }
      actions += '</div>';

      return (
        '<tr data-inventory-id="' + item.id + '" class="hover:bg-slate-50 dark:hover:bg-[#1f2638] transition">' +
        '<td class="px-4 py-3 whitespace-nowrap">' + categoryBadge + '</td>' +
        '<td class="px-4 py-3 font-medium text-slate-900 dark:text-white">' + escapeHtml(item.material_nome || '-') + '</td>' +
        '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + escapeHtml(item.modelo || '-') + '</td>' +
        '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">' + escapeHtml(item.serial || '-') + '</td>' +
        '<td class="px-4 py-3 text-slate-700 dark:text-slate-200">' + escapeHtml(item.tecnico_nome || '-') + '</td>' +
        '<td class="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">' + escapeHtml(dataRetirada) + '</td>' +
        '<td class="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">' + escapeHtml(dataDevolucao) + '</td>' +
        '<td class="px-4 py-3 text-center whitespace-nowrap">' + statusBadge + '</td>' +
        '<td class="px-4 py-3 text-right">' + actions + '</td>' +
        '</tr>'
      );
    })
    .join('');
}

export function setupInventorySearch() {
  const input = document.getElementById('inventorySearchInput');
  if (!input || input._searchInitialized) return;
  input._searchInitialized = true;

  input.addEventListener('click', function () {
    if (this.value !== '') {
      this.value = '';
      inventorySearch = '';
      inventoryList = [];
      if (_inventoryScroll) _inventoryScroll.reset().init();
    }
  });

  let debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      inventorySearch = input.value.trim();
      inventoryList = [];
      if (_inventoryScroll) _inventoryScroll.reset().init();
    }, 300);
  });
}

export function setStatusFilter(status) {
  inventoryStatus = status;
  const statusSelect = document.getElementById('inventoryStatusFilter');
  if (statusSelect && statusSelect.value !== (status || '')) {
    statusSelect.value = status || '';
  }
  const pillGroup = document.getElementById('inventoryStatusPills');
  if (pillGroup) {
    const buttons = pillGroup.querySelectorAll('.status-pill');
    buttons.forEach((btn) => {
      const isSelected = (btn.dataset.status || '') === (status || '');
      if (isSelected) {
        btn.className = 'status-pill px-3 py-1.5 rounded-lg transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold cursor-pointer';
      } else {
        btn.className = 'status-pill px-3 py-1.5 rounded-lg transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      }
    });
  }
  inventoryList = [];
  if (_inventoryScroll) {
    _inventoryScroll.reset().init();
  }
}

export function setCategoryFilter(category) {
  inventoryCategory = category;
  const select = document.getElementById('inventoryCategoryFilter');
  if (select && select.value !== category) {
    select.value = category;
  }
  inventoryList = [];
  if (_inventoryScroll) {
    _inventoryScroll.reset().init();
  }
}

export function setupInventoryFilters() {
  const statusSelect = document.getElementById('inventoryStatusFilter');
  if (statusSelect && !statusSelect._filtersInitialized) {
    statusSelect._filtersInitialized = true;
    statusSelect.addEventListener('change', function () {
      setStatusFilter(this.value);
    });
  }

  const pillGroup = document.getElementById('inventoryStatusPills');
  if (pillGroup && !pillGroup._filtersInitialized) {
    pillGroup._filtersInitialized = true;
    pillGroup.addEventListener('click', function (e) {
      const btn = e.target.closest('.status-pill');
      if (!btn) return;
      setStatusFilter(btn.dataset.status || '');
    });
  }

  const categorySelect = document.getElementById('inventoryCategoryFilter');
  if (categorySelect && !categorySelect._filtersInitialized) {
    categorySelect._filtersInitialized = true;
    categorySelect.addEventListener('change', function () {
      setCategoryFilter(this.value);
    });
  }
}

export async function exportInventoryCsv() {
  try {
    if (typeof showToast === 'function') {
      showToast('Exportando CSV...', 'info');
    }

    let url = '/app/api/index.php?route=inventory&action=export-csv';
    if (inventorySearch) url += '&search=' + encodeURIComponent(inventorySearch);
    if (inventoryStatus) url += '&status=' + encodeURIComponent(inventoryStatus);
    if (inventoryCategory) url += '&categoria=' + encodeURIComponent(inventoryCategory);

    const resp = await fetch(url);
    const result = await resp.json();
    const items = (result && result.data) || [];

    if (!items || items.length === 0) {
      if (typeof showToast === 'function') {
        showToast('Nenhum dado encontrado para exportar', 'error');
      }
      return;
    }

    const header = [
      'ID',
      'Categoria',
      'Material',
      'Modelo',
      'Serial ou Placa',
      'Técnico Responsável',
      'Data de Retirada',
      'Data de Devolução',
      'Status',
      'Observações',
    ].join(';');

    const categoryLabels = {
      veiculo: 'Veículo',
      ferramenta: 'Ferramenta',
      celular_ti: 'Celular TI',
      equipamento: 'Equipamento',
      outros: 'Outros',
    };

    const _sanitize = typeof sanitizeCSV === 'function' ? sanitizeCSV : (typeof globalThis !== 'undefined' && typeof globalThis.sanitizeCSV === 'function' ? globalThis.sanitizeCSV : (v => (v == null ? '' : String(v))));
    const _download = typeof downloadCSV === 'function' ? downloadCSV : (typeof globalThis !== 'undefined' && typeof globalThis.downloadCSV === 'function' ? globalThis.downloadCSV : null);

    if (typeof _download !== 'function') {
      console.error('downloadCSV function not available');
      return;
    }

    const fileName = inventorySearch && inventorySearch.trim() !== ''
      ? 'inventario_' + _sanitize(inventorySearch.trim()).replace(/\s+/g, '_') + '.csv'
      : 'inventario.csv';

    _download(fileName, header, function (addRow) {
      items.forEach(function (item) {
        addRow([
          _sanitize(item.id),
          _sanitize(categoryLabels[item.categoria] || item.categoria || ''),
          _sanitize(item.material_nome || ''),
          _sanitize(item.modelo || ''),
          _sanitize(item.serial || ''),
          _sanitize(item.tecnico_nome || ''),
          _sanitize(item.data_retirada || ''),
          _sanitize(item.data_devolucao || ''),
          _sanitize(item.status === 'devolvido' ? 'Devolvido' : 'Em posse'),
          _sanitize(item.observacoes || ''),
        ]);
      });
    });

    if (typeof showToast === 'function') {
      showToast('CSV exportado com sucesso: ' + items.length + ' registros', 'success');
    }
  } catch (e) {
    console.error('Erro ao exportar CSV', e);
    if (typeof showToast === 'function') {
      showToast('Erro ao exportar CSV', 'error');
    }
  }
}

export async function deleteInventoryItem(id) {
  const item = inventoryList.find(function (i) { return i.id === id; });
  const itemName = item ? (item.material_nome + ' (' + (item.serial || '-') + ')') : '';
  const confirmed = await confirmDelete('Excluir Item', 'Tem certeza que deseja excluir o item', itemName);
  if (!confirmed) return;

  try {
    const response = await fetch('/app/api/index.php?route=inventory&id=' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id }),
    });
    const result = await response.json();
    if (result.success) {
      showToast(result.message || 'Item excluído com sucesso', 'success');
      inventoryList = [];
      if (_inventoryScroll) _inventoryScroll.reset().init();
    } else {
      showToast(result.message || 'Erro ao excluir item', 'error');
    }
  } catch (e) {
    showToast('Erro ao excluir item', 'error');
  }
}

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'inventoryList', {
    get: function () { return inventoryList; },
    set: function (v) { inventoryList = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'inventorySearch', {
    get: function () { return inventorySearch; },
    set: function (v) { inventorySearch = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'inventoryStatus', {
    get: function () { return inventoryStatus; },
    set: function (v) { inventoryStatus = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'inventoryCategory', {
    get: function () { return inventoryCategory; },
    set: function (v) { inventoryCategory = v; },
    configurable: true,
  });
  globalThis.exportInventoryCsv = exportInventoryCsv;
}
