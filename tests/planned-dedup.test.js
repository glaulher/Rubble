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

globalThis.getUser = function () { return { role: 'admin' }; };
globalThis.iconButtonHtml = function () { return ''; };
globalThis.applyRoleVisibility = function () {};

function makePlannedItem(id, tipo, data, overrides) {
  return Object.assign({
    id: id,
    tipo: tipo,
    local: 'RJOEN',
    local_scm: '',
    localidade: '',
    equipamento: 'WM 01',
    capacidade: '10',
    os: 'OS' + id,
    data_planejada: data,
    status: 'Planejado',
    equipe: 'Equipe A',
    obs: '',
    material: '',
    machine_count: 0,
    mercado: '',
    sort_order: 0,
    sla_days: null,
    sla_day_number: 0,
    sla_extensions: null,
  }, overrides || {});
}

function setup() {
  document.body.innerHTML =
    '<div id="plannedContent"></div><div id="plannedCounter">0 atividades</div>';
}

describe("planned-activity renderPlanned dedup", function () {
  it("does not duplicate cards when an overlapping batch is appended", function () {
    setup();
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', 'globalThis.__render = renderPlanned;');

    var batch1 = [
      makePlannedItem(1, 'preventiva', '2026-08-01'),
      makePlannedItem(2, 'preventiva', '2026-08-01'),
    ];
    var batch2 = [
      makePlannedItem(2, 'preventiva', '2026-08-01'),
      makePlannedItem(3, 'preventiva', '2026-08-01'),
    ];

    globalThis.__render(batch1, true);
    globalThis.__render(batch2, true);

    var content = document.getElementById('plannedContent');
    var keys = Array.from(content.querySelectorAll('.planned-card')).map(function (c) {
      return c.getAttribute('data-key');
    });
    expect(keys).toEqual(['preventiva:1', 'preventiva:2', 'preventiva:3']);
  });
});

describe("planned-activity syncPlannedCards identity", function () {
  it("keeps a preventiva and a corretiva sharing the same numeric id", function () {
    setup();
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', 'globalThis.__sync = syncPlannedCards;');

    var items = [
      makePlannedItem(5, 'preventiva', '2026-08-01'),
      makePlannedItem(5, 'corretiva', '2026-08-01'),
    ];

    globalThis.__sync(items, 2);

    var content = document.getElementById('plannedContent');
    var cards = content.querySelectorAll('.planned-card');
    expect(cards.length).toBe(2);
  });

  it("does not replace the wrong card when a batch contains same id in different tipos", function () {
    setup();
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', 'globalThis.__sync = syncPlannedCards;');

    var items = [
      makePlannedItem(5, 'preventiva', '2026-08-01', { os: 'PREV-OS' }),
      makePlannedItem(5, 'corretiva', '2026-08-01', { os: 'CORR-OS' }),
    ];

    globalThis.__sync(items, 2);

    var content = document.getElementById('plannedContent');
    var texts = Array.from(content.querySelectorAll('.planned-card')).map(function (c) {
      return c.textContent;
    });
    var prevCard = content.querySelector('.planned-card[data-key="preventiva:5"]');
    var corrCard = content.querySelector('.planned-card[data-key="corretiva:5"]');
    expect(prevCard).not.toBeNull();
    expect(corrCard).not.toBeNull();
    expect(prevCard.textContent).toContain('PREV-OS');
    expect(corrCard.textContent).toContain('CORR-OS');
    expect(texts.length).toBe(2);
  });
});
