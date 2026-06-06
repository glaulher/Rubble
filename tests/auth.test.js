import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Mock sessionStorage
const storage = {};
const sessionStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

// Mock localStorage
const localStore = {};
const localStorageMock = {
  getItem: (key) => localStore[key] ?? null,
  setItem: (key, value) => { localStore[key] = value; },
  removeItem: (key) => { delete localStore[key]; },
  clear: () => { Object.keys(localStore).forEach(k => delete localStore[k]); },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = async (url, opts) => {
  if (url.includes('route=auth') && opts?.method === 'POST') {
    const body = JSON.parse(opts.body);
    if (body.action === 'logout') {
      return { json: async () => ({ success: true }) };
    }
    if (body.username === 'admin' && body.password === 'admin123') {
      return {
        json: async () => ({
          success: true,
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoiYWRtaW4iLCJub21lIjoiQWRtaW4ifQ.test',
            user: { id: 1, username: 'admin', nome: 'Admin', role: 'admin' },
          },
        }),
      };
    }
    return {
      json: async () => ({
        success: false,
        message: 'Usuário ou senha inválidos',
      }),
    };
  }
  return { json: async () => ({ success: false }) };
};

// Mock escapeHtml from utils.js
globalThis.escapeHtml = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Load auth.js functions
const fs = require('fs');
const path = require('path');
const authCode = fs.readFileSync(path.resolve(__dirname, '../public/js/auth.js'), 'utf-8');
eval(authCode);

describe('auth.js', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.window = { location: { hash: '#/' } };
    document.body.innerHTML = `
      <aside id="sidebar" style="display: none;"></aside>
      <div id="userDisplay"></div>
    `;
  });

  test('getToken returns null when not set', () => {
    expect(getToken()).toBeNull();
  });

  test('getUser returns null when not set', () => {
    expect(getUser()).toBeNull();
  });

  test('isAuthenticated returns false when not logged in', () => {
    expect(isAuthenticated()).toBe(false);
  });

  test('login stores token and user', async () => {
    const user = await login('admin', 'admin123');
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
    expect(getToken()).toBeTruthy();
    expect(getUser()).toBeTruthy();
  });

  test('login throws on invalid credentials', async () => {
    try {
      await login('admin', 'wrong');
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe('Usuário ou senha inválidos');
    }
  });

  test('logout clears auth and redirects', () => {
    sessionStorage.setItem('rubble_token', 'test-token');
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, role: 'admin' }));
    logout();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  test('clearAuth removes all auth data', () => {
    sessionStorage.setItem('rubble_token', 'test');
    sessionStorage.setItem('rubble_user', '{"id":1}');
    clearAuth();
    expect(sessionStorage.getItem('rubble_token')).toBeNull();
    expect(sessionStorage.getItem('rubble_user')).toBeNull();
  });

  test('updateUserDisplay shows login link when not authenticated', () => {
    const displayEl = document.getElementById('userDisplay');
    updateUserDisplay();
    expect(displayEl.innerHTML).toContain('Entrar');
  });

  test('updateUserDisplay shows user name when authenticated', () => {
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, nome: 'Admin', role: 'admin' }));
    const displayEl = document.getElementById('userDisplay');
    updateUserDisplay();
    expect(displayEl.innerHTML).toContain('Admin');
    expect(displayEl.innerHTML).toContain('Sair');
  });

  test('toggleSidebar shows/hides sidebar', () => {
    const sidebar = document.getElementById('sidebar');
    toggleSidebar(true);
    expect(sidebar.style.display).toBe('');
    toggleSidebar(false);
    expect(sidebar.style.display).toBe('none');
  });
});
