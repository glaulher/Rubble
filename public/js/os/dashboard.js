import { apiFetch } from '/public/js/core/auth.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { showToast } from '/public/js/core/dom.js';

var _osDashboardData = null;
var _osDashboardSearch = '';
var _osDashboardSearchDebounce = null;

var PRIORITY_COLORS_OS = {
  '0': '#EF4444', '0-A': '#EF4444', '0-B': '#EF4444', '0-C': '#EF4444',
  '0-D': '#EF4444', '0-E': '#EF4444', '1': '#F59E0B', '3': '#3B82F6',
  '4': '#8B5CF6', '5': '#94A3B8',
};

var STATUS_COLORS_OS = {
  'concluido': '#10B981', 'concluído': '#10B981',
  'pendente': '#EF4444',
  'planejado': '#F59E0B',
  'em andamento': '#3B82F6',
  'cancelado': '#6B7280',
  'projeto clean up': '#8B5CF6',
};

var _osEvolutionChart = null;

export function formatDateOs(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export function renderBreakdownBar(containerId, data, colorMap, total) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = '';
  for (var key in data) {
    if (!data.hasOwnProperty(key)) continue;
    var count = data[key];
    if (count === 0) continue;
    var pct = total > 0 ? Math.round((count / total) * 100) : 0;
    var color = colorMap[key] || '#94A3B8';
    html += '<div class="flex items-center gap-3">';
    html += '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:' + color + '"></span>';
    html += '<span class="text-sm text-slate-600 w-24 shrink-0">' + escapeHtml(key) + '</span>';
    html += '<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">';
    html += '<div class="h-4 rounded-full transition-all" style="width:' + pct + '%;background:' + color + '"></div>';
    html += '</div>';
    html += '<span class="text-sm text-slate-500 w-16 text-right">' + count + ' (' + pct + '%)</span>';
    html += '</div>';
  }
  container.innerHTML = html || '<p class="text-sm text-slate-400">Nenhum dado</p>';
}

export function renderResponsibilityBreakdown(containerId, responsibilityCounts, key) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var entries = [];
  for (var name in responsibilityCounts) {
    if (!responsibilityCounts.hasOwnProperty(name)) continue;
    entries.push({ name: name, count: responsibilityCounts[name][key] || 0 });
  }
  entries.sort(function (a, b) { return b.count - a.count; });

  var dots = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.count === 0) continue;
    var dotColor = dots[i % dots.length];
    html += '<div class="flex items-center gap-2 text-sm">';
    html += '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:' + dotColor + '"></span>';
    html += '<span class="text-slate-600">' + escapeHtml(e.name) + '</span>';
    html += '<span class="text-slate-400">(' + e.count + ')</span>';
    html += '</div>';
  }
  container.innerHTML = html || '<p class="text-sm text-slate-400">-</p>';
}

