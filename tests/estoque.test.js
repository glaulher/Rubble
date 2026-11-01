import { describe, test, expect, beforeEach } from 'bun:test';
import { evalModule } from './helpers/eval-module.js';

const HELPERS = `
globalThis.escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

globalThis.showToast = () => {};
globalThis.apiFetch = (url, options) => {
  if (typeof globalThis._apiFetchImpl === 'function') {
    return globalThis._apiFetchImpl(url, options);
  }
  return Promise.resolve({
    json: () => Promise.resolve({ success: true, data: [], total: 0, status_counts: {}, totals: {} })
  });
};
globalThis.createAutocomplete = () => {};
globalThis.debounce = (fn) => fn;
globalThis.sanitizeCSV = (s) => String(s || '').replace(/;/g, ' ');
globalThis._lastCsv = null;
globalThis.downloadCSV = (filename, header, callback) => {
  globalThis._lastCsv = { filename, header, rows: [] };
  callback((row) => globalThis._lastCsv.rows.push(row));
};
globalThis._currentUser = { role: 'admin' };
globalThis.getUser = () => globalThis._currentUser;
globalThis.confirmDelete = () => Promise.resolve(true);
globalThis.showModal = () => {};
globalThis.hideModal = () => {};
globalThis.iconButtonHtml = (type, tooltip, attrs, tooltipPos) => {
  let extra = '';
  if (attrs) {
    extra = Object.entries(attrs).map(([k, v]) => k + '="' + v + '"').join(' ');
  }
  return '<div class="relative group"><button class="p-2 rounded-xl" ' + extra + '>' + type + '</button><span class="tooltip">' + tooltip + '</span></div>';
};
`;

evalModule('../public/js/estoque/list.js', HELPERS);

describe('Estoque list module', () => {
  const itemMock = {
    id: 10,
    status: 'em_estoque',
    material_descricao: 'Filtro G4 500x500',
    quantidade: 4.0,
    unidade: 'UN',
    preco_compra: 50.0,
    total_compra: 200.0,
    data_entrada: '2026-11-01',
    fornecedor_nf: 'NF 12345',
    data_saida: '2026-11-02',
    tecnico_nome: 'Carlos',
    numero_os: '98765',
    site: 'BMADTC',
    equipamento_id: 5,
    equipamento_texto: null,
    equipamento: 'AC-01',
    capacidade: '10.00',
    localidade: 'Container 1',
    numero_pv: '260232',
    pv_item_id: 101,
    pv_item_descricao: 'Troca de filtros',
    preco_venda: 100.0,
    total_venda: 400.0,
    lucro_bruto: 200.0,
    margem_percent: 50.0,
    markup_percent: 100.0,
    observacoes: 'Substituição preventiva',
  };

  test('resolveEquipmentPick resolve catálogo e texto livre mutuamente exclusivos', () => {
    const catalog = [
      { id: 5, label: 'AC-01 — 10.00 TR - Container 1' },
      { id: 8, label: 'CH-01 — 40.00 TR - Sala Máquinas' },
    ];

    // Pick from catalog
    const fromCat = globalThis.resolveEquipmentPick(catalog, 'AC-01 — 10.00 TR - Container 1');
    expect(fromCat.equipamento_id).toBe(5);
    expect(fromCat.equipamento_texto).toBeNull();

    // Free text
    const freeTxt = globalThis.resolveEquipmentPick(catalog, 'Splitão Avulso Recepção');
    expect(freeTxt.equipamento_id).toBeNull();
    expect(freeTxt.equipamento_texto).toBe('Splitão Avulso Recepção');

    // Empty
    const empty = globalThis.resolveEquipmentPick(catalog, '');
    expect(empty.equipamento_id).toBeNull();
    expect(empty.equipamento_texto).toBeNull();
  });

  test('formatPctEstoque calcula porcentagem e trata divisão por zero', () => {
    expect(globalThis.formatPctEstoque(50.0)).toBe('50,0%');
    expect(globalThis.formatPctEstoque(100.0)).toBe('100,0%');
    expect(globalThis.formatPctEstoque(null)).toBe('—');
    expect(globalThis.formatPctEstoque(undefined)).toBe('—');
    expect(globalThis.formatPctEstoque(NaN)).toBe('—');
  });

  test('buildEstoqueRowHtml renderiza colunas de entrada, baixa e porcentagens', () => {
    globalThis._currentUser = { role: 'admin' };
    const html = globalThis.buildEstoqueRowHtml(itemMock);

    expect(html).toContain('Filtro G4 500x500');
    expect(html).toContain('BMADTC');
    expect(html).toContain('AC-01');
    expect(html).toContain('260232');
    expect(html).toContain('50,0%');
    expect(html).toContain('100,0%');
    expect(html).toContain('R$');
    // Admin deve ter botão de exclusão
    expect(html).toContain('data-action="delete"');
  });

  test('buildEstoqueRowHtml oculta botao deletar para usuarios nao-admin', () => {
    globalThis._currentUser = { role: 'coordenador' };
    const htmlCoord = globalThis.buildEstoqueRowHtml(itemMock);
    expect(htmlCoord).not.toContain('data-action="delete"');

    globalThis._currentUser = { role: 'gerente' };
    const htmlGerente = globalThis.buildEstoqueRowHtml(itemMock);
    expect(htmlGerente).not.toContain('data-action="delete"');
  });

  test('buildEstoqueRowHtml exibe traço quando preco_venda for nulo sem gerar NaN/Infinity', () => {
    const itemSemVenda = {
      ...itemMock,
      preco_venda: null,
      total_venda: null,
      lucro_bruto: null,
      margem_percent: null,
      markup_percent: null,
    };

    const html = globalThis.buildEstoqueRowHtml(itemSemVenda);
    expect(html).toContain('—');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  test('exportEstoqueCsv exporta colunas corretas com BOM e separador', () => {
    const items = [itemMock];
    globalThis.triggerEstoqueCsvExport(items);

    expect(globalThis._lastCsv).not.toBeNull();
    expect(globalThis._lastCsv.filename).toContain('estoque_materiais');
    expect(globalThis._lastCsv.header).toContain('Material');
    expect(globalThis._lastCsv.header).toContain('Total Compra');
    expect(globalThis._lastCsv.header).toContain('% Margem');
    expect(globalThis._lastCsv.rows.length).toBe(1);
    expect(globalThis._lastCsv.rows[0]).toContain('Filtro G4 500x500');
  });
});
