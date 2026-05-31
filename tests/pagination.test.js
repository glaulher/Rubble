import { describe, it, expect, beforeEach } from "bun:test";

globalThis.IntersectionObserver = class {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  observe(el) { this.observed = el; }
  unobserve() {}
  disconnect() {}
};

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function createInfiniteScroll(sentinelId, loadFn) {
  const sentinel = document.getElementById(sentinelId);
  if (!sentinel) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadFn();
      }
    },
    { root: null, rootMargin: '300px', threshold: 0 }
  );

  observer.observe(sentinel);
  return observer;
}

describe("debounce", () => {
  it("calls the function after the delay", (done) => {
    var called = false;
    var debounced = debounce(() => { called = true; }, 50);
    debounced();
    expect(called).toBe(false);
    setTimeout(() => {
      expect(called).toBe(true);
      done();
    }, 100);
  });

  it("cancels previous calls when called again", (done) => {
    var count = 0;
    var debounced = debounce(() => { count++; }, 50);
    debounced();
    debounced();
    debounced();
    setTimeout(() => {
      expect(count).toBe(1);
      done();
    }, 100);
  });

  it("preserves the 'this' context", (done) => {
    var obj = { value: 42, fn: debounce(function () { this.result = this.value; }, 50) };
    obj.fn();
    setTimeout(() => {
      expect(obj.result).toBe(42);
      done();
    }, 100);
  });

  it("passes arguments through", (done) => {
    var debounced = debounce((a, b) => {
      expect(a).toBe(1);
      expect(b).toBe(2);
      done();
    }, 50);
    debounced(1, 2);
  });
});

describe("createInfiniteScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sentinel"></div>';
  });

  it("returns null if sentinel element does not exist", () => {
    var result = createInfiniteScroll("nonexistent", () => {});
    expect(result).toBeNull();
  });

  it("creates an observer and observes the sentinel", () => {
    var loadCalled = false;
    var observer = createInfiniteScroll("sentinel", () => { loadCalled = true; });
    expect(observer).not.toBeNull();
    expect(typeof observer.observe).toBe("function");
  });
});