export function renderEmAndamentoTable(osList) {
  var container = document.getElementById('osEmAndamentoTable');
  if (!container) return;

  if (!osList || osList.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400">Nenhuma OS em andamento</p>';
    return;
  }

  var html = '<table class="w-full text-sm">';
  html += '<thead><tr class="bg-slate-800 text-slate-100">';
  html += '<th class="px-3 py-2 text-left">Site</th>';
  html += '<th class="px-3 py-2 text-left">OS</th>';
  html += '<th class="px-3 py-2 text-left">Equipamento</th>';
  html += '<th class="px-3 py-2 text-left">Prioridade</th>';
  html += '<th class="px-3 py-2 text-left">Técnico</th>';
  html += '<th class="px-3 py-2 text-left">Prev. Conclusão</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < osList.length; i++) {
    var os = osList[i];
    html += '<tr class="border-b border-slate-200 hover:bg-slate-50">';
    html += '<td class="px-3 py-2 text-slate-700">' + escapeHtml(os.local || '') + '</td>';
    html += '<td class="px-3 py-2 font-medium text-slate-800">' + escapeHtml(os.os || '-') + '</td>';
    html += '<td class="px-3 py-2 text-slate-600">' + escapeHtml(os.equipamento || '') + '</td>';
    html += '<td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-xs font-medium" style="background:' + (PRIORITY_COLORS_OS[os.prioridade] || '#E2E8F0') + ';color:' + (os.prioridade === '5' ? '#475569' : '#fff') + '">' + escapeHtml(os.prioridade || '-') + '</span></td>';
    html += '<td class="px-3 py-2 text-slate-600">' + escapeHtml(os.equipe || '-') + '</td>';
    html += '<td class="px-3 py-2 text-slate-600">' + formatDateOs(os.data_prevista_conclusao) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

export function renderClaroTable(osList) {
  var container = document.getElementById('osClaroTable');
  if (!container) return;

  if (!osList || osList.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400">Nenhuma OS sob responsabilidade Claro</p>';
    return;
  }

  var html = '<table class="w-full text-sm">';
  html += '<thead><tr class="bg-slate-800 text-slate-100">';
  html += '<th class="px-3 py-2 text-left">Site</th>';
  html += '<th class="px-3 py-2 text-left">OS</th>';
  html += '<th class="px-3 py-2 text-left">Equipamento</th>';
  html += '<th class="px-3 py-2 text-left">Status</th>';
  html += '<th class="px-3 py-2 text-left">Técnico</th>';
  html += '<th class="px-3 py-2 text-left">Data</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < osList.length; i++) {
    var os = osList[i];
    var statusClass = getStatusBadgeClassOs(os.status);
    html += '<tr class="border-b border-slate-200 hover:bg-slate-50">';
    html += '<td class="px-3 py-2 text-slate-700">' + escapeHtml(os.local || '') + '</td>';
    html += '<td class="px-3 py-2 font-medium text-slate-800">' + escapeHtml(os.os || '-') + '</td>';
    html += '<td class="px-3 py-2 text-slate-600">' + escapeHtml(os.equipamento || '') + '</td>';
    html += '<td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + statusClass + '">' + escapeHtml(os.status || '-') + '</span></td>';
    html += '<td class="px-3 py-2 text-slate-600">' + escapeHtml(os.equipe || '-') + '</td>';
    html += '<td class="px-3 py-2 text-slate-600">' + formatDateOs(os.data) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

export function getStatusBadgeClassOs(status) {
  switch ((status || '').toLowerCase()) {
    case 'concluído': case 'concluido': return 'bg-emerald-100 text-emerald-700';
    case 'pendente': return 'bg-red-100 text-red-700';
    case 'planejado': return 'bg-yellow-100 text-yellow-700';
    case 'em andamento': return 'bg-blue-100 text-blue-700';
    case 'cancelado': return 'bg-slate-100 text-slate-700';
    case 'projeto clean up': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export function renderTopTechnicians(topTech) {
  var container = document.getElementById('osTopTechBars');
  if (!container) return;

  var entries = [];
  for (var name in topTech) {
    if (topTech.hasOwnProperty(name)) {
      entries.push({ name: name, count: topTech[name] });
    }
  }
  entries.sort(function (a, b) { return b.count - a.count; });

  var maxCount = entries.length > 0 ? entries[0].count : 1;
  var colors = ['#1E3A5F', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var pct = Math.round((e.count / maxCount) * 100);
    var color = colors[i % colors.length];
    html += '<div class="flex items-center gap-3">';
    html += '<span class="text-sm text-slate-600 w-32 shrink-0 truncate" title="' + escapeHtml(e.name) + '">' + escapeHtml(e.name) + '</span>';
    html += '<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">';
    html += '<div class="h-4 rounded-full transition-all" style="width:' + pct + '%;background:' + color + '"></div>';
    html += '</div>';
    html += '<span class="text-sm text-slate-500 w-12 text-right">' + e.count + '</span>';
    html += '</div>';
  }
  container.innerHTML = html || '<p class="text-sm text-slate-400">Nenhum técnico</p>';
}

export function renderEvolutionChart(evolution) {
  var canvas = document.getElementById('osEvolutionChart');
  if (!canvas || !evolution || evolution.length === 0) return;

  if (_osEvolutionChart) {
    _osEvolutionChart.destroy();
    _osEvolutionChart = null;
  }

  var labels = evolution.map(function (e) {
    var parts = e.date.split('-');
    return parts[2] + '/' + parts[1];
  });
  var data = evolution.map(function (e) { return e.count; });

  var ctx = canvas.getContext('2d');
  var gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(30, 58, 95, 0.3)');
  gradient.addColorStop(1, 'rgba(30, 58, 95, 0.02)');

  _osEvolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'OS Ativas',
        data: data,
        borderColor: '#1E3A5F',
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (items) {
              return items[0].label;
            },
            label: function (item) {
              return item.raw + ' OS ativas';
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            maxTicksLimit: 12,
            font: { size: 11 },
            color: '#64748b',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: { color: '#E2E8F0' },
          ticks: {
            font: { size: 11 },
            color: '#64748b',
          },
        },
      },
    },
  });
}

