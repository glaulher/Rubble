const PV_STATUSES = [
  'Aguardando doc.',
  'Aguardando orientação',
  'Aprovado serv.',
  'Enviado para o gerente',
  'E-mail de lib. aquisição/serviço',
  'Aprovado aquisição/serviço',
  'E-mail de aprov. serv. realizado',
  'SCM aprovado',
  'SCM negado',
  'SCM enviado',
  'Cancelado',
];

const PV_STATUS_COLORS = {
  'Aguardando doc.': 'bg-slate-100 text-slate-700',
  'Aguardando orientação': 'bg-amber-100 text-amber-700',
  'Aprovado serv.': 'bg-emerald-100 text-emerald-700',
  'Enviado para o gerente': 'bg-blue-100 text-blue-700',
  'E-mail de lib. aquisição/serviço': 'bg-indigo-100 text-indigo-700',
  'Aprovado aquisição/serviço': 'bg-green-100 text-green-700',
  'E-mail de aprov. serv. realizado': 'bg-teal-100 text-teal-700',
  'SCM aprovado': 'bg-cyan-100 text-cyan-700',
  'SCM negado': 'bg-red-100 text-red-700',
  'SCM enviado': 'bg-purple-100 text-purple-700',
  'Cancelado': 'bg-gray-100 text-gray-700',
};

const LPU_OPTIONS_ALL = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_clima', 'LPU Material Clima'],
  ['lpu_material_chiller', 'LPU Material Chiller'],
  ['lpu_servico_clima', 'LPU Serviço Clima'],
  ['lpu_servico_chiller', 'LPU Serviço Chiller'],
];

const LPU_OPTIONS_CHILLER = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_chiller', 'LPU Material Chiller'],
  ['lpu_servico_chiller', 'LPU Serviço Chiller'],
];

const LPU_OPTIONS_CLIMA = [
  ['lpu_civil', 'LPU Civil'],
  ['lpu_material_clima', 'LPU Material Clima'],
  ['lpu_servico_clima', 'LPU Serviço Clima'],
];

let pvItemCounter = 0;
let currentLpuOptions = LPU_OPTIONS_ALL;

const UNIT_MIN_ONE = [
  'CONJUNTO', 'CV', 'DIARIA', 'HH', 'HORA', 'KIT', 'Locação Mensal',
  'MENSAL', 'PAR', 'PÇ', 'PEÇA', 'PONTO', 'PROJETO', 'SACO', 'SERV.',
  'TR', 'UN.', 'UNIDADE', 'Un', 'UN', 'un', 'Unit',
];

function isUnitMinOne(unidade) {
  if (!unidade) return false;
  return UNIT_MIN_ONE.includes(unidade.trim());
}

function getQuantityAttrs(unidade) {
  if (isUnitMinOne(unidade)) {
    return 'step="1" min="1"';
  }
  return 'step="0.01" min="0"';
}
