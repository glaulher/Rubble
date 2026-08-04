import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';

var _pendingScroll = null;
var pendingSearch = '';
var pendingStatusFilter = '';
var pendingSortBy = 'e.local';
var pendingSortDir = 'ASC';
var pendingLoading = false;
var pendingAllLoaded = false;

const PENDING_COLUMNS = 13;
const CSR_COLUMNS = [
  'SITE', 'OS', 'EQUIPAMENTO', 'CATEGORIA', 'STATUS', 'DATA_ABERTURA',
  'DATA_PROGRAMADA', 'DATA_REAL_INICIO', 'DATA_PREVISTA_CONCLUSAO',
  'DATA_CONCLUSAO', 'TECNICO', 'MATERIAL', 'LOCALIDADE',
];

const PENDING_STATUS_OPTIONS = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];

const PENDING_EDITABLE_TYPES = {
  status: 'select',
  data: 'date',
  data_planejada: 'date',
  data_real_inicio: 'date',
  data_prevista_conclusao: 'date',
  data_concluido: 'date',
  equipe: 'text',
  material: 'text',
};

function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendente':
      return 'bg-red-100 text-red-700';
    case 'planejado':
      return 'bg-yellow-100 text-yellow-700';
    case 'em andamento':
      return 'bg-blue-100 text-blue-700';
    case 'projeto clean up':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getCategoryBadgeClass(tipo) {
  switch ((tipo || '').toLowerCase()) {
    case 'corretiva':
      return 'bg-orange-100 text-orange-700';
    case 'preventiva':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function pendingValueRaw(value) {
  return value === null || value === undefined ? '' : value;
}

function pendingFieldDisplay(field, value) {
  if (field.indexOf('data') === 0) return formatDate(value);
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function pendingBadgeClassFor(field, value) {
  if (field === 'status') return 'status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getStatusBadgeClass(value);
  if (field === 'tipo') return 'category-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getCategoryBadgeClass(value);
  return '';
}

function pendingEditBtn(field) {
  return '<button type="button" class="pending-edit text-slate-400 hover:text-blue-500 ml-1 align-middle" data-field="' + field + '" title="Editar" aria-label="Editar">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
    + '</button>';
}

function buildPendingStatusSelect(selected) {
  var html = '<select class="pending-edit-input pending-status px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">';
  for (var i = 0; i < PENDING_STATUS_OPTIONS.length; i++) {
    var opt = PENDING_STATUS_OPTIONS[i];
    var sel = String(selected).toLowerCase() === opt ? ' selected' : '';
    html += '<option value="' + opt + '"' + sel + '>' + opt.charAt(0).toUpperCase() + opt.slice(1) + '</option>';
  }
  html += '</select>';
  return html;
}

function pendingEditableCellHtml(field, value) {
  var raw = pendingValueRaw(value);
  var display = pendingFieldDisplay(field, value);
  var badge = pendingBadgeClassFor(field, value);
  return '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400" data-field="' + field + '">'
    + '<span class="pending-value' + (badge ? ' ' + badge : '') + '" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
    + pendingEditBtn(field)
    + '</td>';
}

function enterPendingEdit(td, field) {
  if (td.querySelector('.pending-edit-input')) return;
  var valueEl = td.querySelector('.pending-value');
  var raw = valueEl ? valueEl.getAttribute('data-raw') : '';
  td.setAttribute('data-prev-raw', raw);

  var type = PENDING_EDITABLE_TYPES[field] || 'text';
  var inputHtml;
  if (type === 'select') {
    inputHtml = buildPendingStatusSelect(raw);
  } else if (type === 'date') {
    inputHtml = '<input type="date" class="pending-edit-input pending-date px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200" value="' + escapeHtml(raw) + '" />';
  } else {
    inputHtml = '<input type="text" class="pending-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200" value="' + escapeHtml(raw) + '" />';
  }

  td.innerHTML = inputHtml
    + '<button type="button" class="pending-save ml-1 px-1.5 py-1 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-800" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
    + '<button type="button" class="pending-cancel ml-1 px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-900" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
}

function refreshPendingCell(td, field, value) {
  var raw = pendingValueRaw(value);
  var display = pendingFieldDisplay(field, value);
  var badge = pendingBadgeClassFor(field, value);
  td.removeAttribute('data-prev-raw');
  td.innerHTML = '<span class="pending-value' + (badge ? ' ' + badge : '') + '" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>' + pendingEditBtn(field);
}

function cancelPendingEdit(td) {
  var field = td.getAttribute('data-field');
  var prev = td.getAttribute('data-prev-raw') || '';
  refreshPendingCell(td, field, prev);
}

async function savePendingField(td) {
  var input = td.querySelector('.pending-edit-input');
  if (!input) return;
  var value = input.value;
  var field = td.getAttribute('data-field');
  var tr = td.closest('tr.pending-row');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao salvar campo', 'error');
      return;
    }
    refreshPendingCell(td, field, value);
    showToast('Campo atualizado', 'success');
  } catch (e) {
    console.error('Erro ao salvar campo', e);
    showToast('Erro ao salvar campo', 'error');
  }
}

function renderPendingTable(list, append) {
  append = append || false;
  var tbody = document.getElementById('pendingTableBody');
  var empty = document.getElementById('pendingEmpty');

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

    html += '<tr class="pending-row border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"'
      + ' data-id="' + item.id + '" data-expandable="true">'
      + '<td class="px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200">'
      + '<span class="expand-icon text-slate-400 mr-2">&#9654;</span>'
      + escapeHtml(item.local) + '</td>'
      + '<td class="px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">'
      + escapeHtml(item.os || '') + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">'
      + escapeHtml(item.equipamento || '') + '</td>'
      + '<td class="px-3 py-2.5 text-sm">'
      + '<span class="category-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getCategoryBadgeClass(item.tipo) + '">'
      + escapeHtml(item.tipo || '-') + '</span></td>'
      + pendingEditableCellHtml('status', item.status)
      + pendingEditableCellHtml('data', item.data)
      + pendingEditableCellHtml('data_planejada', item.data_planejada)
      + pendingEditableCellHtml('data_real_inicio', item.data_real_inicio)
      + pendingEditableCellHtml('data_prevista_conclusao', item.data_prevista_conclusao)
      + pendingEditableCellHtml('data_concluido', item.data_concluido)
      + pendingEditableCellHtml('equipe', item.equipe)
      + pendingEditableCellHtml('material', item.material)
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.localidade || '-') + '</td></tr>';

    html += '<tr class="pending-details hidden" data-detail-for="' + item.id + '">'
      + '<td colspan="' + PENDING_COLUMNS + '" class="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/30">'
      + '<div class="text-sm"><span class="text-slate-500">Observa\u00e7\u00e3o:</span> '
      + '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.obs || '-') + '</span></div>'
      + '</td></tr>';
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }
}

