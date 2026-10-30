import { describe, test, expect } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

evalModule('../public/js/sc/constants.js', '');

describe('SC constants', () => {
  test('SC_STATUSES tem as seis etapas na ordem', () => {
    const keys = globalThis.SC_STATUSES.map((s) => s.key);
    expect(keys).toEqual([
      'em_cotacao',
      'orcamento_recebido',
      'sc_solicitada',
      'sc_aprovada',
      'pc_gerado',
      'material_retirado',
    ]);
    expect(globalThis.SC_STATUSES[0].label).toBe('Em cotação');
  });

  test('scStepIndex devolve a posicao da etapa', () => {
    expect(globalThis.scStepIndex('em_cotacao')).toBe(0);
    expect(globalThis.scStepIndex('material_retirado')).toBe(5);
    expect(globalThis.scStepIndex('inventado')).toBe(-1);
  });

  test('scSteps marca as etapas ate a atual', () => {
    const steps = globalThis.scSteps('sc_aprovada');
    expect(steps.length).toBe(6);
    expect(steps.filter((s) => s.done).length).toBe(4);
    expect(steps[5].label).toBe('Material retirado');
  });

  test('scSteps com status desconhecido nao marca nada', () => {
    expect(globalThis.scSteps('inventado').filter((s) => s.done).length).toBe(0);
  });

  test('formatPct trata nulo, positivo e negativo', () => {
    expect(globalThis.formatPct(null)).toBe('—');
    expect(globalThis.formatPct(undefined)).toBe('—');
    expect(globalThis.formatPct(30)).toBe('+30,0%');
    expect(globalThis.formatPct(-5.25)).toBe('-5,3%');
    expect(globalThis.formatPct(0)).toBe('+0,0%');
  });

  test('scStatusBadgeClass cobre todas as etapas', () => {
    expect(globalThis.scStatusBadgeClass('em_cotacao')).toBe('bg-sky-100 text-sky-700');
    expect(globalThis.scStatusBadgeClass('orcamento_recebido')).toBe('bg-sky-100 text-sky-700');
    expect(globalThis.scStatusBadgeClass('sc_solicitada')).toBe('bg-amber-100 text-amber-700');
    expect(globalThis.scStatusBadgeClass('sc_aprovada')).toBe('bg-emerald-100 text-emerald-700');
    expect(globalThis.scStatusBadgeClass('pc_gerado')).toBe('bg-emerald-100 text-emerald-700');
    expect(globalThis.scStatusBadgeClass('material_retirado')).toBe('bg-slate-200 text-slate-700');
    expect(globalThis.scStatusBadgeClass('inventado')).toBe('bg-slate-100 text-slate-600');
  });
});
