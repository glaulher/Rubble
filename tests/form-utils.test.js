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

var PV_STATUS_COLORS = {
  'Ativo': 'bg-green-100 text-green-700',
  'SCM aprovado': 'bg-blue-100 text-blue-700',
};

function getLpuOptionsForLocal(local) {
  if (!local || local === '' || local.toLowerCase() === 'fornecimento')
    return 'all';
  return 'check';
}

function getLpuOptions(mode) {
  if (mode === 'all') return ['lpu_material_clima', 'LPU Material Clima'];
  if (mode === 'chiller') return ['lpu_material_chiller', 'LPU Material Chiller'];
  return ['lpu_servico', 'LPU Serviço'];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function generateCicloOptions(referenceYear) {
  const currentYear = referenceYear || new Date().getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 5;
  const opts = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      opts.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

function getStatusBadge(status) {
  const color = PV_STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
  return `<span class="inline-block ${color} px-3 py-1 rounded-full text-sm font-semibold">${escapeHtml(status)}</span>`;
}

function updatePvCounter(total, totalValor) {
  const counter = document.getElementById('pvCounter');
  const valueEl = document.getElementById('pvTotalValue');
  if (counter) counter.textContent = total || 0;
  if (valueEl) {
    const val = parseFloat(totalValor) || 0;
    valueEl.textContent = val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
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

function updateSelectOptions(select, options, selectedValue) {
  select.innerHTML = '<option value="">Selecione...</option>';
  options.forEach(([v, t]) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = t;
    if (v === selectedValue) opt.selected = true;
    select.appendChild(opt);
  });
}

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

// --- getLpuOptionsForLocal ---

describe("getLpuOptionsForLocal", () => {
  it("returns 'all' for null", () => {
    expect(getLpuOptionsForLocal(null)).toBe("all");
  });

  it("returns 'all' for empty string", () => {
    expect(getLpuOptionsForLocal("")).toBe("all");
  });

  it("returns 'all' for 'fornecimento'", () => {
    expect(getLpuOptionsForLocal("fornecimento")).toBe("all");
    expect(getLpuOptionsForLocal("Fornecimento")).toBe("all");
  });

  it("returns 'check' for any other local", () => {
    expect(getLpuOptionsForLocal("Sala A")).toBe("check");
  });
});

// --- getLpuOptions ---

describe("getLpuOptions", () => {
  it("returns all options for 'all' mode", () => {
    const opts = getLpuOptions("all");
    expect(Array.isArray(opts)).toBe(true);
    expect(opts[0]).toBe("lpu_material_clima");
  });

  it("returns chiller options for 'chiller' mode", () => {
    const opts = getLpuOptions("chiller");
    expect(opts[0]).toBe("lpu_material_chiller");
  });

  it("returns clima options for any other mode", () => {
    const opts = getLpuOptions("clima");
    expect(opts[0]).toBe("lpu_servico");
  });
});

// --- formatDate ---

describe("formatDate", () => {
  it("converts ISO date to pt-BR format", () => {
    expect(formatDate("2026-05-21")).toBe("21/05/2026");
  });

  it("returns '-' for null", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns original string if not ISO format", () => {
    expect(formatDate("21/05/2026")).toBe("21/05/2026");
  });
});

// --- generateCicloOptions ---

describe("generateCicloOptions", () => {
  it("generates (range * 12) options with referenceYear", () => {
    const opts = generateCicloOptions(2026);
    expect(opts.length).toBe(132);
  });

  it("starts with refYear-5-01 and ends with refYear+5-12", () => {
    const opts = generateCicloOptions(2026);
    expect(opts[0]).toBe("2021-01");
    expect(opts[opts.length - 1]).toBe("2031-12");
  });

  it("all options match YYYY-MM format", () => {
    const opts = generateCicloOptions(2026);
    opts.forEach((o) => expect(o).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/));
  });

  it("defaults to current year when no referenceYear", () => {
    const opts = generateCicloOptions();
    const currentYear = new Date().getFullYear();
    expect(opts[0]).toBe((currentYear - 5) + "-01");
    expect(opts[opts.length - 1]).toBe((currentYear + 5) + "-12");
  });
});

// --- getStatusBadge ---

describe("getStatusBadge", () => {
  it("returns badge with matching color for known status", () => {
    const result = getStatusBadge("Ativo");
    expect(result).toContain("bg-green-100");
    expect(result).toContain("Ativo");
  });

  it("returns default color for unknown status", () => {
    const result = getStatusBadge("unknown");
    expect(result).toContain("bg-slate-100");
    expect(result).toContain("unknown");
  });

  it("escapes HTML in status text", () => {
    const result = getStatusBadge("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("handles null status", () => {
    const result = getStatusBadge(null);
    expect(result).toContain("bg-slate-100");
  });
});

// --- updatePvCounter ---

describe("updatePvCounter", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<span id="pvCounter"></span>' +
      '<span id="pvTotalValue"></span>';
  });

  it("updates counter text", () => {
    updatePvCounter(42, 0);
    expect(document.getElementById("pvCounter").textContent).toBe("42");
  });

  it("formats total value as BRL currency", () => {
    updatePvCounter(1, 1500.5);
    const val = document.getElementById("pvTotalValue").textContent;
    expect(val).toContain("R$");
    expect(val).toContain("1.500,50");
  });

  it("defaults missing elements gracefully", () => {
    document.body.innerHTML = "";
    expect(() => updatePvCounter(5, 100)).not.toThrow();
  });
});

