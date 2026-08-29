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

  var maxVal = 1;
  for (var i = 0; i < treemap.length; i++) {
    var v = treemap[i].value || 1;
    if (v > maxVal) maxVal = v;
  }

  var html = '';
  for (var j = 0; j < treemap.length; j++) {
    var item = treemap[j];
    var val = item.value || 1;
    var ratio = maxVal > 0 ? (val / maxVal) : 0.5;

    // Escala dinâmica proporcional baseada no número de máquinas
    var flexGrow = Math.max(1, Math.round(val));
    var flexBasis = '14%';
    var minHeight = '90px';
    var minWidth = '130px';
    var titleSize = 'text-sm font-semibold';

    if (val >= 16 || ratio >= 0.65) {
      flexBasis = '28%';
      minHeight = '140px';
      minWidth = '210px';
      titleSize = 'text-base font-bold';
    } else if (val >= 7 || ratio >= 0.35) {
      flexBasis = '20%';
      minHeight = '115px';
      minWidth = '170px';
      titleSize = 'text-sm font-bold';
    } else if (val <= 2) {
      flexBasis = '11%';
      minHeight = '80px';
      minWidth = '115px';
      titleSize = 'text-xs font-semibold';
    }

    var qtdText = item.machine_count > 0 ? item.qtd_sum + '/' + item.machine_count : String(item.qtd_sum);
    var restam = item.restam !== undefined ? item.restam : 0;
    var pctText = item.pct !== undefined ? item.pct : 0;

    html += '<div class="rounded-xl p-3 text-white flex flex-col justify-between shadow-sm transition-all hover:scale-[1.01]" style="background:' + (item.color || '#EF4444') + '; flex: ' + flexGrow + ' 1 ' + flexBasis + '; min-width:' + minWidth + '; min-height:' + minHeight + ';">';
    html += '  <div class="flex items-start justify-between gap-1">';
    html += '    <span class="' + titleSize + ' truncate" title="' + escapeHtml(item.site) + '">' + escapeHtml(item.site) + '</span>';
    html += '    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 shrink-0">' + (item.machine_count > 0 ? item.machine_count + ' máq.' : item.total + ' ativ.') + '</span>';
    html += '  </div>';
    html += '  <div class="mt-1 space-y-0.5">';
    html += '    <div class="text-xs opacity-95 font-medium">' + escapeHtml(qtdText) + ' (' + pctText + '%) — faltam ' + restam + '</div>';
    html += '    <div class="text-[11px] opacity-75">' + item.total + ' ' + (item.total === 1 ? 'atividade' : 'atividades') + '</div>';
    html += '  </div>';
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

export function getMeasurementCycleRange(offset, refDate) {
  var now = refDate ? new Date(refDate) : new Date();
  var y = now.getFullYear();
  var m = now.getMonth();
  var d = now.getDate();

  var baseMonth = d >= 16 ? m : m - 1;
  baseMonth += (offset || 0);

  var startDate = new Date(y, baseMonth, 16);
  var endDate = new Date(y, baseMonth + 1, 15);

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var formatYmd = function (dt) {
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  };

  return {
    from: formatYmd(startDate),
    to: formatYmd(endDate)
  };
}

var _preventivaCycleOffset = 0;

export async function initPreventivaDashboard() {
  _preventivaStatusFilter = '';
  _preventivaSearch = '';
  _preventivaCycleOffset = 0;

  var currentRange = getMeasurementCycleRange(0);
  _preventivaDateFrom = currentRange.from;
  _preventivaDateTo = currentRange.to;

  var dateFrom = document.getElementById('preventivaDateFrom');
  var dateTo = document.getElementById('preventivaDateTo');
  if (dateFrom) dateFrom.value = currentRange.from;
  if (dateTo) dateTo.value = currentRange.to;

  var loading = document.getElementById('preventivaDashboardLoading');
  if (loading) loading.classList.remove('hidden');

  var pdfBtn = document.getElementById('preventivaDashboardPdfBtn');
  if (pdfBtn && !pdfBtn._bound) {
    pdfBtn.addEventListener('click', exportPreventivaDashboardPdf);
    pdfBtn._bound = true;
  }

  var statusSel = document.getElementById('preventivaStatusFilter');
  var searchTop = document.getElementById('preventivaDashboardSearchInput');
  var searchFilter = document.getElementById('preventivaSearchFilter');

  function reload() {
    fetchData();
  }

  if (dateFrom && !dateFrom._bound) {
    dateFrom._bound = true;
    dateFrom.addEventListener('change', function () { _preventivaDateFrom = dateFrom.value; reload(); });
    dateFrom.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        _preventivaDateFrom = '';
        reload();
      }
    });
  }
  if (dateTo && !dateTo._bound) {
    dateTo._bound = true;
    dateTo.addEventListener('change', function () { _preventivaDateTo = dateTo.value; reload(); });
    dateTo.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        _preventivaDateTo = '';
        reload();
      }
    });
  }
  if (statusSel && !statusSel._bound) {
    statusSel._bound = true;
    statusSel.addEventListener('change', function () { _preventivaStatusFilter = statusSel.value; reload(); });
  }

  var btnPrev = document.getElementById('btnPrevPrevCycle');
  if (btnPrev && !btnPrev._bound) {
    btnPrev._bound = true;
    btnPrev.addEventListener('click', function () {
      _preventivaCycleOffset--;
      var r = getMeasurementCycleRange(_preventivaCycleOffset);
      if (dateFrom) dateFrom.value = r.from;
      if (dateTo) dateTo.value = r.to;
      _preventivaDateFrom = r.from;
      _preventivaDateTo = r.to;
      reload();
    });
  }

  var btnCurrent = document.getElementById('btnPrevCurrentCycle');
  if (btnCurrent && !btnCurrent._bound) {
    btnCurrent._bound = true;
    btnCurrent.addEventListener('click', function () {
      _preventivaCycleOffset = 0;
      var r = getMeasurementCycleRange(0);
      if (dateFrom) dateFrom.value = r.from;
      if (dateTo) dateTo.value = r.to;
      _preventivaDateFrom = r.from;
      _preventivaDateTo = r.to;
      reload();
    });
  }

  var btnNext = document.getElementById('btnPrevNextCycle');
  if (btnNext && !btnNext._bound) {
    btnNext._bound = true;
    btnNext.addEventListener('click', function () {
      _preventivaCycleOffset++;
      var r = getMeasurementCycleRange(_preventivaCycleOffset);
      if (dateFrom) dateFrom.value = r.from;
      if (dateTo) dateTo.value = r.to;
      _preventivaDateFrom = r.from;
      _preventivaDateTo = r.to;
      reload();
    });
  }

  var btnClear = document.getElementById('btnPrevClearDates');
  if (btnClear && !btnClear._bound) {
    btnClear._bound = true;
    btnClear.addEventListener('click', function () {
      _preventivaCycleOffset = 0;
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      _preventivaDateFrom = '';
      _preventivaDateTo = '';
      reload();
    });
  }
  var debounce;
  function bindSearch(el) {
    if (!el || el._bound) return;
    el._bound = true;
    el.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        _preventivaSearch = '';
        if (searchTop && searchTop !== this) searchTop.value = '';
        if (searchFilter && searchFilter !== this) searchFilter.value = '';
        reload();
      }
    });
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

