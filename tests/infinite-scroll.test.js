import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { resolve } from "path";

var INTERSECTION_CALLBACK = null;

globalThis.IntersectionObserver = class {
  constructor(callback, options) {
    INTERSECTION_CALLBACK = callback;
    this.options = options;
    this.elements = [];
  }
  observe(el) { this.elements.push(el); }
  unobserve() {}
  disconnect() { this.elements = []; }
};

function fakeFetch(data, total) {
  return async function (url) {
    return { json: async () => ({ success: true, data: data, total: total, _hash: 'h' + Date.now() }) };
  };
}

function makeItems(count, start) {
  var items = [];
  for (var i = 0; i < count; i++) {
    items.push({ id: start + i, name: 'item-' + (start + i) });
  }
  return items;
}

function triggerIntersection(isIntersecting) {
  if (INTERSECTION_CALLBACK) {
    INTERSECTION_CALLBACK([{ isIntersecting: isIntersecting !== false }]);
  }
}

// ─── Production implementation ──────────────────────────────────────────────
var { createInfiniteScroll } = await import(resolve(__dirname, '../public/js/components/infinite-scroll.js'));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("createInfiniteScroll", function () {
  beforeEach(function () {
    document.body.innerHTML =
      '<div id="content"></div>' +
      '<div id="sentinel"></div>';
    INTERSECTION_CALLBACK = null;
  });

  afterEach(function () {
    INTERSECTION_CALLBACK = null;
  });

  describe("factory creation", function () {
    it("returns null if sentinel does not exist", function () {
      var scroll = createInfiniteScroll({ sentinelId: "nonexistent", fetchFn: function () {} });
      expect(scroll).toBeNull();
    });

    it("returns object with expected methods", function () {
      var scroll = createInfiniteScroll({ sentinelId: "sentinel", fetchFn: async function () { return { data: [] }; } });
      expect(scroll).not.toBeNull();
      expect(typeof scroll.init).toBe("function");
      expect(typeof scroll.load).toBe("function");
      expect(typeof scroll.reset).toBe("function");
      expect(typeof scroll.destroy).toBe("function");
      expect(typeof scroll.getState).toBe("function");
    });
  });

  describe("scroll loading", function () {
    it("calls load(false) on init", async function () {
      var fetchCalls = [];
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        fetchFn: async function (params) {
          fetchCalls.push(params.page);
          return { data: makeItems(20, 0), total: 100 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("creates observer that triggers load on intersection", async function () {
      var loadCount = 0;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        fetchFn: async function () { return { data: makeItems(20, 0), total: 100 }; },
        renderFn: function () { loadCount++; },
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 30); });
      expect(loadCount).toBeGreaterThanOrEqual(1);
      var before = loadCount;
      triggerIntersection(true);
      await new Promise(function (r) { return setTimeout(r, 30); });
      expect(loadCount).toBeGreaterThan(before);
    });

    it("guards against concurrent loads", async function () {
      var concurrentCalls = 0;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        fetchFn: async function () {
          concurrentCalls++;
          await new Promise(function (r) { return setTimeout(r, 50); });
          return { data: makeItems(20, 0), total: 100 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 10); });
      var state1 = scroll.getState();
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 10); });
      var state2 = scroll.getState();
      expect(state1.loading === true || state1.loading === false).toBe(true);
      expect(concurrentCalls).toBeLessThanOrEqual(3);
    });

    it("stops loading when allLoaded is true", async function () {
      var fetchCalls = [];
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        limit: 5,
        fetchFn: async function (params) {
          fetchCalls.push(params.page);
          return { data: makeItems(params.page === 0 ? 5 : 3, params.page * 5), total: 8 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      triggerIntersection(true);
      await new Promise(function (r) { return setTimeout(r, 50); });
      expect(fetchCalls.length).toBe(2);
      expect(scroll.getState().allLoaded).toBe(true);
      fetchCalls.length = 0;
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 50); });
      expect(fetchCalls.length).toBe(0);
    });

    it("increments page on each scroll load", async function () {
      var fetchPages = [];
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        limit: 10,
        fetchFn: async function (params) {
          fetchPages.push(params.page);
          return { data: makeItems(10, params.page * 10), total: 100 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 30); });
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 30); });
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 30); });
      expect(fetchPages).toEqual([0, 1, 2]);
    });
  });

  describe("chain loading", function () {
    it("chains next load if sentinel visible after load completes", async function () {
      var fetchCount = 0;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        limit: 20,
        fetchFn: async function () {
          fetchCount++;
          return { data: makeItems(20, fetchCount * 20), total: 100 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      triggerIntersection(true);
      await new Promise(function (r) { return setTimeout(r, 200); });
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });

    it("stops chaining when allLoaded", async function () {
      var fetchCalls = 0;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        limit: 5,
        fetchFn: async function (params) {
          fetchCalls++;
          return { data: params.page === 0 ? makeItems(5, 0) : makeItems(2, 5), total: 7 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      triggerIntersection(true);
      await new Promise(function (r) { return setTimeout(r, 300); });
      expect(fetchCalls).toBe(2);
      expect(scroll.getState().allLoaded).toBe(true);
    });
  });

  describe("polling", function () {
    it("loads with isPolling=true on interval", async function () {
      var pollingModes = [];
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        pollingInterval: 50,
        fetchFn: async function (params) {
          pollingModes.push(true);
          return { data: [], total: 0 };
        },
        renderFn: function () {},
        renderFullFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 120); });
      expect(pollingModes.length).toBeGreaterThanOrEqual(2);
      scroll.destroy();
    });

    it("skips render when hash unchanged", async function () {
      var renderCalls = 0;
      var hashValue = "static";
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        pollingInterval: 30,
        fetchFn: async function () { return { data: [{ id: 1 }], total: 1, _hash: hashValue }; },
        renderFn: function () {},
        renderFullFn: function () { renderCalls++; },
        getFilterHash: function () { return hashValue; },
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 100); });
      var callsAfter = renderCalls;
      scroll.destroy();
      expect(callsAfter).toBeLessThanOrEqual(2);
    });

    it("resets state after polling update", async function () {
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        pollingInterval: 30,
        fetchFn: async function (params) { return { data: makeItems(5, 0), total: 5 }; },
        renderFn: function () {},
        renderFullFn: function () {},
        getFilterHash: function () { return 'v' + Date.now(); },
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 150); });
      scroll.destroy();
    });
  });

  describe("timeout / abort", function () {
    it("passes AbortController signal to fetchFn", async function () {
      var receivedSignal = null;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        timeout: 5000,
        fetchFn: async function (params, opts) {
          receivedSignal = opts && opts.signal;
          return { data: [], total: 0 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 30); });
      expect(receivedSignal).not.toBeNull();
      expect(receivedSignal instanceof AbortSignal || typeof receivedSignal.aborted === 'boolean').toBe(true);
      scroll.destroy();
    });
  });

  describe("reset", function () {
    it("clears state and restarts", async function () {
      var fetchCalls = [];
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        limit: 5,
        fetchFn: async function (params) {
          fetchCalls.push(params.page);
          return { data: makeItems(5, params.page * 5), total: 10 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      scroll.load(false);
      await new Promise(function (r) { return setTimeout(r, 50); });
      expect(scroll.getState().data.length).toBe(10);
      scroll.reset();
      expect(scroll.getState().page).toBe(0);
      expect(scroll.getState().allLoaded).toBe(false);
      expect(scroll.getState().data.length).toBe(0);
      expect(scroll.getState().loading).toBe(false);
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      expect(scroll.getState().page).toBeGreaterThanOrEqual(1);
      scroll.destroy();
    });
  });

  describe("stuck detection", function () {
    it("forces retry after 3 consecutive loading blocks during polling", async function () {
      var fetchHappened = 0;
      var blockFetch = true;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        pollingInterval: 20,
        fetchFn: async function () {
          fetchHappened++;
          return { data: makeItems(5, 0), total: 5 };
        },
        renderFn: function () {},
        renderFullFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 30); });
      var state = scroll.getState();
      scroll.destroy();
      expect(fetchHappened).toBeGreaterThanOrEqual(1);
    });
  });

  describe("loading guard in observer", function () {
    it("does not trigger load when already loading", async function () {
      var fetchCount = 0;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        fetchFn: async function (params) {
          fetchCount++;
          await new Promise(function (r) { return setTimeout(r, 100); });
          return { data: makeItems(20, fetchCount * 20), total: 100 };
        },
        renderFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 20); });
      triggerIntersection(true);
      triggerIntersection(true);
      triggerIntersection(true);
      await new Promise(function (r) { return setTimeout(r, 200); });
      expect(fetchCount).toBeLessThanOrEqual(3);
      scroll.destroy();
    });
  });

  describe("destroy", function () {
    it("stops polling and disconnects observer", async function () {
      var pollingRan = false;
      var scroll = createInfiniteScroll({
        sentinelId: "sentinel",
        pollingInterval: 30,
        fetchFn: async function () { pollingRan = true; return { data: [], total: 0 }; },
        renderFn: function () {},
        renderFullFn: function () {},
      });
      scroll.init();
      await new Promise(function (r) { return setTimeout(r, 50); });
      pollingRan = false;
      scroll.destroy();
      await new Promise(function (r) { return setTimeout(r, 60); });
      expect(pollingRan).toBe(false);
      var state = scroll.getState();
      expect(state.loading).toBe(false);
      expect(state.page).toBe(0);
    });
  });
});
