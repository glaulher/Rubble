import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const store = {};
globalThis.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.localStorage = globalThis.sessionStorage;

const VIEW = readFileSync(resolve(import.meta.dir, '../app/Views/sc/list.html'), 'utf-8');
const TOAST = '<div id="toast" class="hidden"><span id="toastIcon"></span><span id="toastMessage"></span><div id="toastProgress" class="hidden"></div></div>';

const ITEM = {
  id: 1, titulo_email: 'Cotacao filtros', status: 'sc_aprovada', site: 'BMADTC',
  equipamento: 'WM 01', capacidade: '10.00', localidade: 'Container 1',
  numero_sc: 'SC-1', numero_pc: null, numero_pv: '260025',
  valor_sc: '1000.00', pv_valor_total: '1300.00', markup_pct: 30, margem_pct: 23.1,
  data: '2026-10-01', data_status: '2026-10-20', sla_dias: 3, overdue_days: 4, observacao: null,
};

function mountView() {
  document.body.innerHTML = VIEW + TOAST;
}

function mockApi(items = [ITEM]) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url).includes('route=sc')) {
      return { json: async () => ({
        success: true,
        total: items.length,
        status_counts: { sc_aprovada: items.length },
        data: items,
      }) };
    }

    return { json: async () => ({ success: true, data: ['BMADTC'] }) };
  };

  return calls;
}

describe('SC view integration', () => {
  test('initSc renderiza cards e atualiza os contadores', async () => {
    mountView();
    const calls = mockApi();

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const listEl = document.getElementById('scList');
    expect(listEl.innerHTML).toContain('Cotacao filtros');
    expect(listEl.innerHTML).toContain('SC-1');
    expect(document.getElementById('scCounter').textContent).toBe('1');
    expect(document.getElementById('scOverdue').textContent).toBe('1');
    expect(calls.length).toBeGreaterThan(0);
  });

  test('voltar para a tela restaura os filtros que continuam ativos', async () => {
    mountView();
    mockApi();

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const status = document.getElementById('scStatusFilter');
    status.value = 'sc_aprovada';
    status.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 10));

    // Navegação: a view é remontada do zero.
    mountView();
    await list.initSc();

    expect(document.getElementById('scStatusFilter').value).toBe('sc_aprovada');
  });

  test('initSc zera o estado de edição (não mata o polling para sempre)', async () => {
    mountView();
    mockApi();

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    list.setScEditing(true);
    expect(list.isScEditing()).toBe(true);

    await list.initSc();

    expect(list.isScEditing()).toBe(false);
  });

  test('re-render com editor aberto descarta a edição e libera o polling', async () => {
    mountView();
    mockApi();

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const card = document.querySelector('[data-sc-id="1"]');
    list.startScEdit(card, 'titulo_email');
    expect(list.isScEditing()).toBe(true);

    await list.loadSc();

    expect(list.isScEditing()).toBe(false);
    expect(document.querySelector('[data-sc-id="1"] [data-sc-edit="titulo_email"]')).not.toBeNull();
  });

  test('registrar sem título avisa o usuário em vez de falhar em silêncio', async () => {
    mountView();
    mockApi();

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    document.getElementById('scTitulo').value = '';
    document.getElementById('scSite').value = 'BMADTC';

    document.getElementById('formSc').dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));

    const message = document.getElementById('toastMessage').textContent;
    expect(message).toContain('título');
  });
});
