import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';
import { apiFetch } from '/public/js/core/auth.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast } from '/public/js/core/dom.js';
import { downloadCSV } from '/public/js/utils/csv.js';

var _summaryScroll = null;
var summarySearch = '';
var summaryDateFrom = '';
var summaryDateTo = '';
var summaryStatusFilter = '';
var summarySortBy = 'data_planejada';
var summarySortDir = 'DESC';
var _summaryTotal = 0;

var SUMMARY_STATUS_BADGES = {
  'planejado':        'bg-amber-100 text-amber-700',
  'concluído':        'bg-emerald-100 text-emerald-700',
  'concluido':        'bg-emerald-100 text-emerald-700',
  'pendente':         'bg-red-100 text-red-700',
  'em andamento':     'bg-blue-100 text-blue-800',
  'projeto clean up': 'bg-purple-100 text-purple-700',
};

var SUMMARY_CSV_HEADER = ['SITE', 'TECNICO', 'DATA', 'STATUS'];

// ── helpers ────────────────────────────────────────────────────────────────

export function summaryStatusBadgeClass(status) {
  return SUMMARY_STATUS_BADGES[(status || '').toLowerCase().trim()] || 'bg-slate-100 text-slate-700';
}

export function summaryFormatDate(value) {
  if (!value) return '-';
  var parts = String(value).split('-');
  if (parts.length !== 3) return String(value);
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

// ── table render ───────────────────────────────────────────────────────────

export function renderSummaryTable(list, append) {
  append = append || false;
  var tbody = document.getElementById('summaryTableBody');
  var empty = document.getElementById('summaryEmpty');

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
    var status = item.status || '';
    var badgeClass = summaryStatusBadgeClass(status);

    html += '<tr class="border-b border-slate-200 hover:bg-slate-50">'
      + '<td class="px-4 py-2.5 text-sm text-slate-700">' + escapeHtml(item.local || '-') + '</td>'
      + '<td class="px-4 py-2.5 text-sm text-slate-700">' + escapeHtml(item.equipe || 'A definir') + '</td>'
      + '<td class="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap">' + summaryFormatDate(item.data_planejada) + '</td>'
      + '<td class="px-4 py-2.5 text-sm">'
      +   '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + escapeHtml(status || '-') + '</span>'
      + '</td>'
      + '</tr>';
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }
}

// ── badge ──────────────────────────────────────────────────────────────────

export function updateSummaryBadge() {
  var badge = document.getElementById('summaryBadge');
  if (badge) badge.textContent = _summaryTotal || 0;
}

// ── query builder ──────────────────────────────────────────────────────────

export function buildSummaryQuery() {
  var q = 'search=' + encodeURIComponent(summarySearch)
    + '&status=' + encodeURIComponent(summaryStatusFilter)
    + '&sort_by=' + encodeURIComponent(summarySortBy)
    + '&sort_dir=' + encodeURIComponent(summarySortDir);
  if (summaryDateFrom) q += '&date_from=' + encodeURIComponent(summaryDateFrom);
  if (summaryDateTo)   q += '&date_to='   + encodeURIComponent(summaryDateTo);
  return q;
}

// ── CSV export ─────────────────────────────────────────────────────────────

