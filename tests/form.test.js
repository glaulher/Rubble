import { describe, it, expect, beforeEach } from "bun:test";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

var PV_STATUSES = ['Ativo', 'SCM aprovado', 'Cancelado'];

function populateStatusSelect(selectId, selected) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  PV_STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

var LPU_OPTIONS_ALL = [['lpu_material_clima', 'LPU Material Clima']];
var pvItemCounter = 0;

function getItemData(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return null;

  const fatura = row.querySelector('.item-fatura').value;

  return {
    lpu_origem: row.querySelector('.item-lpu-origem').value || null,
    numero_item: row.querySelector('.item-numero-item').value
      ? parseInt(row.querySelector('.item-numero-item').value)
      : null,
    descricao_lpu: row.querySelector('.item-descricao-lpu').value || null,
    descricao: row.querySelector('.item-descricao').value.trim() || null,
    valor: row.querySelector('.item-valor').value
      ? parseFloat(row.querySelector('.item-valor').value)
      : null,
    quantidade: row.querySelector('.item-quantidade').value
      ? parseFloat(row.querySelector('.item-quantidade').value)
      : null,
    fatura: fatura || null,
    valor_flpu: row.querySelector('.item-valor-flpu').value
      ? parseFloat(row.querySelector('.item-valor-flpu').value)
      : null,
    bdi: row.querySelector('.item-bdi').value
      ? parseFloat(row.querySelector('.item-bdi').value)
      : null,
    scm: row.querySelector('.item-scm').value.trim() || null,
    laudo: row.querySelector('.item-laudo').value.trim() || null,
  };
}

function resetForm() {
  document.getElementById('pvId').value = '';
  document.getElementById('numeroPv').value = '';
  document.getElementById('numeroPv').placeholder = 'Auto';
  document.getElementById('numeroPvHint').textContent = 'Gerado automaticamente ao salvar';
  document.getElementById('numeroPvGroup').classList.add('hidden');
  document.getElementById('data').value = '';
  document.getElementById('ciclo').value = '';
  document.getElementById('local').value = '';
  document.getElementById('osSearch').value = '';
  document.getElementById('ral').value = '';
  document.getElementById('equipamentoId').value = '';
  document.getElementById('ticketIds').value = '[]';
  document.getElementById('osPills').innerHTML = '';

  const container = document.getElementById('pvItemsContainer');
  container.innerHTML = '';

  pvItemCounter = 0;

  document.getElementById('buttonText').textContent = 'Salvar PV';
  document.getElementById('formTitle').textContent = 'Nova PV';
}

function getFormData() {
  const itemRows = document.querySelectorAll('.item-row');
  const itens = [];

  itemRows.forEach((row) => {
    const index = parseInt(row.dataset.itemIndex);
    const data = getItemData(index);
    if (data) itens.push(data);
  });

  return {
    id: document.getElementById('pvId').value || null,
    numero_pv: document.getElementById('numeroPv').value,
    data: document.getElementById('data').value || null,
    ciclo: document.getElementById('ciclo').value || null,
    local: document.getElementById('local').value.trim(),
    status: document.getElementById('status').value,
    ral: document.getElementById('ral').value.trim(),
    equipamento_id: document.getElementById('equipamentoId').value,
    ticket_ids: (function() {
      try { return JSON.parse(document.getElementById('ticketIds').value || '[]'); }
      catch { return []; }
    })(),
    itens,
  };
}

function validateCycle(cycle) {
  if (!cycle) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cycle)) {
    return 'Formato de ciclo inválido. Use AAAA-MM (ex: 2026-06)';
  }
  return null;
}

function validateItemFatura(item) {
  if (!item.fatura) return 'Selecione o tipo de fatura para todos os itens';
  return null;
}

function validateItemQuantity(item) {
  if (!item.quantidade || item.quantidade <= 0) return 'Informe a quantidade para todos os itens';
  return null;
}

function validateLpuItem(item) {
  if (item.fatura === 'lpu') {
    if (!item.lpu_origem) return 'Selecione a LPU Origem para todos os itens LPU';
    if (!item.numero_item || item.numero_item <= 0) return 'Informe o Nº Item para todos os itens LPU';
    if (!item.descricao_lpu) return 'Item LPU não encontrado na base';
  }
  return null;
}

// --- resetForm ---