// --- populateStatusSelect ---

describe("populateStatusSelect", () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="statusTest"></select>';
  });

  it("populates select with status options", () => {
    populateStatusSelect("statusTest");
    const select = document.getElementById("statusTest");
    expect(select.children.length).toBe(4); // default + 3 statuses
    expect(select.children[1].value).toBe("Ativo");
  });

  it("includes all status options", () => {
    populateStatusSelect("statusTest", "Cancelado");
    const select = document.getElementById("statusTest");
    expect(select.children.length).toBe(4);
    expect(select.children[3].value).toBe("Cancelado");
  });

  it("includes all status options", () => {
    populateStatusSelect("statusTest", "Cancelado");
    const select = document.getElementById("statusTest");
    expect(select.children.length).toBe(4);
    expect(select.children[3].value).toBe("Cancelado");
  });

  it("does nothing when element not found", () => {
    expect(() => populateStatusSelect("nonexistent")).not.toThrow();
  });
});

// --- updateSelectOptions ---

describe("updateSelectOptions", () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="selectTest"></select>';
  });

  it("builds option list from tuples", () => {
    const select = document.getElementById("selectTest");
    updateSelectOptions(select, [["a", "Option A"], ["b", "Option B"]], "");
    expect(select.children.length).toBe(3);
    expect(select.children[1].value).toBe("a");
    expect(select.children[1].textContent).toBe("Option A");
  });

  it("preserves selected value across update", () => {
    const select = document.getElementById("selectTest");
    updateSelectOptions(select, [["a", "A"], ["b", "B"]], "b");
    expect(select.children.length).toBe(3);
    expect(select.children[2].value).toBe("b");
  });
});

// --- getItemData ---

describe("getItemData", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div class="item-row" data-item-index="0">' +
        '<select class="item-fatura"><option value="lpu">LPU</option></select>' +
        '<select class="item-lpu-origem"><option value="lpu_material_clima">Clima</option></select>' +
        '<input class="item-numero-item" value="100">' +
        '<input class="item-descricao-lpu" value="Desc LPU">' +
        '<textarea class="item-descricao">Descrição</textarea>' +
        '<input class="item-valor" value="150.50">' +
        '<input class="item-quantidade" value="3">' +
        '<input class="item-valor-flpu" value="">' +
        '<input class="item-bdi" value="">' +
        '<input class="item-scm" value="SCM001">' +
        '<input class="item-laudo" value="LAUDO-001">' +
      '</div>';
  });

  it("extracts item data from DOM row", () => {
    const data = getItemData(0);
    expect(data.lpu_origem).toBe("lpu_material_clima");
    expect(data.numero_item).toBe(100);
    expect(data.descricao_lpu).toBe("Desc LPU");
    expect(data.descricao).toBe("Descrição");
    expect(data.valor).toBe(150.5);
    expect(data.quantidade).toBe(3);
    expect(data.fatura).toBe("lpu");
    expect(data.scm).toBe("SCM001");
    expect(data.laudo).toBe("LAUDO-001");
  });

  it("returns null when row not found", () => {
    expect(getItemData(999)).toBeNull();
  });
});