export function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function truncateLabel(label, max) {
  return label.length > max ? label.substring(0, max - 1) + '\u2026' : label;
}

export function breakdownToBarItems(map, colorMap) {
  var items = [];
  for (var k in map) {
    if (!map.hasOwnProperty(k)) continue;
    if (map[k] === 0) continue;
    items.push({ label: k, value: map[k], color: colorMap[k] || '#94A3B8' });
  }
  return items;
}

export function osBarChartSvg(items) {
  if (!items || items.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic;padding:12px;">Sem dados.</p>';
  }
  var maxV = 1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].value > maxV) maxV = items[i].value;
  }
  var barH = 30, gap = 8, labelW = 120, valW = 36;
  var W = 820;
  var H = items.length * (barH + gap) + 8;
  var barW = W - labelW - valW - 16;
  var bars = '';
  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    var y = j * (barH + gap) + 4;
    var w = (item.value / maxV) * barW;
    var inside = w > 36;
    var tx = inside ? labelW + w - 8 : labelW + w + 6;
    var lbl = escapeXml(truncateLabel(item.label, 22));
    bars += '<text x="' + (labelW - 8) + '" y="' + (y + barH / 2 + 4) + '" font-size="11" fill="#475569" text-anchor="end" font-family="Inter,sans-serif">' + lbl + '</text>';
    bars += '<rect x="' + labelW + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="6" fill="#F1F5F9"/>';
    bars += '<rect x="' + labelW + '" y="' + y + '" width="' + Math.max(w, 2).toFixed(1) + '" height="' + barH + '" rx="6" fill="' + item.color + '"/>';
    bars += '<text x="' + tx.toFixed(1) + '" y="' + (y + barH / 2 + 4) + '" font-size="11" font-weight="700" fill="' + (inside ? '#fff' : '#475569') + '" text-anchor="' + (inside ? 'end' : 'start') + '" font-family="Inter,sans-serif">' + item.value + '</text>';
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">' + bars + '</svg>';
}

export function osEvolutionChartSvg(data) {
  if (!data || data.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic;padding:16px;">Sem dados de evolu\u00e7\u00e3o.</p>';
  }
  var W = 820, H = 300, P = { t: 20, r: 24, b: 48, l: 44 };
  var cw = W - P.l - P.r, ch = H - P.t - P.b;
  var maxV = 1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].pendencias > maxV) maxV = data[i].pendencias;
  }
  var stepX = data.length > 1 ? cw / (data.length - 1) : 0;
  var pts = [];
  for (var j = 0; j < data.length; j++) {
    pts.push({
      x: P.l + (data.length > 1 ? j * stepX : cw / 2),
      y: P.t + ch - (data[j].pendencias / maxV) * ch,
    });
  }
  var line = '';
  for (var li = 0; li < pts.length; li++) {
    line += (li ? 'L' : 'M') + pts[li].x.toFixed(1) + ',' + pts[li].y.toFixed(1);
  }
  var area = line + 'L' + pts[pts.length - 1].x.toFixed(1) + ',' + (P.t + ch).toFixed(1)
    + 'L' + pts[0].x.toFixed(1) + ',' + (P.t + ch).toFixed(1) + 'Z';
  var grids = '';
  for (var gi = 0; gi <= 5; gi++) {
    var gy = P.t + (ch / 5) * gi;
    var gv = Math.round(maxV - (maxV / 5) * gi);
    grids += '<line x1="' + P.l + '" y1="' + gy + '" x2="' + (P.l + cw) + '" y2="' + gy + '" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>';
    grids += '<text x="' + (P.l - 8) + '" y="' + (gy + 4) + '" font-size="10" fill="#94A3B8" text-anchor="end" font-family="Inter,sans-serif">' + gv + '</text>';
  }
  var every = Math.max(1, Math.ceil(data.length / 12));
  var xLabels = '';
  for (var xi = 0; xi < data.length; xi++) {
    if (xi % every !== 0 && xi !== data.length - 1) continue;
    var x = pts[xi].x;
    var yl = H - P.b + 16;
    xLabels += '<text x="' + x.toFixed(1) + '" y="' + yl + '" font-size="9" fill="#94A3B8" text-anchor="end" font-family="Inter,sans-serif" transform="rotate(-40 ' + x.toFixed(1) + ' ' + yl + ')">' + escapeXml(data[xi].data) + '</text>';
  }
  var dots = '';
  for (var di = 0; di < pts.length; di++) {
    dots += '<circle cx="' + pts[di].x.toFixed(1) + '" cy="' + pts[di].y.toFixed(1) + '" r="3" fill="#1E3A5F" stroke="#fff" stroke-width="1.5"/>';
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E3A5F" stop-opacity="0.85"/><stop offset="100%" stop-color="#2563EB" stop-opacity="0.12"/></linearGradient></defs>'
    + grids + '<path d="' + area + '" fill="url(#evoGrad)"/><path d="' + line + '" fill="none" stroke="#1E3A5F" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + dots + xLabels + '</svg>';
}

