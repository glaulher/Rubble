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
  if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
  var importStripped = code.replace(/^import .+$/gm, '');
  importStripped = importStripped.replace(/^export\s+/gm, '');
  (0, eval)('"use strict"; ' + importStripped + '\n' + extraCode);
}

globalThis.escapeHtml = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

function setupCards() {
  document.body.innerHTML =
    '<div id="cycleContent">' +
    '<div data-equip-id="1" data-valor="94">' +
      '<input type="checkbox" class="cycle-checkbox" checked>' +
      '<textarea class="cycle-obs">obs1</textarea>' +
      '<input type="text" class="cycle-scm-input" value="SCM123">' +
    '</div>' +
    '<div data-equip-id="2" data-valor="94">' +
      '<input type="checkbox" class="cycle-checkbox">' +
      '<textarea class="cycle-obs">obs2</textarea>' +
      '<input type="text" class="cycle-scm-input" value="">' +
    '</div>' +
    '</div>';
}

describe("preventive-cycle _cycleCollectSaveItems", function () {
  it("includes dirty ids that are not rendered (selected via select-all) with null observacao/scm", function () {
    setupCards();
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__collect = _cycleCollectSaveItems;' +
      'globalThis.__setDirty = function (m) { _cycleDirtyChecks = m; };');

    globalThis.__setDirty(new Map([[1, true], [2, false], [3, true], [4, false]]));

    var items = globalThis.__collect();

    expect(items).toEqual([
      { equipamento_id: 1, checked: true, observacao: 'obs1', scm_number: 'SCM123' },
      { equipamento_id: 2, checked: false, observacao: 'obs2', scm_number: '' },
      { equipamento_id: 3, checked: true, observacao: null, scm_number: null },
      { equipamento_id: 4, checked: false, observacao: null, scm_number: null },
    ]);
  });

  it("does not duplicate rendered ids and sends only dirty unrendered ones", function () {
    setupCards();
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__collect = _cycleCollectSaveItems;' +
      'globalThis.__setDirty = function (m) { _cycleDirtyChecks = m; };');

    globalThis.__setDirty(new Map([[1, true], [3, false]]));

    var items = globalThis.__collect();

    expect(items.length).toBe(3);
    expect(items.filter(function (i) { return i.equipamento_id === 1; }).length).toBe(1);
    expect(items.filter(function (i) { return i.equipamento_id === 3; })[0])
      .toEqual({ equipamento_id: 3, checked: false, observacao: null, scm_number: null });
  });
});

describe("preventive-cycle _cycleRenderScmBadge", function () {
  it("renders 'SCM em aberto' badge with amber color when SCM number is not found", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__renderScmBadge = _cycleRenderScmBadge;');

    var badgeEl = document.createElement('span');
    globalThis.__renderScmBadge({ found: false }, badgeEl);

    expect(badgeEl.innerHTML).toContain('SCM em aberto');
    expect(badgeEl.innerHTML).toContain('bg-amber-100');
    expect(badgeEl.innerHTML).toContain('text-amber-700');
    expect(badgeEl.innerHTML).not.toContain('SCM sem número correspondente');
  });

  it("renders status badge when SCM is found and valid", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__renderScmBadge = _cycleRenderScmBadge;');

    var badgeEl = document.createElement('span');
    globalThis.__renderScmBadge({
      found: true,
      status: 'SCM aprovado',
      segmento: 'preventiva on going',
      origem: 'varejo',
      mercado_equipamento: 'varejo'
    }, badgeEl);

    expect(badgeEl.innerHTML).toContain('SCM aprovado');
    expect(badgeEl.innerHTML).toContain('bg-emerald-100');
  });
});

