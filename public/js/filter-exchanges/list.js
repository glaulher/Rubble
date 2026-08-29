import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, showModal, hideModal, confirmDelete } from '/public/js/core/dom.js';
import { downloadCSV } from '/public/js/utils/csv.js';
import { formatDate } from '/public/js/pv/form-utils.js';

var _filterScroll = null;
var filterSearch = '';
var filterStatusFilter = '';
var filterSortBy = 'f.local';
var filterSortDir = 'ASC';
var filterLoading = false;
var filterAllLoaded = false;
var _filterTotalQtd = 0;

var FILTER_COLUMNS_DEF = [
  { key: 'local', label: 'Local' },
  { key: 'equipamento', label: 'Equipamento' },
  { key: 'tamanho', label: 'Tamanho' },
  { key: 'qtd', label: 'Qtd' },
  { key: 'os', label: 'OS' },
  { key: 'data_troca', label: 'Troca' },
  { key: 'data_proxima_troca', label: 'Próxima' },
  { key: 'intervalo_meses', label: 'Intervalo' },
  { key: 'status', label: 'Status' },
];

var FILTER_EDITABLE_COLS = ['tamanho', 'qtd', 'os', 'data_troca', 'intervalo_meses'];

var FILTER_ADMIN_ONLY_COLS = ['tamanho', 'qtd'];

var FILTER_CSR_HEADER = [
  'LOCAL', 'EQUIPAMENTO', 'TAMANHO', 'QTD', 'OS', 'TROCA', 'PROXIMA_TROCA', 'STATUS',
];

var filterHiddenColumns = new Set();
var filterColTodosChecked = true;

export function getFilterStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendente':
      return 'bg-red-100 text-red-700';
    case 'planejado':
      return 'bg-amber-100 text-amber-700';
    case 'concluído':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function filterValueRaw(value) {
  return value === null || value === undefined ? '' : value;
}

export function feIsAdmin() {
  if (typeof getUser === 'function') {
    var u = getUser();
    return !!(u && u.role === 'admin');
  }
  return false;
}

export function filterDeleteBtn() {
  return '<button type="button" class="filter-delete bg-red-100 hover:bg-red-200 text-red-500 p-1.5 rounded-lg transition" title="Excluir" aria-label="Excluir">'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
    + '</button>';
}

