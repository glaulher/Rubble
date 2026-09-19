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
globalThis.initPendingTickets = mock(() => {});
globalThis.initOsDashboard = mock(() => {});
globalThis.initFilters = mock(() => {});
globalThis.initPdfAudit = mock(() => {});
globalThis.initEquipamentDashboard = mock(() => {});
globalThis.initPreventivaDashboard = mock(() => {});

// Target inventory imports
globalThis.initInventoryList = mock(() => {});
globalThis.loadInventoryForm = mock(() => {});

globalThis.requestAnimationFrame = (cb) => cb();

describe('Inventory Integration — Sidebar (index.html)', () => {
  const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

  it('index.html contains inventory sidebar link with correct role, href and label', () => {
    document.body.innerHTML = indexHtml;
    const inventoryLink = document.querySelector('a[href="#/inventory"]');
    expect(inventoryLink).not.toBeNull();
    expect(inventoryLink.getAttribute('data-role')).toBe('admin coordenador supervisor');
    expect(inventoryLink.classList.contains('sidebar-link')).toBe(true);

    const label = inventoryLink.querySelector('.sidebar-label');
    expect(label).not.toBeNull();
    expect(label.textContent.trim()).toBe('Inventário');

    const tooltip = inventoryLink.querySelector('.sidebar-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent.trim()).toBe('Inventário');

    const svg = inventoryLink.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('applyRoleVisibility correctly shows/hides inventory sidebar link based on role', () => {
    // Evaluate auth.js to test real applyRoleVisibility
    evalModule('../public/js/core/auth.js', '');
    const realApplyRoleVisibility = globalThis.applyRoleVisibility;

    document.body.innerHTML = `
      <div id="sidebar">
        <a id="testInventoryLink" href="#/inventory" data-role="admin coordenador supervisor" class="sidebar-link">Inventário</a>
      </div>
    `;
    const link = document.getElementById('testInventoryLink');

    // Admin should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, role: 'admin' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Coordenador should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 2, role: 'coordenador' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Supervisor should see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 3, role: 'supervisor' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('');

    // Administrativo should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 4, role: 'administrativo' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');

    // Cliente should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 5, role: 'cliente' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');

    // Operador should NOT see link
    sessionStorage.setItem('rubble_user', JSON.stringify({ id: 6, role: 'operador' }));
    realApplyRoleVisibility();
    expect(link.style.display).toBe('none');
  });
});

describe('Inventory Integration — Router (public/js/router.js)', () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    globalThis.initInventoryList = mock(() => {});
    globalThis.loadInventoryForm = mock(() => {});
    globalThis.authGuard = mock(() => true);
    globalThis.PollingManager = { stopAll: mock(() => {}) };

    fetchMock = mock(async (url) => {
      if (url.includes('/app/Views/inventory/list.html')) {
        return { ok: true, text: async () => '<div id="inventoryListView">Lista de Inventário</div>' };
      }
      if (url.includes('/app/Views/inventory/form.html')) {
        return { ok: true, text: async () => '<div id="inventoryFormView">Formulário de Inventário</div>' };
      }
      return { ok: true, text: async () => '<div>Outra Página</div>' };
    });
    globalThis.fetch = fetchMock;

    evalModule('../public/js/router.js', '');
  });

  it('routes #/inventory to inventory list view and executes initInventoryList', async () => {
    window.location.hash = '#/inventory';
    await globalThis.router();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/list.html');

    const app = document.getElementById('app');
    expect(app.innerHTML).toContain('inventoryListView');
    expect(globalThis.initInventoryList).toHaveBeenCalled();
  });

  it('routes #/inventory with query parameters to list view and calls initInventoryList', async () => {
    window.location.hash = '#/inventory?search=Strada&status=em_posse';
    await globalThis.router();

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/list.html');
    expect(globalThis.initInventoryList).toHaveBeenCalled();
  });

  it('routes #inventory (without leading slash) to list view and calls initInventoryList', async () => {
    window.location.hash = '#inventory';
    await globalThis.router();

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/list.html');
    expect(globalThis.initInventoryList).toHaveBeenCalled();
  });

  it('routes #/inventoryForm to inventory form view and executes loadInventoryForm', async () => {
    window.location.hash = '#/inventoryForm';
    await globalThis.router();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/form.html');

    const app = document.getElementById('app');
    expect(app.innerHTML).toContain('inventoryFormView');
    expect(globalThis.loadInventoryForm).toHaveBeenCalled();
  });

  it('routes #/inventoryForm with query id to form view and executes loadInventoryForm', async () => {
    window.location.hash = '#/inventoryForm?id=10';
    await globalThis.router();

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/form.html');
    expect(globalThis.loadInventoryForm).toHaveBeenCalled();
  });

  it('routes #inventoryForm (without leading slash) to form view and executes loadInventoryForm', async () => {
    window.location.hash = '#inventoryForm';
    await globalThis.router();

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/app/Views/inventory/form.html');
    expect(globalThis.loadInventoryForm).toHaveBeenCalled();
  });

  it('does not load inventory or call init when authGuard returns false', async () => {
    globalThis.authGuard = mock(() => false);
    window.location.hash = '#/inventory';
    await globalThis.router();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(globalThis.initInventoryList).not.toHaveBeenCalled();
  });
});
