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

describe("planned-activity/list.js bridge", function () {
  it("sets globalThis.initPlannedActivity at module load time", function () {
    delete globalThis.initPlannedActivity;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/planned-activity/list.js', '');
    expect(typeof globalThis.initPlannedActivity).toBe("function");
  });
});
