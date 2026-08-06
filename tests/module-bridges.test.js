import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

var mockInfiniteScroll = `
  function createInfiniteScroll(opts) {
    return {
      init: function () { if (opts.fetchFn) opts.fetchFn({ limit: 20, offset: 0, data: [] }, {}); return this; },
      destroy: function () {},
      reset: function () { return this; },
      load: function () {},
      getState: function () { return { data: [], page: 0, allLoaded: false, loading: false, total: 0 }; },
    };
  }
  function debounce(fn, delay) { var t; return function () { clearTimeout(t); t = setTimeout(fn, delay); }; }
`;

function evalModule(path, extraCode) {
  var code = readFileSync(resolve(__dirname, path), 'utf-8');
  // Strip BOM if present
  if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
  var importStripped = code.replace(/^import .+$/gm, '');
  // strict mode eval prevents function declaration hoisting to globalThis,
  // simulating ES module scope where only explicit globalThis.X = X bridges leak
  (0, eval)('"use strict"; ' + importStripped + '\n' + extraCode);
}

describe("equipment/list.js bridge", function () {
  it("sets globalThis.initEquipmentManager at module load time (not inside fetchFn)", function () {
    delete globalThis.initEquipmentManager;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/equipment/list.js', '');
    expect(typeof globalThis.initEquipmentManager).toBe("function");
  });
});

describe("home-ui.js bridges", function () {
  it("sets globalThis.initHome at module load time", function () {
    delete globalThis.initHome;
    delete globalThis.initPv;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/home/home-ui.js', '');
    expect(typeof globalThis.initHome).toBe("function");
  });

  it("sets globalThis.render at module load time", function () {
    expect(typeof globalThis.render).toBe("function");
  });

  it("sets globalThis.syncHomeCards at module load time", function () {
    expect(typeof globalThis.syncHomeCards).toBe("function");
  });

  it("sets globalThis.hubRecase at module load time", function () {
    expect(typeof globalThis.hubRecase).toBe("function");
  });
});

describe("pv/list.js bridges", function () {
  it("sets globalThis.initPv at module load time", function () {
    delete globalThis.initPv;
    delete globalThis.resetPvState;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pv/list.js', '');
    expect(typeof globalThis.initPv).toBe("function");
  });

  it("sets globalThis.pvSearch (single prefix, not globalThis.globalThis.pvSearch)", function () {
    // globalThis.globalThis.pvSearch works by accident but is redundant
    // The canonical form should be globalThis.pvSearch
    expect(typeof globalThis.pvSearch).toBe("string");
  });
});

describe("scm/list.js bridge", function () {
  it("sets globalThis.initScm at module load time", function () {
    delete globalThis.initScm;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/scm/scm-list.js', '');
    expect(typeof globalThis.initScm).toBe("function");
  });
});

describe("preventive-cycle/list.js bridge", function () {
  it("sets globalThis.initPreventiveCycle at module load time", function () {
    delete globalThis.initPreventiveCycle;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js', '');
    expect(typeof globalThis.initPreventiveCycle).toBe("function");
  });
});