export function formatFilterDate(value) {
  if (value === null || value === undefined || value === '') return '-';
  var parts = String(value).split('-');
  if (parts.length !== 3) return String(value);
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export function filterFieldDisplay(field, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (field === 'data_troca' || field === 'data_proxima_troca') return formatFilterDate(value);
  if (field === 'intervalo_meses') return String(value);
  return value;
}

export function filterEditBtn(field) {
  return '<button type="button" class="filter-edit text-slate-400 hover:text-blue-500 ml-1 align-middle" data-field="' + field + '" title="Editar" aria-label="Editar">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
    + '</button>';
}

export function buildFilterCellHtml(field, value) {
  var raw = filterValueRaw(value);
  var display = filterFieldDisplay(field, value);
  var hidden = filterHiddenColumns.has(field) ? ' hidden' : '';

  if (field === 'status') {
    return '<td class="px-3 py-2.5 text-sm' + hidden + '" data-col="status">'
      + '<span class="filter-value status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getFilterStatusBadgeClass(value) + '">'
      + escapeHtml(display) + '</span>'
      + '</td>';
  }

  var canEdit = FILTER_EDITABLE_COLS.indexOf(field) !== -1;
  if (canEdit && FILTER_ADMIN_ONLY_COLS.indexOf(field) !== -1 && !feIsAdmin()) {
    canEdit = false;
  }

  if (canEdit) {
    return '<td class="px-3 py-2.5 text-sm text-slate-600' + hidden + '" data-col="' + field + '">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="filter-value" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
      + filterEditBtn(field)
      + '</span>'
      + '</td>';
  }

  return '<td class="px-3 py-2.5 text-sm text-slate-600' + hidden + '" data-col="' + field + '">'
    + '<span class="filter-value" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
    + '</td>';
}

export function renderFilterTable(list, append) {
  append = append || false;
  var tbody = document.getElementById('filterTableBody');
  var empty = document.getElementById('filterEmpty');

  if (!tbody) return;

  if (!append) {
    tbody.innerHTML = '';
  }

  if (list.length === 0 && !append) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  var html = '';

  for (var i = 0; i < list.length; i++) {
    var item = list[i];

    html += '<tr class="filter-row border-b border-slate-200 hover:bg-slate-50" data-id="' + item.id + '">'
      + buildFilterCellHtml('local', item.local)
      + buildFilterCellHtml('equipamento', item.equipamento)
      + buildFilterCellHtml('tamanho', item.tamanho)
      + buildFilterCellHtml('qtd', item.qtd)
      + buildFilterCellHtml('os', item.os)
      + buildFilterCellHtml('data_troca', item.data_troca)
      + buildFilterCellHtml('data_proxima_troca', item.data_proxima_troca)
      + buildFilterCellHtml('intervalo_meses', item.intervalo_meses)
      + buildFilterCellHtml('status', item.status)
      + (feIsAdmin()
        ? '<td class="px-3 py-2.5 text-sm text-center" data-col="actions">' + filterDeleteBtn() + '</td>'
        : '')
      + '</tr>';
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }

  applyFilterColumnVisibility();
}

export function refreshFilterCell(cell, field, value) {
  var raw = filterValueRaw(value);
  cell.removeAttribute('data-prev-raw');
  var display = filterFieldDisplay(field, value);

  if (field === 'status') {
    cell.innerHTML = '<span class="filter-value status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getFilterStatusBadgeClass(value) + '">'
      + escapeHtml(display) + '</span>';
    return;
  }

  var canEdit = FILTER_EDITABLE_COLS.indexOf(field) !== -1;
  if (canEdit && FILTER_ADMIN_ONLY_COLS.indexOf(field) !== -1 && !feIsAdmin()) {
    canEdit = false;
  }

  if (canEdit) {
    cell.innerHTML = '<span class="inline-flex items-center gap-1">'
      + '<span class="filter-value" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
      + filterEditBtn(field)
      + '</span>';
    return;
  }

  cell.innerHTML = '<span class="filter-value" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>';
}

export function enterFilterEdit(cell, field) {
  if (cell.querySelector('.filter-edit-input')) return;
  var valueEl = cell.querySelector('.filter-value');
  var raw = valueEl ? (valueEl.getAttribute('data-raw') || '') : '';
  cell.setAttribute('data-prev-raw', raw);

  var isDate = field === 'data_troca' || field === 'data_proxima_troca';
  var isQtd = field === 'qtd';
  var isIntervalo = field === 'intervalo_meses';
  var inputHtml = isDate
    ? '<input type="date" class="filter-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800" value="' + escapeHtml(raw) + '" />'
    : isQtd
      ? '<input type="number" min="1" step="1" class="filter-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 w-20" value="' + escapeHtml(raw) + '" />'
      : isIntervalo
        ? '<input type="number" min="1" max="12" step="1" class="filter-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 w-20" value="' + escapeHtml(raw) + '" />'
        : '<input type="text" class="filter-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800" value="' + escapeHtml(raw) + '" />';

  cell.innerHTML = inputHtml
    + '<button type="button" class="filter-save ml-1 px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
    + '<button type="button" class="filter-cancel ml-1 px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

  var inputEl = cell.querySelector('.filter-edit-input');
  if (inputEl) {
    inputEl.addEventListener('blur', function (e) {
      var rel = e.relatedTarget;
      if (rel && rel.closest && rel.closest('.filter-save')) return;
      if (rel && rel.closest && rel.closest('.filter-cancel')) return;
      if (inputEl.value === (cell.getAttribute('data-prev-raw') || '')) return;
      saveFilterField(cell);
    });
  }
}

export function cancelFilterEdit(cell) {
  var field = cell.getAttribute('data-col') || cell.getAttribute('data-field') || '';
  var prev = cell.getAttribute('data-prev-raw') || '';
  refreshFilterCell(cell, field, prev);
}

export async function saveFilterField(cell) {
  var input = cell.querySelector('.filter-edit-input');
  if (!input) return;
  var value = input.value;
  var field = cell.getAttribute('data-col') || cell.getAttribute('data-field') || '';
  var tr = cell.closest('tr.filter-row');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=filter-exchanges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      if (typeof showToast === 'function') showToast(result.message || 'Erro ao salvar campo', 'error');
      return;
    }
    refreshFilterCell(cell, field, value);
    if (field === 'data_troca' && result.data && result.data.data_proxima_troca !== undefined) {
      var row = cell.closest('tr.filter-row');
      var nextCell = row ? row.querySelector('td[data-col="data_proxima_troca"]') : null;
      if (nextCell) refreshFilterCell(nextCell, 'data_proxima_troca', result.data.data_proxima_troca);
    }
    if (field === 'data_troca' && result.data && result.data.intervalo_meses !== undefined) {
      var r1 = cell.closest('tr.filter-row');
      var ivCell = r1 ? r1.querySelector('td[data-col="intervalo_meses"]') : null;
      if (ivCell) refreshFilterCell(ivCell, 'intervalo_meses', result.data.intervalo_meses);
    }
    if (field === 'data_troca' && result.data && result.data.status !== undefined) {
      var row = cell.closest('tr.filter-row');
      var statusCell = row ? row.querySelector('td[data-col="status"]') : null;
      if (statusCell) refreshFilterCell(statusCell, 'status', result.data.status);
    }
    if (field === 'intervalo_meses' && result.data && result.data.data_proxima_troca !== undefined) {
      var r2 = cell.closest('tr.filter-row');
      var nextCell2 = r2 ? r2.querySelector('td[data-col="data_proxima_troca"]') : null;
      if (nextCell2) refreshFilterCell(nextCell2, 'data_proxima_troca', result.data.data_proxima_troca);
    }
    if (field === 'intervalo_meses' && result.data && result.data.status !== undefined) {
      var r3 = cell.closest('tr.filter-row');
      var statusCell2 = r3 ? r3.querySelector('td[data-col="status"]') : null;
      if (statusCell2) refreshFilterCell(statusCell2, 'status', result.data.status);
    }
    if (typeof showToast === 'function') showToast('Campo atualizado', 'success');
  } catch (e) {
    console.error('Erro ao salvar campo', e);
    if (typeof showToast === 'function') showToast('Erro ao salvar campo', 'error');
  }
}

