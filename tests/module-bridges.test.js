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

  it("renders the status multi-select with the concluded option and updates query", function () {
    delete globalThis.initPendingTickets;
    document.body.innerHTML =
      '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr><th data-sort="e.local">Site</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" />' +
      '<div id="pendingEmpty" class="hidden"></div>' +
      '<div id="pendingStatusContainer">' +
      '<button type="button" id="pendingStatusBtn"><span id="pendingStatusLabel">Todos</span></button>' +
      '<div id="pendingStatusDropdown"></div>' +
      '</div>';

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '\nfunction escapeHtml(v) { return String(v); }\n');

    globalThis.initPendingTickets();

    var checkboxes = document.querySelectorAll('#pendingStatusDropdown input.pending-status-check');
    expect(checkboxes.length).toBe(6);
    var concluidoCb = document.querySelector('#pendingStatusDropdown input[data-value="concluído"]');
    expect(concluidoCb).not.toBe(null);

    concluidoCb.checked = true;
    concluidoCb.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('pendingStatusLabel').textContent).toBe('1 selecionado(s)');
    expect(globalThis.buildPendingQuery()).toContain('status=conclu%C3%ADdo');
  });

  it("unchecks all status options when Todos is unchecked", function () {
    delete globalThis.initPendingTickets;
    document.body.innerHTML =
      '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr><th data-sort="e.local">Site</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" />' +
      '<div id="pendingEmpty" class="hidden"></div>' +
      '<div id="pendingStatusContainer">' +
      '<button type="button" id="pendingStatusBtn"><span id="pendingStatusLabel">Todos</span></button>' +
      '<div id="pendingStatusDropdown"></div>' +
      '</div>';

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/pending-tickets/list.js', '\nfunction escapeHtml(v) { return String(v); }\n');

    globalThis.initPendingTickets();

    var todosCb = document.querySelector('#pendingStatusDropdown input[data-value="__all__"]');
    todosCb.checked = false;
    todosCb.dispatchEvent(new Event('change', { bubbles: true }));

    var individualCbs = document.querySelectorAll('#pendingStatusDropdown input.pending-status-check:not([data-value="__all__"])');
    for (var i = 0; i < individualCbs.length; i++) {
      expect(individualCbs[i].checked).toBe(false);
    }
    expect(document.getElementById('pendingStatusLabel').textContent).toBe('0 selecionado(s)');
    expect(globalThis.buildPendingQuery()).toContain('status=__none__');

    var pendenteCb = document.querySelector('#pendingStatusDropdown input[data-value="pendente"]');
    pendenteCb.checked = true;
    pendenteCb.dispatchEvent(new Event('change', { bubbles: true }));
    var planejadoCb = document.querySelector('#pendingStatusDropdown input[data-value="planejado"]');
    planejadoCb.checked = true;
    planejadoCb.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('pendingStatusLabel').textContent).toBe('2 selecionado(s)');
    expect(globalThis.buildPendingQuery()).toContain('status=pendente,planejado');
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
            data_pv_enviada: null,
            data_pv_aprovada: null,
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

  it("includes prioridade in the CSV row after step and responsavel", function () {
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
        step: 'Compra Claro',
        responsavel: 'Claro',
        prioridade: '3',
        data: '2026-07-15',
        data_pv_enviada: null,
        data_pv_aprovada: null,
        data_planejada: null,
        data_real_inicio: null,
        data_prevista_conclusao: null,
        data_concluido: null,
        equipe: '',
        material: '',
        obs: 'Cliente sem acesso no horário',
      });

      expect(row.length).toBe(19);
      expect(row[4]).toBe('corretiva');
      expect(row[5]).toBe('pendente');
      expect(row[6]).toBe('Compra Claro');
      expect(row[7]).toBe('Claro');
      expect(row[8]).toBe('3');
      expect(row[18]).toBe('Cliente sem acesso no horário');
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("builds a query string that includes the os filter", function () {
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.pendingSearch = 'BMA';
      globalThis.pendingStatusFilter = new Set(['pendente']);
      globalThis.pendingStatusTodosChecked = false;
      globalThis.pendingOsFilter = 'OS123';
      globalThis.pendingSortBy = 'r.os';
      globalThis.pendingSortDir = 'DESC';

      var q = globalThis.buildPendingQuery();

      expect(q).toContain('search=BMA');
      expect(q).toContain('status=pendente');
      expect(q).toContain('os=OS123');
      expect(q).toContain('sort_by=r.os');
      expect(q).toContain('sort_dir=DESC');
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("sends the os filter in the fetch request", function () {
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      document.body.innerHTML =
        '<div id="pendingScrollContainer">' +
        '<table id="pendingTable">' +
        '<thead><tr><th data-sort="e.local">Site</th></tr></thead>' +
        '<tbody id="pendingTableBody"></tbody>' +
        '</table>' +
        '<div id="pendingSentinel"></div>' +
        '</div>' +
        '<input id="pendingSearchInput" />' +
        '<div id="pendingEmpty" class="hidden"></div>';

      var captured = [];
      globalThis.apiFetch = function (url, opts) {
        captured.push(url);
        return Promise.resolve({
          json: function () { return { success: true, data: { items: [], total: 0 } }; },
        });
      };

      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.initPendingTickets();
      globalThis.pendingOsFilter = 'OS123';
      globalThis._pendingReset();

      expect(captured.length).toBeGreaterThan(0);
      expect(captured[captured.length - 1]).toContain('os=OS123');
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("renders the observacao value with an edit pencil in the details row", function () {
    document.body.innerHTML =
      '<table id="pendingTable"><tbody id="pendingTableBody"></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>';

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
            prioridade: '0',
            data: null,
            data_planejada: null,
            data_real_inicio: null,
            data_prevista_conclusao: null,
            data_concluido: null,
            equipe: '',
            material: '',
            obs: 'Filtro sujo',
          },
        ],
        false
      );

      var wrap = document.querySelector('tr.pending-details .obs-wrap');
      expect(wrap).not.toBe(null);
      expect(wrap.querySelector('.obs-value').textContent.trim()).toBe('Filtro sujo');
      expect(wrap.querySelector('button.pending-edit[data-field="obs"]')).not.toBe(null);
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("enters and cancels obs editing preserving the original value", function () {
    document.body.innerHTML =
      '<table id="pendingTable"><tbody id="pendingTableBody"></tbody></table>' +
      '<div id="pendingEmpty" class="hidden"></div>';

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
            prioridade: '0',
            data: null,
            data_planejada: null,
            data_real_inicio: null,
            data_prevista_conclusao: null,
            data_concluido: null,
            equipe: '',
            material: '',
            obs: 'Trocar filtro',
          },
        ],
        false
      );

      var wrap = document.querySelector('tr.pending-details .obs-wrap');
      globalThis.enterPendingObsEdit(wrap);
      expect(wrap.querySelector('textarea.pending-edit-input')).not.toBe(null);
      expect(wrap.querySelector('textarea.pending-edit-input').value).toBe('Trocar filtro');
      expect(wrap.querySelector('button.pending-save')).not.toBe(null);
      expect(wrap.querySelector('button.pending-cancel')).not.toBe(null);

      globalThis.cancelPendingObs(wrap);
      expect(wrap.querySelector('.obs-value').textContent.trim()).toBe('Trocar filtro');
      expect(wrap.querySelector('button.pending-edit[data-field="obs"]')).not.toBe(null);
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("renders a plan action button for admin/coordenador", function () {
    var prevGetUser = globalThis.getUser;
    var prevIconButtonHtml = globalThis.iconButtonHtml;
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    globalThis.getUser = function () { return { role: 'admin' }; };
    globalThis.iconButtonHtml = function (type, tooltip, attrs, tooltipPos) {
      var a = '';
      for (var k in attrs) a += ' ' + k + '="' + attrs[k] + '"';
      return '<button data-icon-type="' + type + '" data-tooltip="' + tooltip + '" data-tooltip-pos="' + tooltipPos + '"' + a + '></button>';
    };
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      var html = globalThis.pendingPlanActionHtml({ id: 9 });
      expect(html).toContain('data-action="plan"');
      expect(html).toContain('data-plan-id="9"');
      expect(html).toContain('Planejar');

      globalThis.getUser = function () { return { role: 'coordenador' }; };
      html = globalThis.pendingPlanActionHtml({ id: 10 });
      expect(html).toContain('data-action="plan"');
      expect(html).toContain('data-plan-id="10"');
    } finally {
      if (prevGetUser === undefined) delete globalThis.getUser;
      else globalThis.getUser = prevGetUser;
      if (prevIconButtonHtml === undefined) delete globalThis.iconButtonHtml;
      else globalThis.iconButtonHtml = prevIconButtonHtml;
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("renders an empty actions cell for roles without permission", function () {
    var prevGetUser = globalThis.getUser;
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    globalThis.getUser = function () { return { role: 'supervisor' }; };
    try {
      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      var html = globalThis.pendingPlanActionHtml({ id: 9 });
      expect(html).toBe('<td class="px-3 py-2.5 text-sm"></td>');
    } finally {
      if (prevGetUser === undefined) delete globalThis.getUser;
      else globalThis.getUser = prevGetUser;
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("prepends an actions cell to each pending row (17 columns)", function () {
    document.body.innerHTML =
      '<table id="pendingTable">' +
      '<thead><tr><th data-col="local">Site</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>';

    var prevGetUser = globalThis.getUser;
    var prevIconButtonHtml = globalThis.iconButtonHtml;
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    globalThis.getUser = function () { return { role: 'admin' }; };
    globalThis.iconButtonHtml = function (type, tooltip, attrs) {
      return '<button data-action="plan" data-plan-id="' + (attrs['data-plan-id'] || '') + '"></button>';
    };
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
            prioridade: '0',
            data: null,
            data_pv_enviada: null,
            data_pv_aprovada: null,
            data_planejada: null,
            data_real_inicio: null,
            data_prevista_conclusao: null,
            data_concluido: null,
            equipe: '',
            material: '',
            obs: 'x',
          },
        ],
        false
      );

      var row = document.querySelector('#pendingTableBody tr.pending-row');
      var cells = row.querySelectorAll('td');
      expect(cells.length).toBe(19);
      expect(cells[0].querySelector('button[data-action="plan"]')).not.toBe(null);
    } finally {
      if (prevGetUser === undefined) delete globalThis.getUser;
      else globalThis.getUser = prevGetUser;
      if (prevIconButtonHtml === undefined) delete globalThis.iconButtonHtml;
      else globalThis.iconButtonHtml = prevIconButtonHtml;
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  function pendingRowsHtml() {
    return '<div id="pendingScrollContainer">' +
      '<table id="pendingTable">' +
      '<thead><tr><th data-sort="e.local" data-col="local">Site</th><th data-sort="r.os" data-col="os">OS</th><th data-col="equipamento">Equipamento</th></tr></thead>' +
      '<tbody id="pendingTableBody"></tbody>' +
      '</table>' +
      '<div id="pendingSentinel"></div>' +
      '</div>' +
      '<input id="pendingSearchInput" />' +
      '<div id="pendingEmpty" class="hidden"></div>';
  }

  var PENDING_ROW = {
    id: 1,
    local: 'BMA',
    os: 'OS123',
    equipamento: 'WM 01',
    localidade: 'Container 1',
    tipo: 'corretiva',
    status: 'pendente',
    prioridade: '0',
    data: null,
    data_pv_enviada: null,
    data_pv_aprovada: null,
    data_planejada: null,
    data_real_inicio: null,
    data_prevista_conclusao: null,
    data_concluido: null,
    equipe: '',
    material: '',
    obs: 'Filtro sujo',
  };

  it("renders the OS cell as a copy-os span with hover classes", function () {
    var prevGetUser = globalThis.getUser;
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    globalThis.getUser = function () { return { role: 'admin' }; };
    try {
      document.body.innerHTML =
        '<table id="pendingTable"><tbody id="pendingTableBody"></tbody></table>' +
        '<div id="pendingEmpty" class="hidden"></div>';

      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.renderPendingTable([PENDING_ROW], false);

      var osCell = document.querySelector('#pendingTableBody td[data-col="os"]');
      var span = osCell.querySelector('[data-action="copy-os"]');
      expect(span).not.toBe(null);
      expect(span.getAttribute('data-os')).toBe('OS123');
      expect(span.firstChild.textContent.trim()).toBe('OS123');
      expect(span.getAttribute('title')).toBe(null);
      expect(span.className).toContain('cursor-pointer');
      expect(span.className).toContain('hover:text-blue-600');
      expect(span.className).toContain('hover:underline');
      var tooltip = span.querySelector('.scale-0');
      expect(tooltip).not.toBe(null);
      expect(tooltip.textContent.trim()).toBe('Clique para copiar');
    } finally {
      if (prevGetUser === undefined) delete globalThis.getUser;
      else globalThis.getUser = prevGetUser;
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("toggles the details row only on arrow or site cell click", function () {
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    try {
      document.body.innerHTML = pendingRowsHtml();
      globalThis.apiFetch = function () {
        return Promise.resolve({ json: function () { return { success: true, data: { items: [], total: 0 } }; } });
      };

      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.renderPendingTable([PENDING_ROW], false);
      globalThis.initPendingTickets();

      var detail = document.querySelector('tr.pending-details');
      var equipCell = document.querySelector('#pendingTableBody td[data-col="equipamento"]');
      equipCell.click();
      expect(detail.classList.contains('hidden')).toBe(true);

      var siteCell = document.querySelector('#pendingTableBody td[data-col="local"]');
      siteCell.click();
      expect(detail.classList.contains('hidden')).toBe(false);

      var arrow = document.querySelector('#pendingTableBody .expand-icon');
      arrow.click();
      expect(detail.classList.contains('hidden')).toBe(true);
    } finally {
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });

  it("copies the OS on click without toggling the details row", async function () {
    var prevShowToast = globalThis.showToast;
    var prevEscapeHtml = globalThis.escapeHtml;
    var prevFormatDate = globalThis.formatDate;
    var written = '';
    globalThis.showToast = function () {};
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: function (t) { written = t; return Promise.resolve(); } },
      writable: true,
      configurable: true,
    });
    try {
      document.body.innerHTML = pendingRowsHtml();
      globalThis.apiFetch = function () {
        return Promise.resolve({ json: function () { return { success: true, data: { items: [], total: 0 } }; } });
      };

      (0, eval)(mockInfiniteScroll);
      (0, eval)(pendingModuleCode() + PENDING_HELPERS);

      globalThis.renderPendingTable([PENDING_ROW], false);
      globalThis.initPendingTickets();

      var osSpan = document.querySelector('#pendingTableBody [data-action="copy-os"]');
      osSpan.click();
      await new Promise(function (r) { setTimeout(r, 0); });
      expect(written).toBe('OS123');

      var detail = document.querySelector('tr.pending-details');
      expect(detail.classList.contains('hidden')).toBe(true);
    } finally {
      if (prevShowToast === undefined) delete globalThis.showToast;
      else globalThis.showToast = prevShowToast;
      delete globalThis.navigator.clipboard;
      if (prevEscapeHtml === undefined) delete globalThis.escapeHtml;
      else globalThis.escapeHtml = prevEscapeHtml;
      if (prevFormatDate === undefined) delete globalThis.formatDate;
      else globalThis.formatDate = prevFormatDate;
    }
  });
});

describe("filter-exchanges/list.js bridge", function () {
  it("sets globalThis.initFilterExchanges at module load time", function () {
    delete globalThis.initFilterExchanges;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/filter-exchanges/list.js', '');
    expect(typeof globalThis.initFilterExchanges).toBe("function");
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