describe("pending-tickets/list.js bridge", function () {
  it("sets globalThis.initPendingTickets at module load time", function () {
    delete globalThis.initPendingTickets;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '');
    expect(typeof globalThis.initPendingTickets).toBe("function");
  });

  it("clears the tbody when a sortable header is clicked", function () {
    delete globalThis.initPendingTickets;
    document.body.innerHTML =
      '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr>' +
      '<th data-sort="e.local">Site <span class="sort-icon"></span></th>' +
      '<th data-sort="r.os">OS <span class="sort-icon"></span></th>' +
      '</tr></thead>' +
      '<tbody id="pendingTableBody"><tr class="pending-row"><td>old</td></tr></tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" />' +
      '<div id="pendingEmpty" class="hidden"></div>';

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '\nfunction escapeHtml(v) { return String(v); }\n');

    globalThis.initPendingTickets();

    var th = document.querySelector('#pendingTable th[data-sort="r.os"]');
    th.click();

    expect(document.querySelectorAll('#pendingTableBody tr.pending-row').length).toBe(0);
    expect(globalThis.buildPendingSortQuery()).toBe('&sort_by=r.os&sort_dir=ASC');
  });

  it("hides a column when its checkbox is unchecked in the column dropdown", function () {
    delete globalThis.initPendingTickets;
    document.body.innerHTML =
      '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr>' +
      '<th data-sort="e.local" data-col="local">Site</th>' +
      '<th data-sort="r.os" data-col="os">OS</th>' +
      '<th data-sort="e.equipamento" data-col="equipamento">Equipamento</th>' +
      '</tr></thead>' +
      '<tbody id="pendingTableBody">' +
      '<tr class="pending-row"><td data-col="local">BMA</td><td data-col="os">OS123</td><td data-col="equipamento">WM 01</td></tr>' +
      '</tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" />' +
      '<div id="pendingEmpty" class="hidden"></div>' +
      '<div id="pendingColContainer">' +
      '<button type="button" id="pendingColBtn"><span id="pendingColLabel">Todas</span></button>' +
      '<div id="pendingColDropdown"></div>' +
      '</div>';

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '\nfunction escapeHtml(v) { return String(v); }\n');

    globalThis.initPendingTickets();

    var osCheckbox = document.querySelector('#pendingColDropdown input[data-value="os"]');
    osCheckbox.checked = false;
    osCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('th[data-col="os"]').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('td[data-col="os"]').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('th[data-col="local"]').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('td[data-col="equipamento"]').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('pendingColLabel').textContent).toBe('1 oculta(s)');

    var allCheckbox = document.querySelector('#pendingColDropdown input[data-value="__all__"]');
    allCheckbox.checked = true;
    allCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('th[data-col="os"]').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('td[data-col="os"]').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('pendingColLabel').textContent).toBe('Todas');
  });

  it("clears the search input on click when non-empty", function () {
    delete globalThis.initPendingTickets;
    document.body.innerHTML =
      '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr><th data-sort="e.local">Site</th></tr></thead>' +
      '<tbody id="pendingTableBody"><tr class="pending-row"><td>old</td></tr></tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" value="BMA" />' +
      '<div id="pendingEmpty" class="hidden"></div>';

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '\nfunction escapeHtml(v) { return String(v); }\n');

    globalThis.initPendingTickets();

    var searchInput = document.getElementById('pendingSearchInput');
    searchInput.value = 'BMA';
    searchInput.click();

    expect(searchInput.value).toBe('');
    expect(document.querySelectorAll('#pendingTableBody tr.pending-row').length).toBe(0);
  });

  it("wraps the value and edit pencil in an inline-flex cell", function () {
    var code = readFileSync(resolve(__dirname, '../public/js/pending-tickets/list.js'), 'utf-8');
    if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
    var importStripped = code.replace(/^import .+$/gm, '');

    document.body.innerHTML =
      '<table id="pendingTable">' +
      '<thead><tr><th data-col="status">Status</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>';

    (0, eval)(mockInfiniteScroll);
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      (0, eval)(
        importStripped +
          '\nfunction escapeHtml(v) { return String(v); }\n' +
          'function formatDate(v) { return v || ""; }\n'
      );

      globalThis.renderPendingTable(
        [
          {
            id: 1,
            local: 'BMA',
            os: 'OS1',
            equipamento: 'WM 01',
            localidade: 'Container 1',
            tipo: 'corretiva',
            status: 'pendente',
            data: '2026-01-01',
            data_planejada: null,
            data_real_inicio: null,
            data_prevista_conclusao: null,
            data_concluido: null,
            equipe: '',
            material: '',
            obs: 'obs',
          },
        ],
        false
      );

      var statusCell = document.querySelector('#pendingTableBody td[data-col="status"]');
      var wrapper = statusCell.querySelector(':scope > span.inline-flex');
      expect(wrapper).not.toBe(null);
      expect(wrapper.querySelector('.pending-value')).not.toBe(null);
      expect(wrapper.querySelector('button.pending-edit')).not.toBe(null);
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  function pendingModuleCode() {
    var code = readFileSync(resolve(__dirname, '../public/js/pending-tickets/list.js'), 'utf-8');
    if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
    return code.replace(/^import .+$/gm, '');
  }

  var PENDING_HELPERS =
    '\nfunction escapeHtml(v) { return String(v); }\n' +
    'function formatDate(v) { return v || ""; }\n' +
    'function sanitizeCSV(v) { if (v === null || v === undefined) return ""; var s = String(v); return /[;"\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s; }\n';

  it("maps priority values to Rubble badge colors", function () {
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);
      expect(globalThis.getPriorityBadgeClass('0')).toBe('bg-red-100 text-red-700');
      expect(globalThis.getPriorityBadgeClass('0-D')).toBe('bg-red-100 text-red-700');
      expect(globalThis.getPriorityBadgeClass('0-E')).toBe('bg-red-100 text-red-700');
      expect(globalThis.getPriorityBadgeClass('1')).toBe('bg-amber-100 text-amber-700');
      expect(globalThis.getPriorityBadgeClass('3')).toBe('bg-blue-100 text-blue-700');
      expect(globalThis.getPriorityBadgeClass('4')).toBe('bg-purple-100 text-purple-700');
      expect(globalThis.getPriorityBadgeClass('5')).toBe('bg-slate-100 text-slate-700');
      expect(globalThis.getPriorityBadgeClass('')).toBe('bg-slate-100 text-slate-700');
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("renders the prioridade cell with badge and pencil", function () {
    document.body.innerHTML =
      '<table id="pendingTable">' +
      '<thead><tr><th data-col="prioridade">Prioridade</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>';

    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.renderPendingTable(
        [
          {
            id: 1,
            local: 'BMA',
            os: 'OS1',
            equipamento: 'WM',
            localidade: 'C1',
            tipo: 'corretiva',
            status: 'pendente',
            prioridade: '0-D',
            data: null,
            data_planejada: null,
            data_real_inicio: null,
            data_prevista_conclusao: null,
            data_concluido: null,
            equipe: '',
            material: '',
            obs: 'obs',
          },
        ],
        false
      );

      var cell = document.querySelector('#pendingTableBody td[data-col="prioridade"]');
      expect(cell).not.toBe(null);
      var badge = cell.querySelector('.priority-badge');
      expect(badge).not.toBe(null);
      expect(badge.textContent.trim()).toBe('0-D');
      expect(badge.className).toContain('bg-red-100');
      expect(cell.querySelector('button.pending-edit')).not.toBe(null);
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("includes prioridade in the CSV row after status", function () {
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      var row = globalThis.buildPendingCsvRow({
        local: 'BMA',
        os: 'OS1',
        equipamento: 'WM',
        localidade: 'C1',
        tipo: 'corretiva',
        status: 'pendente',
        prioridade: '3',
        data: '2026-07-15',
        data_planejada: null,
        data_real_inicio: null,
        data_prevista_conclusao: null,
        data_concluido: null,
        equipe: '',
        material: '',
      });

      expect(row.length).toBe(14);
      expect(row[5]).toBe('pendente');
      expect(row[6]).toBe('3');
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });
});

describe("planned-activity/list.js bridge", function () {
  it("sets globalThis.initPlannedActivity at module load time", function () {
    delete globalThis.initPlannedActivity;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', '');
    expect(typeof globalThis.initPlannedActivity).toBe("function");
  });
});
