import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

var mockInfiniteScroll = `
  function createInfiniteScroll(opts) {
    return {
      init: function () {
        var self = this;
        if (opts.fetchFn) {
          var p = opts.fetchFn({ limit: 20, offset: 0, data: [] }, {});
          if (p && typeof p.then === 'function') {
            p.then(function (result) {
              if (result && result.data && opts.renderFullFn) {
                opts.renderFullFn(result.data, result.total || 0);
              }
              if (opts.afterLoadFn) {
                opts.afterLoadFn({ page: 0, total: result ? result.total : 0, data: result ? result.data : [], allLoaded: false, isPolling: false });
              }
            });
          }
        }
        return this;
      },
      destroy: function () {},
      reset: function () { return this; },
      load: function () {},
      getState: function () { return { data: [], page: 0, allLoaded: false, loading: false, total: 0 }; },
    };
  }
  function debounce(fn, delay) { var t; return function () { clearTimeout(t); t = setTimeout(fn, delay); }; }
`;

var FE_HELPERS =
  '\nfunction escapeHtml(v) { if (v === null || v === undefined) return ""; return String(v); }\n' +
  'function formatDate(v) { return v || ""; }\n' +
  'function sanitizeCSV(v) { if (v === null || v === undefined) return ""; var s = String(v); return /[;"\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s; }\n' +
  'function formatCurrency(v) { if (v === null || v === undefined) return ""; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }\n';

function feModuleCode() {
  var code = readFileSync(resolve(__dirname, '../public/js/filter-exchanges/list.js'), 'utf-8');
  if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
  return code.replace(/^import .+$/gm, '').replace(/^export /gm, '');
}

function feTableMarkup() {
  return (
    '<div id="filterScrollContainer">' +
    '<table id="filterTable">' +
    '<thead><tr>' +
    '<th data-sort="f.local" data-col="local">Local</th>' +
    '<th data-sort="f.equipamento" data-col="equipamento">Equipamento</th>' +
    '<th data-sort="f.tamanho" data-col="tamanho">Tamanho</th>' +
    '<th data-sort="f.qtd" data-col="qtd">Qtd</th>' +
    '<th data-sort="f.os" data-col="os">OS</th>' +
    '<th data-sort="f.data_troca" data-col="data_troca">Troca</th>' +
    '<th data-sort="f.data_proxima_troca" data-col="data_proxima_troca">Pr\u00f3xima</th>' +
    '<th data-col="status">Status</th>' +
    '</tr></thead>' +
    '<tbody id="filterTableBody"></tbody>' +
    '</table>' +
    '<div id="filterSentinel"></div>' +
    '</div>' +
    '<input id="filterSearchInput" />' +
    '<div id="filterEmpty" class="hidden"></div>' +
    '<div id="filterColContainer">' +
    '<button type="button" id="filterColBtn"><span id="filterColLabel">Todas</span></button>' +
    '<div id="filterColDropdown"></div>' +
    '</div>' +
    '<div id="filterBadge"></div>'
  );
}

function setupFe() {
  document.body.innerHTML = feTableMarkup();
  globalThis.apiFetch = function () {
    return Promise.resolve({
      json: function () { return { success: true, data: { items: [], total: 0 } }; },
    });
  };
  (0, eval)(mockInfiniteScroll);
  (0, eval)(feModuleCode() + FE_HELPERS);
}