export async function deleteFilterRow(id) {
  var tr = document.querySelector('#filterTableBody tr.filter-row[data-id="' + String(parseInt(id, 10)) + '"]');
  var label = 'filtro #' + id;
  if (tr) {
    var localEl = tr.querySelector('td[data-col="local"] .filter-value');
    var eqEl = tr.querySelector('td[data-col="equipamento"] .filter-value');
    var localTxt = localEl ? localEl.textContent : '';
    var eqTxt = eqEl ? eqEl.textContent : '';
    if (localTxt || eqTxt) label = (localTxt + ' - ' + eqTxt).replace(/ - -$/, '');
  }
  var confirmed = await confirmDelete('Excluir Filtro', 'Tem certeza que deseja excluir o filtro de', label);
  if (!confirmed) return;
  try {
    var resp = await apiFetch('/app/api/index.php?route=filter-exchanges&id=' + encodeURIComponent(id), { method: 'DELETE' });
    var result = await resp.json();
    if (!result.success) {
      if (typeof showToast === 'function') showToast(result.message || 'Erro ao excluir filtro', 'error');
      return;
    }
    if (typeof showToast === 'function') showToast('Filtro excluído', 'success');
    _filterReset();
  } catch (err) {
    console.error('Erro ao excluir filtro', err);
    if (typeof showToast === 'function') showToast('Erro ao excluir filtro', 'error');
  }
}