function syncPendingTable(newItems) {
  var tbody = document.getElementById('pendingTableBody');
  if (!tbody) return;

  var existingRows = tbody.querySelectorAll('tr.pending-row');
  var existingIds = {};
  for (var i = 0; i < existingRows.length; i++) {
    var id = existingRows[i].getAttribute('data-id');
    if (id) existingIds[id] = existingRows[i];
  }

  var newIds = {};
  for (var i = 0; i < newItems.length; i++) {
    newIds[newItems[i].id] = true;
  }

  for (var id in existingIds) {
    if (!newIds[id]) {
      var row = existingIds[id];
      var detail = tbody.querySelector('tr.pending-details[data-detail-for="' + id + '"]');
      if (row) row.remove();
      if (detail) detail.remove();
    }
  }
}

function togglePendingRow(id) {
  var row = document.querySelector('tr.pending-row[data-id="' + id + '"]');
  var detail = document.querySelector('tr.pending-details[data-detail-for="' + id + '"]');
  if (!row || !detail) return;

  detail.classList.toggle('hidden');
  var icon = row.querySelector('.expand-icon');
  if (icon) {
    icon.innerHTML = detail.classList.contains('hidden') ? '&#9654;' : '&#9660;';
  }
}

function updatePendingBadge(data) {
  var badge = document.getElementById('pendingBadge');
  if (badge) badge.textContent = data.total || 0;
}

function updatePendingCount(total) {
  var count = document.getElementById('pendingCount');
  if (count) count.textContent = total || 0;
}

function buildPendingCsvRow(item) {
  return [
    sanitizeCSV(item.local),
    sanitizeCSV(item.os || ''),
    sanitizeCSV(item.equipamento || ''),
    sanitizeCSV(item.tipo || ''),
    sanitizeCSV(item.status || ''),
    formatDate(item.data),
    formatDate(item.data_planejada),
    formatDate(item.data_real_inicio),
    formatDate(item.data_prevista_conclusao),
    formatDate(item.data_concluido),
    sanitizeCSV(item.equipe || ''),
    sanitizeCSV(item.material || ''),
    sanitizeCSV(item.localidade || ''),
  ];
}

async function exportPendingCsv() {
  try {
    var allRows = [];
    var offset = 0;
    var total;
    var CHUNK = 200;

    while (true) {
      var url = '/app/api/index.php?route=pending-tickets&limit=' + CHUNK
        + '&offset=' + offset
        + '&search=' + encodeURIComponent(pendingSearch)
        + '&status=' + encodeURIComponent(pendingStatusFilter)
        + buildPendingSortQuery();

      var resp = await fetch(url);
      var result = await resp.json();
      var chunk = (result && result.data && result.data.items) || [];
      total = (result && result.data && result.data.total) || chunk.length;

      for (var i = 0; i < chunk.length; i++) {
        allRows.push(buildPendingCsvRow(chunk[i]));
      }

      if (chunk.length === 0) break;
      offset += chunk.length;
    }

    if (allRows.length === 0) {
      showToast('Nenhum dado encontrado', 'error');
      return;
    }

    var fileName = pendingSearch && pendingSearch.trim() !== ''
      ? 'os_pendentes_' + pendingSearch.trim().replace(/\s+/g, '_') + '.csv'
      : 'os_pendentes.csv';

    var header = CSR_COLUMNS.join(';');

    downloadCSV(fileName, header, function (_addRow) {
      for (var i = 0; i < allRows.length; i++) {
        _addRow(allRows[i]);
      }
    });

    showToast('CSV gerado: ' + allRows.length + ' registros', 'success');
  } catch (e) {
    console.error('Erro ao exportar CSV', e);
    showToast('Erro ao gerar CSV', 'error');
  }
}

