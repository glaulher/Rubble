import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';

var _pendingScroll = null;
var pendingSearch = '';
var pendingStatusFilter = '';
var pendingLastLocal = null;
var pendingLastId = null;
var pendingLoading = false;
var pendingAllLoaded = false;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusBadgeClass(status) {
  switch (status) {
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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
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

  var currentLocal = null;
  var html = '';

  for (var i = 0; i < list.length; i++) {
    var item = list[i];

    if (item.local !== currentLocal) {
      currentLocal = item.local;
      html += '<tr class="site-separator bg-slate-100 dark:bg-slate-800">'
        + '<td colspan="5" class="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">'
        + escapeHtml(currentLocal) + '</td></tr>';
    }

    html += '<tr class="pending-row border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"'
      + ' data-id="' + item.id + '" data-expandable="true">'
      + '<td class="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">'
      + '<span class="expand-icon text-slate-400 mr-2">&#9654;</span>'
      + escapeHtml(item.local) + '</td>'
      + '<td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">'
      + escapeHtml(item.equipamento || '') + '</td>'
      + '<td class="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">'
      + escapeHtml(item.os || '') + '</td>'
      + '<td class="px-4 py-3 text-sm">'
      + '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + getStatusBadgeClass(item.status) + '">'
      + escapeHtml(item.status) + '</span></td>'
      + '<td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">'
      + escapeHtml(formatDate(item.data)) + '</td></tr>';

    html += '<tr class="pending-details hidden" data-detail-for="' + item.id + '">'
      + '<td colspan="5" class="px-4 py-3 bg-slate-50 dark:bg-slate-800/30">'
      + '<div class="grid grid-cols-2 gap-2 text-sm">'
      + '<div><span class="text-slate-500">Observa\u00e7\u00e3o:</span> '
      + '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.obs || '-') + '</span></div>'
      + '<div><span class="text-slate-500">Material:</span> '
      + '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.material || '-') + '</span></div>'
      + '<div><span class="text-slate-500">Equipe:</span> '
      + '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.equipe || '-') + '</span></div>'
      + '<div><span class="text-slate-500">Localidade:</span> '
      + '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.localidade || '-') + '</span></div>'
      + '</div></td></tr>';
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
  if (!badge) return;

  badge.textContent = data.total || 0;
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

  var filterBtns = document.querySelectorAll('.pending-filter-btn');
  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener('click', function () {
      var status = this.getAttribute('data-status');

      filterBtns.forEach(function (btn) {
        btn.className = 'pending-filter-btn px-3 py-1.5 rounded-full text-xs font-medium transition bg-slate-200 text-slate-700 hover:bg-slate-300';
      });
      this.className = 'pending-filter-btn px-3 py-1.5 rounded-full text-xs font-medium transition bg-sky-200 text-sky-800';

      pendingStatusFilter = status;
      _pendingReset();
    });
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
    },
    afterLoadFn: function (state) {
      if (!state.isPolling) {
        updatePendingBadge({ total: state.total });
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