export function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function truncateLabel(label, max) {
  return label && label.length > max ? label.substring(0, max - 1) + '\u2026' : (label || '');
}

export function formatDateBr(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export function preventivaBarChartSvg(items) {
  if (!items || items.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic;padding:12px;">Sem dados.</p>';
  }
  var maxV = 1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].value > maxV) maxV = items[i].value;
  }
  var barH = 30, gap = 8, labelW = 140, valW = 40;
  var W = 820;
  var H = items.length * (barH + gap) + 8;
  var barW = W - labelW - valW - 16;
  var bars = '';
  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    var y = j * (barH + gap) + 4;
    var w = (item.value / maxV) * barW;
    var inside = w > 40;
    var tx = inside ? labelW + w - 8 : labelW + w + 6;
    var lbl = escapeXml(truncateLabel(item.label, 24));
    bars += '<text x="' + (labelW - 8) + '" y="' + (y + barH / 2 + 4) + '" font-size="11" fill="#475569" text-anchor="end" font-family="Inter,sans-serif">' + lbl + '</text>';
    bars += '<rect x="' + labelW + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="6" fill="#F1F5F9"/>';
    bars += '<rect x="' + labelW + '" y="' + y + '" width="' + Math.max(w, 2).toFixed(1) + '" height="' + barH + '" rx="6" fill="' + item.color + '"/>';
    bars += '<text x="' + tx.toFixed(1) + '" y="' + (y + barH / 2 + 4) + '" font-size="11" font-weight="700" fill="' + (inside ? '#fff' : '#475569') + '" text-anchor="' + (inside ? 'end' : 'start') + '" font-family="Inter,sans-serif">' + item.value + (item.pct !== undefined ? ' (' + item.pct + '%)' : '') + '</text>';
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">' + bars + '</svg>';
}

