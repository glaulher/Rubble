import { describe, test, expect } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

evalModule('../public/js/sc/constants.js', '');

describe('SC constants', () => {
  test('SC_STATUSES tem as oito etapas na ordem', () => {
    const keys = globalThis.SC_STATUSES.map((s) => s.key);
    expect(keys).toEqual([
      'enviar_email',
      'solicitada_cotacao',
      'orcamento_recebido',
      'sc_solicitada',
      'sc_aprovada',
      'pc_gerado',
      'material_retirado',
      'sc_cancelada',
    ]);
    expect(globalThis.SC_STATUSES[0].label).toBe('Enviar e-mail');
    expect(globalThis.SC_STATUSES[7].label).toBe('SC cancelada');
  });

  test('scStepIndex devolve a posicao da etapa', () => {
    expect(globalThis.scStepIndex('enviar_email')).toBe(0);
    expect(globalThis.scStepIndex('material_retirado')).toBe(6);
    expect(globalThis.scStepIndex('sc_cancelada')).toBe(7);
    expect(globalThis.scStepIndex('inventado')).toBe(-1);
  });

  test('scSteps marca as etapas ate a atual', () => {
    const steps = globalThis.scSteps('sc_aprovada');
    expect(steps.length).toBe(8);
    expect(steps.filter((s) => s.done).length).toBe(5);
    expect(steps[6].label).toBe('Material retirado');
    expect(steps[7].label).toBe('SC cancelada');
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
    expect(globalThis.scStatusBadgeClass('enviar_email')).toBe('bg-sky-100 text-sky-700');
    expect(globalThis.scStatusBadgeClass('solicitada_cotacao')).toBe('bg-blue-100 text-blue-700');
    expect(globalThis.scStatusBadgeClass('orcamento_recebido')).toBe('bg-violet-100 text-violet-700');
    expect(globalThis.scStatusBadgeClass('sc_solicitada')).toBe('bg-amber-100 text-amber-700');
    expect(globalThis.scStatusBadgeClass('sc_aprovada')).toBe('bg-emerald-100 text-emerald-700');
    expect(globalThis.scStatusBadgeClass('pc_gerado')).toBe('bg-emerald-100 text-emerald-700');
    expect(globalThis.scStatusBadgeClass('material_retirado')).toBe('bg-slate-200 text-slate-700');
    expect(globalThis.scStatusBadgeClass('sc_cancelada')).toBe('bg-red-100 text-red-700');
    expect(globalThis.scStatusBadgeClass('inventado')).toBe('bg-slate-100 text-slate-600');
  });
});
