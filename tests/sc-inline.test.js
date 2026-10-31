import { describe, test, expect } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

const HELPERS = `
globalThis.escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
globalThis.showToast = () => {};
globalThis.apiFetch = () => Promise.resolve({ json: () => Promise.resolve({ success: true, data: {} }) });
globalThis.PollingManager = { start: () => {}, stop: () => {} };
globalThis.createAutocomplete = () => {};
globalThis.initScForm = () => {};
globalThis.debounce = (fn) => fn;
globalThis.SC_STATUSES = [
  { key: 'em_cotacao', label: 'Em cotação' },
  { key: 'orcamento_recebido', label: 'Orçamento recebido' },
  { key: 'sc_solicitada', label: 'SC solicitada' },
  { key: 'sc_aprovada', label: 'SC aprovada' },
  { key: 'pc_gerado', label: 'PC gerado' },
  { key: 'material_retirado', label: 'Material retirado' },
];
globalThis.scSteps = (status) => globalThis.SC_STATUSES.map((s, i) => ({
  key: s.key,
  label: s.label,
  done: i <= globalThis.SC_STATUSES.findIndex((x) => x.key === status),
}));
globalThis.formatPct = (v) => (v === null || v === undefined ? '—' : String(v));
globalThis.scStatusBadgeClass = () => '';
`;

evalModule('../public/js/sc/list.js', HELPERS);

describe('SC inline editing', () => {
  test('saveScField faz PATCH com id, field e value', async () => {
    const calls = [];
    globalThis.apiFetch = (url, opts) => {
      calls.push({ url, opts });
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: {} }) });
    };

    const ok = await globalThis.saveScField(7, 'numero_sc', 'SC-1');

    expect(ok).toBe(true);
    expect(calls[0].url).toContain('route=sc');
    expect(calls[0].opts.method).toBe('PATCH');
    expect(JSON.parse(calls[0].opts.body)).toEqual({ id: 7, field: 'numero_sc', value: 'SC-1' });
  });

  test('saveScField devolve false e avisa quando a API falha', async () => {
    let toasted = null;
    globalThis.showToast = (message, type) => { toasted = { message, type }; };
    globalThis.apiFetch = () => Promise.resolve({
      json: () => Promise.resolve({ success: false, message: 'Campo não editável.' }),
    });

    const ok = await globalThis.saveScField(7, 'id', 1);

    expect(ok).toBe(false);
    expect(toasted).toEqual({ message: 'Campo não editável.', type: 'error' });
  });
});