describe("filter-exchanges/list.js bridge", function () {
  beforeEach(function () {
    delete globalThis.initFilterExchanges;
    delete globalThis.initFilters;
  });

  it("sets globalThis.initFilterExchanges at module load time", function () {
    setupFe();
    expect(typeof globalThis.initFilterExchanges).toBe("function");
  });

  it("sets globalThis.initFilters as alias at module load time", function () {
    setupFe();
    expect(typeof globalThis.initFilters).toBe("function");
  });

  it("renders a row with local, equipamento, tamanho, qtd, os and dates", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '510X390X25mm',
        qtd: 4,
        os: 'OS123',
        data_troca: '2026-07-15',
        data_proxima_troca: '2026-11-15',
        status: 'planejado',
      },
    ], false);

    var tr = document.querySelector('#filterTableBody tr.filter-row');
    expect(tr).not.toBe(null);
    expect(tr.querySelector('td[data-col="local"] .filter-value').textContent.trim()).toBe('RSDDTC');
    expect(tr.querySelector('td[data-col="equipamento"] .filter-value').textContent.trim()).toBe('WM');
    expect(tr.querySelector('td[data-col="tamanho"] .filter-value').textContent.trim()).toBe('510X390X25mm');
    expect(tr.querySelector('td[data-col="qtd"] .filter-value').textContent.trim()).toBe('4');
    expect(tr.querySelector('td[data-col="os"] .filter-value').textContent.trim()).toBe('OS123');
    expect(tr.querySelector('td[data-col="data_troca"] .filter-value').textContent.trim()).toBe('15/07/2026');
    expect(tr.querySelector('td[data-col="data_proxima_troca"] .filter-value').textContent.trim()).toBe('15/11/2026');
  });

  it("wraps the value and edit pencil in an inline-flex cell for editable columns", function () {
    document.body.innerHTML = feTableMarkup();
    globalThis.getUser = function () { return { role: 'admin' }; };
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '510X390X25mm',
        qtd: 4,
        os: null,
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var osCell = document.querySelector('#filterTableBody td[data-col="os"]');
    expect(osCell.querySelector(':scope > span.inline-flex')).not.toBe(null);
    expect(osCell.querySelector('button.filter-edit')).not.toBe(null);

    var tamanhoCell = document.querySelector('#filterTableBody td[data-col="tamanho"]');
    expect(tamanhoCell.querySelector('button.filter-edit')).not.toBe(null);
    expect(tamanhoCell.querySelector(':scope > span.inline-flex')).not.toBe(null);

    var qtdCell = document.querySelector('#filterTableBody td[data-col="qtd"]');
    expect(qtdCell.querySelector('button.filter-edit')).not.toBe(null);
    expect(qtdCell.querySelector(':scope > span.inline-flex')).not.toBe(null);

    var localCell = document.querySelector('#filterTableBody td[data-col="local"]');
    expect(localCell.querySelector('button.filter-edit')).toBe(null);

    var nextCell = document.querySelector('#filterTableBody td[data-col="data_proxima_troca"]');
    expect(nextCell.querySelector('button.filter-edit')).toBe(null);
    expect(nextCell.querySelector(':scope > span.inline-flex')).toBe(null);

    delete globalThis.getUser;
  });

  it("does not render an edit pencil for the status column", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: null,
        data_troca: null,
        data_proxima_troca: null,
        status: 'concluído',
      },
    ], false);

    var statusCell = document.querySelector('#filterTableBody td[data-col="status"]');
    expect(statusCell.querySelector('button.filter-edit')).toBe(null);
    expect(statusCell.querySelector('.status-badge')).not.toBe(null);
  });

  it("maps status values to badge classes", function () {
    setupFe();
    expect(globalThis.getFilterStatusBadgeClass('pendente')).toBe('bg-red-100 text-red-700');
    expect(globalThis.getFilterStatusBadgeClass('planejado')).toBe('bg-amber-100 text-amber-700');
    expect(globalThis.getFilterStatusBadgeClass('concluído')).toBe('bg-emerald-100 text-emerald-700');
  });

  it("enters inline edit for a text column (os)", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: 'OS1',
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var osCell = document.querySelector('#filterTableBody td[data-col="os"]');
    globalThis.enterFilterEdit(osCell, 'os');
    expect(osCell.querySelector('input.filter-edit-input')).not.toBe(null);
    expect(osCell.querySelector('input.filter-edit-input').value).toBe('OS1');
    expect(osCell.querySelector('button.filter-save')).not.toBe(null);
    expect(osCell.querySelector('button.filter-cancel')).not.toBe(null);
  });

  it("enters inline edit for a date column (data_troca)", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: null,
        data_troca: '2026-07-15',
        data_proxima_troca: '2026-11-15',
        status: 'planejado',
      },
    ], false);

    var cell = document.querySelector('#filterTableBody td[data-col="data_troca"]');
    globalThis.enterFilterEdit(cell, 'data_troca');
    expect(cell.querySelector('input[type="date"].filter-edit-input')).not.toBe(null);
    expect(cell.querySelector('input[type="date"].filter-edit-input').value).toBe('2026-07-15');
  });

  it("cancels inline edit preserving original value", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: 'OS1',
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var osCell = document.querySelector('#filterTableBody td[data-col="os"]');
    globalThis.enterFilterEdit(osCell, 'os');
    osCell.querySelector('input.filter-edit-input').value = 'OS2';
    globalThis.cancelFilterEdit(osCell);
    expect(osCell.querySelector('.filter-value').textContent.trim()).toBe('OS1');
    expect(osCell.querySelector('button.filter-edit')).not.toBe(null);
  });

  it("saves the os field via apiFetch PATCH", async function () {
    document.body.innerHTML = feTableMarkup();
    var captured = [];
    globalThis.apiFetch = function (url, opts) {
      captured.push({ url: url, opts: opts });
      return Promise.resolve({
        json: function () { return { success: true }; },
      });
    };
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: 'OS1',
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var osCell = document.querySelector('#filterTableBody td[data-col="os"]');
    globalThis.enterFilterEdit(osCell, 'os');
    osCell.querySelector('input.filter-edit-input').value = 'OS999';
    await globalThis.saveFilterField(osCell);

    expect(captured.length).toBe(1);
    expect(captured[0].url).toContain('route=filter-exchanges');
    expect(captured[0].opts.method).toBe('PATCH');
    expect(JSON.parse(captured[0].opts.body)).toEqual({ id: 1, field: 'os', value: 'OS999' });
  });

  it("refreshes the data_proxima_troca cell from the backend response when saving data_troca", async function () {
    document.body.innerHTML = feTableMarkup();
    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { data_proxima_troca: '2026-12-13' } }; },
      });
    };
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: null,
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var trocaCell = document.querySelector('#filterTableBody td[data-col="data_troca"]');
    globalThis.enterFilterEdit(trocaCell, 'data_troca');
    trocaCell.querySelector('input.filter-edit-input').value = '2026-08-13';
    await globalThis.saveFilterField(trocaCell);

    expect(trocaCell.querySelector('.filter-value').textContent.trim()).toBe('13/08/2026');
    var nextCell = document.querySelector('#filterTableBody td[data-col="data_proxima_troca"]');
    expect(nextCell.querySelector('.filter-value').textContent.trim()).toBe('13/12/2026');
  });

  it("refreshes the status cell from the backend response when saving data_troca", async function () {
    document.body.innerHTML = feTableMarkup();
    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { data_proxima_troca: '2026-12-14', status: 'concluído' } }; },
      });
    };
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: null,
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var trocaCell = document.querySelector('#filterTableBody td[data-col="data_troca"]');
    globalThis.enterFilterEdit(trocaCell, 'data_troca');
    trocaCell.querySelector('input.filter-edit-input').value = '2026-08-14';
    await globalThis.saveFilterField(trocaCell);

    var statusCell = document.querySelector('#filterTableBody td[data-col="status"]');
    expect(statusCell.querySelector('.filter-value').textContent.trim()).toBe('concluído');
    expect(statusCell.querySelector('.status-badge').className).toContain('bg-emerald-100');
  });

  it("saves the field when the edit input loses focus", async function () {
    document.body.innerHTML = feTableMarkup();
    var captured = [];
    globalThis.apiFetch = function (url, opts) {
      captured.push({ url: url, opts: opts });
      return Promise.resolve({
        json: function () { return { success: true, data: { data_proxima_troca: '2026-12-13' } }; },
      });
    };
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);

    globalThis.renderFilterTable([
      {
        id: 1,
        local: 'RSDDTC',
        equipamento: 'WM',
        tamanho: '',
        qtd: 1,
        os: null,
        data_troca: null,
        data_proxima_troca: null,
        status: 'pendente',
      },
    ], false);

    var trocaCell = document.querySelector('#filterTableBody td[data-col="data_troca"]');
    globalThis.enterFilterEdit(trocaCell, 'data_troca');
    var input = trocaCell.querySelector('input.filter-edit-input');
    input.value = '2026-08-13';
    input.dispatchEvent(new Event('blur'));

    await new Promise(function (r) { setTimeout(r, 20); });
    expect(captured.length).toBe(1);
    expect(JSON.parse(captured[0].opts.body)).toEqual({ id: 1, field: 'data_troca', value: '2026-08-13' });
  });

  it("builds a query string with search, status and sort", function () {
    setupFe();
    globalThis.filterSearch = 'RSD';
    globalThis.filterStatusFilter = 'planejado';
    globalThis.filterSortBy = 'f.local';
    globalThis.filterSortDir = 'DESC';
    var q = globalThis.buildFilterQuery();
    expect(q).toContain('search=RSD');
    expect(q).toContain('status=planejado');
    expect(q).toContain('sort_by=f.local');
    expect(q).toContain('sort_dir=DESC');
  });

  it("builds a CSV row in the expected order", function () {
    setupFe();
    var row = globalThis.buildFilterCsvRow({
      local: 'RSDDTC',
      equipamento: 'WM',
      tamanho: '510X390X25mm',
      qtd: 4,
      os: 'OS123',
      data_troca: '2026-07-15',
      data_proxima_troca: '2026-11-15',
      status: 'planejado',
    });
    expect(row[0]).toBe('RSDDTC');
    expect(row[1]).toBe('WM');
    expect(row[2]).toBe('510X390X25mm');
    expect(row[3]).toBe('4');
    expect(row[4]).toBe('OS123');
    expect(row[5]).toBe('2026-07-15');
    expect(row[6]).toBe('2026-11-15');
    expect(row[7]).toBe('planejado');
  });

  it("clears the search input on click when non-empty", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);
    globalThis.initFilterExchanges();
    var searchInput = document.getElementById('filterSearchInput');
    searchInput.value = 'RSD';
    searchInput.click();
    expect(searchInput.value).toBe('');
  });

  it("hides a column when its checkbox is unchecked in the column dropdown", function () {
    document.body.innerHTML = feTableMarkup();
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);
    globalThis.initFilterExchanges();

    var osCheckbox = document.querySelector('#filterColDropdown input[data-value="os"]');
    osCheckbox.checked = false;
    osCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('th[data-col="os"]').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('filterColLabel').textContent).toBe('1 oculta(s)');
  });
});

