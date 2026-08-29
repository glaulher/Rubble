import { apiFetch } from '/public/js/core/auth.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { showToast } from '/public/js/core/dom.js';

var _preventivaDashboardData = null;
var _preventivaDateFrom = '';
var _preventivaDateTo = '';
var _preventivaStatusFilter = '';
var _preventivaSearch = '';

var STATUS_COLORS_PREV = {
  'concluído': '#10B981', 'concluido': '#10B981',
  'em andamento': '#F59E0B',
  'planejado': '#EF4444', 'pendente': '#EF4444', 'projeto clean up': '#EF4444',
};

export function getStatusBadgeClassPreventiva(status) {
  var key = (status || '').toLowerCase().trim();
  if (key === 'concluído' || key === 'concluido') return 'bg-emerald-100 text-emerald-700';
  if (key === 'em andamento') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function renderBreakdownBarPreventiva(containerId, data, colorMap, total) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var html = '';
  for (var key in data) {
    if (!data.hasOwnProperty(key)) continue;
    var count = data[key];
    if (count === 0) continue;
    var pct = total > 0 ? Math.round((count / total) * 100) : 0;
    var color = colorMap[key.toLowerCase()] || '#94A3B8';
    html += '<div class="flex items-center gap-3">';
    html += '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:' + color + '"></span>';
    html += '<span class="text-sm text-slate-600 w-32 shrink-0">' + escapeHtml(key) + '</span>';
    html += '<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">';
    html += '<div class="h-4 rounded-full transition-all" style="width:' + pct + '%;background:' + color + '"></div>';
    html += '</div>';
    html += '<span class="text-sm text-slate-500 w-16 text-right">' + count + ' (' + pct + '%)</span>';
    html += '</div>';
  }
  container.innerHTML = html || '<p class="text-sm text-slate-400">Nenhum dado</p>';
}

export function renderTreemap(treemap) {
  var container = document.getElementById('preventivaTreemap');
  if (!container) return;
  if (!treemap || treemap.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400">Nenhum dado para treemap</p>';
    return;
  }
  var totalValue = 0;
  for (var i = 0; i < treemap.length; i++) totalValue += treemap[i].value || 0;
  if (totalValue === 0) totalValue = treemap.length;
  var html = '';
  for (var j = 0; j < treemap.length; j++) {
    var item = treemap[j];
    var pct = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    var flexBasis = Math.max(12, pct).toFixed(1);
    var qtdText = item.machine_count > 0 ? item.qtd_sum + '/' + item.machine_count : String(item.qtd_sum);
    var restam = item.restam !== undefined ? item.restam : 0;
    var pctText = item.pct !== undefined ? item.pct : 0;
    html += '<div class="rounded-xl p-3 text-white flex flex-col justify-between" style="background:' + (item.color || '#EF4444') + '; flex: 1 1 ' + flexBasis + '%; min-width:140px; min-height:90px;">';
    html += '<span class="text-sm font-semibold truncate" title="' + escapeHtml(item.site) + '">' + escapeHtml(item.site) + '</span>';
    html += '<span class="text-xs opacity-90">' + escapeHtml(qtdText) + ' (' + pctText + '%) — faltam ' + restam + '</span>';
    html += '<span class="text-xs opacity-80">' + item.total + ' atividades</span>';
    html += '</div>';
  }
  container.innerHTML = html;
}

export function renderPreventivaDashboardFiltered() {
  if (!_preventivaDashboardData) return;
  var d = _preventivaDashboardData;
  document.getElementById('preventivaKpiTotal').textContent = d.total || 0;
  document.getElementById('preventivaKpiCompleted').textContent = d.completed || 0;
  document.getElementById('preventivaKpiInProgress').textContent = d.inProgress || 0;
  document.getElementById('preventivaKpiPending').textContent = d.pending || 0;
  renderBreakdownBarPreventiva('preventivaStatusBars', d.statusBreakdown || {}, STATUS_COLORS_PREV, d.total || 0);
  renderTreemap(d.treemap || []);
}

