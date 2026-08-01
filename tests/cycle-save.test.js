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