export function computeStats(rows) {
  var total = rows.length;
  var completed = 0;
  var pending = 0;
  var inProgress = 0;
  var cancelled = 0;

  var responsibilityCounts = {};
  var priorityBreakdown = {};
  var completedPriorityBreakdown = {};
  var statusBreakdown = {};
  var emAndamentoOS = [];
  var responsabilidadeClaroOS = [];
  var technicians = {};
  var dailyActive = {};
  var firstDate = null;
  var today = new Date().toISOString().slice(0, 10);

  var PRIORITY_KEYS = ['0', '0-A', '0-B', '0-C', '0-D', '0-E', '1', '3', '4', '5'];
  for (var k = 0; k < PRIORITY_KEYS.length; k++) {
    priorityBreakdown[PRIORITY_KEYS[k]] = 0;
    completedPriorityBreakdown[PRIORITY_KEYS[k]] = 0;
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var status = (row.status || '').trim().toLowerCase();
    var priority = (row.prioridade || '').trim().toUpperCase();
    var responsavel = (row.responsavel || '').trim();
    var equipe = (row.equipe || '').trim();
    var data = row.data || null;
    var dataConcluido = row.data_concluido || null;

    var isCompleted = (status === 'concluido' || status === 'concluído');
    var isCancelled = (status === 'cancelado');
    var isInProgress = (status === 'em andamento');

    if (isCompleted) completed++;
    else if (isCancelled) cancelled++;
    else pending++;

    if (isInProgress) inProgress++;

    var statusKey = status !== '' ? status : 'desconhecido';
    statusBreakdown[statusKey] = (statusBreakdown[statusKey] || 0) + 1;

    if (priorityBreakdown.hasOwnProperty(priority)) {
      priorityBreakdown[priority]++;
      if (isCompleted) completedPriorityBreakdown[priority]++;
    }

    if (responsavel !== '') {
      if (!responsibilityCounts[responsavel]) {
        responsibilityCounts[responsavel] = { total: 0, pending: 0, completed: 0, inProgress: 0 };
      }
      responsibilityCounts[responsavel].total++;
      if (isCompleted) responsibilityCounts[responsavel].completed++;
      else if (!isCancelled) responsibilityCounts[responsavel].pending++;
      if (isInProgress) responsibilityCounts[responsavel].inProgress++;
    }

    if (isInProgress) {
      emAndamentoOS.push({
        local: row.local || '', os: row.os || '', equipamento: row.equipamento || '',
        obs: row.obs || '', prioridade: row.prioridade || '', equipe: row.equipe || '',
        data_prevista_conclusao: row.data_prevista_conclusao || null,
      });
    }

    if (responsavel.toLowerCase() === 'claro') {
      responsabilidadeClaroOS.push({
        local: row.local || '', os: row.os || '', equipamento: row.equipamento || '',
        localidade: row.localidade || '', status: row.status || '', equipe: row.equipe || '',
        data: row.data || null, data_concluido: row.data_concluido || null,
      });
    }

    if (equipe !== '') technicians[equipe] = (technicians[equipe] || 0) + 1;

    if (data && data !== '') {
      if (!firstDate || data < firstDate) firstDate = data;
      dailyActive[data] = (dailyActive[data] || 0) + 1;
      if (isCompleted && dataConcluido && dataConcluido !== '') {
        dailyActive[dataConcluido] = (dailyActive[dataConcluido] || 0) - 1;
      }
    }
  }

  var techKeys = Object.keys(technicians);
  techKeys.sort(function (a, b) { return technicians[b] - technicians[a]; });
  var topTechnicians = {};
  for (var ti = 0; ti < Math.min(5, techKeys.length); ti++) {
    topTechnicians[techKeys[ti]] = technicians[techKeys[ti]];
  }

  var evolution = [];
  if (firstDate) {
    var cumulative = 0;
    var cur = new Date(firstDate + 'T00:00:00');
    var end = new Date(today + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    while (cur < end) {
      var dateKey = cur.toISOString().slice(0, 10);
      cumulative += (dailyActive[dateKey] || 0);
      evolution.push({ date: dateKey, count: Math.max(0, cumulative) });
      cur.setDate(cur.getDate() + 2);
    }
  }

  return {
    total: total, pending: pending, completed: completed, inProgress: inProgress, cancelled: cancelled,
    responsibilityCounts: responsibilityCounts, priorityBreakdown: priorityBreakdown,
    completedPriorityBreakdown: completedPriorityBreakdown, statusBreakdown: statusBreakdown,
    emAndamentoOS: emAndamentoOS, responsabilidadeClaroOS: responsabilidadeClaroOS,
    topTechnicians: topTechnicians, evolution: evolution,
  };
}

export function getFilteredRows() {
  if (!_osDashboardData || !_osDashboardData._allRows) return [];
  if (!_osDashboardSearch) return _osDashboardData._allRows;

  var term = _osDashboardSearch.toLowerCase();
  return _osDashboardData._allRows.filter(function (r) {
    return (r.local || '').toLowerCase().indexOf(term) !== -1
      || (r.os || '').toLowerCase().indexOf(term) !== -1
      || (r.equipamento || '').toLowerCase().indexOf(term) !== -1
      || (r.equipe || '').toLowerCase().indexOf(term) !== -1;
  });
}

export function renderOsDashboardFiltered() {
  var rows = getFilteredRows();
  var d = computeStats(rows);

  document.getElementById('osKpiTotal').textContent = d.total || 0;
  document.getElementById('osKpiPending').textContent = d.pending || 0;
  document.getElementById('osKpiCompleted').textContent = d.completed || 0;
  document.getElementById('osKpiInProgress').textContent = d.inProgress || 0;

  renderResponsibilityBreakdown('osKpiTotalBreakdown', d.responsibilityCounts, 'total');
  renderResponsibilityBreakdown('osKpiPendingBreakdown', d.responsibilityCounts, 'pending');
  renderResponsibilityBreakdown('osKpiCompletedBreakdown', d.responsibilityCounts, 'completed');
  renderResponsibilityBreakdown('osKpiInProgressBreakdown', d.responsibilityCounts, 'inProgress');

  renderBreakdownBar('osPriorityBars', d.priorityBreakdown, PRIORITY_COLORS_OS, d.total);
  renderBreakdownBar('osStatusBars', d.statusBreakdown, STATUS_COLORS_OS, d.total);
  renderBreakdownBar('osCompletedPriorityBars', d.completedPriorityBreakdown, PRIORITY_COLORS_OS, d.completed);

  renderEmAndamentoTable(d.emAndamentoOS);
  renderClaroTable(d.responsabilidadeClaroOS);
  renderTopTechnicians(d.topTechnicians);
  renderEvolutionChart(d.evolution);
}

export function showOsDashboardSections() {
  var ids = ['osKpiSection', 'osBreakdownSection', 'osTablesSection', 'osClaroSection', 'osEvolutionSection', 'osTopTechSection'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.classList.remove('hidden');
  }
  var loading = document.getElementById('osDashboardLoading');
  if (loading) loading.classList.add('hidden');
}

export async function initOsDashboard() {
  var loading = document.getElementById('osDashboardLoading');
  if (loading) loading.classList.remove('hidden');

  var pdfBtn = document.getElementById('osDashboardPdfBtn');
  if (pdfBtn && !pdfBtn._bound) {
    pdfBtn.addEventListener('click', exportOsDashboardPdf);
    pdfBtn._bound = true;
  }

  var searchInput = document.getElementById('osDashboardSearchInput');
  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', function () {
      clearTimeout(_osDashboardSearchDebounce);
      var val = searchInput.value.trim();
      _osDashboardSearchDebounce = setTimeout(function () {
        _osDashboardSearch = val;
        renderOsDashboardFiltered();
      }, 300);
    });
  }

  try {
    var resp = await apiFetch('/app/api/index.php?route=os-dashboard');
    var result = await resp.json();
    if (!result || !result.success || !result.data) {
      showToast('Erro ao carregar dados do dashboard', 'error');
      return;
    }

    _osDashboardData = result.data;
    _osDashboardData._allRows = result.data.allRows || [];

    showOsDashboardSections();
    renderOsDashboardFiltered();
  } catch (e) {
    console.error('Erro ao carregar dashboard', e);
    showToast('Erro ao carregar dashboard', 'error');
  }
}

