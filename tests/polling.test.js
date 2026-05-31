import { describe, it, expect, beforeEach } from "bun:test";

function setupVisibilityListener() {
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      for (var view in PollingManager.state) {
        if (PollingManager.state[view] && PollingManager.state[view].timer !== null) {
          clearInterval(PollingManager.state[view].timer);
          PollingManager.state[view].timer = null;
        }
      }
    } else {
      for (var view in PollingManager.state) {
        var s = PollingManager.state[view];
        s.timer = setInterval(s.callback, s.intervalMs);
      }
    }
  });
}

globalThis.PollingManager = {
  state: {},
  start(view, callback, intervalMs) {
    intervalMs = intervalMs || 30000;
    this.stop(view);
    this.state[view] = { callback, intervalMs, timer: null };
    callback();
    this.state[view].timer = setInterval(callback, intervalMs);
  },
  stop(view) {
    if (this.state[view] && this.state[view].timer !== null) {
      clearInterval(this.state[view].timer);
      this.state[view].timer = null;
    }
    delete this.state[view];
  },
  stopAll() {
    for (var view in this.state) {
      this.stop(view);
    }
  },
  isRunning(view) {
    return !!this.state[view];
  }
};

setupVisibilityListener();

describe("PollingManager", () => {
  beforeEach(() => {
    PollingManager.stopAll();
  });

  it("calls callback immediately when started", () => {
    let called = false;
    PollingManager.start('test', () => { called = true; }, 1000);
    expect(called).toBe(true);
  });

  it("stops polling and clears interval", () => {
    PollingManager.start('home', () => {}, 50);
    expect(PollingManager.isRunning('home')).toBe(true);
    PollingManager.stop('home');
    expect(PollingManager.isRunning('home')).toBe(false);
  });

  it("starts polling and calls callback repeatedly", (done) => {
    let callCount = 0;
    const cb = () => { callCount++; };
    PollingManager.start('counting', cb, 50);
    setTimeout(() => {
      // Should have been called at least 2 times (immediate + after 50ms)
      if (callCount >= 2) {
        PollingManager.stop('counting');
        done();
      }
    }, 120);
  });

  it("stops previous interval when started again", () => {
    const calls = [];
    const cb1 = () => calls.push('first');
    const cb2 = () => calls.push('second');

    PollingManager.start('view', cb1, 100);
    PollingManager.start('view', cb2, 100);

    // First callback runs sync on start, then stop + second callback runs sync
    expect(calls).toEqual(['first', 'second']);
    // Only the second interval should remain active
    expect(PollingManager.state['view'].callback).toBe(cb2);
  });

  it("stops all intervals", () => {
    PollingManager.start('home', () => {}, 100);
    PollingManager.start('pv', () => {}, 100);
    PollingManager.stopAll();
    expect(PollingManager.isRunning('home')).toBe(false);
    expect(PollingManager.isRunning('pv')).toBe(false);
  });

  it("reports isRunning correctly for multiple views", () => {
    expect(PollingManager.isRunning('a')).toBe(false);
    PollingManager.start('a', () => {}, 100);
    expect(PollingManager.isRunning('a')).toBe(true);
    PollingManager.start('b', () => {}, 100);
    expect(PollingManager.isRunning('a')).toBe(true);
    expect(PollingManager.isRunning('b')).toBe(true);
    PollingManager.stop('a');
    expect(PollingManager.isRunning('a')).toBe(false);
    expect(PollingManager.isRunning('b')).toBe(true);
  });

  it("pauses on visibility change", () => {
    PollingManager.start('home', () => {}, 100);
    expect(PollingManager.isRunning('home')).toBe(true);
    expect(PollingManager.state['home'].timer).not.toBe(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(PollingManager.state['home'].timer).toBe(null);
  });

  it("resumes on visibility change when tab becomes visible", () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    PollingManager.start('home', () => {}, 100);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(PollingManager.state['home'].timer).toBe(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(PollingManager.state['home'].timer).not.toBe(null);
  });
});
