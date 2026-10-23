import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { evalModule } from './helpers/eval-module.js';

// Mock storage
const storage = {};
const sessionStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
try {
  Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });
} catch (_) {
  globalThis.sessionStorage = sessionStorageMock;
}

const localStore = {};
const localStorageMock = {
  getItem: (key) => localStore[key] ?? null,
  setItem: (key, value) => { localStore[key] = value; },
  removeItem: (key) => { delete localStore[key]; },
  clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); },
};
try {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
} catch (_) {
  globalThis.localStorage = localStorageMock;
}

if (!globalThis.window) {
  globalThis.window = { location: { hash: '#/' }, addEventListener: () => {} };
} else if (typeof globalThis.window.addEventListener !== 'function') {
  globalThis.window.addEventListener = () => {};
}

// Global mocks needed by router.js and auth.js
globalThis.PollingManager = { stopAll: mock(() => {}) };
globalThis.authGuard = mock(() => true);
globalThis.destroyTurnstile = mock(() => {});
globalThis.updateUserDisplay = mock(() => {});
globalThis.applyRoleVisibility = mock(() => {});
globalThis.initLogin = mock(() => {});
globalThis.initHome = mock(() => {});
globalThis.loadHomeForm = mock(() => {});
globalThis.loadPvForm = mock(() => {});
globalThis.initPvDashboard = mock(() => {});
globalThis.initPv = mock(() => {});
globalThis.loadUserForm = mock(() => {});
globalThis.initUsers = mock(() => {});
globalThis.loadEquipmentForm = mock(() => {});
globalThis.initEquipmentManager = mock(() => {});
globalThis.initPriceForm = mock(() => {});
globalThis.initPriceList = mock(() => {});
globalThis.initPreventiveCycle = mock(() => {});
globalThis.initScm = mock(() => {});
globalThis.initPlannedActivity = mock(() => {});
globalThis.initPlannedSummary = mock(() => {});
globalThis.initPendingTickets = mock(() => {});
globalThis.initOsDashboard = mock(() => {});
globalThis.initFilters = mock(() => {});
globalThis.initPdfAudit = mock(() => {});
globalThis.initEquipamentDashboard = mock(() => {});
globalThis.initPreventivaDashboard = mock(() => {});
globalThis.initInventoryList = mock(() => {});
globalThis.loadInventoryForm = mock(() => {});
globalThis.initAdminAudit = mock(() => {});
globalThis.initPreditivaParse = mock(() => {});

// Target diario import
globalThis.initDiarioList = mock(() => {});

globalThis.requestAnimationFrame = (cb) => cb();

describe('Diário Integration — Sidebar (index.html)', () => {
  const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

  it('index.html contains diario sidebar link with correct role, href and label', () => {
    document.body.innerHTML = indexHtml;
    const diarioLink = document.querySelector('a[href="#/diario"]');
    expect(diarioLink).not.toBeNull();
    expect(diarioLink.getAttribute('data-role')).toBe('admin supervisor coordenador gerente');

    const span = diarioLink.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.textContent.trim()).toBe('Diário de Atividades');

    const svg = diarioLink.querySelector('svg');
    expect(svg).not.toBeNull();

    // Must be inside #plannedSubmenu
    const plannedSubmenu = document.getElementById('plannedSubmenu');
    expect(plannedSubmenu).not.toBeNull();
    expect(plannedSubmenu.contains(diarioLink)).toBe(true);
  });

  it('applyRoleVisibility correctly shows/hides diario sidebar link based on role', () => {
    evalModule('../public/js/core/auth.js', '');
    const realApplyRoleVisibility = globalThis.applyRoleVisibility;

    document.body.innerHTML = `
      <div id="sidebar">
        <a id="testDiarioLink" href="#/diario" data-role="admin supervisor coordenador gerente">Diário</a>
      </div>
    `;
    const link = document.getElementById('testDiarioLink');

    // Admin should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, role: 'admin' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Supervisor should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 2, role: 'supervisor' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Coordenador should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 3, role: 'coordenador' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Gerente should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 4, role: 'gerente' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Administrativo should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 5, role: 'administrativo' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');

    // Cliente should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 6, role: 'cliente' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');

    // Operador should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 7, role: 'operador' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');
  });
});

describe('Diário Integration — Router (public/js/router.js)', () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    globalThis.initDiarioList = mock(() => {});
    globalThis.authGuard = mock(() => true);
    globalThis.PollingManager = { stopAll: mock(() => {}) };

    fetchMock = mock(async (url) => {
      if (url.includes('/app/Views/diario/list.html')) {
        return { ok: true, text: async () => '<div id="diarioListView">Lista Diário de Atividades</div>' };
      }
      return { ok: true, text: async () => '<div>Outra Página</div>' };
    });
    globalThis.fetch = fetchMock;

    evalModule('../public/js/router.js', '');
  });

  it('routes #/diario to diario list view and executes initDiarioList', async () => {
    window.location.hash = '#/diario';
    await globalThis.router();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/diario/list.html?v=48');
    expect(document.getElementById('app').innerHTML).toBe('<div id="diarioListView">Lista Diário de Atividades</div>');
    expect(globalThis.initDiarioList).toHaveBeenCalled();
  });

  it('routes #/diario with query parameters to list view and calls initDiarioList', async () => {
    window.location.hash = '#/diario?categoria=corretiva&status=Pendente';
    await globalThis.router();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/diario/list.html?v=48');
    expect(document.getElementById('app').innerHTML).toBe('<div id="diarioListView">Lista Diário de Atividades</div>');
    expect(globalThis.initDiarioList).toHaveBeenCalled();
  });

  it('routes #diario (without leading slash) to list view and calls initDiarioList', async () => {
    window.location.hash = '#diario';
    await globalThis.router();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/diario/list.html?v=48');
    expect(document.getElementById('app').innerHTML).toBe('<div id="diarioListView">Lista Diário de Atividades</div>');
    expect(globalThis.initDiarioList).toHaveBeenCalled();
  });

  it('does not load diario or call init when authGuard returns false', async () => {
    globalThis.authGuard = mock(() => false);
    evalModule('../public/js/router.js', '');

    window.location.hash = '#/diario';
    await globalThis.router();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(globalThis.initDiarioList).not.toHaveBeenCalled();
  });
});