export function exportOsDashboardPdf() {
  if (!_osDashboardData) {
    showToast('Dados não carregados', 'error');
    return;
  }

  var rows = getFilteredRows();
  var d = computeStats(rows);

  var filterNote = _osDashboardSearch
    ? '<p style="font-size:11px;color:#64748b;margin-top:2px;">Filtro ativo: "' + escapeHtml(_osDashboardSearch) + '"</p>'
    : '';

  function responsibilityHtml(rc, key) {
    var entries = [];
    for (var name in rc) {
      if (!rc.hasOwnProperty(name)) continue;
      entries.push({ name: name, count: rc[name][key] || 0 });
    }
    entries.sort(function (a, b) { return b.count - a.count; });
    var dots = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    var html = '';
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].count === 0) continue;
      html += '<div class="responsibility-row">';
      html += '<span class="responsibility-name"><span class="responsibility-dot" style="background:' + dots[i % dots.length] + '"></span>' + escapeHtml(entries[i].name) + '</span>';
      html += '<strong>' + entries[i].count + '</strong>';
      html += '</div>';
    }
    return html || '<span style="font-size:9px;color:#94A3B8;">-</span>';
  }

  var kpiCards = [
    { label: 'Total de OS', value: d.total, color: '#2563EB', dot: '#2563EB' },
    { label: 'Pendentes', value: d.pending, color: '#D97706', dot: '#D97706' },
    { label: 'Concluídas', value: d.completed, color: '#059669', dot: '#059669' },
    { label: 'Em Andamento', value: d.inProgress, color: '#4F46E5', dot: '#4F46E5' },
  ];
  var kpiHtml = '<div class="section"><div class="kpi-grid">';
  for (var ki = 0; ki < kpiCards.length; ki++) {
    var kpi = kpiCards[ki];
    var kpiKey = ki === 0 ? 'total' : ki === 1 ? 'pending' : ki === 2 ? 'completed' : 'inProgress';
    kpiHtml += '<div class="kpi-card">';
    kpiHtml += '<div class="kpi-dot" style="background:' + kpi.dot + '"></div>';
    kpiHtml += '<p class="kpi-label">' + escapeHtml(kpi.label) + '</p>';
    kpiHtml += '<p class="kpi-value" style="color:' + kpi.color + ';">' + (kpi.value || 0) + '</p>';
    kpiHtml += '<div class="responsibility-breakdown"><p class="responsibility-title">Por Responsável</p>';
    kpiHtml += responsibilityHtml(d.responsibilityCounts, kpiKey);
    kpiHtml += '</div></div>';
  }
  kpiHtml += '</div></div>';

  var priorityItems = breakdownToBarItems(d.priorityBreakdown, PRIORITY_COLORS_OS);
  var statusItems = breakdownToBarItems(d.statusBreakdown, STATUS_COLORS_OS);
  var completedPriorityItems = breakdownToBarItems(d.completedPriorityBreakdown, PRIORITY_COLORS_OS);

  var priorityHtml = '<div class="section"><div class="two-col"><div><div class="section-title">OS por Prioridade</div>' + osBarChartSvg(priorityItems) + '</div><div><div class="section-title">OS por Status</div>' + osBarChartSvg(statusItems) + '</div></div></div>';

  var completedPriorityHtml = '<div class="section"><div class="section-title">OS por Prioridade — Concluídas</div>' + osBarChartSvg(completedPriorityItems) + '</div>';

  var emTableHtml = '';
  if (d.emAndamentoOS && d.emAndamentoOS.length > 0) {
    emTableHtml = '<div class="section"><div class="section-title">OS em Andamento</div>';
    emTableHtml += '<table class="data-table in-progress-table">';
    emTableHtml += '<thead><tr><th>Site</th><th>OS</th><th>Equipamento</th><th>Observação</th><th>Prior.</th><th>Técnico</th><th>Prev. Conclusão</th></tr></thead><tbody>';
    for (var ei = 0; ei < d.emAndamentoOS.length; ei++) {
      var e = d.emAndamentoOS[ei];
      emTableHtml += '<tr><td>' + escapeHtml(e.local || '') + '</td><td>' + escapeHtml(e.os || '-') + '</td><td>' + escapeHtml(e.equipamento || '') + '</td><td>' + escapeHtml(e.obs || '-') + '</td><td>' + escapeHtml(e.prioridade || '-') + '</td><td>' + escapeHtml(e.equipe || '-') + '</td><td>' + formatDateOs(e.data_prevista_conclusao) + '</td></tr>';
    }
    emTableHtml += '</tbody></table></div>';
  }

  var claroTableHtml = '';
  if (d.responsabilidadeClaroOS && d.responsabilidadeClaroOS.length > 0) {
    claroTableHtml = '<div class="section"><div class="section-title">OS sob Responsabilidade Claro</div>';
    claroTableHtml += '<table class="data-table">';
    claroTableHtml += '<thead><tr><th>Site</th><th>OS</th><th>Equipamento</th><th>Status</th><th>Técnico</th><th>Data</th></tr></thead><tbody>';
    for (var ci = 0; ci < d.responsabilidadeClaroOS.length; ci++) {
      var c = d.responsabilidadeClaroOS[ci];
      claroTableHtml += '<tr><td>' + escapeHtml(c.local || '') + '</td><td>' + escapeHtml(c.os || '-') + '</td><td>' + escapeHtml(c.equipamento || '') + '</td><td>' + escapeHtml(c.status || '-') + '</td><td>' + escapeHtml(c.equipe || '-') + '</td><td>' + formatDateOs(c.data) + '</td></tr>';
    }
    claroTableHtml += '</tbody></table></div>';
  }

  var techItems = [];
  var techEntries = [];
  for (var tk in d.topTechnicians) {
    if (d.topTechnicians.hasOwnProperty(tk)) {
      techEntries.push({ name: tk, count: d.topTechnicians[tk] });
    }
  }
  techEntries.sort(function (a, b) { return b.count - a.count; });
  var techColors = ['#1E3A5F', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];
  for (var ti = 0; ti < techEntries.length; ti++) {
    techItems.push({ label: techEntries[ti].name, value: techEntries[ti].count, color: techColors[ti % techColors.length] });
  }
  var techHtml = '<div class="section"><div class="section-title">Top 5 Técnicos por Número de OS</div>' + osBarChartSvg(techItems) + '</div>';

  var evolutionPoints = [];
  for (var evi = 0; evi < d.evolution.length; evi++) {
    evolutionPoints.push({ data: d.evolution[evi].date, pendencias: d.evolution[evi].count });
  }
  var evolutionHtml = '<div class="section"><div class="section-title">Evolução de OS</div>' + osEvolutionChartSvg(evolutionPoints) + '</div>';

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard de Gestão de OS</title>';
  html += '<style>';
  html += '*{margin:0;padding:0;box-sizing:border-box}';
  html += "body{font-family:'Inter','Segoe UI',Arial,sans-serif;padding:32px;color:#1a1a1a;background:#fff}";
  html += '.header{border-bottom:3px solid #1E3A5F;padding-bottom:16px;margin-bottom:28px}';
  html += '.header h1{font-size:24px;color:#1E3A5F;font-weight:800}';
  html += '.header .sub{font-size:12px;color:#64748b;margin-top:6px}';
  html += '.section{margin-bottom:28px;page-break-inside:avoid}';
  html += '.section-title{font-size:15px;font-weight:700;color:#1E3A5F;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #E2E8F0}';
  html += '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}';
  html += '.kpi-card{border:1px solid #E2E8F0;border-radius:10px;padding:14px;position:relative;min-height:176px}';
  html += '.kpi-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em}';
  html += '.kpi-value{font-size:26px;font-weight:800;margin-top:5px}';
  html += '.kpi-dot{position:absolute;top:15px;right:14px;width:11px;height:11px;border-radius:50%}';
  html += '.responsibility-breakdown{border-top:1px solid #E2E8F0;margin-top:10px;padding-top:8px}';
  html += '.responsibility-title{font-size:8px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}';
  html += '.responsibility-row{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:9px;color:#475569;line-height:1.65}';
  html += '.responsibility-name{display:flex;align-items:center;gap:5px;min-width:0}';
  html += '.responsibility-dot{display:inline-block;width:6px;height:6px;border-radius:50%;flex:0 0 6px}';
  html += '.responsibility-row strong{font-size:9px;color:#1E293B}';
  html += '.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}';
  html += '@page{margin:1.5cm}';
  html += '@media print{body{padding:0}.section{page-break-inside:avoid}}';
  html += '@media print and (orientation:portrait){.two-col{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}';
  html += '.data-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}';
  html += '.data-table th{background:#1E3A5F;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em}';
  html += '.data-table td{padding:6px 10px;border-bottom:1px solid #E2E8F0}';
  html += '.data-table tbody tr:nth-child(even){background:#F8FAFC}';
  html += '.in-progress-table{table-layout:fixed;font-size:9px}';
  html += '.in-progress-table th{padding:6px;font-size:8px;overflow-wrap:anywhere}';
  html += '.in-progress-table td{padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}';
  html += '.in-progress-table th:nth-child(1){width:8%}';
  html += '.in-progress-table th:nth-child(2){width:14%}';
  html += '.in-progress-table th:nth-child(3){width:13%}';
  html += '.in-progress-table th:nth-child(4){width:27%}';
  html += '.in-progress-table th:nth-child(5){width:6%}';
  html += '.in-progress-table th:nth-child(6){width:10%}';
  html += '.in-progress-table th:nth-child(7){width:12%}';
  html += '.in-progress-table td:last-child{white-space:nowrap}';
  html += '</style></head><body>';
  html += '<div class="header">';
  html += '<h1>Dashboard de Gestão de OS</h1>';
  html += '<p class="sub">Indicadores consolidados — ' + new Date().toLocaleDateString('pt-BR') + '</p>';
  html += filterNote;
  html += '</div>';
  html += kpiHtml;
  html += priorityHtml;
  html += completedPriorityHtml;
  html += emTableHtml + claroTableHtml;
  html += evolutionHtml + techHtml;
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