export function updateFilterBadge() {
  var badge = document.getElementById('filterBadge');
  if (badge) badge.textContent = _filterTotalQtd || 0;
}

export function applyFilterColumnVisibility() {
  for (var i = 0; i < FILTER_COLUMNS_DEF.length; i++) {
    var col = FILTER_COLUMNS_DEF[i].key;
    var hidden = filterHiddenColumns.has(col);
    var ths = document.querySelectorAll('#filterTable thead th[data-col="' + col + '"]');
    var tds = document.querySelectorAll('#filterTable tbody td[data-col="' + col + '"]');
    for (var t = 0; t < ths.length; t++) ths[t].classList.toggle('hidden', hidden);
    for (var d = 0; d < tds.length; d++) tds[d].classList.toggle('hidden', hidden);
  }
}

export function updateFilterColumnLabel() {
  var label = document.getElementById('filterColLabel');
  if (!label) return;
  if (filterColTodosChecked) {
    label.textContent = 'Todas';
    label.classList.remove('text-blue-600');
  } else {
    label.textContent = filterHiddenColumns.size + ' oculta(s)';
    label.classList.add('text-blue-600');
  }
}

export function renderFilterColumnDropdown() {
  var dropdown = document.getElementById('filterColDropdown');
  if (!dropdown) return;

  if (!dropdown.dataset.delegated) {
    dropdown.addEventListener('change', function (e) {
      var cb = e.target.closest('.filter-col-check');
      if (!cb) return;
      var val = cb.dataset.value;
      if (val === '__all__') {
        filterColTodosChecked = cb.checked;
        if (cb.checked) {
          filterHiddenColumns.clear();
        } else {
          filterHiddenColumns = new Set(FILTER_COLUMNS_DEF.map(function (c) { return c.key; }));
        }
      } else {
        if (cb.checked) {
          filterHiddenColumns.delete(val);
        } else {
          filterHiddenColumns.add(val);
        }
        filterColTodosChecked = filterHiddenColumns.size === 0;
      }
      renderFilterColumnDropdown();
      updateFilterColumnLabel();
      applyFilterColumnVisibility();
    });
    dropdown.dataset.delegated = '1';
  }

  var html = '';
  var allChecked = filterColTodosChecked ? 'checked' : '';
  html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">';
  html += '<input type="checkbox" class="filter-col-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="__all__" ' + allChecked + '>';
  html += '<span class="text-sm text-slate-700 font-medium">Todas</span>';
  html += '</label>';

  for (var i = 0; i < FILTER_COLUMNS_DEF.length; i++) {
    var col = FILTER_COLUMNS_DEF[i];
    var checked = filterColTodosChecked || !filterHiddenColumns.has(col.key) ? 'checked' : '';
    html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">';
    html += '<input type="checkbox" class="filter-col-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="' + col.key + '" ' + checked + '>';
    html += '<span class="text-sm text-slate-700">' + escapeHtml(col.label) + '</span>';
    html += '</label>';
  }

  dropdown.innerHTML = html;
}

