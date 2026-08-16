import { describe, it, expect, beforeEach } from "bun:test";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateOs(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

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
};

function getStatusBadgeClassOs(status) {
  switch ((status || '').toLowerCase()) {
    case 'concluído': case 'concluido': return 'bg-emerald-100 text-emerald-700';
    case 'pendente': return 'bg-red-100 text-red-700';
    case 'planejado': return 'bg-yellow-100 text-yellow-700';
    case 'em andamento': return 'bg-blue-100 text-blue-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function renderBreakdownBar(containerId, data, colorMap, total) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;
    const count = data[key];
    if (count === 0) continue;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const color = colorMap[key] || '#94A3B8';
    html += `<div class="flex items-center gap-3">`;
    html += `<span class="text-sm text-slate-600 w-24 shrink-0">${escapeHtml(key)}</span>`;
    html += `<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">`;
    html += `<div class="h-4 rounded-full transition-all" style="width:${pct}%;background:${color}"></div>`;
    html += `</div>`;
    html += `<span class="text-sm text-slate-500 w-16 text-right">${count} (${pct}%)</span>`;
    html += `</div>`;
  }
  container.innerHTML = html || '<p class="text-sm text-slate-400">Nenhum dado</p>';
}

function computeStats(rows) {
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
      emAndamentoOS.push({ local: row.local, os: row.os, equipamento: row.equipamento, equipe: row.equipe });
    }

    if (responsavel.toLowerCase() === 'claro') {
      responsabilidadeClaroOS.push({ os: row.os, local: row.local });
    }

    if (equipe !== '') technicians[equipe] = (technicians[equipe] || 0) + 1;
  }

  return {
    total, pending, completed, inProgress, cancelled,
    responsibilityCounts, priorityBreakdown, completedPriorityBreakdown,
    statusBreakdown, emAndamentoOS, responsabilidadeClaroOS, topTechnicians: technicians,
  };
}