export function exportPreventivaDashboardPdf() {
  if (!_preventivaDashboardData) {
    showToast('Dados não carregados', 'error');
    return;
  }
  var d = _preventivaDashboardData;

  // Filtros ativos para o cabeçalho
  var filterParts = [];
  if (_preventivaDateFrom && _preventivaDateTo) {
    filterParts.push('Período: ' + formatDateBr(_preventivaDateFrom) + ' a ' + formatDateBr(_preventivaDateTo));
  } else if (_preventivaDateFrom) {
    filterParts.push('A partir de: ' + formatDateBr(_preventivaDateFrom));
  } else if (_preventivaDateTo) {
    filterParts.push('Até: ' + formatDateBr(_preventivaDateTo));
  }
  if (_preventivaStatusFilter) {
    filterParts.push('Status: ' + _preventivaStatusFilter);
  }
  if (_preventivaSearch) {
    filterParts.push('Busca: "' + _preventivaSearch + '"');
  }
  var filterNote = filterParts.length > 0
    ? '<p class="sub" style="margin-top:4px;">' + escapeHtml(filterParts.join(' | ')) + '</p>'
    : '';

  // KPI Cards
  var kpiCards = [
    { label: 'Total de Atividades', value: d.total || 0, color: '#2563EB', dot: '#2563EB' },
    { label: 'Concluídas', value: d.completed || 0, color: '#059669', dot: '#059669' },
    { label: 'Em Andamento', value: d.inProgress || 0, color: '#D97706', dot: '#D97706' },
    { label: 'Pendentes / Planejadas', value: d.pending || 0, color: '#DC2626', dot: '#DC2626' },
  ];
  var kpiHtml = '<div class="section"><div class="kpi-grid">';
  for (var ki = 0; ki < kpiCards.length; ki++) {
    var kpi = kpiCards[ki];
    kpiHtml += '<div class="kpi-card">';
    kpiHtml += '<div class="kpi-dot" style="background:' + kpi.dot + '"></div>';
    kpiHtml += '<p class="kpi-label">' + escapeHtml(kpi.label) + '</p>';
    kpiHtml += '<p class="kpi-value" style="color:' + kpi.color + ';">' + kpi.value + '</p>';
    kpiHtml += '</div>';
  }
  kpiHtml += '</div></div>';

  // Status Breakdown SVG Bar Chart
  var statusItems = [];
  var total = d.total || 0;
  for (var sk in d.statusBreakdown) {
    if (d.statusBreakdown.hasOwnProperty(sk)) {
      var cnt = d.statusBreakdown[sk];
      var pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
      var colorKey = sk.toLowerCase().trim();
      var c = STATUS_COLORS_PREV[colorKey] || '#94A3B8';
      statusItems.push({ label: sk, value: cnt, pct: pct, color: c });
    }
  }
  var statusHtml = '<div class="section"><div class="section-title">Preventivas por Status</div>' + preventivaBarChartSvg(statusItems) + '</div>';

  // Treemap Grid
  var treemapHtml = '';
  if (d.treemap && d.treemap.length > 0) {
    treemapHtml = '<div class="section">';
    treemapHtml += '<div class="section-title"><span>Treemap por Site — Total máquinas e preventivadas</span>';
    treemapHtml += '<div class="legend">';
    treemapHtml += '<span class="legend-item"><span class="legend-dot" style="background:#10B981;"></span> Concluído</span>';
    treemapHtml += '<span class="legend-item"><span class="legend-dot" style="background:#F59E0B;"></span> Em Andamento</span>';
    treemapHtml += '<span class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span> Pendente</span>';
    treemapHtml += '</div></div>';
    var maxVal = 1;
    for (var ti0 = 0; ti0 < d.treemap.length; ti0++) {
      var v0 = d.treemap[ti0].value || 1;
      if (v0 > maxVal) maxVal = v0;
    }

    treemapHtml += '<div class="treemap-grid">';
    for (var ti = 0; ti < d.treemap.length; ti++) {
      var it = d.treemap[ti];
      var bg = it.color || '#EF4444';
      var val = it.value || 1;
      var ratio = maxVal > 0 ? (val / maxVal) : 0.5;
      var qtdText = it.machine_count > 0 ? it.qtd_sum + '/' + it.machine_count : String(it.qtd_sum);
      var pctText = it.pct !== undefined ? it.pct : 0;
      var restamText = it.restam !== undefined ? it.restam : 0;
      var flexGrow = Math.max(1, Math.round(val));
      var flexBasis = (val >= 16 || ratio >= 0.65) ? '28%' : ((val >= 7 || ratio >= 0.35) ? '20%' : ((val <= 2) ? '11%' : '14%'));
      var minHeight = (val >= 16 || ratio >= 0.65) ? '120px' : ((val >= 7 || ratio >= 0.35) ? '95px' : ((val <= 2) ? '70px' : '85px'));
      treemapHtml += '<div class="treemap-card" style="background:' + bg + '; flex:' + flexGrow + ' 1 ' + flexBasis + '; min-height:' + minHeight + ';">';
      treemapHtml += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">';
      treemapHtml += '<span class="treemap-title" style="font-size:' + (val >= 16 ? '13px' : (val <= 2 ? '11px' : '12px')) + ';">' + escapeHtml(it.site) + '</span>';
      treemapHtml += '<span style="font-size:9px; font-weight:bold; background:rgba(0,0,0,0.25); padding:1px 4px; border-radius:3px;">' + (it.machine_count > 0 ? it.machine_count + ' máq.' : it.total + ' ativ.') + '</span>';
      treemapHtml += '</div>';
      treemapHtml += '<div>';
      treemapHtml += '<div class="treemap-sub">' + escapeHtml(qtdText) + ' (' + pctText + '%) — faltam ' + restamText + '</div>';
      treemapHtml += '<div class="treemap-count">' + it.total + ' atividade(s)</div>';
      treemapHtml += '</div>';
      treemapHtml += '</div>';
    }
    treemapHtml += '</div></div>';
  }

  // Tabela de Atividades (Detalhamento)
  var tableHtml = '';
  if (d.allRows && d.allRows.length > 0) {
    tableHtml = '<div class="section"><div class="section-title">Detalhamento de Atividades</div>';
    tableHtml += '<table class="data-table">';
    tableHtml += '<thead><tr><th>Site</th><th>Data Planejada</th><th>Ticket</th><th>Status</th><th>Equipe</th><th>Qtd</th><th>Observações</th></tr></thead><tbody>';
    for (var ri = 0; ri < d.allRows.length; ri++) {
      var row = d.allRows[ri];
      tableHtml += '<tr>';
      tableHtml += '<td><strong>' + escapeHtml(row.site || '-') + '</strong></td>';
      tableHtml += '<td>' + formatDateBr(row.data_planejada) + '</td>';
      tableHtml += '<td>' + escapeHtml(row.ticket || '-') + '</td>';
      tableHtml += '<td>' + escapeHtml(row.status || '-') + '</td>';
      tableHtml += '<td>' + escapeHtml(row.equipe || '-') + '</td>';
      tableHtml += '<td>' + (row.qtd_executada !== null && row.qtd_executada !== '' ? row.qtd_executada : '-') + '</td>';
      tableHtml += '<td>' + escapeHtml(truncateLabel(row.obs, 60)) + '</td>';
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div>';
  }

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard de Preventiva</title>';
  html += '<style>';
  html += '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';
  html += "body{font-family:'Inter','Segoe UI',Arial,sans-serif;padding:32px;color:#1a1a1a;background:#fff}";
  html += '.header{border-bottom:3px solid #1E3A5F;padding-bottom:16px;margin-bottom:28px}';
  html += '.header h1{font-size:24px;color:#1E3A5F;font-weight:800}';
  html += '.header .sub{font-size:12px;color:#64748b;margin-top:6px}';
  html += '.section{margin-bottom:28px;page-break-inside:avoid}';
  html += '.section-title{font-size:15px;font-weight:700;color:#1E3A5F;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between}';
  html += '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}';
  html += '.kpi-card{border:1px solid #E2E8F0;border-radius:10px;padding:14px;position:relative;min-height:84px}';
  html += '.kpi-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em}';
  html += '.kpi-value{font-size:26px;font-weight:800;margin-top:5px}';
  html += '.kpi-dot{position:absolute;top:15px;right:14px;width:11px;height:11px;border-radius:50%}';
  html += '.treemap-grid{display:flex;flex-wrap:wrap;gap:8px}';
  html += '.treemap-card{flex:1 1 140px;min-height:85px;border-radius:10px;padding:10px 12px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';
  html += '.treemap-title{font-size:13px;font-weight:700}';
  html += '.treemap-sub{font-size:10px;opacity:0.95;font-weight:500}';
  html += '.treemap-count{font-size:9px;opacity:0.8}';
  html += '.legend{display:flex;align-items:center;gap:12px;font-size:11px;font-weight:normal;color:#64748b}';
  html += '.legend-item{display:flex;align-items:center;gap:4px}';
  html += '.legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block}';
  html += '.data-table{width:100%;border-collapse:collapse;font-size:10px;margin-top:8px}';
  html += '.data-table th{background:#1E3A5F;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:9px;text-transform:uppercase;letter-spacing:.04em}';
  html += '.data-table td{padding:6px 10px;border-bottom:1px solid #E2E8F0}';
  html += '.data-table tbody tr:nth-child(even){background:#F8FAFC}';
  html += '@page{margin:1.5cm}';
  html += '@media print{body{padding:0}.section{page-break-inside:avoid}}';
  html += '@media print and (orientation:portrait){.kpi-grid{grid-template-columns:repeat(2,1fr)}}';
  html += '</style></head><body>';
  html += '<div class="header">';
  html += '<h1>Dashboard de Preventiva</h1>';
  html += '<p class="sub">Indicadores consolidados — ' + new Date().toLocaleDateString('pt-BR') + '</p>';
  html += filterNote;
  html += '</div>';
  html += kpiHtml;
  html += statusHtml;
  html += treemapHtml;
  html += tableHtml;
  html += '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>';
  html += '</body></html>';

  var printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    showToast('Bloqueador de pop-up ativo. Desative para gerar o PDF.', 'error');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