export function initFilterColumnSelect() {
  var btn = document.getElementById('filterColBtn');
  var dropdown = document.getElementById('filterColDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  if (!document._filterColGlobalListener) {
    document.addEventListener('click', function (e) {
      var container = document.getElementById('filterColContainer');
      if (container && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
    document._filterColGlobalListener = true;
  }

  renderFilterColumnDropdown();
  updateFilterColumnLabel();
  applyFilterColumnVisibility();
}

export function buildFilterQuery() {
  return 'search=' + encodeURIComponent(filterSearch)
    + '&status=' + encodeURIComponent(filterStatusFilter)
    + '&sort_by=' + encodeURIComponent(filterSortBy)
    + '&sort_dir=' + encodeURIComponent(filterSortDir);
}

export function buildFilterCsvRow(item) {
  return [
    sanitizeCSV(item.local),
    sanitizeCSV(item.equipamento),
    sanitizeCSV(item.tamanho),
    String(item.qtd),
    sanitizeCSV(item.os || ''),
    formatDate(item.data_troca),
    formatDate(item.data_proxima_troca),
    sanitizeCSV(item.status || ''),
  ];
}

export async function exportFilterCsv() {
  try {
    var allRows = [];
    var offset = 0;
    var CHUNK = 200;

    while (true) {
      var url = '/app/api/index.php?route=filter-exchanges&limit=' + CHUNK
        + '&offset=' + offset
        + '&' + buildFilterQuery();

      var resp = await apiFetch(url);
      var result = await resp.json();
      var chunk = (result && result.data && result.data.items) || [];

      for (var i = 0; i < chunk.length; i++) {
        allRows.push(buildFilterCsvRow(chunk[i]));
      }

      if (chunk.length === 0) break;
      offset += chunk.length;
    }

    if (allRows.length === 0) {
      if (typeof showToast === 'function') showToast('Nenhum dado encontrado', 'error');
      return;
    }

    var fileName = filterSearch && filterSearch.trim() !== ''
      ? 'troca_filtros_' + filterSearch.trim().replace(/\s+/g, '_') + '.csv'
      : 'troca_filtros.csv';

    var header = FILTER_CSR_HEADER.join(';');

    downloadCSV(fileName, header, function (_addRow) {
      for (var i = 0; i < allRows.length; i++) {
        _addRow(allRows[i]);
      }
    });

    if (typeof showToast === 'function') showToast('CSV gerado: ' + allRows.length + ' registros', 'success');
  } catch (e) {
    console.error('Erro ao exportar CSV', e);
    if (typeof showToast === 'function') showToast('Erro ao gerar CSV', 'error');
  }
}

var filterDebouncedSearch = debounce(function (val) {
  filterSearch = val;
  _filterReset();
}, 1000);

export function setupFilterSort() {
  document.querySelectorAll('#filterTable thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.sort;
      if (filterSortBy === col) {
        filterSortDir = filterSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        filterSortBy = col;
        filterSortDir = 'ASC';
      }
      document.querySelectorAll('#filterTable thead th .sort-icon').forEach(function (el) {
        el.textContent = '';
      });
      var icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = filterSortDir === 'ASC' ? '\u25B2' : '\u25BC';
      _filterReset();
    });
  });
}

export function _filterReset() {
  filterLoading = false;
  filterAllLoaded = false;
  var tbody = document.getElementById('filterTableBody');
  if (tbody) tbody.innerHTML = '';
  if (_filterScroll) _filterScroll.reset().init();
}

export async function openFilterAddModal() {
  if (typeof showModal === 'function') {
    showModal('filterAddModal');
  }
}

export async function submitFilterAdd() {
  var local = document.getElementById('filterAddLocal');
  var equipamento = document.getElementById('filterAddEquipamento');
  var uf = document.getElementById('filterAddUf');
  var regiao = document.getElementById('filterAddRegiao');
  var tamanho = document.getElementById('filterAddTamanho');
  var qtd = document.getElementById('filterAddQtd');

  if (!local || !equipamento || !qtd) return;

  if (local.value.trim() === '' || equipamento.value.trim() === '') {
    if (typeof showToast === 'function') showToast('Preencha local e equipamento', 'error');
    return;
  }

  try {
    var resp = await apiFetch('/app/api/index.php?route=filter-exchanges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local: local.value.trim(),
        equipamento: equipamento.value.trim(),
        uf: uf ? uf.value.trim() : '',
        regiao: regiao ? regiao.value.trim() : '',
        tamanho: tamanho ? tamanho.value.trim() : '',
        qtd: parseInt(qtd.value, 10) || 1,
      }),
    });
    var result = await resp.json();
    if (!result.success) {
      if (typeof showToast === 'function') showToast(result.message || 'Erro ao adicionar filtro', 'error');
      return;
    }
    if (typeof hideModal === 'function') hideModal('filterAddModal');
    if (typeof showToast === 'function') showToast('Filtro adicionado', 'success');
    _filterReset();
  } catch (e) {
    console.error('Erro ao adicionar filtro', e);
    if (typeof showToast === 'function') showToast('Erro ao adicionar filtro', 'error');
  }
}