var pendingDebouncedSearch = debounce(function (val) {
  pendingSearch = val;
  pendingStatusFilter = pendingStatusFilter || '';
  _pendingReset();
}, 1000);

function buildPendingSortQuery() {
  return '&sort_by=' + encodeURIComponent(pendingSortBy)
    + '&sort_dir=' + encodeURIComponent(pendingSortDir);
}

function _pendingReset() {
  pendingLoading = false;
  pendingAllLoaded = false;
  if (_pendingScroll) _pendingScroll.reset().init();
}

function setupPendingSort() {
  document.querySelectorAll('#pendingTable thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.sort;
      if (pendingSortBy === col) {
        pendingSortDir = pendingSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        pendingSortBy = col;
        pendingSortDir = 'ASC';
      }
      document.querySelectorAll('#pendingTable thead th .sort-icon').forEach(function (el) {
        el.textContent = '';
      });
      var icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = pendingSortDir === 'ASC' ? '\u25B2' : '\u25BC';
      _pendingReset();
    });
  });
}

function initPendingTickets() {
  pendingSearch = '';
  pendingStatusFilter = '';
  pendingSortBy = 'e.local';
  pendingSortDir = 'ASC';
  pendingLoading = false;
  pendingAllLoaded = false;

  var searchInput = document.getElementById('pendingSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.addEventListener('input', function () {
      pendingDebouncedSearch(this.value);
    });
  }

  var filterRadios = document.querySelectorAll('input[name="pendingFilter"]');
  for (var i = 0; i < filterRadios.length; i++) {
    filterRadios[i].addEventListener('change', function () {
      if (!this.checked) return;
      pendingStatusFilter = this.value;
      _pendingReset();
    });
  }

  var refreshBtn = document.getElementById('pendingRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      _pendingReset();
    });
  }

  var csvBtn = document.getElementById('pendingCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', exportPendingCsv);
  }

  var tbody = document.getElementById('pendingTableBody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var editBtn = e.target.closest('button.pending-edit');
      if (editBtn) {
        enterPendingEdit(editBtn.closest('td'), editBtn.getAttribute('data-field'));
        return;
      }
      var saveBtn = e.target.closest('button.pending-save');
      if (saveBtn) {
        savePendingField(saveBtn.closest('td'));
        return;
      }
      var cancelBtn = e.target.closest('button.pending-cancel');
      if (cancelBtn) {
        cancelPendingEdit(cancelBtn.closest('td'));
        return;
      }
      var row = e.target.closest('tr.pending-row');
      if (row) {
        var id = row.getAttribute('data-id');
        if (id) togglePendingRow(parseInt(id));
      }
    });

    tbody.addEventListener('keydown', function (e) {
      var input = e.target.closest('.pending-edit-input');
      if (!input) return;
      var td = input.closest('td');
      if (e.key === 'Enter') {
        savePendingField(td);
      } else if (e.key === 'Escape') {
        cancelPendingEdit(td);
      }
    });
  }

  setupPendingSort();

  _pendingScroll = createInfiniteScroll({
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=pending-tickets&limit=' + params.limit
        + '&offset=' + params.offset
        + '&search=' + encodeURIComponent(pendingSearch)
        + '&status=' + encodeURIComponent(pendingStatusFilter)
        + buildPendingSortQuery();

      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderPendingTable(items, true);
    },
    renderFullFn: function (items, total) {
      renderPendingTable(items, false);
      updatePendingBadge({ total: total });
      updatePendingCount(total);
    },
    afterLoadFn: function (state) {
      if (!state.isPolling) {
        updatePendingBadge({ total: state.total });
        updatePendingCount(state.total);
      }
    },
    getFilterHash: function () {
      return pendingSearch + '|' + pendingStatusFilter + '|' + pendingSortBy + '|' + pendingSortDir;
    },
    sentinelId: 'pendingSentinel',
    scrollContainerId: 'pendingScrollContainer',
    limit: 20,
  });

  _pendingScroll.init();
}

globalThis.initPendingTickets = initPendingTickets;
globalThis.exportPendingCsv = exportPendingCsv;
globalThis.buildPendingCsvRow = buildPendingCsvRow;
globalThis.buildPendingSortQuery = buildPendingSortQuery;