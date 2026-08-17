import { describe, it, expect, beforeEach } from "bun:test";
import { evalModule } from "./helpers/eval-module.js";

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

var PENDING_HELPERS =
  '\nfunction escapeHtml(v) { return String(v == null ? "" : v); }\n' +
  'function titleCase(v) { return String(v == null ? "" : v); }\n' +
  'function formatAddress(v) { return String(v == null ? "" : v); }\n' +
  'function buttonHtml(type, label, attrs) { var a = ""; for (var k in attrs) a += " " + k + "=\\"" + attrs[k] + "\\""; return "<button" + a + ">" + label + "</button>"; }\n' +
  'function iconButtonHtml() { return ""; }\n' +
  'function formatDate(v) { return v || ""; }\n' +
  'function applyRoleVisibility() {}\n' +
  'function showToast() {}\n' +
  'function deleteTicket() {}\n' +
  'function importOS() {}\n' +
  'function generateCSVReport() {}\n' +
  'function setupHomeScroll() {}\n';

function loadHomeUi() {
  delete globalThis.buildEquipmentCardHtml;
  delete globalThis.syncHomeCards;
  delete globalThis.render;
  (0, eval)(mockInfiniteScroll);
  evalModule('../public/js/home/home-ui.js', PENDING_HELPERS);
}

beforeEach(function () {
  document.body.innerHTML = "";
  globalThis.getUser = function () { return { role: 'admin' }; };
  globalThis.currentSearch = '';
  globalThis.totalOS = 0;
  globalThis.totalEquipment = 0;
  globalThis.totalValor = 0;
  loadHomeUi();
});

function makeEquip(overrides) {
  return Object.assign({
    id: 1,
    local: 'RSD',
    local_scm: 'RSDDTC',
    local_do_endereco: 'Resende',
    endereco: 'Av Central',
    equipamento: 'WM 02',
    capacidade: '10',
    color: 'bg-slate-100 text-slate-800',
    icon: '',
    localidade: 'Container 3',
    tag_infratel: '',
    tickets_count: 0,
    pvs_pendentes_count: 0,
    pvs_pendentes: '',
    valor_tr: null,
  }, overrides || {});
}

describe("home-ui buildEquipmentCardHtml", function () {
  it("renders tag_infratel in a separate p line below the locality", function () {
    var html = globalThis.buildEquipmentCardHtml(
      makeEquip({ tag_infratel: 'CLIMA - AC-02 / CARRIER / CONTAINER 04' }),
      true
    );
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    var subtitle = wrapper.querySelector('.card-subtitle');
    expect(subtitle).not.toBe(null);

    var lines = subtitle.querySelectorAll('p');
    expect(lines.length).toBe(2);
    expect(lines[0].textContent).toContain('Container 3');
    expect(lines[1].textContent).toContain('CLIMA - AC-02 / CARRIER / CONTAINER 04');
  });

  it("omits the tag line when tag_infratel is empty", function () {
    var html = globalThis.buildEquipmentCardHtml(makeEquip({ tag_infratel: '' }), true);
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    var subtitle = wrapper.querySelector('.card-subtitle');
    var lines = subtitle.querySelectorAll('p');
    expect(lines.length).toBe(1);
    expect(lines[0].textContent).toContain('Container 3');
  });

  it("keeps the status icon on the locality line", function () {
    var html = globalThis.buildEquipmentCardHtml(
      makeEquip({ icon: '\u{1F552}', tag_infratel: 'CLIMA - 01' }),
      true
    );
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    var subtitle = wrapper.querySelector('.card-subtitle');
    var lines = subtitle.querySelectorAll('p');
    expect(lines[0].textContent).toContain('\u{1F552}');
    expect(lines[1].textContent).not.toContain('\u{1F552}');
  });
});

describe("home-ui syncHomeCards (polling header update)", function () {
  it("updates the h3 color classes when e.color changes", function () {
    document.body.innerHTML =
      '<div id="content"></div>' +
      '<span id="machineCounter"></span><span id="counterLabel"></span><span id="counterValue"></span>';

    globalThis.render([makeEquip()], false);

    var h3 = document.querySelector('#content .card-item[data-equip-id="1"] h3');
    expect(h3.className).toContain('bg-slate-100');

    globalThis.syncHomeCards([
      makeEquip({ color: 'bg-red-100 text-red-800' }),
    ]);

    h3 = document.querySelector('#content .card-item[data-equip-id="1"] h3');
    expect(h3.className).toContain('bg-red-100');
    expect(h3.className).not.toContain('bg-slate-100');
  });

  it("updates the subtitle locality/tag/icon via polling", function () {
    document.body.innerHTML =
      '<div id="content"></div>' +
      '<span id="machineCounter"></span><span id="counterLabel"></span><span id="counterValue"></span>';

    globalThis.render([makeEquip()], false);

    globalThis.syncHomeCards([
      makeEquip({
        localidade: 'Container 9',
        tag_infratel: 'CLIMA - 99 / NOVO',
        icon: '\u26A0\uFE0F',
      }),
    ]);

    var subtitle = document.querySelector('#content .card-item[data-equip-id="1"] .card-subtitle');
    expect(subtitle).not.toBe(null);
    var lines = subtitle.querySelectorAll('p');
    expect(lines[0].textContent).toContain('Container 9');
    expect(lines[0].textContent).toContain('\u26A0\uFE0F');
    expect(lines[1].textContent).toContain('CLIMA - 99 / NOVO');
  });
});