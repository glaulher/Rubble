export const PV_STATUSES = [
  'Aguardando envio',
  'Aprovado serv.',
  'E-mail de lib. aquisição/serviço',
  'Aprovado aquisição/serviço',
  'E-mail de aprov. serv. realizado',
  'SCM aprovado',
  'SCM negado',
  'SCM enviado',
  'Cancelado',
];

export const PV_STATUS_COLORS = {
  'Aguardando envio': 'bg-amber-100 text-amber-700',
  'Aprovado serv.': 'bg-emerald-100 text-emerald-700',
  'E-mail de lib. aquisição/serviço': 'bg-indigo-100 text-indigo-700',
  'Aprovado aquisição/serviço': 'bg-green-100 text-green-700',
  'E-mail de aprov. serv. realizado': 'bg-teal-100 text-teal-700',
  'SCM aprovado': 'bg-cyan-100 text-cyan-700',
  'SCM negado': 'bg-red-100 text-red-700',
  'SCM enviado': 'bg-purple-100 text-purple-700',
  'Cancelado': 'bg-gray-100 text-gray-700',
};

export const PV_STATUS_PRIORITY = {
  'SCM negado': 1,
  'Aguardando envio': 2,
  'Aprovado serv.': 3,
  'E-mail de lib. aquisição/serviço': 4,
  'Aprovado aquisição/serviço': 5,
  'E-mail de aprov. serv. realizado': 6,
  'SCM enviado': 7,
  'SCM aprovado': 8,
  'Cancelado': 9,
};

export const LPU_OPTIONS_ALL = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_clima', 'LPU Material Clima'],
  ['lpu_material_chiller', 'LPU Material Chiller'],
  ['lpu_servico_clima', 'LPU Serviço Clima'],
  ['lpu_servico_chiller', 'LPU Serviço Chiller'],
];

export const LPU_OPTIONS_CHILLER = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_chiller', 'LPU Material Chiller'],
  ['lpu_servico_chiller', 'LPU Serviço Chiller'],
];

export const LPU_OPTIONS_CLIMA = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_clima', 'LPU Material Clima'],
  ['lpu_servico_clima', 'LPU Serviço Clima'],
];

let pvItemCounter = 0;
let currentLpuOptions = LPU_OPTIONS_ALL;

export const UNIT_MIN_ONE = [
  'CONJUNTO', 'CV', 'DIARIA', 'HH', 'HORA', 'KIT', 'LOCAÇÃO MENSAL',
  'MENSAL', 'PAR', 'PÇ', 'PEÇA', 'PONTO', 'PROJETO', 'SACO', 'SERV.',
  'TR', 'UN.', 'UNIDADE', 'UNIT.',
];

export function isUnitMinOne(unidade) {
  if (!unidade) return false;
  return UNIT_MIN_ONE.includes(unidade.trim().toUpperCase());
}

export function getQuantityAttrs(unidade) {
  if (isUnitMinOne(unidade)) {
    return 'step="1" min="1"';
  }
  return 'step="0.01" min="0"';
}

export function getPvItemCounter() {
  return pvItemCounter;
}

export function incrementPvItemCounter() {
  return pvItemCounter++;
}

export function resetPvItemCounter() {
  pvItemCounter = 0;
}

export function setCurrentLpuOptions(options) {
  currentLpuOptions = options;
}

export function getCurrentLpuOptions() {
  return currentLpuOptions;
}

if (typeof globalThis !== 'undefined') {
  globalThis.PV_STATUSES = PV_STATUSES;
  globalThis.PV_STATUS_COLORS = PV_STATUS_COLORS;
  globalThis.PV_STATUS_PRIORITY = PV_STATUS_PRIORITY;
  globalThis.LPU_OPTIONS_ALL = LPU_OPTIONS_ALL;
  globalThis.LPU_OPTIONS_CHILLER = LPU_OPTIONS_CHILLER;
  globalThis.LPU_OPTIONS_CLIMA = LPU_OPTIONS_CLIMA;
  globalThis.UNIT_MIN_ONE = UNIT_MIN_ONE;
  globalThis.isUnitMinOne = isUnitMinOne;
  globalThis.getQuantityAttrs = getQuantityAttrs;
  Object.defineProperty(globalThis, 'pvItemCounter', {
    get: getPvItemCounter,
    set: function (v) { pvItemCounter = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'currentLpuOptions', {
    get: getCurrentLpuOptions,
    set: function (v) { currentLpuOptions = v; },
    configurable: true,
  });
}