describe("filter-exchanges admin permissions", function () {
  var feRow = function () {
    return {
      id: 1,
      local: 'RSDDTC',
      equipamento: 'WM',
      tamanho: '510X390X25mm',
      qtd: 4,
      os: 'OS1',
      data_troca: '2026-07-15',
      data_proxima_troca: '2026-11-15',
      status: 'planejado',
    };
  };

  function feEval() {
    (0, eval)(mockInfiniteScroll);
    (0, eval)(feModuleCode() + FE_HELPERS);
  }

  it("renders no edit pencil on tamanho/qtd for non-admin users", function () {
    document.body.innerHTML = feTableMarkup();
    delete globalThis.getUser;
    feEval();

    globalThis.renderFilterTable([feRow()], false);

    var tamanhoCell = document.querySelector('#filterTableBody td[data-col="tamanho"]');
    expect(tamanhoCell.querySelector('button.filter-edit')).toBe(null);
    expect(tamanhoCell.querySelector('.filter-value').textContent.trim()).toBe('510X390X25mm');

    var qtdCell = document.querySelector('#filterTableBody td[data-col="qtd"]');
    expect(qtdCell.querySelector('button.filter-edit')).toBe(null);

    var osCell = document.querySelector('#filterTableBody td[data-col="os"]');
    expect(osCell.querySelector('button.filter-edit')).not.toBe(null);

    var trocaCell = document.querySelector('#filterTableBody td[data-col="data_troca"]');
    expect(trocaCell.querySelector('button.filter-edit')).not.toBe(null);
  });

  it("renders no actions column for non-admin users", function () {
    document.body.innerHTML = feTableMarkup();
    delete globalThis.getUser;
    feEval();

    globalThis.renderFilterTable([feRow()], false);

    var tr = document.querySelector('#filterTableBody tr.filter-row');
    expect(tr.querySelector('td[data-col="actions"]')).toBe(null);
    expect(tr.querySelector('button.filter-delete')).toBe(null);
  });

  it("renders edit pencils on tamanho/qtd and a delete button for admin users", function () {
    document.body.innerHTML = feTableMarkup();
    globalThis.getUser = function () { return { role: 'admin' }; };
    feEval();

    globalThis.renderFilterTable([feRow()], false);

    var tamanhoCell = document.querySelector('#filterTableBody td[data-col="tamanho"]');
    expect(tamanhoCell.querySelector('button.filter-edit')).not.toBe(null);

    var qtdCell = document.querySelector('#filterTableBody td[data-col="qtd"]');
    expect(qtdCell.querySelector('button.filter-edit')).not.toBe(null);

    var actionsCell = document.querySelector('#filterTableBody td[data-col="actions"]');
    expect(actionsCell).not.toBe(null);
    expect(actionsCell.closest('tr').getAttribute('data-id')).toBe('1');
    expect(actionsCell.querySelector('button.filter-delete')).not.toBe(null);

    delete globalThis.getUser;
  });

  it("deletes the row via apiFetch DELETE after confirmation", async function () {
    document.body.innerHTML = feTableMarkup();
    var captured = [];
    var toasts = [];
    globalThis.apiFetch = function (url, opts) {
      captured.push({ url: url, opts: opts });
      return Promise.resolve({
        json: function () { return { success: true }; },
      });
    };
    globalThis.confirmDelete = function () { return Promise.resolve(true); };
    globalThis.showToast = function (msg, type) { toasts.push({ msg: msg, type: type }); };
    delete globalThis.getUser;
    feEval();

    globalThis.renderFilterTable([feRow()], false);
    await globalThis.deleteFilterRow(1);

    expect(captured.length).toBe(1);
    expect(captured[0].url).toContain('route=filter-exchanges');
    expect(captured[0].url).toContain('id=1');
    expect(captured[0].opts.method).toBe('DELETE');
    expect(toasts.some(function (t) { return t.type === 'success'; })).toBe(true);
  });

  it("does not call the api when the delete is cancelled", async function () {
    document.body.innerHTML = feTableMarkup();
    var captured = [];
    globalThis.apiFetch = function (url, opts) {
      captured.push({ url: url, opts: opts });
      return Promise.resolve({
        json: function () { return { success: true }; },
      });
    };
    globalThis.confirmDelete = function () { return Promise.resolve(false); };
    globalThis.showToast = function () {};
    delete globalThis.getUser;
    feEval();

    globalThis.renderFilterTable([feRow()], false);
    await globalThis.deleteFilterRow(1);

    expect(captured.length).toBe(0);
  });

  it("shows total_qtd sum in the badge instead of row count", async function () {
    document.body.innerHTML = feTableMarkup();
    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () {
          return {
            success: true,
            data: {
              items: [
                { id: 1, local: 'A', equipamento: 'X', tamanho: '510', qtd: 4, os: null, data_troca: null, data_proxima_troca: null, status: 'pendente' },
                { id: 2, local: 'B', equipamento: 'Y', tamanho: '850', qtd: 7, os: null, data_troca: null, data_proxima_troca: null, status: 'pendente' },
              ],
              total: 2,
              total_qtd: 11,
            },
          };
        },
      });
    };
    feEval();

    globalThis.initFilterExchanges();

    await new Promise(function (r) { setTimeout(r, 20); });

    var badge = document.getElementById('filterBadge');
    expect(badge.textContent).toBe('11');
  });
});
