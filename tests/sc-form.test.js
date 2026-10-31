import { describe, test, expect, beforeEach } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

const HELPERS = `
function showToast() {}
function apiFetch() {}
`;

evalModule('../public/js/sc/form.js', HELPERS);

describe('SC form', () => {
  test('buildScCreatePayload exige titulo e site', () => {
    expect(() => globalThis.buildScCreatePayload({ titulo_email: '', site: 'BMADTC' })).toThrow('O título da solicitação é obrigatório.');
    expect(() => globalThis.buildScCreatePayload({ titulo_email: 'x', site: '' })).toThrow('O site é obrigatório.');
  });

  test('buildScCreatePayload assume status inicial e data de hoje', () => {
    const p = globalThis.buildScCreatePayload({ titulo_email: 'Cotação', site: 'BMADTC' });
    expect(p.status).toBe('em_cotacao');
    expect(p.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.data_status).toBe(p.data);
  });

  test('buildScCreatePayload respeita a data escolhida no modal', () => {
    const p = globalThis.buildScCreatePayload({
      titulo_email: 'Cotação',
      site: 'BMADTC',
      data: '2026-10-05',
    });
    expect(p.data).toBe('2026-10-05');
    expect(p.data_status).toBe('2026-10-05');
  });

  test('buildScCreatePayload converte sla vazio em null', () => {
    const p = globalThis.buildScCreatePayload({ titulo_email: 'Cotação', site: 'BMADTC', sla_dias: '' });
    expect(p.sla_dias).toBeNull();
    const p2 = globalThis.buildScCreatePayload({ titulo_email: 'Cotação', site: 'BMADTC', sla_dias: undefined });
    expect(p2.sla_dias).toBeNull();
    const p3 = globalThis.buildScCreatePayload({ titulo_email: 'Cotação', site: 'BMADTC', sla_dias: null });
    expect(p3.sla_dias).toBeNull();
    const p4 = globalThis.buildScCreatePayload({ titulo_email: 'Cotação', site: 'BMADTC', sla_dias: '5' });
    expect(p4.sla_dias).toBe(5);
  });
});