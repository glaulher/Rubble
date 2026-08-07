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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function sanitizeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[;"\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

var pendingSearch = '';
var pendingStatusFilter = '';
var pendingSortBy = 'e.local';
var pendingSortDir = 'ASC';
var pendingLoading = false;
var pendingAllLoaded = false;

const PENDING_COLUMNS = 14;

function resetPendingState(search, status) {
  pendingSearch = search || '';
  pendingStatusFilter = status || '';
  pendingAllLoaded = false;
  pendingLoading = false;

  const tbody = document.getElementById('pendingTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pendingEmpty');
  if (empty) empty.classList.add('hidden');
}

function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendente': return 'bg-red-100 text-red-700';
    case 'planejado': return 'bg-yellow-100 text-yellow-700';
    case 'em andamento': return 'bg-blue-100 text-blue-700';
    case 'projeto clean up': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getCategoryBadgeClass(tipo) {
  switch ((tipo || '').toLowerCase()) {
    case 'corretiva': return 'bg-orange-100 text-orange-700';
    case 'preventiva': return 'bg-sky-100 text-sky-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getPriorityBadgeClass(priority) {
  const p = (priority || '').toUpperCase();
  if (p === '0' || p.indexOf('0-') === 0) return 'bg-red-100 text-red-700';
  if (p === '1') return 'bg-amber-100 text-amber-700';
  if (p === '3') return 'bg-blue-100 text-blue-700';
  if (p === '4') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-700';
}

function renderPendingTable(list, append) {
  append = append || false;
  const tbody = document.getElementById('pendingTableBody');
  const empty = document.getElementById('pendingEmpty');

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

    html += '<tr class="pending-row border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" '
      + 'data-id="' + item.id + '" data-expandable="true">'
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
      + '<td class="px-3 py-2.5 text-sm">'
      + '<span class="priority-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getPriorityBadgeClass(item.prioridade) + '">'
      + escapeHtml(item.prioridade || '-') + '</span></td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_planejada)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_real_inicio)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_prevista_conclusao)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(formatDate(item.data_concluido)) + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.equipe || '-') + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.material || '-') + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(item.localidade || '-') + '</td>'
      + '</tr>';

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

function toggleRow(id) {
  const row = document.querySelector('tr.pending-row[data-id="' + id + '"]');
  const detail = document.querySelector('tr.pending-details[data-detail-for="' + id + '"]');
  if (!row || !detail) return;

  detail.classList.toggle('hidden');
  const icon = row.querySelector('.expand-icon');
  if (icon) {
    icon.textContent = detail.classList.contains('hidden') ? '▶' : '▼';
  }
}

function buildPendingSortQuery() {
  return '&sort_by=' + encodeURIComponent(pendingSortBy)
    + '&sort_dir=' + encodeURIComponent(pendingSortDir);
}

function buildPendingStatusSelect(selected) {
  const PENDING_STATUS_OPTIONS = ['pendente', 'planejado', 'em andamento', 'projeto clean up'];
  let html = '<select class="pending-edit-input pending-status px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">';
  for (let i = 0; i < PENDING_STATUS_OPTIONS.length; i++) {
    const opt = PENDING_STATUS_OPTIONS[i];
    const sel = String(selected).toLowerCase() === opt ? ' selected' : '';
    html += '<option value="' + opt + '"' + sel + '>' + opt.charAt(0).toUpperCase() + opt.slice(1) + '</option>';
  }
  html += '</select>';
  return html;
}

function buildPendingCsvRow(item) {
  return [
    sanitizeCSV(item.local),
    sanitizeCSV(item.os || ''),
    sanitizeCSV(item.equipamento || ''),
    sanitizeCSV(item.tipo || ''),
    sanitizeCSV(item.status || ''),
    sanitizeCSV(item.prioridade || ''),
    formatDate(item.data),
    formatDate(item.data_planejada),
    formatDate(item.data_real_inicio),
    formatDate(item.data_prevista_conclusao),
    formatDate(item.data_concluido),
    sanitizeCSV(item.equipe || ''),
    sanitizeCSV(item.material || ''),
    sanitizeCSV(item.localidade || ''),
    sanitizeCSV(item.obs || ''),
  ];
}

describe("buildPendingSortQuery", () => {
  it("builds sort params for default sort", () => {
    pendingSortBy = 'e.local';
    pendingSortDir = 'ASC';
    expect(buildPendingSortQuery()).toBe('&sort_by=e.local&sort_dir=ASC');
  });

  it("reflects current sort state", () => {
    pendingSortBy = 'r.data_concluido';
    pendingSortDir = 'DESC';
    expect(buildPendingSortQuery()).toBe('&sort_by=r.data_concluido&sort_dir=DESC');
  });

  it("encodes unsafe characters in column names", () => {
    pendingSortBy = 'r.os; DROP';
    pendingSortDir = 'ASC';
    expect(buildPendingSortQuery()).toBe('&sort_by=r.os%3B%20DROP&sort_dir=ASC');
  });
});

describe("buildPendingStatusSelect", () => {
  it("renders an option for each pending status", () => {
    const html = buildPendingStatusSelect('');
    expect((html.match(/<option/g) || []).length).toBe(4);
    expect(html).toContain('value="pendente"');
    expect(html).toContain('value="em andamento"');
    expect(html).toContain('value="projeto clean up"');
  });

  it("marks the current status as selected", () => {
    const html = buildPendingStatusSelect('em andamento');
    expect(html).toContain('<option value="em andamento" selected>Em andamento</option>');
  });

  it("does not select any option when value is empty", () => {
    const html = buildPendingStatusSelect('');
    expect(html).not.toContain(' selected');
  });
});

describe("resetPendingState", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody id="pendingTableBody"><tr><td>old</td></tr></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>';
  });

  it("clears state and DOM", () => {
    pendingLoading = true;
    pendingAllLoaded = true;
    pendingSortBy = 'r.data';
    pendingSortDir = 'DESC';
    resetPendingState('', '');

    expect(pendingSearch).toBe('');
    expect(pendingStatusFilter).toBe('');
    expect(pendingAllLoaded).toBe(false);
    expect(pendingLoading).toBe(false);
    expect((typeof pendingSortBy).toLowerCase()).toBe('string');
    expect(document.getElementById('pendingTableBody').innerHTML).toBe('');
  });

  it("preserves search and status on reset", () => {
    resetPendingState('BMA', 'pendente');
    expect(pendingSearch).toBe('BMA');
    expect(pendingStatusFilter).toBe('pendente');
  });
});

