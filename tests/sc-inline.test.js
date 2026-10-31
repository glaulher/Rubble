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

  test('normalizeScValue normaliza valores monetários em formato brasileiro', () => {
    expect(globalThis.normalizeScValue('valor_sc', '1.500,50')).toBe('1500.5');
    expect(globalThis.normalizeScValue('valor_sc', 'R$ 2.000,00')).toBe('2000');
    expect(globalThis.normalizeScValue('valor_sc', '150,00')).toBe('150');
    expect(globalThis.normalizeScValue('valor_sc', '0,00')).toBe('0');
    expect(globalThis.normalizeScValue('valor_sc', '1250.75')).toBe('1250.75');
    expect(globalThis.normalizeScValue('valor_sc', '')).toBeNull();
    expect(globalThis.normalizeScValue('valor_sc', '   ')).toBeNull();
    expect(() => globalThis.normalizeScValue('valor_sc', 'invalido')).toThrow();
    expect(() => globalThis.normalizeScValue('valor_sc', '-50')).toThrow();
  });

  test('normalizeScValue normaliza sla_dias e campos de texto', () => {
    expect(globalThis.normalizeScValue('sla_dias', '5')).toBe('5');
    expect(globalThis.normalizeScValue('sla_dias', '')).toBeNull();
    expect(() => globalThis.normalizeScValue('sla_dias', 'abc')).toThrow();
    expect(globalThis.normalizeScValue('numero_sc', 'SC-999')).toBe('SC-999');
    expect(globalThis.normalizeScValue('numero_sc', '   ')).toBeNull();
  });

  test('startScEdit monta wrapper com botoes salvar/cancelar e esconde lapis', () => {
    const card = document.createElement('div');
    card.dataset.scId = '10';
    card.innerHTML = `
      <div>
        <span data-sc-field="numero_sc" data-sc-value="SC-123">SC-123</span>
        <button type="button" data-sc-edit="numero_sc">Editar</button>
      </div>
    `;
    document.body.appendChild(card);

    globalThis.startScEdit(card, 'numero_sc');

    const wrapper = card.querySelector('.sc-inline-wrap');
    expect(wrapper).not.toBeNull();
    const input = wrapper.querySelector('input');
    expect(input).not.toBeNull();
    expect(input.value).toBe('SC-123');

    const saveBtn = wrapper.querySelector('button[aria-label="Salvar"]');
    const cancelBtn = wrapper.querySelector('button[aria-label="Cancelar"]');
    expect(saveBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();

    const pencil = card.querySelector('[data-sc-edit="numero_sc"]');
    expect(pencil.classList.contains('hidden')).toBe(true);

    card.remove();
  });

  test('startScEdit aninha o dropdown dentro do wrapper para site e equipamento', () => {
    const card = document.createElement('div');
    card.dataset.scId = '10';
    card.innerHTML = `
      <div>
        <span data-sc-field="equipamento" data-sc-value="Chiller 1">Chiller 1</span>
        <button type="button" data-sc-edit="equipamento">Editar</button>
      </div>
    `;
    document.body.appendChild(card);

    globalThis.startScEdit(card, 'equipamento');

    const wrapper = card.querySelector('.sc-inline-wrap');
    expect(wrapper).not.toBeNull();
    const dropdown = wrapper.querySelector('.autocomplete-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown.parentElement).toBe(wrapper);

    card.remove();
  });

  test('startScEdit inicializa createAutocomplete quando edita site ou equipamento', () => {
    let acConfig = null;
    globalThis.createAutocomplete = (cfg) => { acConfig = cfg; };

    const card = document.createElement('div');
    card.dataset.scId = '10';
    card.innerHTML = `
      <div>
        <span data-sc-field="site" data-sc-value="BMADTC">BMADTC</span>
        <button type="button" data-sc-edit="site">Editar</button>
      </div>
    `;
    document.body.appendChild(card);

    globalThis.startScEdit(card, 'site');

    expect(acConfig).not.toBeNull();
    expect(acConfig.inputSelector).toBe('#sc-inline-site-10');
    expect(acConfig.dropdownSelector).toBe('#sc-inline-dd-site-10');

    // Elementos existem no document no momento da chamada de createAutocomplete
    expect(document.querySelector(acConfig.inputSelector)).not.toBeNull();
    expect(document.querySelector(acConfig.dropdownSelector)).not.toBeNull();

    card.remove();
  });

  test('startScEdit nao quebra com campos de data (sem DOMException em select)', () => {
    const card = document.createElement('div');
    card.dataset.scId = '10';
    card.innerHTML = `
      <div>
        <span data-sc-field="data" data-sc-value="2026-10-31">31/10/2026</span>
        <button type="button" data-sc-edit="data">Editar</button>
      </div>
    `;
    document.body.appendChild(card);

    expect(() => globalThis.startScEdit(card, 'data')).not.toThrow();

    const wrapper = card.querySelector('.sc-inline-wrap');
    expect(wrapper).not.toBeNull();
    const input = wrapper.querySelector('input[type="date"]');
    expect(input).not.toBeNull();

    card.remove();
  });
});
