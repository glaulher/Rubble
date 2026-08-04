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
});

describe("planned-activity/list.js bridge", function () {
  it("sets globalThis.initPlannedActivity at module load time", function () {
    delete globalThis.initPlannedActivity;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', '');
    expect(typeof globalThis.initPlannedActivity).toBe("function");
  });
});