describe("preventive-cycle cycle status dropdown", function () {
  it("renders status dropdown with 'Todos' and all status options", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__renderDropdown = renderCycleStatusDropdown;' +
      'globalThis.__setFilter = _setCycleStatusFilter;' +
      'globalThis.__STATUS_OPTIONS = CYCLE_STATUS_OPTIONS;');

    document.body.innerHTML = '<div id="cycleStatusDropdown"></div>';
    globalThis.__setFilter(new Set(), true);
    globalThis.__renderDropdown();

    var dropdown = document.getElementById('cycleStatusDropdown');
    var allCb = dropdown.querySelector('input[data-value="__all__"]');
    expect(allCb).not.toBeNull();
    expect(allCb.checked).toBe(true);

    var optionChecks = dropdown.querySelectorAll('.cycle-status-check:not([data-value="__all__"])');
    expect(optionChecks.length).toBe(globalThis.__STATUS_OPTIONS.length);
    optionChecks.forEach(function (cb) {
      expect(cb.checked).toBe(true);
    });
  });

  it("updates cycle status label when filter is active vs Todos", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__updateLabel = updateCycleStatusLabel;' +
      'globalThis.__setFilter = _setCycleStatusFilter;');

    document.body.innerHTML = '<span id="cycleStatusLabel"></span>';
    var label = document.getElementById('cycleStatusLabel');

    globalThis.__setFilter(new Set(), true);
    globalThis.__updateLabel();
    expect(label.textContent).toBe('Todos');
    expect(label.classList.contains('text-blue-600')).toBe(false);

    globalThis.__setFilter(new Set(['SCM aprovado']), false);
    globalThis.__updateLabel();
    expect(label.textContent).toBe('1 selecionado(s)');
    expect(label.classList.contains('text-blue-600')).toBe(true);

    globalThis.__setFilter(new Set(['SCM aprovado', 'SCM negado']), false);
    globalThis.__updateLabel();
    expect(label.textContent).toBe('2 selecionado(s)');
    expect(label.classList.contains('text-blue-600')).toBe(true);
  });

  it("initCycleStatusMultiSelect toggles dropdown visibility on button click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__initDropdown = initCycleStatusMultiSelect;' +
      'globalThis.__setFilter = _setCycleStatusFilter;');

    document.body.innerHTML =
      '<button id="cycleStatusBtn"><span id="cycleStatusLabel"></span></button>' +
      '<div id="cycleStatusDropdown" class="hidden"></div>';

    var btn = document.getElementById('cycleStatusBtn');
    var dropdown = document.getElementById('cycleStatusDropdown');

    globalThis.__initDropdown();
    expect(dropdown.classList.contains('hidden')).toBe(true);

    btn.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);

    btn.click();
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });
});

describe("preventive-cycle _cycleExportCsv", function () {
  it("exports CSV with header including STATUS and rows with scm_status", async function () {
    (0, eval)(mockInfiniteScroll);

    var downloaded = null;
    globalThis.downloadCSV = function (filename, header, rowBuilder) {
      var rows = [];
      rowBuilder(function (cells) {
        rows.push(cells);
      });
      downloaded = { filename: filename, header: header, rows: rows };
    };
    globalThis.sanitizeCSV = function (str) { return str; };
    globalThis.showToast = function () {};
    globalThis.dismissToast = function () {};

    var mockData = [
      {
        local: 'SITE1',
        local_scm: 'SITE1',
        localidade: 'Cidade 1',
        equipamento: 'AC-01',
        tag_infratel: 'TAG-1',
        capacidade: '5',
        valor: '150.00',
        checked: 1,
        observacao: 'Obs ok',
        scm_number: 'SCM123',
        scm_status: 'SCM aprovado'
      },
      {
        local: 'SITE2',
        local_scm: 'SITE2',
        localidade: 'Cidade 2',
        equipamento: 'AC-02',
        tag_infratel: 'TAG-2',
        capacidade: '10',
        valor: '200.00',
        checked: 0,
        observacao: '',
        scm_number: 'SCM999',
        scm_status: 'SCM em aberto'
      },
      {
        local: 'SITE3',
        local_scm: 'SITE3',
        localidade: 'Cidade 3',
        equipamento: 'AC-03',
        tag_infratel: 'TAG-3',
        capacidade: '7.5',
        valor: '0',
        checked: 0,
        observacao: '',
        scm_number: '',
        scm_status: ''
      }
    ];

    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () {
          return Promise.resolve({ success: true, data: mockData });
        }
      });
    };

    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__exportCsv = _cycleExportCsv;' +
      '_cycleCurrent = "2026-09";');

    await globalThis.__exportCsv();

    expect(downloaded).not.toBeNull();
    expect(downloaded.filename).toBe('preventiva_2026-09.csv');
    expect(downloaded.header).toBe(
      'LOCAL;LOCAL SCM;LOCALIDADE;EQUIPAMENTO;TAG INFRATEL;CAPACIDADE (TR);VALOR (R$);MARCADO;OBSERVACAO;SCM;STATUS'
    );
    expect(downloaded.rows.length).toBe(3);

    // Row 1: SCM aprovado
    expect(downloaded.rows[0].length).toBe(11);
    expect(downloaded.rows[0][9]).toBe('SCM123');
    expect(downloaded.rows[0][10]).toBe('SCM aprovado');

    // Row 2: SCM em aberto
    expect(downloaded.rows[1].length).toBe(11);
    expect(downloaded.rows[1][9]).toBe('SCM999');
    expect(downloaded.rows[1][10]).toBe('SCM em aberto');

    // Row 3: empty status
    expect(downloaded.rows[2].length).toBe(11);
    expect(downloaded.rows[2][9]).toBe('');
    expect(downloaded.rows[2][10]).toBe('');
  });
});

