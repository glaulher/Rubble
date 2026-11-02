import { describe, test, expect } from 'bun:test';
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
  const loteMock = {
    id: 10,
    status: 'em_estoque',
    material_descricao: 'Filtro G4 500x500',
    quantidade: 4.0,
    quantidade_disponivel: 3.0,
    quantidade_baixada: 1.0,
    unidade: 'UN',
    preco_compra: 50.0,
    total_compra: 200.0,
    data_entrada: '2026-11-01',
    fornecedor_nf: 'NF 12345',
    site: 'Estoque Central',
    observacoes: 'Lote recebido em perfeito estado',
  };

  const saidaMock = {
    id: 101,
    estoque_material_id: 10,
    material_descricao: 'Filtro G4 500x500',
    quantidade_saida: 1.0,
    unidade: 'UN',
    preco_compra: 50.0,
    total_compra: 50.0,
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
    pv_item_id: 201,
    pv_item_descricao: 'Troca de filtros',
    preco_venda: 100.0,
    total_venda: 100.0,
    lucro_bruto: 50.0,
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

  test('buildEstoqueRowHtml renderiza colunas da entrada, saldo disponível e ações', () => {
    globalThis._currentUser = { role: 'admin' };
    const html = globalThis.buildEstoqueRowHtml(loteMock);

    expect(html).toContain('Filtro G4 500x500');
    expect(html).toContain('Estoque Central');
    expect(html).toContain('4.00'); // Qtd entrada
    expect(html).toContain('3.00'); // Saldo disponível
    expect(html).toContain('1.00'); // Qtd baixada
    expect(html).toContain('R$');
    expect(html).toContain('NF 12345');
    // Como tem saldo disponível, deve ter botão de Dar Baixa
    expect(html).toContain('data-action="baixa"');
    // Admin deve ter botão de exclusão
    expect(html).toContain('data-action="delete-entrada"');
  });

  test('buildEstoqueRowHtml não exibe botão de baixa quando lote está esgotado (saldo 0)', () => {
    globalThis._currentUser = { role: 'admin' };
    const loteEsgotado = {
      ...loteMock,
      quantidade_disponivel: 0.0,
      quantidade_baixada: 4.0,
      status: 'aplicado',
    };

    const html = globalThis.buildEstoqueRowHtml(loteEsgotado);
    expect(html).not.toContain('data-action="baixa"');
  });

  test('buildEstoqueRowHtml oculta botão deletar para usuários não-admin', () => {
    globalThis._currentUser = { role: 'coordenador' };
    const htmlCoord = globalThis.buildEstoqueRowHtml(loteMock);
    expect(htmlCoord).not.toContain('data-action="delete-entrada"');

    globalThis._currentUser = { role: 'gerente' };
    const htmlGerente = globalThis.buildEstoqueRowHtml(loteMock);
    expect(htmlGerente).not.toContain('data-action="delete-entrada"');
  });

  test('buildSaidaRowHtml renderiza linha da saída com site destino, PV, técnico e rentabilidade', () => {
    globalThis._currentUser = { role: 'admin' };
    const html = globalThis.buildSaidaRowHtml(saidaMock);

    expect(html).toContain('Filtro G4 500x500');
    expect(html).toContain('BMADTC');
    expect(html).toContain('AC-01');
    expect(html).toContain('Carlos');
    expect(html).toContain('98765');
    expect(html).toContain('260232');
    expect(html).toContain('50,0%');
    expect(html).toContain('100,0%');
    expect(html).toContain('data-action="delete-saida"');
  });

  test('buildSaidaRowHtml exibe traço quando preco_venda for nulo sem gerar NaN/Infinity', () => {
    const saidaSemVenda = {
      ...saidaMock,
      preco_venda: null,
      total_venda: null,
      lucro_bruto: null,
      margem_percent: null,
      markup_percent: null,
    };

    const html = globalThis.buildSaidaRowHtml(saidaSemVenda);
    expect(html).toContain('—');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  test('exportEstoqueCsv exporta colunas corretas de lotes com saldo e custo', () => {
    const items = [loteMock];
    globalThis.triggerEstoqueCsvExport(items);

    expect(globalThis._lastCsv).not.toBeNull();
    expect(globalThis._lastCsv.filename).toContain('estoque_entradas');
    expect(globalThis._lastCsv.header).toContain('Material');
    expect(globalThis._lastCsv.header).toContain('Qtd Entrada');
    expect(globalThis._lastCsv.header).toContain('Saldo Disponível');
    expect(globalThis._lastCsv.header).toContain('Total Compra');
    expect(globalThis._lastCsv.rows.length).toBe(1);
    expect(globalThis._lastCsv.rows[0]).toContain('Filtro G4 500x500');
  });

  test('exportSaidasCsv exporta colunas corretas de saídas com rentabilidade e site', () => {
    const items = [saidaMock];
    globalThis.triggerSaidasCsvExport(items);

    expect(globalThis._lastCsv).not.toBeNull();
    expect(globalThis._lastCsv.filename).toContain('estoque_saidas');
    expect(globalThis._lastCsv.header).toContain('Material');
    expect(globalThis._lastCsv.header).toContain('Site de Destino');
    expect(globalThis._lastCsv.header).toContain('% Margem');
    expect(globalThis._lastCsv.rows.length).toBe(1);
    expect(globalThis._lastCsv.rows[0]).toContain('BMADTC');
  });
});