function filterRows(rows, term) {
  if (!term) return rows;
  var lower = term.toLowerCase();
  return rows.filter(function (r) {
    return (r.local || '').toLowerCase().indexOf(lower) !== -1
      || (r.os || '').toLowerCase().indexOf(lower) !== -1
      || (r.equipamento || '').toLowerCase().indexOf(lower) !== -1
      || (r.equipe || '').toLowerCase().indexOf(lower) !== -1;
  });
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateLabel(label, max) {
  return label.length > max ? label.substring(0, max - 1) + '\u2026' : label;
}

function breakdownToBarItems(map, colorMap) {
  var items = [];
  for (var k in map) {
    if (!map.hasOwnProperty(k)) continue;
    if (map[k] === 0) continue;
    items.push({ label: k, value: map[k], color: colorMap[k] || '#94A3B8' });
  }
  return items;
}

function osBarChartSvg(items) {
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

function osEvolutionChartSvg(data) {
  if (!data || data.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic;padding:16px;">Sem dados de evolução.</p>';
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

const SAMPLE_ROWS = [
  { id: 1, local: 'BMA', os: 'OS100', equipamento: 'WM 01', localidade: 'C1', tipo: 'corretiva', status: 'Pendente', prioridade: '0', data: '2026-01-01', data_concluido: null, responsavel: 'Claro', equipe: 'João', obs: '', data_prevista_conclusao: null },
  { id: 2, local: 'BMA', os: 'OS200', equipamento: 'WM 02', localidade: 'C2', tipo: 'corretiva', status: 'Concluído', prioridade: '1', data: '2026-01-02', data_concluido: '2026-01-03', responsavel: 'Engemon', equipe: 'Maria', obs: '', data_prevista_conclusao: null },
  { id: 3, local: 'NIT', os: 'OS300', equipamento: 'CH 01', localidade: 'C3', tipo: 'corretiva', status: 'Em andamento', prioridade: '3', data: '2026-01-03', data_concluido: null, responsavel: '', equipe: 'João', obs: '', data_prevista_conclusao: '2026-01-10' },
  { id: 4, local: 'NIT', os: 'OS400', equipamento: 'CH 02', localidade: 'C4', tipo: 'corretiva', status: 'Pendente', prioridade: '0-A', data: '2026-01-04', data_concluido: null, responsavel: 'Claro', equipe: 'Pedro', obs: '', data_prevista_conclusao: null },
];

describe("OS Dashboard", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="osKpiSection" class="hidden"></div>
      <div id="osBreakdownSection" class="hidden"></div>
      <div id="osKpiTotal">0</div>
      <div id="osKpiPending">0</div>
      <div id="osKpiCompleted">0</div>
      <div id="osKpiInProgress">0</div>
      <div id="osKpiTotalBreakdown"></div>
      <div id="osKpiPendingBreakdown"></div>
      <div id="osKpiCompletedBreakdown"></div>
      <div id="osKpiInProgressBreakdown"></div>
      <div id="osPriorityBars"></div>
      <div id="osStatusBars"></div>
      <div id="osCompletedPriorityBars"></div>
      <div id="osEmAndamentoTable"></div>
      <div id="osClaroTable"></div>
      <div id="osTopTechBars"></div>
      <div id="osDashboardLoading"></div>
      <div id="osEvolutionSection" class="hidden"></div>
      <div id="osTopTechSection" class="hidden"></div>
      <div id="osClaroSection" class="hidden"></div>
      <div id="osTablesSection" class="hidden"></div>
      <div id="osDashboardPdfBtn"></div>
      <div id="osDashboardSearchInput"></div>
    `;
  });

  it("formatDateOs formats YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateOs("2026-01-15")).toBe("15/01/2026");
    expect(formatDateOs(null)).toBe("-");
    expect(formatDateOs("")).toBe("-");
    expect(formatDateOs("invalid")).toBe("invalid");
  });

  it("getStatusBadgeClassOs returns correct classes", () => {
    expect(getStatusBadgeClassOs("Concluído")).toContain("emerald");
    expect(getStatusBadgeClassOs("Pendente")).toContain("red");
    expect(getStatusBadgeClassOs("Em andamento")).toContain("blue");
    expect(getStatusBadgeClassOs("Planejado")).toContain("yellow");
    expect(getStatusBadgeClassOs("unknown")).toContain("slate");
  });

  it("renderBreakdownBar renders bars for non-zero values", () => {
    const data = { '0': 5, '1': 3, '3': 0 };
    renderBreakdownBar("osPriorityBars", data, PRIORITY_COLORS_OS, 8);

    const container = document.getElementById("osPriorityBars");
    expect(container.innerHTML).toContain("0");
    expect(container.innerHTML).toContain("5");
    expect(container.innerHTML).toContain("63%");
    expect(container.innerHTML).toContain("1");
    expect(container.innerHTML).toContain("3");
    expect(container.innerHTML).toContain("38%");
    expect(container.innerHTML).not.toContain(">0 (0%)<");
  });

  it("renderBreakdownBar shows empty message when all zero", () => {
    const data = { '0': 0, '1': 0 };
    renderBreakdownBar("osPriorityBars", data, PRIORITY_COLORS_OS, 0);

    const container = document.getElementById("osPriorityBars");
    expect(container.innerHTML).toContain("Nenhum dado");
  });

  it("PRIORITY_COLORS_OS has all expected keys", () => {
    expect(PRIORITY_COLORS_OS['0']).toBeDefined();
    expect(PRIORITY_COLORS_OS['0-A']).toBeDefined();
    expect(PRIORITY_COLORS_OS['5']).toBeDefined();
    expect(PRIORITY_COLORS_OS['0']).toBe('#EF4444');
  });

  it("STATUS_COLORS_OS has expected statuses", () => {
    expect(STATUS_COLORS_OS['pendente']).toBe('#EF4444');
    expect(STATUS_COLORS_OS['concluido']).toBe('#10B981');
    expect(STATUS_COLORS_OS['em andamento']).toBe('#3B82F6');
  });

  it("escapeHtml escapes special characters", () => {
    expect(escapeHtml('<script>')).toBe("&lt;script&gt;");
    expect(escapeHtml('a&b')).toBe("a&amp;b");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("computeStats", () => {
  it("counts totals correctly", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.total).toBe(4);
    expect(stats.pending).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.inProgress).toBe(1);
  });

  it("groups responsibility counts", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.responsibilityCounts['Claro']['total']).toBe(2);
    expect(stats.responsibilityCounts['Claro']['completed']).toBe(0);
    expect(stats.responsibilityCounts['Engemon']['total']).toBe(1);
    expect(stats.responsibilityCounts['Engemon']['completed']).toBe(1);
  });

  it("builds priority breakdown", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.priorityBreakdown['0']).toBe(1);
    expect(stats.priorityBreakdown['0-A']).toBe(1);
    expect(stats.priorityBreakdown['1']).toBe(1);
    expect(stats.priorityBreakdown['3']).toBe(1);
  });

  it("filters em andamento OS", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.emAndamentoOS.length).toBe(1);
    expect(stats.emAndamentoOS[0].os).toBe('OS300');
  });

  it("filters responsabilidade claro OS", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.responsabilidadeClaroOS.length).toBe(2);
    expect(stats.responsabilidadeClaroOS[0].os).toBe('OS100');
    expect(stats.responsabilidadeClaroOS[1].os).toBe('OS400');
  });

  it("counts top technicians", () => {
    const stats = computeStats(SAMPLE_ROWS);
    expect(stats.topTechnicians['João']).toBe(2);
    expect(stats.topTechnicians['Maria']).toBe(1);
    expect(stats.topTechnicians['Pedro']).toBe(1);
  });

  it("handles empty rows", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.inProgress).toBe(0);
    expect(Object.keys(stats.responsibilityCounts)).toHaveLength(0);
  });
});

describe("filterRows", () => {
  it("returns all rows when term is empty", () => {
    expect(filterRows(SAMPLE_ROWS, '')).toHaveLength(4);
    expect(filterRows(SAMPLE_ROWS, null)).toHaveLength(4);
  });

  it("filters by local (site)", () => {
    const result = filterRows(SAMPLE_ROWS, 'BMA');
    expect(result).toHaveLength(2);
    expect(result[0].os).toBe('OS100');
    expect(result[1].os).toBe('OS200');
  });

  it("filters by OS number", () => {
    const result = filterRows(SAMPLE_ROWS, 'OS300');
    expect(result).toHaveLength(1);
    expect(result[0].os).toBe('OS300');
  });

  it("filters by equipment name", () => {
    const result = filterRows(SAMPLE_ROWS, 'CH');
    expect(result).toHaveLength(2);
  });

  it("filters by technician name", () => {
    const result = filterRows(SAMPLE_ROWS, 'Maria');
    expect(result).toHaveLength(1);
    expect(result[0].os).toBe('OS200');
  });

  it("is case-insensitive", () => {
    const result = filterRows(SAMPLE_ROWS, 'bma');
    expect(result).toHaveLength(2);
  });

  it("returns empty when no match", () => {
    const result = filterRows(SAMPLE_ROWS, 'ZZZZZ');
    expect(result).toHaveLength(0);
  });
});

describe("SVG chart helpers", () => {
  it("escapeXml escapes XML special chars", () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
    expect(escapeXml('<x>')).toBe('&lt;x&gt;');
    expect(escapeXml('"q"')).toBe('&quot;q&quot;');
    expect(escapeXml('plain')).toBe('plain');
  });

  it("truncateLabel shortens long labels with ellipsis", () => {
    expect(truncateLabel('abcdef', 5)).toBe('abcd\u2026');
    expect(truncateLabel('abc', 5)).toBe('abc');
  });

  it("breakdownToBarItems filters zero values and maps colors", () => {
    const items = breakdownToBarItems({ '0': 5, '1': 0, '3': 2 }, PRIORITY_COLORS_OS);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ label: '0', value: 5, color: '#EF4444' });
    expect(items[1]).toEqual({ label: '3', value: 2, color: '#3B82F6' });
  });

  it("breakdownToBarItems falls back to gray for unknown keys", () => {
    const items = breakdownToBarItems({ 'xpto': 1 }, PRIORITY_COLORS_OS);
    expect(items[0].color).toBe('#94A3B8');
  });

  it("osBarChartSvg renders SVG with rect fills (print-safe)", () => {
    const svg = osBarChartSvg([{ label: '0', value: 4, color: '#EF4444' }, { label: '1', value: 2, color: '#F59E0B' }]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('fill="#EF4444"');
    expect(svg).toContain('fill="#F59E0B"');
    expect(svg).toContain('fill="#F1F5F9"');
    expect(svg).toContain('rect');
    expect(svg).not.toContain('background:');
    expect(svg).toContain('>4</text>');
  });

  it("osBarChartSvg returns message for empty data", () => {
    expect(osBarChartSvg([])).toContain('Sem dados');
    expect(osBarChartSvg(null)).toContain('Sem dados');
  });

  it("osEvolutionChartSvg renders line chart SVG", () => {
    const svg = osEvolutionChartSvg([
      { data: '2026-01-01', pendencias: 2 },
      { data: '2026-01-02', pendencias: 5 },
      { data: '2026-01-03', pendencias: 3 },
    ]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('linearGradient id="evoGrad"');
    expect(svg).toContain('stroke="#1E3A5F"');
    expect(svg).toContain('circle');
    expect(svg).toContain('2026-01-01');
  });

  it("osEvolutionChartSvg returns message for empty data", () => {
    expect(osEvolutionChartSvg([])).toContain('Sem dados');
    expect(osEvolutionChartSvg(null)).toContain('Sem dados');
  });

  it("osBarChartSvg escapes labels in SVG text", () => {
    const svg = osBarChartSvg([{ label: 'a<b&c', value: 1, color: '#EF4444' }]);
    expect(svg).toContain('a&lt;b&amp;c');
    expect(svg).not.toContain('a<b&c');
  });
});