describe("renderPendingTable", () => {
  const mockData = [
    { id: 1, local: 'BMA', equipamento: 'WM 01', os: 'OS123', tipo: 'corretiva', status: 'pendente', prioridade: '0-D', data: '2026-07-15', data_planejada: '2026-07-20', data_real_inicio: '2026-07-22', data_prevista_conclusao: '2026-07-25', data_concluido: null, obs: 'Filtro sujo', material: 'Filtro AR', equipe: 'João', localidade: 'Container 1' },
    { id: 2, local: 'BMA', equipamento: 'WM 02', os: 'OS456', tipo: 'preventiva', status: 'planejado', prioridade: '4', data: '2026-07-16', data_planejada: null, data_real_inicio: null, data_prevista_conclusao: null, data_concluido: '2026-07-18', obs: 'Troca óleo', material: 'Óleo 5W30', equipe: 'Maria', localidade: 'Container 1' },
    { id: 3, local: 'RJO', equipamento: 'CH 01', os: 'OS789', tipo: null, status: 'pendente', prioridade: null, data: '2026-07-14', data_planejada: null, data_real_inicio: null, data_prevista_conclusao: null, data_concluido: null, obs: 'Vazamento', material: 'Vedação', equipe: 'José', localidade: 'Sala 5' },
  ];

  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody id="pendingTableBody"></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>';
  });

  it("renders rows flat (no site separators)", () => {
    renderPendingTable(mockData);

    expect(document.querySelectorAll('tr.pending-row').length).toBe(3);
    expect(document.querySelectorAll('tr.site-separator').length).toBe(0);
  });

  it("renders one cell per column (flat layout)", () => {
    renderPendingTable([mockData[0]]);

    const row = document.querySelector('tr.pending-row');
    expect(row.querySelectorAll('td').length).toBe(PENDING_COLUMNS);
  });

  it("renders status badges with correct colors", () => {
    renderPendingTable(mockData);

    const badges = document.querySelectorAll('.status-badge');
    expect(badges[0].textContent.trim()).toBe('pendente');
    expect(badges[0].className).toContain('bg-red-100');

    expect(badges[1].textContent.trim()).toBe('planejado');
    expect(badges[1].className).toContain('bg-yellow-100');

    expect(badges[2].textContent.trim()).toBe('pendente');
    expect(badges[2].className).toContain('bg-red-100');
  });

  it("renders category badges with correct colors", () => {
    renderPendingTable(mockData);

    const badges = document.querySelectorAll('.category-badge');
    expect(badges.length).toBe(3);
    expect(badges[0].textContent.trim()).toBe('corretiva');
    expect(badges[0].className).toContain('bg-orange-100');

    expect(badges[1].textContent.trim()).toBe('preventiva');
    expect(badges[1].className).toContain('bg-sky-100');

    expect(badges[2].textContent.trim()).toBe('-');
    expect(badges[2].className).toContain('bg-slate-100');
  });

  it("renders priority badges with correct colors", () => {
    renderPendingTable(mockData);

    const badges = document.querySelectorAll('.priority-badge');
    expect(badges.length).toBe(3);
    expect(badges[0].textContent.trim()).toBe('0-D');
    expect(badges[0].className).toContain('bg-red-100');

    expect(badges[1].textContent.trim()).toBe('4');
    expect(badges[1].className).toContain('bg-purple-100');

    expect(badges[2].textContent.trim()).toBe('-');
    expect(badges[2].className).toContain('bg-slate-100');
  });

  it("renders formatted date columns", () => {
    renderPendingTable([mockData[0]]);

    const cells = document.querySelector('tr.pending-row').querySelectorAll('td');
    // index 6 = data abertura, 7 = programada, 8 = real inicio, 9 = prevista conclusao, 10 = conclusao
    expect(cells[6].textContent.trim()).toBe('15/07/2026');
    expect(cells[7].textContent.trim()).toBe('20/07/2026');
    expect(cells[8].textContent.trim()).toBe('22/07/2026');
    expect(cells[9].textContent.trim()).toBe('25/07/2026');
    expect(cells[10].textContent.trim()).toBe('-');
  });

  it("shows technician, material and localidade columns", () => {
    renderPendingTable([mockData[0]]);

    const cells = document.querySelector('tr.pending-row').querySelectorAll('td');
    expect(cells[11].textContent.trim()).toBe('João');
    expect(cells[12].textContent.trim()).toBe('Filtro AR');
    expect(cells[13].textContent.trim()).toBe('Container 1');
  });

  it("shows empty state when no data", () => {
    renderPendingTable([], false);
    expect(document.getElementById('pendingEmpty').classList.contains('hidden')).toBe(false);
  });

  it("does not clear tbody when append=true with empty list", () => {
    renderPendingTable([mockData[0]], false);
    expect(document.querySelectorAll('tr.pending-row').length).toBe(1);

    renderPendingTable([], true);
    expect(document.querySelectorAll('tr.pending-row').length).toBe(1);
  });

  it("renders details row hidden after each data row", () => {
    renderPendingTable(mockData);

    const details = document.querySelectorAll('tr.pending-details');
    expect(details.length).toBe(3);
    details.forEach(function (d) {
      expect(d.classList.contains('hidden')).toBe(true);
      expect(d.querySelector('td').colSpan).toBe(PENDING_COLUMNS);
    });
  });

  it("includes observacao in details", () => {
    renderPendingTable([mockData[0]]);

    const detail = document.querySelector('tr.pending-details');
    expect(detail.textContent).toContain('Filtro sujo');
  });
});

