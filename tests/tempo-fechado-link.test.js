import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

// Mocks for tempo-fechado link module

const storage = {};
const sessionStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};
try { Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true }); } catch (_) { try { globalThis.sessionStorage = sessionStorageMock; } catch (_) {} }

const localStore = {};
const localStorageMock = {
  getItem: (key) => localStore[key] ?? null,
  setItem: (key, value) => { localStore[key] = value; },
  removeItem: (key) => { delete localStore[key]; },
  clear: () => { Object.keys(localStore).forEach(k => delete localStore[k]); },
};
try { Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true }); } catch (_) { try { globalThis.localStorage = localStorageMock; } catch (_) {} }

globalThis.escapeHtml = function (str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

describe('tempo-fechado/link.js (TDD red)', () => {
  let openTempoFechado;
  let buildTempoFechadoUrl;

  beforeEach(() => {
    sessionStorage.clear();
    // provide global getToken for eval-module stripped import
    globalThis.getToken = () => sessionStorage.getItem('rubble_token');
    if (!globalThis.window) globalThis.window = {};
    if (!globalThis.window.location) globalThis.window.location = { hash: '#/' };
    if (!globalThis.window.open) globalThis.window.open = () => {};
    // must re-eval module each test to pick up fresh globals
    evalModule('../public/js/tempo-fechado/link.js', '');
    openTempoFechado = globalThis.openTempoFechado;
    buildTempoFechadoUrl = globalThis.buildTempoFechadoUrl;
  });

  test('buildTempoFechadoUrl returns null when no token', () => {
    expect(buildTempoFechadoUrl()).toBeNull();
  });

  test('buildTempoFechadoUrl encodes token in sso URL', () => {
    sessionStorage.setItem('rubble_token', 'abc.def.ghi');
    const url = buildTempoFechadoUrl();
    expect(url).toContain('/tempo-fechado/sso?token=');
    expect(url).toContain(encodeURIComponent('abc.def.ghi'));
  });

  test('openTempoFechado does not call window.open when not authenticated', () => {
    sessionStorage.clear();
    const spy = mock(() => {});
    const origOpen = globalThis.window.open;
    globalThis.window.open = spy;
    openTempoFechado();
    expect(spy).not.toHaveBeenCalled();
    globalThis.window.open = origOpen;
  });

  test('openTempoFechado calls window.open with _blank noopener when authenticated', () => {
    sessionStorage.setItem('rubble_token', 'tok123');
    const spy = mock(() => {});
    const origOpen = globalThis.window.open;
    globalThis.window.open = spy;
    openTempoFechado();
    expect(spy).toHaveBeenCalled();
    const [url, target, features] = spy.mock.calls[0];
    expect(url).toContain('/tempo-fechado/sso?token=');
    expect(target).toBe('_blank');
    expect(features).toContain('noopener');
    globalThis.window.open = origOpen;
  });

  test('openTempoFechado redirects to #/login when no token', () => {
    sessionStorage.clear();
    globalThis.window.location = { hash: '#/pv' };
    openTempoFechado();
    expect(globalThis.window.location.hash).toBe('#/login');
  });

  test('module exports both functions', () => {
    expect(typeof buildTempoFechadoUrl).toBe('function');
    expect(typeof openTempoFechado).toBe('function');
  });
});
