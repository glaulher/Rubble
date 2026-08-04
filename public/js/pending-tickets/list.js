import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';

var _pendingScroll = null;
var pendingSearch = '';
var pendingStatusFilter = '';
var pendingLastLocal = null;
var pendingLastId = null;
var pendingLoading = false;
var pendingAllLoaded = false;

const PENDING_COLUMNS = 13;
const CSR_COLUMNS = [
  'SITE', 'OS', 'EQUIPAMENTO', 'CATEGORIA', 'STATUS', 'DATA_ABERTURA',
  'DATA_PROGRAMADA', 'DATA_REAL_INICIO', 'DATA_PREVISTA_CONCLUSAO',
  'DATA_CONCLUSAO', 'TECNICO', 'MATERIAL', 'LOCALIDADE',
];

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
      + '<td class="px-3 py-2.5 text-sm">'
      + '<span class="status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getStatusBadgeClass(item.status) + '">'
      + escapeHtml(item.status) + '</span></td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_planejada)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_real_inicio)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_prevista_conclusao)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_concluido)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.equipe || '-') + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.material || '-') + '</td>'
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
    var lastLocal = null;
    var lastId = null;
    var total;

    while (true) {
      var url = '/app/api/index.php?route=pending-tickets&limit=200'
        + '&search=' + encodeURIComponent(pendingSearch)
        + '&status=' + encodeURIComponent(pendingStatusFilter);

      if (lastLocal && lastId) {
        url += '&lastLocal=' + encodeURIComponent(lastLocal) + '&lastId=' + lastId;
      }

      var resp = await fetch(url);
      var result = await resp.json();
      var chunk = (result && result.data && result.data.items) || [];
      total = (result && result.data && result.data.total) || chunk.length;

      for (var i = 0; i < chunk.length; i++) {
        allRows.push(buildPendingCsvRow(chunk[i]));
      }

      if (chunk.length > 0) {
        var last = chunk[chunk.length - 1];
        lastLocal = last.local;
        lastId = last.id;
      }

      if (chunk.length === 0) break;
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

function _pendingReset() {
  pendingLastLocal = null;
  pendingLastId = null;
  pendingAllLoaded = false;
  if (_pendingScroll) _pendingScroll.reset().init();
}

function initPendingTickets() {
  pendingSearch = '';
  pendingStatusFilter = '';
  pendingLastLocal = null;
  pendingLastId = null;
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
      var row = e.target.closest('tr.pending-row');
      if (row) {
        var id = row.getAttribute('data-id');
        if (id) togglePendingRow(parseInt(id));
      }
    });
  }

  _pendingScroll = createInfiniteScroll({
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=pending-tickets&limit=' + params.limit
        + '&search=' + encodeURIComponent(pendingSearch)
        + '&status=' + encodeURIComponent(pendingStatusFilter);

      if (pendingLastLocal && pendingLastId) {
        url += '&lastLocal=' + encodeURIComponent(pendingLastLocal)
          + '&lastId=' + pendingLastId;
      }

      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      var append = pendingLastLocal !== null;
      renderPendingTable(items, append);

      if (items.length > 0) {
        var last = items[items.length - 1];
        pendingLastLocal = last.local;
        pendingLastId = last.id;
      }
    },
    renderFullFn: function (items, total) {
      pendingLastLocal = null;
      pendingLastId = null;
      renderPendingTable(items, false);
      if (items.length > 0) {
        var last = items[items.length - 1];
        pendingLastLocal = last.local;
        pendingLastId = last.id;
      }
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
      return pendingSearch + '|' + pendingStatusFilter;
    },
    sentinelId: 'pendingSentinel',
    limit: 20,
  });

  _pendingScroll.init();
}

globalThis.initPendingTickets = initPendingTickets;
globalThis.exportPendingCsv = exportPendingCsv;
globalThis.buildPendingCsvRow = buildPendingCsvRow;