export async function exportSummaryCsv() {
  try {
    var allRows = [];
    var offset = 0;
    var CHUNK = 200;

    while (true) {
      var url = '/app/api/index.php?route=planned-activities&limit=' + CHUNK
        + '&offset=' + offset
        + '&' + buildSummaryQuery();

      var resp   = await apiFetch(url);
      var result = await resp.json();
      var chunk  = (result && result.data && result.data.items) || [];

      for (var i = 0; i < chunk.length; i++) {
        var it = chunk[i];
        allRows.push([
          sanitizeCSV(it.local || ''),
          sanitizeCSV(it.equipe || ''),
          summaryFormatDate(it.data_planejada),
          sanitizeCSV(it.status || ''),
        ]);
      }

      if (chunk.length === 0) break;
      offset += chunk.length;
    }

    if (allRows.length === 0) {
      if (typeof showToast === 'function') showToast('Nenhum dado encontrado', 'error');
      return;
    }

    var fileName = 'resumo_atividades.csv';

    downloadCSV(fileName, SUMMARY_CSV_HEADER.join(';'), function (_addRow) {
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

// ── sort ───────────────────────────────────────────────────────────────────

export function setupSummarySort() {
  document.querySelectorAll('#summaryTable thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.sort;
      if (summarySortBy === col) {
        summarySortDir = summarySortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        summarySortBy = col;
        summarySortDir = 'ASC';
      }
      document.querySelectorAll('#summaryTable thead th .sort-icon').forEach(function (el) {
        el.textContent = '';
      });
      var icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = summarySortDir === 'ASC' ? '\u25B2' : '\u25BC';
      _summaryReset();
    });
  });
}

// ── reset / init ───────────────────────────────────────────────────────────

export function _summaryReset() {
  var tbody = document.getElementById('summaryTableBody');
  if (tbody) tbody.innerHTML = '';
  if (_summaryScroll) _summaryScroll.reset().init();
}

var _summaryDebouncedSearch = debounce(function (val) {
  summarySearch = val;
  _summaryReset();
}, 600);

export function initPlannedSummary() {
  summarySearch       = '';
  summaryDateFrom     = '';
  summaryDateTo       = '';
  summaryStatusFilter = '';
  summarySortBy       = 'data_planejada';
  summarySortDir      = 'DESC';
  _summaryTotal       = 0;

  // ── date from ──────────────────────────────────────────────────────────
  var elDateFrom = document.getElementById('summaryDateFrom');
  if (elDateFrom) {
    elDateFrom.value = '';
    elDateFrom.addEventListener('change', function () {
      summaryDateFrom = this.value;
      _summaryReset();
    });
  }

  // ── date to ────────────────────────────────────────────────────────────
  var elDateTo = document.getElementById('summaryDateTo');
  if (elDateTo) {
    elDateTo.value = '';
    elDateTo.addEventListener('change', function () {
      summaryDateTo = this.value;
      _summaryReset();
    });
  }

  // ── status filter ──────────────────────────────────────────────────────
  var elStatus = document.getElementById('summaryStatusFilter');
  if (elStatus) {
    elStatus.value = '';
    elStatus.addEventListener('change', function () {
      summaryStatusFilter = this.value;
      _summaryReset();
    });
  }

  // ── search ─────────────────────────────────────────────────────────────
  var elSearch = document.getElementById('summarySearchInput');
  if (elSearch) {
    elSearch.value = '';
    elSearch.addEventListener('input', function () {
      _summaryDebouncedSearch(this.value);
    });
  }

  // ── CSV ────────────────────────────────────────────────────────────────
  var csvBtn = document.getElementById('summaryCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', exportSummaryCsv);
  }

  setupSummarySort();

  // ── infinite scroll ────────────────────────────────────────────────────
  _summaryScroll = createInfiniteScroll({
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=planned-activities&limit=' + params.limit
        + '&offset=' + params.offset
        + '&' + buildSummaryQuery();

      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          _summaryTotal = result.data.total || 0;
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderSummaryTable(items, true);
    },
    renderFullFn: function (items) {
      renderSummaryTable(items, false);
      updateSummaryBadge();
    },
    afterLoadFn: function (state) {
      if (!state.isPolling) {
        updateSummaryBadge();
      }
    },
    getFilterHash: function () {
      return summarySearch + '|' + summaryDateFrom + '|' + summaryDateTo + '|' + summaryStatusFilter + '|' + summarySortBy + '|' + summarySortDir;
    },
    sentinelId: 'summarySentinel',
    scrollContainerId: 'summaryScrollContainer',
    limit: 30,
  });

  _summaryScroll.init();
}
