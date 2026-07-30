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

var pendingSearch = '';
var pendingStatusFilter = '';
var pendingLastLocal = null;
var pendingLastId = null;
var pendingLoading = false;
var pendingAllLoaded = false;

function resetPendingState(search, status) {
  pendingSearch = search || '';
  pendingStatusFilter = status || '';
  pendingLastLocal = null;
  pendingLastId = null;
  pendingAllLoaded = false;
  pendingLoading = false;

  const tbody = document.getElementById('pendingTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pendingEmpty');
  if (empty) empty.classList.add('hidden');

  const siteSep = document.getElementById('pendingSiteSep');
  if (siteSep) siteSep.classList.add('hidden');
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

  let currentLocal = null;
  var html = '';

  for (var i = 0; i < list.length; i++) {
    var item = list[i];

    if (item.local !== currentLocal) {
      currentLocal = item.local;
      html += '<tr class="site-separator bg-slate-100 dark:bg-slate-800">' +
        '<td colspan="5" class="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">' +
        escapeHtml(currentLocal) + '</td></tr>';
    }

    html += '<tr class="pending-row border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" ' +
      'data-id="' + item.id + '" data-expandable="true">' +
      '<td class="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">' +
      '<span class="expand-icon text-slate-400 mr-2">▶</span>' +
      escapeHtml(item.local) + '</td>' +
      '<td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">' +
      escapeHtml(item.equipamento || '') + '</td>' +
      '<td class="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">' +
      escapeHtml(item.os || '') + '</td>' +
      '<td class="px-4 py-3 text-sm">' +
      '<span class="status-badge px-2 py-0.5 rounded-full text-xs font-medium ' +
      ((item.status || '').toLowerCase() === 'pendente' ? 'bg-red-100 text-red-700' :
       (item.status || '').toLowerCase() === 'planejado' ? 'bg-yellow-100 text-yellow-700' :
       (item.status || '').toLowerCase() === 'em andamento' ? 'bg-blue-100 text-blue-700' :
       'bg-purple-100 text-purple-700') + '">' +
      escapeHtml(item.status) + '</span></td>' +
      '<td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">' +
      escapeHtml(item.data || '') + '</td></tr>';

    html += '<tr class="pending-details hidden" data-detail-for="' + item.id + '">' +
      '<td colspan="5" class="px-4 py-3 bg-slate-50 dark:bg-slate-800/30">' +
      '<div class="grid grid-cols-2 gap-2 text-sm">' +
      '<div><span class="text-slate-500">Observação:</span> ' +
      '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.obs || '-') + '</span></div>' +
      '<div><span class="text-slate-500">Material:</span> ' +
      '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.material || '-') + '</span></div>' +
      '<div><span class="text-slate-500">Equipe:</span> ' +
      '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.equipe || '-') + '</span></div>' +
      '<div><span class="text-slate-500">Localidade:</span> ' +
      '<span class="text-slate-700 dark:text-slate-300">' + escapeHtml(item.localidade || '-') + '</span></div>' +
      '</div></td></tr>';
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    var existing = tbody.querySelector('tr.site-separator, tr.pending-row');
    if (existing) {
      tbody.insertAdjacentHTML('beforeend', html);
    } else {
      tbody.innerHTML = html;
    }
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

function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendente': return 'bg-red-100 text-red-700';
    case 'planejado': return 'bg-yellow-100 text-yellow-700';
    case 'em andamento': return 'bg-blue-100 text-blue-700';
    case 'projeto clean up': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

describe("resetPendingState", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody id="pendingTableBody"><tr><td>old</td></tr></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>' +
      '<div id="pendingSiteSep" class="hidden"></div>';
  });

  it("clears state and DOM", () => {
    pendingLoading = true;
    pendingAllLoaded = true;
    pendingLastLocal = 'BMA';
    resetPendingState('', '');

    expect(pendingSearch).toBe('');
    expect(pendingStatusFilter).toBe('');
    expect(pendingLastLocal).toBeNull();
    expect(pendingAllLoaded).toBe(false);
    expect(pendingLoading).toBe(false);
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
    { id: 1, local: 'BMA', equipamento: 'WM 01', os: 'OS123', status: 'pendente', data: '15/07/2026', obs: 'Filtro sujo', material: 'Filtro AR', equipe: 'João', localidade: 'Container 1' },
    { id: 2, local: 'BMA', equipamento: 'WM 02', os: 'OS456', status: 'planejado', data: '16/07/2026', obs: 'Troca óleo', material: 'Óleo 5W30', equipe: 'Maria', localidade: 'Container 1' },
    { id: 3, local: 'RJO', equipamento: 'CH 01', os: 'OS789', status: 'pendente', data: '14/07/2026', obs: 'Vazamento', material: 'Vedação', equipe: 'José', localidade: 'Sala 5' },
  ];

  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody id="pendingTableBody"></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>';
  });

  it("renders rows grouped by site", () => {
    renderPendingTable(mockData);

    const rows = document.querySelectorAll('tr.pending-row');
    expect(rows.length).toBe(3);

    const separators = document.querySelectorAll('tr.site-separator');
    expect(separators.length).toBe(2);

    // BMA group first
    expect(separators[0].textContent).toContain('BMA');

    // First 2 rows belong to BMA (icon + text in first td)
    expect(rows[0].querySelectorAll('td')[0].textContent).toContain('BMA');
    expect(rows[1].querySelectorAll('td')[0].textContent).toContain('BMA');

    // RJO group second
    expect(separators[1].textContent).toContain('RJO');
    expect(rows[2].querySelectorAll('td')[0].textContent).toContain('RJO');
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
    });
  });

  it("includes observacao, material, equipe and localidade in details", () => {
    renderPendingTable([mockData[0]]);

    const detail = document.querySelector('tr.pending-details');
    expect(detail.textContent).toContain('Filtro sujo');
    expect(detail.textContent).toContain('Filtro AR');
    expect(detail.textContent).toContain('João');
    expect(detail.textContent).toContain('Container 1');
  });
});

describe("toggleRow", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<table><tbody>' +
      '<tr class="pending-row border-b cursor-pointer" data-id="1" data-expandable="true">' +
      '<td><span class="expand-icon text-slate-400 mr-2">▶</span>BMA</td>' +
      '<td>WM 01</td><td>OS123</td><td><span class="status-badge">pendente</span></td><td>15/07</td>' +
      '</tr>' +
      '<tr class="pending-details hidden" data-detail-for="1"><td colspan="5">Details</td></tr>' +
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