describe("toggleRow", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody>' +
      '<tr class="pending-row border-b cursor-pointer" data-id="1" data-expandable="true">' +
      '<td><span class="expand-icon text-slate-400 mr-2">▶</span>BMA</td>' +
      '</tr>' +
      '<tr class="pending-details hidden" data-detail-for="1"><td colspan="13">Details</td></tr>' +
      '</tbody></table>';
  });

  it("expands detail row on toggle", () => {
    const detail = document.querySelector('tr.pending-details');
    expect(detail.classList.contains('hidden')).toBe(true);

    toggleRow(1);
    expect(detail.classList.contains('hidden')).toBe(false);
  });

  it("collapses detail row on second toggle", () => {
    toggleRow(1);
    expect(document.querySelector('tr.pending-details').classList.contains('hidden')).toBe(false);

    toggleRow(1);
    expect(document.querySelector('tr.pending-details').classList.contains('hidden')).toBe(true);
  });

  it("changes icon from ▶ to ▼ on expand", () => {
    const icon = document.querySelector('.expand-icon');
    expect(icon.textContent).toBe('▶');

    toggleRow(1);
    expect(icon.textContent).toBe('▼');

    toggleRow(1);
    expect(icon.textContent).toBe('▶');
  });
});

describe("getStatusBadgeClass", () => {
  it("returns red for pendente", () => {
    expect(getStatusBadgeClass('pendente')).toContain('bg-red-100');
  });

  it("returns yellow for planejado", () => {
    expect(getStatusBadgeClass('planejado')).toContain('bg-yellow-100');
  });

  it("returns blue for em andamento", () => {
    expect(getStatusBadgeClass('em andamento')).toContain('bg-blue-100');
  });

  it("returns purple for projeto clean up", () => {
    expect(getStatusBadgeClass('projeto clean up')).toContain('bg-purple-100');
  });

  it("returns default for unknown", () => {
    expect(getStatusBadgeClass('unknown')).toContain('bg-slate-100');
  });

  it("handles mixed case status", () => {
    expect(getStatusBadgeClass('Pendente')).toContain('bg-red-100');
    expect(getStatusBadgeClass('PLANEJADO')).toContain('bg-yellow-100');
    expect(getStatusBadgeClass('Em Andamento')).toContain('bg-blue-100');
  });
});

