import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Window } from 'happy-dom';

const domWindow = new Window({ url: 'https://rubble.local/#/login' });
globalThis.window = domWindow;
globalThis.document = domWindow.document;

// Mock storage
const storage = {};
const sessionStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
globalThis.sessionStorage = sessionStorageMock;

const localStore = {};
const localStorageMock = {
  getItem: (key) => localStore[key] ?? null,
  setItem: (key, value) => { localStore[key] = value; },
  removeItem: (key) => { delete localStore[key]; },
  clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); },
};
globalThis.localStorage = localStorageMock;

const { authGuard } = await import('../public/js/core/auth.js');

describe('Termo Public Routes Auth Guard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('allows public access to #/assinar-termo with token when not logged in', () => {
    window.location.hash = '#/assinar-termo?token=abcdef123456';
    const allowed = authGuard();
    expect(allowed).toBe(true);
  });

  it('allows public access to #/termo with token when not logged in', () => {
    window.location.hash = '#/termo?token=abcdef123456';
    const allowed = authGuard();
    expect(allowed).toBe(true);
  });

  it('blocks private routes like #/inventory when not logged in', () => {
    window.location.hash = '#/inventory';
    const allowed = authGuard();
    expect(allowed).toBe(false);
    expect(window.location.hash).toBe('#/login');
  });
});
