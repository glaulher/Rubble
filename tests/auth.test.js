import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

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

// Load auth.js functions via the shared eval helper, which exposes the
// module's real named exports on globalThis.
evalModule('../public/js/core/auth.js', '');

var getToken = globalThis.getToken;
var getUser = globalThis.getUser;
var setToken = globalThis.setToken;
var setUser = globalThis.setUser;
var isAuthenticated = globalThis.isAuthenticated;
var parseJwtPayload = globalThis.parseJwtPayload;
var storeAuth = globalThis.storeAuth;
var clearAuth = globalThis.clearAuth;
var destroyTurnstile = globalThis.destroyTurnstile;
var login = globalThis.login;
var logout = globalThis.logout;
var authGuard = globalThis.authGuard;
var toggleSidebar = globalThis.toggleSidebar;
var updateUserDisplay = globalThis.updateUserDisplay;
var initLogin = globalThis.initLogin;
var startActiveCountPolling = globalThis.startActiveCountPolling;
var stopActiveCountPolling = globalThis.stopActiveCountPolling;
var fetchActiveCount = globalThis.fetchActiveCount;
var applyRoleVisibility = globalThis.applyRoleVisibility;

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

  test('applyRoleVisibility shows preventiva-dashboard for admin, supervisor, coordenador, cliente', () => {
    document.body.innerHTML = `
      <div id="dashboardMenuContainer" data-role="admin supervisor coordenador cliente">
        <a id="preventivaLink" href="#/preventiva-dashboard" data-role="admin supervisor coordenador cliente">Preventiva</a>
        <a id="pvLink" href="#/pv-dashboard" data-role="admin coordenador">PV</a>
      </div>
    `;

    const container = document.getElementById('dashboardMenuContainer');
    const prevLink = document.getElementById('preventivaLink');
    const pvLink = document.getElementById('pvLink');

    // Test cliente
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 2, role: 'cliente' }));
    applyRoleVisibility();
    expect(container.style.display).toBe('');
    expect(prevLink.style.display).toBe('');
    expect(pvLink.style.display).toBe('none');

    // Test supervisor
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 3, role: 'supervisor' }));
    applyRoleVisibility();
    expect(container.style.display).toBe('');
    expect(prevLink.style.display).toBe('');
    expect(pvLink.style.display).toBe('none');

    // Test coordenador
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 4, role: 'coordenador' }));
    applyRoleVisibility();
    expect(container.style.display).toBe('');
    expect(prevLink.style.display).toBe('');
    expect(pvLink.style.display).toBe('');

    // Test admin
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, role: 'admin' }));
    applyRoleVisibility();
    expect(container.style.display).toBe('');
    expect(prevLink.style.display).toBe('');
    expect(pvLink.style.display).toBe('');
  });
});
