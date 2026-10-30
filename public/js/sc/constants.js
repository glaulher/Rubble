export const SC_STATUSES = [
  { key: 'em_cotacao', label: 'Em cotação' },
  { key: 'orcamento_recebido', label: 'Orçamento recebido' },
  { key: 'sc_solicitada', label: 'SC solicitada' },
  { key: 'sc_aprovada', label: 'SC aprovada' },
  { key: 'pc_gerado', label: 'PC gerado' },
  { key: 'material_retirado', label: 'Material retirado' },
];

const SC_STATUS_BADGES = {
  em_cotacao: 'bg-sky-100 text-sky-700',
  orcamento_recebido: 'bg-sky-100 text-sky-700',
  sc_solicitada: 'bg-amber-100 text-amber-700',
  sc_aprovada: 'bg-emerald-100 text-emerald-700',
  pc_gerado: 'bg-emerald-100 text-emerald-700',
  material_retirado: 'bg-slate-200 text-slate-700',
};

export function scStepIndex(status) {
  const index = SC_STATUSES.findIndex((s) => s.key === status);

  return index;
}

export function scSteps(status) {
  const current = scStepIndex(status);

  return SC_STATUSES.map((s, index) => ({
    key: s.key,
    label: s.label,
    done: index <= current,
  }));
}

export function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  const number = Number(value);
  const formatted = number.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (number >= 0 ? '+' : '') + formatted + '%';
}

export function scStatusBadgeClass(status) {
  return SC_STATUS_BADGES[status] || 'bg-slate-100 text-slate-600';
}

export function scStatusLabel(status) {
  const found = SC_STATUSES.find((s) => s.key === status);

  return found ? found.label : status || '—';
}
