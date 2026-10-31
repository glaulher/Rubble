import { describe, test, expect, beforeEach } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

const HELPERS = `
globalThis.escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
globalThis.formatDate = (s) => String(s || '');
globalThis.showToast = () => {};
globalThis.apiFetch = () => Promise.resolve({ success: true, data: [], total: 0, status_counts: {} });
globalThis.PollingManager = { start: () => {}, stop: () => {} };
globalThis.createAutocomplete = () => {};
globalThis.initScForm = () => {};
globalThis.debounce = (fn) => fn;

const SC_STATUSES = [
  { key: 'em_cotacao', label: 'Em cotação' },
  { key: 'orcamento_recebido', label: 'Orçamento recebido' },
  { key: 'sc_solicitada', label: 'SC solicitada' },
  { key: 'sc_aprovada', label: 'SC aprovada' },
  { key: 'pc_gerado', label: 'PC gerado' },
  { key: 'material_retirado', label: 'Material retirado' },
];

function scStepIndex(status) {
  const index = SC_STATUSES.findIndex(s => s.key === status);
  return index;
}

function scSteps(status) {
  const current = scStepIndex(status);
  return SC_STATUSES.map((s, index) => ({ key: s.key, label: s.label, done: index <= current }));
}

function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  const formatted = number.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (number >= 0 ? '+' : '') + formatted + '%';
}

function scStatusBadgeClass(status) {
  const badges = {
    em_cotacao: 'bg-sky-100 text-sky-700',
    orcamento_recebido: 'bg-sky-100 text-sky-700',
    sc_solicitada: 'bg-amber-100 text-amber-700',
    sc_aprovada: 'bg-emerald-100 text-emerald-700',
    pc_gerado: 'bg-emerald-100 text-emerald-700',
    material_retirado: 'bg-slate-200 text-slate-700',
  };
  return badges[status] || 'bg-slate-100 text-slate-600';
}

globalThis.SC_STATUSES = SC_STATUSES;
globalThis.scStepIndex = scStepIndex;
globalThis.scSteps = scSteps;
globalThis.formatPct = formatPct;
globalThis.scStatusBadgeClass = scStatusBadgeClass;
`;

evalModule('../public/js/sc/list.js', HELPERS);

describe('SC list', () => {
  const item = {
    id: 1,
    titulo_email: 'Cotação filtros 20x20',
    status: 'sc_aprovada',
    site: 'BMADTC',
    equipamento: 'WM 01',
    capacidade: '10.00',
    localidade: 'Container 1',
    numero_sc: 'SC-9001',
    numero_pc: null,
    numero_pv: '260025',
    valor_sc: '1000.00',
    pv_valor_total: '1300.00',
    markup_pct: 30.0,
    margem_pct: 23.1,
    data: '2026-10-01',
    data_status: '2026-10-20',
    sla_dias: 3,
    overdue_days: 0,
    observacao: null,
  };

  beforeEach(() => {
    // Reset editing state
    if (globalThis.setScEditing) globalThis.setScEditing(false);
  });

  test('buildScCardHtml mostra titulo, numeros e equipamento formatado', () => {
    const html = globalThis.buildScCardHtml(item);
    expect(html).toContain('Cotação filtros 20x20');
    expect(html).toContain('SC-9001');
    expect(html).toContain('260025');
    expect(html).toContain('WM 01 — 10.00 TR - Container 1');
  });

  test('buildScCardHtml mostra as duas porcentagens', () => {
    const html = globalThis.buildScCardHtml(item);
    expect(html).toContain('+30,0%');
    expect(html).toContain('+23,1%');
  });

  test('buildScCardHtml mostra tracejado quando nao ha PV', () => {
    const html = globalThis.buildScCardHtml({ ...item, pv_valor_total: null, markup_pct: null, margem_pct: null });
    expect(html).toContain('—');
    expect(html).not.toContain('Infinity');
    expect(html).not.toContain('NaN');
  });

  test('buildScCardHtml mostra badge de atraso quando overdue_days > 0', () => {
    const html = globalThis.buildScCardHtml({ ...item, overdue_days: 4 });
    expect(html).toContain('4 dia');
  });

  test('buildScCardHtml tem select de status com as 6 etapas', () => {
    const html = globalThis.buildScCardHtml(item);
    expect((html.match(/<option/g) || []).length).toBe(6);
    expect(html).toContain('data-sc-field="status"');
  });

  test('buildScCardHtml escapa HTML do titulo', () => {
    const html = globalThis.buildScCardHtml({ ...item, titulo_email: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
  });

  test('setScEditing controla a pausa do polling', () => {
    expect(globalThis.isScEditing()).toBe(false);
    globalThis.setScEditing(true);
    expect(globalThis.isScEditing()).toBe(true);
    globalThis.setScEditing(false);
    expect(globalThis.isScEditing()).toBe(false);
  });

  test('resolveEquipmentPick usa o id quando o texto casa com a lista', () => {
    const items = [{ id: 5, label: 'WM 01 — 10.00 TR - Container 1' }];
    expect(globalThis.resolveEquipmentPick(items, 'WM 01 — 10.00 TR - Container 1'))
      .toEqual({ equipamento_id: 5, equipamento_texto: null });
  });

  test('resolveEquipmentPick grava texto livre quando nao casa', () => {
    const items = [{ id: 5, label: 'WM 01 — 10.00 TR - Container 1' }];
    expect(globalThis.resolveEquipmentPick(items, 'Bomba 3'))
      .toEqual({ equipamento_id: null, equipamento_texto: 'Bomba 3' });
  });

  test('resolveEquipmentPick vazio devolve dois null', () => {
    expect(globalThis.resolveEquipmentPick([], '')).toEqual({ equipamento_id: null, equipamento_texto: null });
    expect(globalThis.resolveEquipmentPick([], '   ')).toEqual({ equipamento_id: null, equipamento_texto: null });
  });
});