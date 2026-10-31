import { describe, it, expect, beforeEach, mock } from 'bun:test';

window.location.hash = '#/login';

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
import fs from 'fs';

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

describe('Termo Public Sign Page Rendering', () => {
  beforeEach(() => {
    const html = fs.readFileSync('app/Views/termo/public-sign.html', 'utf-8');
    document.body.innerHTML = `<div id="app">${html}</div>`;
  });

  it('renders items list and observations when termo is pending signature', async () => {
    window.location.hash = '#/assinar-termo?token=1234567890123456789012345678901234567890123456789012345678901234';

    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        already_signed: false,
        data: {
          id: 1,
          codigo: 'TR-2026-0001',
          entregue_por: 'Mauro',
          tecnico_nome: 'Carlos Silva',
          observacoes: 'Acompanha maleta e cabo de força',
          itens: [
            { id: 10, material_nome: 'Bomba de Vácuo', modelo: '7 CFM', serial: 'BV-01' },
            { id: 11, material_nome: 'Recolhedora', modelo: 'R410A', serial: 'REC-99' },
          ],
        },
      }),
    }));

    const { initPublicSign } = await import('../public/js/termo/public-sign.js');
    await initPublicSign();

    const signState = document.getElementById('termoSignState');
    expect(signState.classList.contains('hidden')).toBe(false);

    const itemsList = document.getElementById('signItemsList');
    expect(itemsList.children.length).toBe(2);
    expect(itemsList.innerHTML).toContain('Bomba de Vácuo');
    expect(itemsList.innerHTML).toContain('7 CFM');
    expect(itemsList.innerHTML).toContain('BV-01');
    expect(itemsList.innerHTML).toContain('Recolhedora');
    expect(itemsList.innerHTML).toContain('REC-99');

    const badge = document.getElementById('signItemsCountBadge');
    expect(badge.textContent).toBe('2 itens');

    const obs = document.getElementById('signObservacoesText');
    expect(obs.textContent).toBe('Acompanha maleta e cabo de força');
    expect(document.getElementById('signObservacoesContainer').classList.contains('hidden')).toBe(false);
  });

  it('renders items list and observations when termo is already signed', async () => {
    window.location.hash = '#/assinar-termo?token=1234567890123456789012345678901234567890123456789012345678901234';

    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        already_signed: true,
        data: {
          id: 2,
          codigo: 'TR-2026-0002',
          entregue_por: 'Mauro',
          tecnico_nome: 'Raphael Donato',
          assinado_em: '2026-10-30 14:00:00',
          observacoes: 'Ferramenta testada e calibrada',
          itens: [
            { id: 20, material_nome: 'Manômetro Digital', modelo: 'Testo 550s', serial: 'MAN-550' },
          ],
        },
      }),
    }));

    const { initPublicSign } = await import('../public/js/termo/public-sign.js');
    await initPublicSign();

    const successState = document.getElementById('termoSuccessState');
    expect(successState.classList.contains('hidden')).toBe(false);

    const itemsList = document.getElementById('successItemsList');
    expect(itemsList.children.length).toBe(1);
    expect(itemsList.innerHTML).toContain('Manômetro Digital');
    expect(itemsList.innerHTML).toContain('Testo 550s');
    expect(itemsList.innerHTML).toContain('MAN-550');

    const badge = document.getElementById('successItemsCountBadge');
    expect(badge.textContent).toBe('1 item');

    const obs = document.getElementById('successObservacoesText');
    expect(obs.textContent).toBe('Ferramenta testada e calibrada');
  });
});