describe("preventive-cycle _cycleUpdateBadge with SCM em aberto", function () {
  it("renders 'SCM em aberto' count in cycle badge when present in scm data", function () {
    document.body.innerHTML = '<span id="cycleBadge"></span>';
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__updateBadge = _cycleUpdateBadge;' +
      'globalThis.__setSummaryData = function (d) { _cycleSummaryData = d; };' +
      'globalThis.__setScmData = function (d) { _cycleScmData = d; };');

    globalThis.__setSummaryData({ total_valor: 150000, site_count: 25, checked_count: 100 });
    globalThis.__setScmData({
      'SCM em aberto': 4,
      'SCM enviado': 2,
      'SCM negado': 1,
      'SCM aprovado': 20
    });

    globalThis.__updateBadge();

    var badgeEl = document.getElementById('cycleBadge');
    expect(badgeEl.textContent).toContain('SCM em aberto 4');
    expect(badgeEl.textContent).toContain('SCM enviado 2');
    expect(badgeEl.textContent).toContain('SCM negado 1');
    expect(badgeEl.textContent).toContain('SCM aprovado 20');
  });
});

describe("preventive-cycle _cycleSyncScms", function () {
  it("calls auto-link-scm API and shows toast with linked count", async function () {
    document.body.innerHTML = '<button id="syncScmCycleBtn">Puxar SCMs</button>';
    var toastMsg = null;
    globalThis.showToast = function (msg) { toastMsg = msg; };

    var apiCalled = false;
    var requestBody = null;
    globalThis.apiFetch = function (url, opts) {
      if (url.includes('auto-link-scm')) {
        apiCalled = true;
        requestBody = opts && opts.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          json: function () {
            return Promise.resolve({ success: true, data: { ciclo: '2026-09', linked: 15 } });
          }
        });
      }
      return Promise.resolve({
        json: function () {
          return Promise.resolve({ success: true, data: [], total: 0 });
        }
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__syncScms = _cycleSyncScms;' +
      '_cycleCurrent = "2026-09";');

    await globalThis.__syncScms();

    expect(apiCalled).toBe(true);
    expect(requestBody.ciclo).toBe('2026-09');
    expect(toastMsg).toBe('15 equipamento(s) vinculado(s) a SCMs');
  });
});

describe("preventive-cycle _cycleValidateScm", function () {
  it("includes equipamento_id in URL and caches per scmNumber_equipId", async function () {
    var requestedUrls = [];
    globalThis.apiFetch = function (url) {
      requestedUrls.push(url);
      if (url.includes('equipamento_id=47')) {
        return Promise.resolve({
          json: function () {
            return Promise.resolve({
              success: true,
              data: { found: true, status: 'SCM negado', segmento: 'preventiva on going', origem: 'varejo', mercado_equipamento: 'varejo' }
            });
          }
        });
      }
      return Promise.resolve({
        json: function () {
          return Promise.resolve({
            success: true,
            data: { found: true, status: 'SCM aprovado', segmento: 'preventiva on going', origem: 'varejo', mercado_equipamento: 'varejo' }
          });
        }
      });
    };

    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/preventive-cycle/list.js',
      'globalThis.__validateScm = _cycleValidateScm;' +
      'globalThis.__cache = _cycleScmValidationCache;');

    var badge47 = document.createElement('span');
    var badge51 = document.createElement('span');

    // First call for equipId 47
    globalThis.__validateScm('531393', 47, badge47);
    await new Promise(function (r) { setTimeout(r, 10); });

    expect(requestedUrls[0]).toContain('scm_number=531393');
    expect(requestedUrls[0]).toContain('equipamento_id=47');
    expect(badge47.innerHTML).toContain('SCM negado');
    expect(globalThis.__cache['531393_47']).toBeDefined();
    expect(globalThis.__cache['531393_47'].status).toBe('SCM negado');

    // Second call for same equipId uses cache (no new fetch)
    var badge47_2 = document.createElement('span');
    globalThis.__validateScm('531393', 47, badge47_2);
    expect(requestedUrls.length).toBe(1);
    expect(badge47_2.innerHTML).toContain('SCM negado');

    // Call for equipId 51 on same SCM fetches with equipId 51 and gets distinct status
    globalThis.__validateScm('531393', 51, badge51);
    await new Promise(function (r) { setTimeout(r, 10); });

    expect(requestedUrls.length).toBe(2);
    expect(requestedUrls[1]).toContain('scm_number=531393');
    expect(requestedUrls[1]).toContain('equipamento_id=51');
    expect(badge51.innerHTML).toContain('SCM aprovado');
    expect(globalThis.__cache['531393_51'].status).toBe('SCM aprovado');
  });
});




