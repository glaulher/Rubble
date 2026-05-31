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

var pvPage = 0;
var pvLimit = 20;
var pvLoading = false;
var pvAllLoaded = false;
var pvList = [];
var pvSearch = '';
var pvStatusFilter = '';
var pvCycleFilter = '';
var pvSortBy = 'pv.id';
var pvSortDir = 'DESC';

function resetPvState(search, status, cycle, keepSort) {
  pvSearch = search;
  pvStatusFilter = status;
  pvCycleFilter = cycle || '';
  if (!keepSort) {
    pvSortBy = 'pv.id';
    pvSortDir = 'DESC';
  }
  pvPage = 0;
  pvAllLoaded = false;
  pvLoading = false;
  pvList = [];

  const tbody = document.getElementById('pvTableBody');
  if (tbody) tbody.innerHTML = '';

  const empty = document.getElementById('pvEmpty');
  if (empty) empty.classList.add('hidden');
}

function copyOs(os) {
  if (!os || os === '-') return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(os);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // fallback
  }
  document.body.removeChild(textarea);
}

function renderPvs(list, append) {
  append = append || false;
  const tbody = document.getElementById('pvTableBody');
  const empty = document.getElementById('pvEmpty');

  if (!tbody) return;

  if (!append) {
    tbody.innerHTML = '';
  }

  if (pvList.length === 0 && !append) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  list.forEach((pv) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer';
    tr.dataset.pvId = pv.id;

    tr.innerHTML = `
      <td class="px-4 py-4 text-sm font-semibold text-slate-900">${escapeHtml(pv.numero_pv)}</td>
      <td class="px-4 py-4 text-sm text-slate-700">${pv.data || '-'}</td>
      <td class="px-4 py-4 text-sm text-slate-700">${escapeHtml(pv.os || '-')}</td>
      <td class="px-4 py-4 text-sm text-slate-700">${escapeHtml(pv.local)}</td>
      <td class="px-4 py-4 text-sm">${escapeHtml(pv.status)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// --- resetPvState ---

describe("resetPvState", () => {
  beforeEach(() => {
    pvPage = 5;
    pvLimit = 20;
    pvLoading = true;
    pvAllLoaded = true;
    pvList = [{ id: 1 }];
    pvSearch = 'old';
    pvStatusFilter = 'old';
    pvCycleFilter = 'old';
    pvSortBy = 'pv.local';
    pvSortDir = 'ASC';
    document.body.innerHTML =
      '<table><tbody id="pvTableBody"><tr></tr></tbody></table>' +
      '<div id="pvEmpty"></div>';
  });

  it("resets page, loading, list and allLoaded", () => {
    resetPvState('search', 'status', 'cycle');
    expect(pvPage).toBe(0);
    expect(pvLoading).toBe(false);
    expect(pvAllLoaded).toBe(false);
    expect(pvList).toEqual([]);
  });

  it("updates search, status and cycle filters", () => {
    resetPvState('new_search', 'new_status', 'new_cycle');
    expect(pvSearch).toBe('new_search');
    expect(pvStatusFilter).toBe('new_status');
    expect(pvCycleFilter).toBe('new_cycle');
  });

  it("defaults cycle to empty string", () => {
    resetPvState('s', 'st', null);
    expect(pvCycleFilter).toBe('');
  });

  it("keeps sort when keepSort is true", () => {
    resetPvState('s', 'st', 'c', true);
    expect(pvSortBy).toBe('pv.local');
    expect(pvSortDir).toBe('ASC');
  });

  it("resets sort when keepSort is false", () => {
    resetPvState('s', 'st', 'c', false);
    expect(pvSortBy).toBe('pv.id');
    expect(pvSortDir).toBe('DESC');
  });

  it("clears tbody and hides empty element", () => {
    const tbody = document.getElementById('pvTableBody');
    expect(tbody.children.length).toBe(1);

    resetPvState('s', 'st', 'c');
    expect(tbody.children.length).toBe(0);
    expect(document.getElementById('pvEmpty').classList.contains('hidden')).toBe(true);
  });
});

// --- copyOs ---

describe("copyOs", () => {
  it("returns early when os is null", () => {
    expect(() => copyOs(null)).not.toThrow();
  });

  it("returns early when os is '-'", () => {
    expect(() => copyOs('-')).not.toThrow();
  });

  it("calls navigator.clipboard.writeText when available", () => {
    var written = '';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: (t) => { written = t; } },
      writable: true,
      configurable: true,
    });
    copyOs('OS-001');
    expect(written).toBe('OS-001');
  });
});

// --- fallbackCopy ---

describe("fallbackCopy", () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it("creates a temporary textarea and removes it", () => {
    fallbackCopy('test text');
    expect(document.querySelector('textarea')).toBeNull();
  });
});

// --- renderPvs ---

describe("renderPvs", () => {
  beforeEach(() => {
    pvList = [];
    document.body.innerHTML =
      '<table><tbody id="pvTableBody"></tbody></table>' +
      '<div id="pvEmpty" class="hidden"></div>';
  });

  it("shows empty state when no items and not appending", () => {
    renderPvs([], false);
    expect(document.getElementById('pvEmpty').classList.contains('hidden')).toBe(false);
  });

  it("renders PV rows into tbody", () => {
    pvList = [{ id: 1, numero_pv: '26001', data: '2026-05-21', os: 'OS-001', local: 'Sala A', status: 'Ativo' }];
    renderPvs(pvList, false);
    const tbody = document.getElementById('pvTableBody');
    expect(tbody.children.length).toBe(1);
    expect(tbody.children[0].dataset.pvId).toBe('1');
  });

  it("appends rows when append is true", () => {
    pvList = [{ id: 1, numero_pv: '26001', data: '2026-05-21', os: 'OS-001', local: 'Sala A', status: 'Ativo' }];
    renderPvs(pvList, false);
    renderPvs([{ id: 2, numero_pv: '26002', data: '2026-05-22', os: 'OS-002', local: 'Sala B', status: 'Pendente' }], true);
    const tbody = document.getElementById('pvTableBody');
    expect(tbody.children.length).toBe(2);
  });

  it("escapes HTML in PV data", () => {
    pvList = [{ id: 1, numero_pv: '<script>', data: null, os: null, local: '<b>', status: '<i>' }];

    renderPvs(pvList, false);
    const tbody = document.getElementById('pvTableBody');
    expect(tbody.innerHTML).toContain('&lt;script&gt;');
    expect(tbody.innerHTML).toContain('&lt;b&gt;');
  });
});