export function showPreventivaDashboardSections() {
  ['preventivaKpiSection', 'preventivaBreakdownSection', 'preventivaTreemapSection'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
  var loading = document.getElementById('preventivaDashboardLoading');
  if (loading) loading.classList.add('hidden');
}

export function buildPreventivaQuery() {
  var parts = [];
  if (_preventivaDateFrom) parts.push('date_from=' + encodeURIComponent(_preventivaDateFrom));
  if (_preventivaDateTo) parts.push('date_to=' + encodeURIComponent(_preventivaDateTo));
  if (_preventivaStatusFilter) parts.push('status=' + encodeURIComponent(_preventivaStatusFilter));
  if (_preventivaSearch) parts.push('search=' + encodeURIComponent(_preventivaSearch));
  return parts.join('&');
}

export async function initPreventivaDashboard() {
  _preventivaDateFrom = '';
  _preventivaDateTo = '';
  _preventivaStatusFilter = '';
  _preventivaSearch = '';

  var loading = document.getElementById('preventivaDashboardLoading');
  if (loading) loading.classList.remove('hidden');

  var pdfBtn = document.getElementById('preventivaDashboardPdfBtn');
  if (pdfBtn && !pdfBtn._bound) {
    pdfBtn.addEventListener('click', exportPreventivaDashboardPdf);
    pdfBtn._bound = true;
  }

  var dateFrom = document.getElementById('preventivaDateFrom');
  var dateTo = document.getElementById('preventivaDateTo');
  var statusSel = document.getElementById('preventivaStatusFilter');
  var searchTop = document.getElementById('preventivaDashboardSearchInput');
  var searchFilter = document.getElementById('preventivaSearchFilter');

  function reload() {
    fetchData();
  }

  if (dateFrom && !dateFrom._bound) {
    dateFrom._bound = true;
    dateFrom.addEventListener('change', function () { _preventivaDateFrom = dateFrom.value; reload(); });
  }
  if (dateTo && !dateTo._bound) {
    dateTo._bound = true;
    dateTo.addEventListener('change', function () { _preventivaDateTo = dateTo.value; reload(); });
  }
  if (statusSel && !statusSel._bound) {
    statusSel._bound = true;
    statusSel.addEventListener('change', function () { _preventivaStatusFilter = statusSel.value; reload(); });
  }
  var debounce;
  function bindSearch(el) {
    if (!el || el._bound) return;
    el._bound = true;
    el.addEventListener('input', function () {
      clearTimeout(debounce);
      var val = el.value.trim();
      debounce = setTimeout(function () {
        _preventivaSearch = val;
        // sincroniza os dois inputs
        if (searchTop && searchTop !== el) searchTop.value = val;
        if (searchFilter && searchFilter !== el) searchFilter.value = val;
        reload();
      }, 300);
    });
  }
  bindSearch(searchTop);
  bindSearch(searchFilter);

  await fetchData();
}

async function fetchData() {
  try {
    var q = buildPreventivaQuery();
    var url = '/app/api/index.php?route=preventiva-dashboard' + (q ? '&' + q : '');
    var resp = await apiFetch(url);
    var result = await resp.json();
    if (!result || !result.success || !result.data) {
      showToast('Erro ao carregar dashboard de preventiva', 'error');
      return;
    }
    _preventivaDashboardData = result.data;
    showPreventivaDashboardSections();
    renderPreventivaDashboardFiltered();
  } catch (e) {
    console.error('Erro dashboard preventiva', e);
    showToast('Erro ao carregar dashboard', 'error');
  }
}

export function exportPreventivaDashboardPdf() {
  if (!_preventivaDashboardData) {
    showToast('Dados não carregados', 'error');
    return;
  }
  var d = _preventivaDashboardData;
  var treemapHtml = '';
  if (d.treemap && d.treemap.length > 0) {
    treemapHtml = '<div class="treemap">';
    for (var i = 0; i < d.treemap.length; i++) {
      var it = d.treemap[i];
      treemapHtml += '<div class="treemap-cell" style="background:' + (it.color || '#EF4444') + '">';
      treemapHtml += '<strong>' + escapeHtml(it.site) + '</strong>';
      treemapHtml += '<span>' + it.qtd_sum + '/' + it.machine_count + ' (' + it.pct + '%) — faltam ' + it.restam + '</span>';
      treemapHtml += '</div>';
    }
    treemapHtml += '</div>';
  } else {
    treemapHtml = '<p style="color:#94a3b8;">Sem dados</p>';
  }

  var statusItems = '';
  for (var k in d.statusBreakdown) {
    if (d.statusBreakdown.hasOwnProperty(k)) {
      statusItems += '<div class="row"><span>' + escapeHtml(k) + '</span><strong>' + d.statusBreakdown[k] + '</strong></div>';
    }
  }

  var q = buildPreventivaQuery();
  var filterNote = q ? '<p style="font-size:11px;color:#64748b;">Filtros: ' + escapeHtml(q) + '</p>' : '';
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard Preventiva</title>';
  html += '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;padding:32px}';
  html += '.header{border-bottom:3px solid #1E3A5F;padding-bottom:16px;margin-bottom:28px}.header h1{font-size:24px;color:#1E3A5F}';
  html += '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}.kpi-card{border:1px solid #E2E8F0;border-radius:10px;padding:14px}';
  html += '.treemap{display:flex;flex-wrap:wrap;gap:8px}.treemap-cell{flex:1 1 140px;min-height:90px;border-radius:10px;padding:12px;color:#fff;display:flex;flex-direction:column;justify-content:space-between}';
  html += '.section{margin-bottom:28px}';
  html += '</style></head><body>';
  html += '<div class="header"><h1>Dashboard de Preventiva</h1><p style="font-size:12px;color:#64748b;">' + new Date().toLocaleDateString('pt-BR') + '</p>' + filterNote + '</div>';
  html += '<div class="kpi-grid"><div class="kpi-card"><p>Total</p><h2>' + d.total + '</h2></div><div class="kpi-card"><p>Concluídas</p><h2 style="color:#059669">' + d.completed + '</h2></div><div class="kpi-card"><p>Em Andamento</p><h2 style="color:#D97706">' + d.inProgress + '</h2></div><div class="kpi-card"><p>Pendentes</p><h2 style="color:#DC2626">' + d.pending + '</h2></div></div>';
  html += '<div class="section"><h3>Status</h3>' + statusItems + '</div>';
  html += '<div class="section"><h3>Treemap por Site</h3>' + treemapHtml + '</div>';
  html += '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
  var w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { showToast('Bloqueador de pop-up', 'error'); return; }
  w.document.write(html);
  w.document.close();
}
