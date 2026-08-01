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
globalThis.showToast = function () {};

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

function loadHelpers() {
  (0, eval)(mockInfiniteScroll);
  evalModule('../public/js/planned-activity/list.js', [
    'globalThis.__remove = _removePlannedCards;',
    'globalThis.__append = _appendPlannedToGroup;',
    'globalThis.__apply = _applyPlannedCardUpdate;',
    'globalThis.__counter = _updatePlannedCounter;',
  ].join('\n'));
}

describe("planned-activity _removePlannedCards", function () {
  it("removes the matching card and removes the group when it becomes empty", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(1, 'preventiva', '2026-08-01'));

    globalThis.__remove(1, 'preventiva');

    var content = document.getElementById('plannedContent');
    expect(content.querySelector('.planned-card[data-key="preventiva:1"]')).toBeNull();
    expect(content.querySelectorAll('.timeline-group').length).toBe(0);
  });

  it("keeps a corretiva card sharing the same numeric id as a preventiva", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(7, 'preventiva', '2026-08-01', { os: 'PREV-OS' }));
    globalThis.__append(makePlannedItem(7, 'corretiva', '2026-08-01', { os: 'CORR-OS' }));

    globalThis.__remove(7, 'preventiva');

    var content = document.getElementById('plannedContent');
    expect(content.querySelector('.planned-card[data-key="preventiva:7"]')).toBeNull();
    expect(content.querySelector('.planned-card[data-key="corretiva:7"]')).not.toBeNull();
    expect(content.querySelectorAll('.timeline-group').length).toBe(1);
  });

  it("does not remove a card from a different date group", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(3, 'corretiva', '2026-08-01'));
    globalThis.__append(makePlannedItem(4, 'corretiva', '2026-08-02'));

    globalThis.__remove(3, 'corretiva');

    var content = document.getElementById('plannedContent');
    expect(content.querySelector('.planned-card[data-key="corretiva:3"]')).toBeNull();
    expect(content.querySelector('.planned-card[data-key="corretiva:4"]')).not.toBeNull();
  });
});

describe("planned-activity _appendPlannedToGroup", function () {
  it("appends a card to an existing date group without duplicating", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(1, 'preventiva', '2026-08-01'));
    globalThis.__append(makePlannedItem(2, 'preventiva', '2026-08-01'));
    globalThis.__append(makePlannedItem(2, 'preventiva', '2026-08-01'));

    var content = document.getElementById('plannedContent');
    var keys = Array.from(content.querySelectorAll('.planned-card')).map(function (c) {
      return c.getAttribute('data-key');
    });
    expect(keys).toEqual(['preventiva:1', 'preventiva:2']);
  });

  it("creates a new date group when the date is absent", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(1, 'preventiva', '2026-08-01'));
    globalThis.__append(makePlannedItem(2, 'corretiva', '2026-08-05'));

    var content = document.getElementById('plannedContent');
    var dates = Array.from(content.querySelectorAll('.timeline-group')).map(function (g) {
      return g.getAttribute('data-date');
    });
    expect(dates).toEqual(['2026-08-05', '2026-08-01']);
    expect(content.querySelector('.planned-card[data-key="corretiva:2"]')).not.toBeNull();
  });
});

describe("planned-activity _applyPlannedCardUpdate", function () {
  it("replaces the card content in place when the date does not change", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(1, 'corretiva', '2026-08-01', { status: 'Pendente' }));

    globalThis.__apply(makePlannedItem(1, 'corretiva', '2026-08-01', { status: 'Conclu\u00eddo' }));

    var content = document.getElementById('plannedContent');
    expect(content.querySelectorAll('.planned-card').length).toBe(1);
    expect(content.querySelector('.planned-card[data-key="corretiva:1"]').textContent).toContain('Conclu\u00eddo');
  });

  it("moves the card to the new date group when data_planejada changes", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(1, 'corretiva', '2026-08-01'));

    globalThis.__apply(makePlannedItem(1, 'corretiva', '2026-08-05'));

    var content = document.getElementById('plannedContent');
    var sourceGroup = content.querySelector('.timeline-group[data-date="2026-08-01"]');
    var targetGroup = content.querySelector('.timeline-group[data-date="2026-08-05"]');
    expect(sourceGroup).toBeNull();
    expect(targetGroup).not.toBeNull();
    expect(targetGroup.querySelector('.planned-card[data-key="corretiva:1"]')).not.toBeNull();
  });

  it("updates only the matching tipo:id (preventiva and corretiva coexist)", function () {
    setup();
    loadHelpers();
    globalThis.__append(makePlannedItem(9, 'preventiva', '2026-08-01', { os: 'PREV-OS', status: 'Planejado' }));
    globalThis.__append(makePlannedItem(9, 'corretiva', '2026-08-01', { os: 'CORR-OS', status: 'Pendente' }));

    globalThis.__apply(makePlannedItem(9, 'corretiva', '2026-08-01', { os: 'CORR-OS', status: 'Conclu\u00eddo' }));

    var content = document.getElementById('plannedContent');
    var prevCard = content.querySelector('.planned-card[data-key="preventiva:9"]');
    var corrCard = content.querySelector('.planned-card[data-key="corretiva:9"]');
    expect(prevCard.textContent).toContain('Planejado');
    expect(corrCard.textContent).toContain('Conclu\u00eddo');
  });
});

describe("planned-activity _updatePlannedCounter", function () {
  it("updates window._plannedTotal and the counter element", function () {
    setup();
    loadHelpers();

    globalThis.__counter(42);

    expect(window._plannedTotal).toBe(42);
    expect(document.getElementById('plannedCounter').textContent).toBe('42 atividades');
  });
});