describe("resetForm", () => {
  beforeEach(() => {
    pvItemCounter = 5;
    document.body.innerHTML =
      '<input id="pvId" value="1">' +
      '<input id="numeroPv" value="26001">' +
      '<span id="numeroPvHint">Hint</span>' +
      '<div id="numeroPvGroup"></div>' +
      '<input id="data" value="2026-05-21">' +
      '<input id="ciclo" value="2026-05">' +
      '<input id="local" value="Sala A">' +
      '<input id="osSearch" value="OS-001">' +
      '<input id="ral" value="RAL-001">' +
      '<input id="ticketIds" value="[]">' +
      '<div id="osPills"></div>' +
      '<select id="equipamentoId"><option value="5">Machine</option></select>' +
      '<div id="pvItemsContainer"><div class="item-row">item</div></div>' +
      '<span id="buttonText">Atualizar PV</span>' +
      '<span id="formTitle">Editar PV</span>';
  });

  it("clears all form fields", () => {
    resetForm();
    expect(document.getElementById('pvId').value).toBe('');
    expect(document.getElementById('numeroPv').value).toBe('');
    expect(document.getElementById('numeroPv').placeholder).toBe('Auto');
    expect(document.getElementById('numeroPvHint').textContent).toBe('Gerado automaticamente ao salvar');
    expect(document.getElementById('data').value).toBe('');
    expect(document.getElementById('ciclo').value).toBe('');
    expect(document.getElementById('local').value).toBe('');
    expect(document.getElementById('osSearch').value).toBe('');
    expect(document.getElementById('ral').value).toBe('');
    expect(document.getElementById('equipamentoId').value).toBe('');
  });

  it("clears items container and resets counter", () => {
    resetForm();
    expect(document.getElementById('pvItemsContainer').innerHTML).toBe('');
    expect(pvItemCounter).toBe(0);
  });

  it("resets title and button text", () => {
    resetForm();
    expect(document.getElementById('buttonText').textContent).toBe('Salvar PV');
    expect(document.getElementById('formTitle').textContent).toBe('Nova PV');
  });

  it("hides numeroPvGroup", () => {
    resetForm();
    expect(document.getElementById('numeroPvGroup').classList.contains('hidden')).toBe(true);
  });
});

// --- getFormData ---

describe("getFormData", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="pvId" value="1">' +
      '<input id="numeroPv" value="26001">' +
      '<input id="data" value="2026-05-21">' +
      '<input id="ciclo" value="2026-05">' +
      '<input id="local" value="Sala A">' +
      '<select id="status"><option value="Ativo">Ativo</option></select>' +
      '<input id="ral" value="">' +
      '<input id="ticketIds" value="[1, 2]">' +
      '<div id="osPills"></div>' +
      '<input id="osSearch" value="">' +
      '<select id="equipamentoId"><option value="5">Machine</option></select>' +
      '<div id="pvItemsContainer"></div>';
  });

  it("collects form field values", () => {
    const data = getFormData();
    expect(data.id).toBe('1');
    expect(data.numero_pv).toBe('26001');
    expect(data.data).toBe('2026-05-21');
    expect(data.ciclo).toBe('2026-05');
    expect(data.local).toBe('Sala A');
    expect(data.status).toBe('Ativo');
    expect(data.ral).toBe('');
    expect(data.ticket_ids).toEqual([1, 2]);
    expect(data.equipamento_id).toBe('5');
    expect(data.itens).toEqual([]);
  });
});

// --- validateCycle ---

describe("validateCycle", () => {
  it("returns null for valid cycle", () => {
    expect(validateCycle("2026-06")).toBeNull();
    expect(validateCycle("2030-12")).toBeNull();
  });

  it("returns error for invalid format", () => {
    expect(validateCycle("2026-6")).not.toBeNull();
    expect(validateCycle("26-06")).not.toBeNull();
    expect(validateCycle("2026-13")).not.toBeNull();
    expect(validateCycle("2026-00")).not.toBeNull();
  });

  it("returns null for empty cycle", () => {
    expect(validateCycle("")).toBeNull();
    expect(validateCycle(null)).toBeNull();
  });
});

// --- validateItemFatura ---

describe("validateItemFatura", () => {
  it("returns null when fatura is set", () => {
    expect(validateItemFatura({ fatura: 'lpu' })).toBeNull();
    expect(validateItemFatura({ fatura: 'flpu' })).toBeNull();
  });

  it("returns error when fatura is missing", () => {
    expect(validateItemFatura({})).not.toBeNull();
    expect(validateItemFatura({ fatura: null })).not.toBeNull();
    expect(validateItemFatura({ fatura: '' })).not.toBeNull();
  });
});

// --- validateItemQuantity ---

describe("validateItemQuantity", () => {
  it("returns null when quantity is valid", () => {
    expect(validateItemQuantity({ quantidade: 1 })).toBeNull();
    expect(validateItemQuantity({ quantidade: 5.5 })).toBeNull();
  });

  it("returns error when quantity is missing or zero", () => {
    expect(validateItemQuantity({})).not.toBeNull();
    expect(validateItemQuantity({ quantidade: 0 })).not.toBeNull();
    expect(validateItemQuantity({ quantidade: -1 })).not.toBeNull();
  });
});

// --- validateLpuItem ---

describe("validateLpuItem", () => {
  it("returns null for valid LPU item", () => {
    expect(validateLpuItem({ fatura: 'lpu', lpu_origem: 'lpu_material_clima', numero_item: 100, descricao_lpu: 'Desc' })).toBeNull();
  });

  it("returns null for FLPU item (skips LPU validation)", () => {
    expect(validateLpuItem({ fatura: 'flpu' })).toBeNull();
  });

  it("returns error when lpu_origem is missing", () => {
    const err = validateLpuItem({ fatura: 'lpu', numero_item: 100, descricao_lpu: 'Desc' });
    expect(err).toContain('LPU Origem');
  });

  it("returns error when numero_item is missing", () => {
    const err = validateLpuItem({ fatura: 'lpu', lpu_origem: 'lpu_material_clima', descricao_lpu: 'Desc' });
    expect(err).toContain('Nº Item');
  });

  it("returns error when descricao_lpu is missing", () => {
    const err = validateLpuItem({ fatura: 'lpu', lpu_origem: 'lpu_material_clima', numero_item: 100 });
    expect(err).toContain('não encontrado');
  });
});
