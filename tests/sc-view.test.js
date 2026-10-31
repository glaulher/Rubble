import { describe, test, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';


const store = {};
globalThis.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.localStorage = globalThis.sessionStorage;

describe('SC view integration', () => {
  test('initSc renderiza cards e nao lanca', async () => {
    const html = readFileSync(resolve(import.meta.dir, '../app/Views/sc/list.html'), 'utf-8');
    document.body.innerHTML = html;

    let listCalls = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes('route=sc')) {
        listCalls++;
        return { json: async () => ({
          success: true,
          total: 1,
          status_counts: { sc_aprovada: 1 },
          data: [{
            id: 1, titulo_email: 'Cotacao filtros', status: 'sc_aprovada', site: 'BMADTC',
            equipamento: 'WM 01', capacidade: '10.00', localidade: 'Container 1',
            numero_sc: 'SC-1', numero_pc: null, numero_pv: '260025',
            valor_sc: '1000.00', pv_valor_total: '1300.00', markup_pct: 30, margem_pct: 23.1,
            data: '2026-10-01', data_status: '2026-10-20', sla_dias: 3, overdue_days: 4, observacao: null,
          }],
        }) };
      }
      return { json: async () => ({ success: true, data: ['BMADTC'] }) };
    };

    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const listEl = document.getElementById('scList');
    expect(listEl.innerHTML).toContain('Cotacao filtros');
    expect(listEl.innerHTML).toContain('SC-1');
    expect(document.getElementById('scCounter').textContent).toBe('1');
    expect(document.getElementById('scOverdue').textContent).toBe('1');
    expect(listCalls).toBeGreaterThan(0);
  });
});