if (typeof globalThis !== 'undefined') {
  globalThis.formatDateOs = formatDateOs;
  globalThis.renderBreakdownBar = renderBreakdownBar;
  globalThis.renderResponsibilityBreakdown = renderResponsibilityBreakdown;
  globalThis.renderEmAndamentoTable = renderEmAndamentoTable;
  globalThis.renderClaroTable = renderClaroTable;
  globalThis.getStatusBadgeClassOs = getStatusBadgeClassOs;
  globalThis.renderTopTechnicians = renderTopTechnicians;
  globalThis.renderEvolutionChart = renderEvolutionChart;
  globalThis.escapeXml = escapeXml;
  globalThis.truncateLabel = truncateLabel;
  globalThis.breakdownToBarItems = breakdownToBarItems;
  globalThis.osBarChartSvg = osBarChartSvg;
  globalThis.osEvolutionChartSvg = osEvolutionChartSvg;
  globalThis.computeStats = computeStats;
  globalThis.getFilteredRows = getFilteredRows;
  globalThis.renderOsDashboardFiltered = renderOsDashboardFiltered;
  globalThis.showOsDashboardSections = showOsDashboardSections;
  globalThis.initOsDashboard = initOsDashboard;
  globalThis.exportOsDashboardPdf = exportOsDashboardPdf;
}