describe("getCategoryBadgeClass", () => {
  it("returns orange for corretiva", () => {
    expect(getCategoryBadgeClass('corretiva')).toContain('bg-orange-100');
  });

  it("returns sky for preventiva", () => {
    expect(getCategoryBadgeClass('preventiva')).toContain('bg-sky-100');
  });

  it("returns default for unknown or missing", () => {
    expect(getCategoryBadgeClass('outro')).toContain('bg-slate-100');
    expect(getCategoryBadgeClass('')).toContain('bg-slate-100');
    expect(getCategoryBadgeClass(null)).toContain('bg-slate-100');
  });
});

describe("getPriorityBadgeClass", () => {
  it("returns red for 0 and 0-x variants", () => {
    expect(getPriorityBadgeClass('0')).toBe('bg-red-100 text-red-700');
    expect(getPriorityBadgeClass('0-A')).toBe('bg-red-100 text-red-700');
    expect(getPriorityBadgeClass('0-E')).toBe('bg-red-100 text-red-700');
  });

  it("returns amber for 1", () => {
    expect(getPriorityBadgeClass('1')).toBe('bg-amber-100 text-amber-700');
  });

  it("returns blue for 3", () => {
    expect(getPriorityBadgeClass('3')).toBe('bg-blue-100 text-blue-700');
  });

  it("returns purple for 4", () => {
    expect(getPriorityBadgeClass('4')).toBe('bg-purple-100 text-purple-700');
  });

  it("returns slate for 5 and missing", () => {
    expect(getPriorityBadgeClass('5')).toBe('bg-slate-100 text-slate-700');
    expect(getPriorityBadgeClass('')).toBe('bg-slate-100 text-slate-700');
    expect(getPriorityBadgeClass(null)).toBe('bg-slate-100 text-slate-700');
  });

  it("handles lowercase and unknown values", () => {
    expect(getPriorityBadgeClass('0-d')).toBe('bg-red-100 text-red-700');
    expect(getPriorityBadgeClass('7')).toBe('bg-slate-100 text-slate-700');
  });
});

describe("buildPendingCsvRow", () => {
  it("builds a 15-cell row including the observacao", () => {
    const row = buildPendingCsvRow({
      id: 1, local: 'BMA', os: 'OS123', equipamento: 'WM 01', tipo: 'corretiva',
      status: 'pendente', prioridade: '3', data: '2026-07-15', data_planejada: '2026-07-20',
      data_real_inicio: null, data_prevista_conclusao: null, data_concluido: null,
      equipe: 'João', material: 'Filtro AR', localidade: 'Container 1',
      obs: 'Trocar filtro na próxima visita',
    });

    expect(row.length).toBe(15);
    expect(row[0]).toBe('BMA');
    expect(row[1]).toBe('OS123');
    expect(row[4]).toBe('pendente');
    expect(row[5]).toBe('3');
    expect(row[6]).toBe('15/07/2026');
    expect(row[7]).toBe('20/07/2026');
    expect(row[8]).toBe('-');
    expect(row[9]).toBe('-');
    expect(row[10]).toBe('-');
    expect(row[11]).toBe('João');
    expect(row[14]).toBe('Trocar filtro na próxima visita');
  });

  it("quotes fields containing semicolons", () => {
    const row = buildPendingCsvRow({ local: 'BMA;X', status: 'pendente' });
    expect(row[0]).toBe('"BMA;X"');
  });
});