export function initFilterExchanges() {
  filterSearch = '';
  filterStatusFilter = '';
  filterSortBy = 'f.local';
  filterSortDir = 'ASC';
  filterLoading = false;
  filterAllLoaded = false;
  _filterTotalQtd = 0;
  filterHiddenColumns = new Set();
  filterColTodosChecked = true;

  var searchInput = document.getElementById('filterSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.addEventListener('click', function () {
      if (this.value.trim() !== '') {
        this.value = '';
        filterSearch = '';
        _filterReset();
      }
    });
    searchInput.addEventListener('input', function () {
      filterDebouncedSearch(this.value);
    });
  }

  var filterRadios = document.querySelectorAll('input[name="filterStatusFilter"]');
  for (var i = 0; i < filterRadios.length; i++) {
    filterRadios[i].addEventListener('change', function () {
      if (!this.checked) return;
      filterStatusFilter = this.value;
      _filterReset();
    });
  }

  var csvBtn = document.getElementById('filterCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', exportFilterCsv);
  }

  var addBtn = document.getElementById('filterAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openFilterAddModal);
  }

  var submitAddBtn = document.getElementById('filterAddSubmit');
  if (submitAddBtn) {
    submitAddBtn.addEventListener('click', submitFilterAdd);
  }

  document.querySelectorAll('[data-action="close-add-filter"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (typeof hideModal === 'function') hideModal('filterAddModal');
    });
  });

  var tbody = document.getElementById('filterTableBody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var delBtn = e.target.closest('button.filter-delete');
      if (delBtn) {
        var drow = delBtn.closest('tr.filter-row');
        if (drow) deleteFilterRow(drow.getAttribute('data-id'));
        return;
      }
      var editBtn = e.target.closest('button.filter-edit');
      if (editBtn) {
        var cell = editBtn.closest('td');
        enterFilterEdit(cell, editBtn.getAttribute('data-field'));
        return;
      }
      var saveBtn = e.target.closest('button.filter-save');
      if (saveBtn) {
        saveFilterField(saveBtn.closest('td'));
        return;
      }
      var cancelBtn = e.target.closest('button.filter-cancel');
      if (cancelBtn) {
        cancelFilterEdit(cancelBtn.closest('td'));
        return;
      }
    });

    tbody.addEventListener('keydown', function (e) {
      var input = e.target.closest('.filter-edit-input');
      if (!input) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        saveFilterField(input.closest('td'));
      } else if (e.key === 'Escape') {
        cancelFilterEdit(input.closest('td'));
      }
    });
  }

  setupFilterSort();
  initFilterColumnSelect();

  _filterScroll = createInfiniteScroll({
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=filter-exchanges&limit=' + params.limit
        + '&offset=' + params.offset
        + '&' + buildFilterQuery();

      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          _filterTotalQtd = result.data.total_qtd || 0;
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderFilterTable(items, true);
    },
    renderFullFn: function (items, total) {
      renderFilterTable(items, false);
      updateFilterBadge();
    },
    afterLoadFn: function (state) {
      if (!state.isPolling) {
        updateFilterBadge();
      }
    },
    getFilterHash: function () {
      return filterSearch + '|' + filterStatusFilter + '|' + filterSortBy + '|' + filterSortDir;
    },
    sentinelId: 'filterSentinel',
    scrollContainerId: 'filterScrollContainer',
    limit: 20,
  });

  _filterScroll.init();
}

export var initFilters = initFilterExchanges;