function emAbertoItem(overrides) {
  var item = {
    equipamento_id: 1,
    local: 'SITE1',
    local_scm: 'SITE1',
    localidade: 'Cidade 1',
    equipamento: 'AC-01',
    tag_infratel: '',
    capacidade: '5',
    valor: '0',
    checked: 1,
    observacao: '',
    scm_number: '',
    scm_status: ''
  };
  Object.keys(overrides || {}).forEach(function (k) { item[k] = overrides[k]; });
  return item;
}

function renderCycleCards(items) {
  document.body.innerHTML = '<div id="cycleContent"></div>';
  globalThis.hubRecase = function (s) { return s || ''; };
  globalThis.applyRoleVisibility = function () {};
  globalThis.apiFetch = function () {
    return Promise.resolve({ json: function () { return Promise.resolve({ success: false }); } });
  };
  evalModule('../public/js/preventive-cycle/list.js',
    'globalThis.__renderCards = _cycleRenderCards;' +
    'globalThis.__bindScmFocusout = function () { var c = document.getElementById("cycleContent"); return c && c._scmListenerAdded; };');
  globalThis.__renderCards(items, false);
  return document.getElementById('cycleContent');
}

function dispatchFocusout(container, equipId) {
  var inp = container.querySelector('.cycle-scm-input[data-equip-id="' + equipId + '"]');
  inp.dispatchEvent(new Event('focusout', { bubbles: true }));
}

describe("preventive-cycle card badge for items without SCM number", function () {
  it("renders 'SCM em aberto' badge for a checked item whose scm_number is empty", function () {
    var container = renderCycleCards([
      emAbertoItem({ checked: 1, scm_number: '', scm_status: 'SCM em aberto' })
    ]);

    var badge = container.querySelector('.cycle-scm-badge[data-equip-id="1"]');
    expect(badge).not.toBeNull();
    expect(badge.innerHTML).toContain('SCM em aberto');
    expect(badge.innerHTML).toContain('bg-amber-100');
    expect(badge.innerHTML).toContain('text-amber-700');
  });

  it("keeps showing the resolved status for a checked item with a resolved SCM", function () {
    var container = renderCycleCards([
      emAbertoItem({ checked: 1, scm_number: 'SCM123', scm_status: 'SCM aprovado' })
    ]);

    var badge = container.querySelector('.cycle-scm-badge[data-equip-id="1"]');
    expect(badge.innerHTML).toContain('SCM aprovado');
    expect(badge.innerHTML).toContain('bg-emerald-100');
  });

  it("renders an empty badge for an unchecked item with empty scm_status", function () {
    var container = renderCycleCards([
      emAbertoItem({ checked: 0, scm_number: '', scm_status: '' })
    ]);

    var badge = container.querySelector('.cycle-scm-badge[data-equip-id="1"]');
    expect(badge).not.toBeNull();
    expect(badge.innerHTML).toBe('');
  });
});

describe("preventive-cycle scm input focusout with cleared value", function () {
  it("restores 'SCM em aberto' on a CHECKED card when the input is cleared", function () {
    var container = renderCycleCards([
      emAbertoItem({ checked: 1, scm_number: '', scm_status: 'SCM em aberto' })
    ]);

    var badge = container.querySelector('.cycle-scm-badge[data-equip-id="1"]');
    expect(badge.innerHTML).toContain('SCM em aberto');

    container.querySelector('.cycle-scm-input[data-equip-id="1"]').value = '';
    dispatchFocusout(container, 1);

    expect(badge.innerHTML).toContain('SCM em aberto');
    expect(badge.innerHTML).toContain('bg-amber-100');
  });

  it("clears the badge on an UNCHECKED card when the input is cleared", function () {
    var container = renderCycleCards([
      emAbertoItem({ checked: 0, scm_number: '', scm_status: 'SCM em aberto' })
    ]);

    var badge = container.querySelector('.cycle-scm-badge[data-equip-id="1"]');
    expect(badge.innerHTML).toContain('SCM em aberto');

    container.querySelector('.cycle-scm-input[data-equip-id="1"]').value = '';
    dispatchFocusout(container, 1);

    expect(badge.innerHTML).toBe('');
  });
});
