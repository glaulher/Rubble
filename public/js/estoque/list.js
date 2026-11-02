// public/js/estoque/list.js

import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, showModal, hideModal } from '/public/js/core/dom.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { debounce } from '/public/js/components/infinite-scroll.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js?v=1';
import { downloadCSV } from '/public/js/utils/csv.js';

let _activeTab = 'entradas'; // 'entradas' | 'saidas'

// Estado da aba Entradas
let _estoqueItems = [];
let _estoqueTotal = 0;
let _estoqueTotals = {};
let _estoqueStatusCounts = {};
let _estoqueLimit = 50;
let _estoqueOffset = 0;
let _estoqueSearch = '';
let _estoqueStatusFilter = '';

// Estado da aba Saídas
let _saidasItems = [];
let _saidasTotal = 0;
let _saidasTotals = {};
let _saidasLimit = 50;
let _saidasOffset = 0;
let _saidasPvFilter = '';

// Itens selecionados para modais
let _currentSelectedItem = null;
let _currentSelectedSaida = null;
let _currentDelete = null; // { type: 'entrada' | 'saida', id: number, desc: string }

let _siteOptions = [];
let _equipmentCatalog = [];

export const ESTOQUE_STATUS_MAP = {
  em_estoque: { label: 'Em Estoque', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  aguardando_chegada: { label: 'Aguardando Chegada', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  reservado: { label: 'Reservado PV', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  aplicado: { label: 'Aplicado (Esgotado)', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  devolvido: { label: 'Devolvido / Sobra', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
};

export function resolveEquipmentPick(items, label) {
  const trimmed = (label || '').trim();

  if (trimmed === '') {
    return { equipamento_id: null, equipamento_texto: null };
  }

  const found = (items || []).find((item) => item.label === trimmed);

  if (found) {
    return { equipamento_id: found.id, equipamento_texto: null };
  }

  return { equipamento_id: null, equipamento_texto: trimmed };
}

export function formatPctEstoque(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  const num = Number(value);
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(value) {
  if (!value) return '—';
  const parts = String(value).split('-');
  if (parts.length !== 3) return escapeHtml(String(value));
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// -------------------------------------------------------------------------
// RENDERIZADORES DE LINHA (HTML)
// -------------------------------------------------------------------------

export function buildEstoqueRowHtml(item) {
  const user = typeof getUser === 'function' ? getUser() : null;
  const isAdmin = user && user.role === 'admin';
  const isCoordOrGerente = user && (user.role === 'admin' || user.role === 'coordenador' || user.role === 'gerente');

  const statusInfo = ESTOQUE_STATUS_MAP[item.status] || {
    label: item.status,
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  const disponivel = Number(item.quantidade_disponivel ?? item.quantidade ?? 0);
  const baixada = Number(item.quantidade_baixada ?? 0);
  const temSaldo = disponivel > 0.0001;

  const saldoBadge = temSaldo
    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono">${disponivel.toFixed(2)}</span>`
    : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 font-mono">0,00</span>`;

  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" data-id="${item.id}" data-type="entrada" title="${temSaldo ? 'Clique para dar baixa neste lote' : 'Lote esgotado'}">
      <td class="px-3 py-2.5">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.badge}">
          ${escapeHtml(statusInfo.label)}
        </span>
      </td>
      <td class="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200" title="${escapeHtml(item.material_descricao)}">
        ${escapeHtml(item.material_descricao)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-medium">${Number(item.quantidade).toFixed(2)}</td>
      <td class="px-3 py-2.5 text-right">${saldoBadge}</td>
      <td class="px-3 py-2.5 text-right font-mono ${baixada > 0 ? 'text-sky-600 font-semibold' : 'text-slate-400'}">
        ${baixada > 0 ? baixada.toFixed(2) : '—'}
      </td>
      <td class="px-3 py-2.5 text-slate-500">${escapeHtml(item.unidade || 'UN')}</td>
      <td class="px-3 py-2.5 text-right font-mono">${formatMoney(item.preco_compra)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">${formatMoney(item.total_compra)}</td>
      <td class="px-3 py-2.5 text-slate-500">${formatDateBr(item.data_entrada)}</td>
      <td class="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">${escapeHtml(item.site || 'Estoque Central')}</td>
      <td class="px-3 py-2.5 text-slate-500 truncate max-w-[140px]" title="${escapeHtml(item.fornecedor_nf || '—')}">
        ${escapeHtml(item.fornecedor_nf || '—')}
      </td>
      <td class="px-3 py-2.5 text-center">
        <div class="flex items-center justify-center gap-1.5">
          ${
            temSaldo
              ? iconButtonHtml('baixa', 'Dar Baixa', { 'data-action': 'baixa', 'data-id': item.id }, 'right')
              : ''
          }
          ${
            isCoordOrGerente
              ? iconButtonHtml('edit', 'Editar entrada', { 'data-action': 'edit-entrada', 'data-id': item.id }, 'right')
              : ''
          }
          ${
            isAdmin
              ? iconButtonHtml(
                  'delete',
                  'Excluir lote',
                  {
                    'data-action': 'delete-entrada',
                    'data-id': item.id,
                    'data-desc': item.material_descricao,
                  },
                  'right'
                )
              : ''
          }
        </div>
      </td>
    </tr>
  `;
}

export function buildSaidaRowHtml(saida) {
  const user = typeof getUser === 'function' ? getUser() : null;
  const isAdmin = user && user.role === 'admin';
  const isCoordOrGerente = user && (user.role === 'admin' || user.role === 'coordenador' || user.role === 'gerente');

  const equipamentoExibicao = saida.equipamento
    ? `${saida.equipamento}${saida.capacidade ? ' — ' + saida.capacidade + ' TR' : ''}${saida.localidade ? ' - ' + saida.localidade : ''}`
    : (saida.equipamento_texto || '—');

  const pvItemExibicao = saida.pv_item_descricao ? saida.pv_item_descricao : '—';

  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" data-id="${saida.id}" data-type="saida">
      <td class="px-3 py-2.5 text-slate-600 dark:text-slate-400 font-medium">${formatDateBr(saida.data_saida)}</td>
      <td class="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200" title="${escapeHtml(saida.material_descricao || '')}">
        ${escapeHtml(saida.material_descricao || '—')}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-bold text-sky-700 dark:text-sky-400">${Number(saida.quantidade_saida).toFixed(2)}</td>
      <td class="px-3 py-2.5 text-slate-500">${escapeHtml(saida.unidade || 'UN')}</td>
      <td class="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(saida.site || '—')}</td>
      <td class="px-3 py-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title="${escapeHtml(equipamentoExibicao)}">
        ${escapeHtml(equipamentoExibicao)}
      </td>
      <td class="px-3 py-2.5 text-slate-600 dark:text-slate-400">${escapeHtml(saida.tecnico_nome || '—')}</td>
      <td class="px-3 py-2.5 text-slate-600 dark:text-slate-400 font-mono">${escapeHtml(saida.numero_os || '—')}</td>
      <td class="px-3 py-2.5 font-mono text-blue-600 font-medium">
        ${saida.numero_pv ? escapeHtml(saida.numero_pv) : '—'}
      </td>
      <td class="px-3 py-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[160px]" title="${escapeHtml(pvItemExibicao)}">
        ${escapeHtml(pvItemExibicao)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono">${formatMoney(saida.preco_venda)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">${formatMoney(saida.total_venda)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold ${saida.lucro_bruto > 0 ? 'text-emerald-600' : (saida.lucro_bruto < 0 ? 'text-red-600' : 'text-slate-600')}">
        ${formatMoney(saida.lucro_bruto)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600">
        ${formatPctEstoque(saida.margem_percent)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-indigo-600">
        ${formatPctEstoque(saida.markup_percent)}
      </td>
      <td class="px-3 py-2.5 text-center">
        <div class="flex items-center justify-center gap-1.5">
          ${
            isCoordOrGerente
              ? iconButtonHtml('edit', 'Editar saída', { 'data-action': 'edit-saida', 'data-id': saida.id }, 'right')
              : ''
          }
          ${
            isAdmin
              ? iconButtonHtml(
                  'delete',
                  'Excluir saída',
                  {
                    'data-action': 'delete-saida',
                    'data-id': saida.id,
                    'data-desc': `${saida.quantidade_saida}x ${saida.material_descricao || 'item'} (${saida.site})`,
                  },
                  'right'
                )
              : ''
          }
        </div>
      </td>
    </tr>
  `;
}

// -------------------------------------------------------------------------
// EXPORTAÇÕES CSV
// -------------------------------------------------------------------------

export function triggerEstoqueCsvExport(items) {
  const filename = `estoque_entradas_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Status',
    'Material',
    'Qtd Entrada',
    'Saldo Disponível',
    'Qtd Baixada',
    'Unidade',
    'Preço Compra Unit.',
    'Total Compra',
    'Data Entrada',
    'Almoxarifado',
    'Fornecedor / NF',
    'Observações',
  ];

  downloadCSV(filename, headers, (writeRow) => {
    (items || []).forEach((item) => {
      const statusLabel = ESTOQUE_STATUS_MAP[item.status]?.label || item.status;

      writeRow([
        sanitizeCSV(statusLabel),
        sanitizeCSV(item.material_descricao),
        Number(item.quantidade).toFixed(2),
        Number(item.quantidade_disponivel ?? item.quantidade).toFixed(2),
        Number(item.quantidade_baixada || 0).toFixed(2),
        sanitizeCSV(item.unidade || 'UN'),
        Number(item.preco_compra || 0).toFixed(2),
        Number(item.total_compra || 0).toFixed(2),
        item.data_entrada || '',
        sanitizeCSV(item.site || 'Estoque Central'),
        sanitizeCSV(item.fornecedor_nf || ''),
        sanitizeCSV(item.observacoes || ''),
      ]);
    });
  });
}

export function triggerSaidasCsvExport(items) {
  const filename = `estoque_saidas_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Data Saída',
    'Material',
    'Qtd Saída',
    'Unidade',
    'Preço Compra Unit.',
    'Total Custo',
    'Preço Venda Unit.',
    'Total Venda',
    'Lucro Bruto',
    '% Margem',
    '% Markup',
    'Site de Destino',
    'Equipamento',
    'Técnico',
    'OS',
    'PV',
    'Item PV',
    'Observações',
  ];

  downloadCSV(filename, headers, (writeRow) => {
    (items || []).forEach((saida) => {
      const eq = saida.equipamento || saida.equipamento_texto || '';

      writeRow([
        saida.data_saida || '',
        sanitizeCSV(saida.material_descricao || ''),
        Number(saida.quantidade_saida).toFixed(2),
        sanitizeCSV(saida.unidade || 'UN'),
        Number(saida.preco_compra || 0).toFixed(2),
        Number(saida.total_compra || 0).toFixed(2),
        saida.preco_venda !== null ? Number(saida.preco_venda).toFixed(2) : '',
        saida.total_venda !== null ? Number(saida.total_venda).toFixed(2) : '',
        saida.lucro_bruto !== null ? Number(saida.lucro_bruto).toFixed(2) : '',
        saida.margem_percent !== null ? formatPctEstoque(saida.margem_percent) : '',
        saida.markup_percent !== null ? formatPctEstoque(saida.markup_percent) : '',
        sanitizeCSV(saida.site),
        sanitizeCSV(eq),
        sanitizeCSV(saida.tecnico_nome || ''),
        sanitizeCSV(saida.numero_os || ''),
        sanitizeCSV(saida.numero_pv || ''),
        sanitizeCSV(saida.pv_item_descricao || ''),
        sanitizeCSV(saida.observacoes || ''),
      ]);
    });
  });
}

// -------------------------------------------------------------------------
// REQUISIÇÕES DE DADOS (FETCH)
// -------------------------------------------------------------------------

export async function fetchEstoqueData() {
  try {
    const params = new URLSearchParams({
      route: 'estoque',
      limit: String(_estoqueLimit),
      offset: String(_estoqueOffset),
    });

    if (_estoqueSearch) params.set('search', _estoqueSearch);
    if (_estoqueStatusFilter) params.set('status', _estoqueStatusFilter);

    const res = await apiFetch(`/app/api/index.php?${params.toString()}`);
    const json = await res.json();

    if (!json.success) {
      if (typeof showToast === 'function') {
        showToast(json.message || 'Erro ao carregar estoque', 'error');
      }
      return;
    }

    _estoqueItems = json.data || [];
    _estoqueTotal = json.total || 0;
    _estoqueTotals = json.totals || {};
    _estoqueStatusCounts = json.status_counts || {};

    renderEstoqueTable();
    updateEstoqueCards();
  } catch (err) {
    console.error('Erro ao buscar dados do estoque:', err);
    if (typeof showToast === 'function') {
      showToast('Falha na comunicação com o servidor', 'error');
    }
  }
}

export async function fetchSaidasData() {
  try {
    const params = new URLSearchParams({
      route: 'estoque-saidas',
      limit: String(_saidasLimit),
      offset: String(_saidasOffset),
    });

    if (_estoqueSearch) params.set('search', _estoqueSearch);
    if (_saidasPvFilter) params.set('com_pv', _saidasPvFilter);

    const res = await apiFetch(`/app/api/index.php?${params.toString()}`);
    const json = await res.json();

    if (!json.success) {
      if (typeof showToast === 'function') {
        showToast(json.message || 'Erro ao carregar saídas', 'error');
      }
      return;
    }

    _saidasItems = json.data || [];
    _saidasTotal = json.total || 0;
    _saidasTotals = json.totals || {};

    renderSaidasTable();
    updateSaidasCards();
  } catch (err) {
    console.error('Erro ao buscar dados de saídas:', err);
    if (typeof showToast === 'function') {
      showToast('Falha na comunicação com o servidor', 'error');
    }
  }
}

// -------------------------------------------------------------------------
// RENDERIZAÇÃO DE TABELAS & CARDS
// -------------------------------------------------------------------------

function renderEstoqueTable() {
  const tbody = document.getElementById('estoqueTableBody');
  const emptyEl = document.getElementById('estoqueEmpty');

  if (!tbody) return;

  if (_estoqueItems.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    updatePaginationDisplay();
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  tbody.innerHTML = _estoqueItems.map(buildEstoqueRowHtml).join('');
  updatePaginationDisplay();
}

function renderSaidasTable() {
  const tbody = document.getElementById('saidasTableBody');
  const emptyEl = document.getElementById('saidasEmpty');

  if (!tbody) return;

  if (_saidasItems.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    updateSaidasPaginationDisplay();
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  tbody.innerHTML = _saidasItems.map(buildSaidaRowHtml).join('');
  updateSaidasPaginationDisplay();
}

function updateEstoqueCards() {
  const cardTotalLotes = document.getElementById('cardTotalLotes');
  const cardTotalItensEntrada = document.getElementById('cardTotalItensEntrada');
  const cardItensDisponiveis = document.getElementById('cardItensDisponiveis');
  const cardItensBaixados = document.getElementById('cardItensBaixados');
  const cardTotalCompra = document.getElementById('cardTotalCompra');

  const estoqueCounter = document.getElementById('estoqueCounter');
  const estoqueEmEstoqueCounter = document.getElementById('estoqueEmEstoqueCounter');
  const badgeEntradasCount = document.getElementById('badgeEntradasCount');

  const totalLotes = _estoqueTotals.total_lotes ?? _estoqueTotal;
  const totalItens = _estoqueTotals.total_itens_entrada ?? 0;
  const disponiveis = _estoqueTotals.total_itens_disponiveis ?? 0;
  const baixados = _estoqueTotals.total_itens_baixados ?? 0;
  const totalCompra = _estoqueTotals.total_compra ?? 0;

  if (cardTotalLotes) cardTotalLotes.textContent = totalLotes.toLocaleString('pt-BR');
  if (cardTotalItensEntrada) cardTotalItensEntrada.textContent = totalItens.toLocaleString('pt-BR');
  if (cardItensDisponiveis) cardItensDisponiveis.textContent = disponiveis.toLocaleString('pt-BR');
  if (cardItensBaixados) cardItensBaixados.textContent = baixados.toLocaleString('pt-BR');
  if (cardTotalCompra) cardTotalCompra.textContent = formatMoney(totalCompra);

  if (badgeEntradasCount) badgeEntradasCount.textContent = totalLotes.toLocaleString('pt-BR');

  if (_activeTab === 'entradas') {
    if (estoqueCounter) estoqueCounter.textContent = totalLotes.toLocaleString('pt-BR');
    if (estoqueEmEstoqueCounter) estoqueEmEstoqueCounter.textContent = disponiveis.toLocaleString('pt-BR');
    const cLabel = document.getElementById('estoqueCounterLabel');
    const sLabel = document.getElementById('estoqueSubCounterLabel');
    if (cLabel) cLabel.textContent = 'lotes';
    if (sLabel) sLabel.textContent = 'peças disponíveis';
  }
}

function updateSaidasCards() {
  const cardSaidasTotal = document.getElementById('cardSaidasTotal');
  const cardSaidasItensTotal = document.getElementById('cardSaidasItensTotal');
  const cardSaidasVenda = document.getElementById('cardSaidasVenda');
  const cardSaidasCusto = document.getElementById('cardSaidasCusto');
  const cardSaidasLucro = document.getElementById('cardSaidasLucro');
  const cardSaidasMargem = document.getElementById('cardSaidasMargem');

  const badgeSaidasCount = document.getElementById('badgeSaidasCount');

  const totalSaidas = _saidasTotals.total_saidas ?? _saidasTotal;
  const totalItens = _saidasTotals.total_itens_baixados ?? 0;
  const totalVenda = _saidasTotals.total_venda ?? 0;
  const totalCusto = _saidasTotals.total_custo ?? 0;
  const lucro = _saidasTotals.lucro_bruto ?? 0;
  const margem = _saidasTotals.margem_media;

  if (cardSaidasTotal) cardSaidasTotal.textContent = totalSaidas.toLocaleString('pt-BR');
  if (cardSaidasItensTotal) cardSaidasItensTotal.textContent = totalItens.toLocaleString('pt-BR');
  if (cardSaidasVenda) cardSaidasVenda.textContent = formatMoney(totalVenda);
  if (cardSaidasCusto) cardSaidasCusto.textContent = formatMoney(totalCusto);
  if (cardSaidasLucro) cardSaidasLucro.textContent = formatMoney(lucro);
  if (cardSaidasMargem) cardSaidasMargem.textContent = formatPctEstoque(margem);

  if (badgeSaidasCount) badgeSaidasCount.textContent = totalSaidas.toLocaleString('pt-BR');

  if (_activeTab === 'saidas') {
    const estoqueCounter = document.getElementById('estoqueCounter');
    const estoqueEmEstoqueCounter = document.getElementById('estoqueEmEstoqueCounter');
    const cLabel = document.getElementById('estoqueCounterLabel');
    const sLabel = document.getElementById('estoqueSubCounterLabel');

    if (estoqueCounter) estoqueCounter.textContent = totalSaidas.toLocaleString('pt-BR');
    if (estoqueEmEstoqueCounter) estoqueEmEstoqueCounter.textContent = totalItens.toLocaleString('pt-BR');
    if (cLabel) cLabel.textContent = 'baixas';
    if (sLabel) sLabel.textContent = 'peças aplicadas';
  }
}

// -------------------------------------------------------------------------
// PAGINAÇÃO
// -------------------------------------------------------------------------

function updatePaginationDisplay() {
  const startEl = document.getElementById('estoquePageStart');
  const endEl = document.getElementById('estoquePageEnd');
  const totalEl = document.getElementById('estoquePageTotal');
  const btnsEl = document.getElementById('estoquePaginationBtns');

  if (!startEl || !endEl || !totalEl || !btnsEl) return;

  const start = _estoqueTotal === 0 ? 0 : _estoqueOffset + 1;
  const end = Math.min(_estoqueOffset + _estoqueLimit, _estoqueTotal);

  startEl.textContent = String(start);
  endEl.textContent = String(end);
  totalEl.textContent = String(_estoqueTotal);

  const totalPages = Math.ceil(_estoqueTotal / _estoqueLimit) || 1;
  const currentPage = Math.floor(_estoqueOffset / _estoqueLimit) + 1;

  btnsEl.innerHTML = `
    <button
      type="button"
      id="estoquePrevPage"
      ${currentPage <= 1 ? 'disabled' : ''}
      class="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Anterior
    </button>
    <span class="px-2 py-1 text-slate-700 font-semibold">${currentPage} / ${totalPages}</span>
    <button
      type="button"
      id="estoqueNextPage"
      ${currentPage >= totalPages ? 'disabled' : ''}
      class="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Próxima
    </button>
  `;

  const prevBtn = document.getElementById('estoquePrevPage');
  const nextBtn = document.getElementById('estoqueNextPage');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (_estoqueOffset >= _estoqueLimit) {
        _estoqueOffset -= _estoqueLimit;
        fetchEstoqueData();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (_estoqueOffset + _estoqueLimit < _estoqueTotal) {
        _estoqueOffset += _estoqueLimit;
        fetchEstoqueData();
      }
    });
  }
}

function updateSaidasPaginationDisplay() {
  const startEl = document.getElementById('saidasPageStart');
  const endEl = document.getElementById('saidasPageEnd');
  const totalEl = document.getElementById('saidasPageTotal');
  const btnsEl = document.getElementById('saidasPaginationBtns');

  if (!startEl || !endEl || !totalEl || !btnsEl) return;

  const start = _saidasTotal === 0 ? 0 : _saidasOffset + 1;
  const end = Math.min(_saidasOffset + _saidasLimit, _saidasTotal);

  startEl.textContent = String(start);
  endEl.textContent = String(end);
  totalEl.textContent = String(_saidasTotal);

  const totalPages = Math.ceil(_saidasTotal / _saidasLimit) || 1;
  const currentPage = Math.floor(_saidasOffset / _saidasLimit) + 1;

  btnsEl.innerHTML = `
    <button
      type="button"
      id="saidasPrevPage"
      ${currentPage <= 1 ? 'disabled' : ''}
      class="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Anterior
    </button>
    <span class="px-2 py-1 text-slate-700 font-semibold">${currentPage} / ${totalPages}</span>
    <button
      type="button"
      id="saidasNextPage"
      ${currentPage >= totalPages ? 'disabled' : ''}
      class="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Próxima
    </button>
  `;

  const prevBtn = document.getElementById('saidasPrevPage');
  const nextBtn = document.getElementById('saidasNextPage');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (_saidasOffset >= _saidasLimit) {
        _saidasOffset -= _saidasLimit;
        fetchSaidasData();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (_saidasOffset + _saidasLimit < _saidasTotal) {
        _saidasOffset += _saidasLimit;
        fetchSaidasData();
      }
    });
  }
}

// -------------------------------------------------------------------------
// NAVEGAÇÃO POR ABAS
// -------------------------------------------------------------------------

function switchTab(targetTab) {
  _activeTab = targetTab;

  const tabEntradasBtn = document.getElementById('tabEntradasBtn');
  const tabSaidasBtn = document.getElementById('tabSaidasBtn');

  const cardsEntradas = document.getElementById('cardsEntradas');
  const cardsSaidas = document.getElementById('cardsSaidas');

  const filtrosEntradas = document.getElementById('filtrosEntradas');
  const filtrosSaidas = document.getElementById('filtrosSaidas');

  const painelEntradas = document.getElementById('painelEntradas');
  const painelSaidas = document.getElementById('painelSaidas');

  const badgeEntradas = document.getElementById('badgeEntradasCount');
  const badgeSaidas = document.getElementById('badgeSaidasCount');

  const activeClasses =
    'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all bg-sky-300 hover:bg-sky-400 active:bg-sky-500 text-sky-800 shadow-xs cursor-pointer';
  const inactiveClasses =
    'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer';

  const activeBadgeClasses = 'bg-sky-800 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold';
  const inactiveBadgeClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-mono';

  if (targetTab === 'entradas') {
    if (tabEntradasBtn) {
      tabEntradasBtn.className = activeClasses;
    }
    if (badgeEntradas) {
      badgeEntradas.className = activeBadgeClasses;
    }
    if (tabSaidasBtn) {
      tabSaidasBtn.className = inactiveClasses;
    }
    if (badgeSaidas) {
      badgeSaidas.className = inactiveBadgeClasses;
    }

    if (cardsEntradas) cardsEntradas.classList.remove('hidden');
    if (cardsSaidas) cardsSaidas.classList.add('hidden');

    if (filtrosEntradas) filtrosEntradas.classList.remove('hidden');
    if (filtrosSaidas) filtrosSaidas.classList.add('hidden');

    if (painelEntradas) painelEntradas.classList.remove('hidden');
    if (painelSaidas) painelSaidas.classList.add('hidden');

    fetchEstoqueData();
  } else {
    if (tabSaidasBtn) {
      tabSaidasBtn.className = activeClasses;
    }
    if (badgeSaidas) {
      badgeSaidas.className = activeBadgeClasses;
    }
    if (tabEntradasBtn) {
      tabEntradasBtn.className = inactiveClasses;
    }
    if (badgeEntradas) {
      badgeEntradas.className = inactiveBadgeClasses;
    }

    if (cardsEntradas) cardsEntradas.classList.add('hidden');
    if (cardsSaidas) cardsSaidas.classList.remove('hidden');

    if (filtrosEntradas) filtrosEntradas.classList.add('hidden');
    if (filtrosSaidas) filtrosSaidas.classList.remove('hidden');

    if (painelEntradas) painelEntradas.classList.add('hidden');
    if (painelSaidas) painelSaidas.classList.remove('hidden');

    fetchSaidasData();
  }
}

// -------------------------------------------------------------------------
// CATÁLOGOS & LOOKUPS
// -------------------------------------------------------------------------

async function loadCatalogs() {
  try {
    const res = await apiFetch('/app/api/index.php?route=equipment');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      _equipmentCatalog = json.data.map((eq) => ({
        id: eq.id,
        label: `${eq.equipamento || ''}${eq.capacidade ? ' — ' + eq.capacidade + ' TR' : ''}${eq.localidade ? ' - ' + eq.localidade : ''}`.trim(),
        site: eq.local || '',
      }));

      const siteSet = new Set();
      _equipmentCatalog.forEach((e) => {
        if (e.site) siteSet.add(e.site);
      });
      _siteOptions = Array.from(siteSet).sort();
    }
  } catch (err) {
    console.warn('Falha ao carregar catálogo de equipamentos para estoque:', err);
  }
}

async function handlePvLookup(numeroPv) {
  const pvItemSelect = document.getElementById('baixaPvItemId');
  if (!pvItemSelect) return;

  const digits = String(numeroPv || '').replace(/\D/g, '');
  if (!digits) {
    pvItemSelect.innerHTML = '<option value="">Nenhum item selecionado</option>';
    return;
  }

  try {
    const res = await apiFetch(`/app/api/index.php?route=estoque-saidas&action=pv-items&numero_pv=${digits}`);
    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      if (json.data.length === 0) {
        pvItemSelect.innerHTML = '<option value="">Nenhum item encontrado nesta PV</option>';
        return;
      }

      let optionsHtml = '<option value="">Selecione o item correspondente...</option>';
      json.data.forEach((it) => {
        const desc = it.descricao || 'Item sem descrição';
        const val = Number(it.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        optionsHtml += `<option value="${it.id}" data-valor="${it.valor}" data-desc="${escapeHtml(desc)}">
          Item #${it.numero_item || it.id} — ${escapeHtml(desc)} (${val})
        </option>`;
      });

      pvItemSelect.innerHTML = optionsHtml;
    }
  } catch (err) {
    console.warn('Erro ao buscar itens da PV:', err);
  }
}

function updateBaixaCalculations() {
  if (!_currentSelectedItem) return;

  const qtdVal = parseFloat(document.getElementById('baixaQuantidade')?.value || '1');
  const precoCompra = parseFloat(_currentSelectedItem.preco_compra || '0');
  const precoVendaRaw = document.getElementById('baixaPrecoVenda')?.value;

  const totalCompra = qtdVal * precoCompra;
  let totalVenda = null;
  let lucro = null;
  let margem = null;
  let markup = null;

  if (precoVendaRaw !== '' && precoVendaRaw !== null && !isNaN(parseFloat(precoVendaRaw))) {
    const precoVenda = parseFloat(precoVendaRaw);
    totalVenda = qtdVal * precoVenda;
    lucro = totalVenda - totalCompra;
    if (precoVenda > 0) {
      margem = ((precoVenda - precoCompra) / precoVenda) * 100;
    }
    if (precoCompra > 0) {
      markup = ((precoVenda - precoCompra) / precoCompra) * 100;
    }
  }

  const elTotalCompra = document.getElementById('baixaCalcTotalCompra');
  const elTotalVenda = document.getElementById('baixaCalcTotalVenda');
  const elLucro = document.getElementById('baixaCalcLucro');
  const elMargem = document.getElementById('baixaCalcMargem');
  const elMarkup = document.getElementById('baixaCalcMarkup');

  if (elTotalCompra) elTotalCompra.textContent = formatMoney(totalCompra);
  if (elTotalVenda) elTotalVenda.textContent = totalVenda !== null ? formatMoney(totalVenda) : '—';
  if (elLucro) {
    elLucro.textContent = lucro !== null ? formatMoney(lucro) : '—';
    elLucro.className = `font-mono font-bold ${lucro > 0 ? 'text-emerald-600' : (lucro < 0 ? 'text-red-600' : 'text-slate-800')}`;
  }
  if (elMargem) elMargem.textContent = formatPctEstoque(margem);
  if (elMarkup) elMarkup.textContent = formatPctEstoque(markup);
}

// -------------------------------------------------------------------------
// MODAL 1: ENTRADA DE MATERIAL (LOTE)
// -------------------------------------------------------------------------

function openEntradaModal(itemToEdit = null) {
  const modal = document.getElementById('estoqueEntradaModal');
  const form = document.getElementById('estoqueEntradaForm');
  const titleEl = document.getElementById('estoqueEntradaModalTitle');
  if (!modal || !form) return;

  form.reset();

  const idInput = document.getElementById('entradaFormId');
  const matInput = document.getElementById('entradaMaterialDescricao');
  const statusSelect = document.getElementById('entradaStatus');
  const qtdInput = document.getElementById('entradaQuantidade');
  const unInput = document.getElementById('entradaUnidade');
  const compraInput = document.getElementById('entradaPrecoCompra');
  const dataEntradaInput = document.getElementById('entradaDataEntrada');
  const fornecedorInput = document.getElementById('entradaFornecedorNf');
  const siteInput = document.getElementById('entradaSite');
  const obsInput = document.getElementById('entradaObservacoes');

  if (itemToEdit) {
    if (titleEl) titleEl.textContent = 'Editar Entrada de Material';
    if (idInput) idInput.value = itemToEdit.id;
    if (matInput) matInput.value = itemToEdit.material_descricao;
    if (statusSelect) statusSelect.value = itemToEdit.status;
    if (qtdInput) qtdInput.value = itemToEdit.quantidade;
    if (unInput) unInput.value = itemToEdit.unidade || 'UN';
    if (compraInput) compraInput.value = itemToEdit.preco_compra;
    if (dataEntradaInput) dataEntradaInput.value = itemToEdit.data_entrada;
    if (fornecedorInput) fornecedorInput.value = itemToEdit.fornecedor_nf || '';
    if (siteInput) siteInput.value = itemToEdit.site || 'Estoque Central';
    if (obsInput) obsInput.value = itemToEdit.observacoes || '';
  } else {
    if (titleEl) titleEl.textContent = 'Nova Entrada de Material no Estoque';
    if (idInput) idInput.value = '';
    if (qtdInput) qtdInput.value = '1.00';
    if (unInput) unInput.value = 'UN';
    if (compraInput) compraInput.value = '0.00';
    if (dataEntradaInput) dataEntradaInput.value = new Date().toISOString().slice(0, 10);
    if (siteInput) siteInput.value = 'Estoque Central';
  }

  showModal('estoqueEntradaModal');
}

function closeEntradaModal() {
  hideModal('estoqueEntradaModal');
}

// -------------------------------------------------------------------------
// MODAL 2: DAR BAIXA / SAÍDA DE MATERIAL
// -------------------------------------------------------------------------

function openBaixaModal(item, saidaToEdit = null) {
  _currentSelectedItem = item;
  _currentSelectedSaida = saidaToEdit;

  const modal = document.getElementById('estoqueBaixaModal');
  const form = document.getElementById('estoqueBaixaForm');
  const modalTitle = document.getElementById('estoqueBaixaModalTitle');
  if (!modal || !form || !item) return;

  form.reset();

  const tituloEl = document.getElementById('baixaMaterialTitulo');
  const infoQtdEntrada = document.getElementById('baixaInfoQtdEntrada');
  const infoSaldoDisponivel = document.getElementById('baixaInfoSaldoDisponivel');
  const infoPrecoCompra = document.getElementById('baixaInfoPrecoCompra');
  const qtdMaxAlert = document.getElementById('baixaQtdMaxAlert');

  const saldoDisponivel = Number(item.quantidade_disponivel ?? item.quantidade ?? 0);

  if (tituloEl) tituloEl.textContent = item.material_descricao;
  if (infoQtdEntrada) infoQtdEntrada.textContent = `${Number(item.quantidade).toFixed(2)} ${item.unidade || 'UN'}`;
  if (infoSaldoDisponivel) infoSaldoDisponivel.textContent = `${saldoDisponivel.toFixed(2)} ${item.unidade || 'UN'}`;
  if (infoPrecoCompra) infoPrecoCompra.textContent = formatMoney(item.preco_compra);

  const materialIdInput = document.getElementById('baixaMaterialId');
  const saidaIdInput = document.getElementById('baixaSaidaId');
  const qtdInput = document.getElementById('baixaQuantidade');
  const dataSaidaInput = document.getElementById('baixaDataSaida');
  const tecnicoInput = document.getElementById('baixaTecnicoNome');
  const osInput = document.getElementById('baixaNumeroOs');
  const siteInput = document.getElementById('baixaSite');
  const eqInput = document.getElementById('baixaEquipamento');
  const eqIdInput = document.getElementById('baixaEquipamentoId');
  const pvInput = document.getElementById('baixaNumeroPv');
  const pvItemSelect = document.getElementById('baixaPvItemId');
  const vendaInput = document.getElementById('baixaPrecoVenda');
  const obsInput = document.getElementById('baixaObservacoes');

  if (materialIdInput) materialIdInput.value = item.id;

  if (saidaToEdit) {
    if (modalTitle) modalTitle.textContent = 'Editar Saída de Material';
    if (saidaIdInput) saidaIdInput.value = saidaToEdit.id;
    if (qtdInput) {
      qtdInput.value = saidaToEdit.quantidade_saida;
      const maxAllowed = saldoDisponivel + Number(saidaToEdit.quantidade_saida);
      qtdInput.max = String(maxAllowed);
      if (qtdMaxAlert) qtdMaxAlert.textContent = `Saldo disponível para ajuste: até ${maxAllowed.toFixed(2)}`;
    }
    if (dataSaidaInput) dataSaidaInput.value = saidaToEdit.data_saida || new Date().toISOString().slice(0, 10);
    if (tecnicoInput) tecnicoInput.value = saidaToEdit.tecnico_nome || '';
    if (osInput) osInput.value = saidaToEdit.numero_os || '';
    if (siteInput) siteInput.value = saidaToEdit.site || '';

    if (saidaToEdit.equipamento_id) {
      if (eqIdInput) eqIdInput.value = saidaToEdit.equipamento_id;
      const found = _equipmentCatalog.find((e) => e.id === saidaToEdit.equipamento_id);
      if (eqInput) eqInput.value = found ? found.label : (saidaToEdit.equipamento || '');
    } else {
      if (eqIdInput) eqIdInput.value = '';
      if (eqInput) eqInput.value = saidaToEdit.equipamento_texto || '';
    }

    if (pvInput) pvInput.value = saidaToEdit.numero_pv || '';
    if (vendaInput) vendaInput.value = saidaToEdit.preco_venda !== null && saidaToEdit.preco_venda !== undefined ? saidaToEdit.preco_venda : '';
    if (obsInput) obsInput.value = saidaToEdit.observacoes || '';

    if (saidaToEdit.numero_pv) {
      handlePvLookup(saidaToEdit.numero_pv).then(() => {
        if (pvItemSelect && saidaToEdit.pv_item_id) {
          pvItemSelect.value = String(saidaToEdit.pv_item_id);
        }
      });
    } else if (pvItemSelect) {
      pvItemSelect.innerHTML = '<option value="">Nenhum item selecionado</option>';
    }
  } else {
    if (modalTitle) modalTitle.textContent = 'Dar Baixa / Saída de Material';
    if (saidaIdInput) saidaIdInput.value = '';
    if (qtdInput) {
      const defaultQtd = Math.min(1.0, saldoDisponivel);
      qtdInput.value = defaultQtd > 0 ? defaultQtd.toFixed(2) : '0.00';
      qtdInput.max = String(saldoDisponivel);
      if (qtdMaxAlert) qtdMaxAlert.textContent = `Máximo permitido: ${saldoDisponivel.toFixed(2)} ${item.unidade || 'UN'}`;
    }
    if (dataSaidaInput) dataSaidaInput.value = new Date().toISOString().slice(0, 10);
    if (siteInput) siteInput.value = '';
    if (eqIdInput) eqIdInput.value = '';
    if (eqInput) eqInput.value = '';
    if (pvInput) pvInput.value = '';
    if (vendaInput) vendaInput.value = '';
    if (obsInput) obsInput.value = '';
    if (pvItemSelect) pvItemSelect.innerHTML = '<option value="">Nenhum item selecionado</option>';
  }

  updateBaixaCalculations();
  showModal('estoqueBaixaModal');
}

function closeBaixaModal() {
  hideModal('estoqueBaixaModal');
  _currentSelectedItem = null;
  _currentSelectedSaida = null;
}

// -------------------------------------------------------------------------
// INICIALIZAÇÃO DO MÓDULO
// -------------------------------------------------------------------------

export function initEstoqueList() {
  _estoqueOffset = 0;
  _saidasOffset = 0;

  loadCatalogs();
  fetchEstoqueData();
  fetchSaidasData(); // Pré-carrega contadores das saídas

  // Configuração das abas
  const tabEntradasBtn = document.getElementById('tabEntradasBtn');
  if (tabEntradasBtn) {
    tabEntradasBtn.addEventListener('click', () => switchTab('entradas'));
  }

  const tabSaidasBtn = document.getElementById('tabSaidasBtn');
  if (tabSaidasBtn) {
    tabSaidasBtn.addEventListener('click', () => switchTab('saidas'));
  }

  // Busca debounced
  const searchInput = document.getElementById('estoqueSearch');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        _estoqueSearch = e.target.value.trim();
        _estoqueOffset = 0;
        _saidasOffset = 0;
        if (_activeTab === 'entradas') {
          fetchEstoqueData();
        } else {
          fetchSaidasData();
        }
      }, 300)
    );
  }

  // Filtro de status (Entradas)
  const statusFilter = document.getElementById('estoqueStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      _estoqueStatusFilter = e.target.value;
      _estoqueOffset = 0;
      fetchEstoqueData();
    });
  }

  // Filtro de PV (Saídas)
  const saidaPvFilter = document.getElementById('saidaPvFilter');
  if (saidaPvFilter) {
    saidaPvFilter.addEventListener('change', (e) => {
      _saidasPvFilter = e.target.value;
      _saidasOffset = 0;
      fetchSaidasData();
    });
  }

  // Limpar filtros Entradas
  const clearEntradasBtn = document.getElementById('estoqueClearFilters');
  if (clearEntradasBtn) {
    clearEntradasBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      _estoqueSearch = '';
      _estoqueStatusFilter = '';
      _estoqueOffset = 0;
      fetchEstoqueData();
    });
  }

  // Limpar filtros Saídas
  const clearSaidasBtn = document.getElementById('saidaClearFilters');
  if (clearSaidasBtn) {
    clearSaidasBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (saidaPvFilter) saidaPvFilter.value = '';
      _estoqueSearch = '';
      _saidasPvFilter = '';
      _saidasOffset = 0;
      fetchSaidasData();
    });
  }

  // Botão CSV (exporta conforme aba ativa)
  const csvBtn = document.getElementById('estoqueCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', async () => {
      try {
        if (_activeTab === 'entradas') {
          const params = new URLSearchParams({
            route: 'estoque',
            limit: '10000',
            offset: '0',
          });
          if (_estoqueSearch) params.set('search', _estoqueSearch);
          if (_estoqueStatusFilter) params.set('status', _estoqueStatusFilter);

          const res = await apiFetch(`/app/api/index.php?${params.toString()}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            triggerEstoqueCsvExport(json.data);
          } else {
            showToast('Não há dados de entradas para exportar', 'warning');
          }
        } else {
          const params = new URLSearchParams({
            route: 'estoque-saidas',
            limit: '10000',
            offset: '0',
          });
          if (_estoqueSearch) params.set('search', _estoqueSearch);
          if (_saidasPvFilter) params.set('com_pv', _saidasPvFilter);

          const res = await apiFetch(`/app/api/index.php?${params.toString()}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            triggerSaidasCsvExport(json.data);
          } else {
            showToast('Não há dados de saídas para exportar', 'warning');
          }
        }
      } catch (err) {
        console.error('Erro na exportação CSV:', err);
        showToast('Erro ao exportar CSV', 'error');
      }
    });
  }

  // Botão + Nova Entrada
  const newBtn = document.getElementById('estoqueNewBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => openEntradaModal());
  }

  // Fechamento de modais
  const entradaCloseBtn = document.getElementById('estoqueEntradaModalCloseBtn');
  if (entradaCloseBtn) entradaCloseBtn.addEventListener('click', closeEntradaModal);
  const entradaCancelBtn = document.getElementById('estoqueEntradaCancelBtn');
  if (entradaCancelBtn) entradaCancelBtn.addEventListener('click', closeEntradaModal);

  const baixaCloseBtn = document.getElementById('estoqueBaixaModalCloseBtn');
  if (baixaCloseBtn) baixaCloseBtn.addEventListener('click', closeBaixaModal);
  const baixaCancelBtn = document.getElementById('estoqueBaixaCancelBtn');
  if (baixaCancelBtn) baixaCancelBtn.addEventListener('click', closeBaixaModal);

  // ----------------------------------------------------
  // AUTOCOMPLETES (SITE & EQUIPAMENTO)
  // ----------------------------------------------------
  if (typeof createAutocomplete === 'function') {
    // Autocomplete Site na Entrada
    createAutocomplete({
      inputSelector: '#entradaSite',
      dropdownSelector: '#entradaSiteDropdown',
      dataSource: () => _siteOptions,
      filterFn: (items, q) => {
        if (!q) return [...items];
        const lower = q.toLowerCase();
        return items.filter((item) => item.toLowerCase().includes(lower));
      },
      formatItem: (item) => item,
      onSelect: (selected, input) => {
        input.value = selected;
      },
      onBlur: ({ hide }) => hide(),
    });

    // Autocomplete Site na Baixa
    createAutocomplete({
      inputSelector: '#baixaSite',
      dropdownSelector: '#baixaSiteDropdown',
      dataSource: () => _siteOptions,
      filterFn: (items, q) => {
        if (!q) return [...items];
        const lower = q.toLowerCase();
        return items.filter((item) => item.toLowerCase().includes(lower));
      },
      formatItem: (item) => item,
      onSelect: (selected, input) => {
        input.value = selected;
      },
      onBlur: ({ hide }) => hide(),
    });

    // Autocomplete Equipamento na Baixa
    createAutocomplete({
      inputSelector: '#baixaEquipamento',
      dropdownSelector: '#baixaEquipamentoDropdown',
      dataSource: () => {
        const currentSite = (document.getElementById('baixaSite')?.value || '').trim().toUpperCase();
        if (currentSite) {
          const filtered = _equipmentCatalog.filter((e) => (e.site || '').toUpperCase() === currentSite);
          if (filtered.length > 0) return filtered.map((e) => e.label);
        }
        return _equipmentCatalog.map((e) => e.label);
      },
      filterFn: (items, q) => {
        if (!q) return [...items];
        const lower = q.toLowerCase();
        return items.filter((item) => item.toLowerCase().includes(lower));
      },
      formatItem: (item) => item,
      onSelect: (selected, input) => {
        input.value = selected;
        const res = resolveEquipmentPick(_equipmentCatalog, selected);
        const eqIdInput = document.getElementById('baixaEquipamentoId');
        if (eqIdInput) eqIdInput.value = res.equipamento_id || '';
      },
      onBlur: ({ hide }) => hide(),
    });
  }

  const baixaEqInput = document.getElementById('baixaEquipamento');
  if (baixaEqInput) {
    baixaEqInput.addEventListener('input', () => {
      const eqIdInput = document.getElementById('baixaEquipamentoId');
      if (eqIdInput) eqIdInput.value = '';
    });
  }

  // Lookup de PV no modal de baixa
  const baixaPvInput = document.getElementById('baixaNumeroPv');
  if (baixaPvInput) {
    baixaPvInput.addEventListener('blur', (e) => {
      handlePvLookup(e.target.value);
    });
  }

  const baixaPvItemSelect = document.getElementById('baixaPvItemId');
  if (baixaPvItemSelect) {
    baixaPvItemSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;

      const valor = selectedOption.getAttribute('data-valor');
      const precoVendaInput = document.getElementById('baixaPrecoVenda');
      if (precoVendaInput && valor !== null && valor !== undefined) {
        precoVendaInput.value = parseFloat(valor).toFixed(2);
        updateBaixaCalculations();
      }
    });
  }

  // Cálculos reativos na baixa
  const baixaPrecoVendaInput = document.getElementById('baixaPrecoVenda');
  if (baixaPrecoVendaInput) {
    baixaPrecoVendaInput.addEventListener('input', updateBaixaCalculations);
  }
  const baixaQtdInput = document.getElementById('baixaQuantidade');
  if (baixaQtdInput) {
    baixaQtdInput.addEventListener('input', updateBaixaCalculations);
  }

  // ----------------------------------------------------
  // SUBMIT DO FORMULÁRIO 1: ENTRADA DE MATERIAL
  // ----------------------------------------------------
  const entradaForm = document.getElementById('estoqueEntradaForm');
  if (entradaForm) {
    entradaForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('entradaFormId')?.value;
      const mat = document.getElementById('entradaMaterialDescricao')?.value.trim();
      const status = document.getElementById('entradaStatus')?.value || 'em_estoque';
      const qtd = parseFloat(document.getElementById('entradaQuantidade')?.value || '1');
      const un = document.getElementById('entradaUnidade')?.value.trim() || 'UN';
      const precoCompra = parseFloat(document.getElementById('entradaPrecoCompra')?.value || '0');
      const dataEntrada = document.getElementById('entradaDataEntrada')?.value;
      const fornecedor = document.getElementById('entradaFornecedorNf')?.value.trim() || null;
      const site = document.getElementById('entradaSite')?.value.trim() || 'Estoque Central';
      const observacoes = document.getElementById('entradaObservacoes')?.value.trim() || null;

      const payload = {
        material_descricao: mat,
        status: status,
        quantidade: qtd,
        unidade: un,
        preco_compra: precoCompra,
        data_entrada: dataEntrada,
        fornecedor_nf: fornecedor,
        site: site,
        observacoes: observacoes,
      };

      try {
        const isEdit = id && parseInt(id, 10) > 0;
        const method = isEdit ? 'PUT' : 'POST';
        if (isEdit) payload.id = parseInt(id, 10);

        const res = await apiFetch(`/app/api/index.php?route=estoque`, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success) {
          showToast(isEdit ? 'Entrada atualizada com sucesso!' : 'Material cadastrado no estoque!', 'success');
          closeEntradaModal();
          fetchEstoqueData();
        } else {
          showToast(json.message || 'Erro ao salvar entrada', 'error');
        }
      } catch (err) {
        console.error('Erro ao salvar entrada:', err);
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  // ----------------------------------------------------
  // SUBMIT DO FORMULÁRIO 2: DAR BAIXA / SAÍDA DE MATERIAL
  // Cria ou atualiza registro na tabela estoque_saidas!
  // ----------------------------------------------------
  const baixaForm = document.getElementById('estoqueBaixaForm');
  if (baixaForm) {
    baixaForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const saidaId = document.getElementById('baixaSaidaId')?.value;
      const materialId = document.getElementById('baixaMaterialId')?.value;
      if (!materialId && !saidaId) return;

      const qtd = parseFloat(document.getElementById('baixaQuantidade')?.value || '1');
      const dataSaida = document.getElementById('baixaDataSaida')?.value || null;
      const tecnico = document.getElementById('baixaTecnicoNome')?.value.trim() || null;
      const numeroOs = document.getElementById('baixaNumeroOs')?.value.trim() || null;
      const site = document.getElementById('baixaSite')?.value.trim();

      const eqTextoRaw = document.getElementById('baixaEquipamento')?.value.trim();
      const eqIdRaw = document.getElementById('baixaEquipamentoId')?.value;

      let equipamentoId = null;
      let equipamentoTexto = null;

      if (eqIdRaw && parseInt(eqIdRaw, 10) > 0) {
        equipamentoId = parseInt(eqIdRaw, 10);
      } else if (eqTextoRaw) {
        const pick = resolveEquipmentPick(_equipmentCatalog, eqTextoRaw);
        equipamentoId = pick.equipamento_id;
        equipamentoTexto = pick.equipamento_texto;
      }

      const numeroPv = document.getElementById('baixaNumeroPv')?.value.trim() || null;
      const pvItemIdRaw = document.getElementById('baixaPvItemId')?.value;
      const pvItemId = pvItemIdRaw ? parseInt(pvItemIdRaw, 10) : null;

      const precoVendaRaw = document.getElementById('baixaPrecoVenda')?.value;
      const precoVenda = precoVendaRaw !== '' && precoVendaRaw !== null ? parseFloat(precoVendaRaw) : null;
      const observacoes = document.getElementById('baixaObservacoes')?.value.trim() || null;

      const isEdit = saidaId && parseInt(saidaId, 10) > 0;
      const payload = {
        estoque_material_id: parseInt(materialId, 10),
        quantidade_saida: qtd,
        data_saida: dataSaida,
        tecnico_nome: tecnico,
        numero_os: numeroOs,
        site: site,
        equipamento_id: equipamentoId,
        equipamento_texto: equipamentoTexto,
        numero_pv: numeroPv,
        pv_item_id: pvItemId,
        preco_venda: precoVenda,
        observacoes: observacoes,
      };

      if (isEdit) payload.id = parseInt(saidaId, 10);

      try {
        const res = await apiFetch(`/app/api/index.php?route=estoque-saidas`, {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success) {
          showToast(isEdit ? 'Saída atualizada com sucesso!' : 'Baixa registrada com sucesso!', 'success');
          closeBaixaModal();
          fetchEstoqueData();
          fetchSaidasData();
        } else {
          showToast(json.message || 'Erro ao realizar baixa', 'error');
        }
      } catch (err) {
        console.error('Erro ao realizar baixa:', err);
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  // ----------------------------------------------------
  // CLIQUES NA TABELA DE ENTRADAS
  // ----------------------------------------------------
  const estoqueTbody = document.getElementById('estoqueTableBody');
  if (estoqueTbody) {
    estoqueTbody.addEventListener('click', (e) => {
      // 1. Excluir Lote
      const deleteBtn = e.target.closest('[data-action="delete-entrada"]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
        const desc = deleteBtn.getAttribute('data-desc') || '';
        openDeleteModal('entrada', id, desc);
        return;
      }

      // 2. Editar Entrada
      const editBtn = e.target.closest('[data-action="edit-entrada"]');
      if (editBtn) {
        e.stopPropagation();
        const id = parseInt(editBtn.getAttribute('data-id'), 10);
        const item = _estoqueItems.find((it) => it.id === id);
        if (item) openEntradaModal(item);
        return;
      }

      // 3. Dar Baixa no Lote
      const baixaBtn = e.target.closest('[data-action="baixa"]');
      if (baixaBtn) {
        e.stopPropagation();
        const id = parseInt(baixaBtn.getAttribute('data-id'), 10);
        const item = _estoqueItems.find((it) => it.id === id);
        if (item) {
          const saldo = Number(item.quantidade_disponivel ?? item.quantidade ?? 0);
          if (saldo <= 0) {
            showToast('Este lote já está 100% baixado (sem saldo disponível).', 'warning');
            return;
          }
          openBaixaModal(item);
        }
        return;
      }

      // 4. Ignora cliques na coluna de ações ou botões não tratados
      if (e.target.closest('button') || e.target.closest('td:last-child')) {
        return;
      }

      // 5. Clique no corpo da linha (atalho para dar baixa)
      const row = e.target.closest('tr[data-id]');
      if (row) {
        const id = parseInt(row.getAttribute('data-id'), 10);
        const item = _estoqueItems.find((it) => it.id === id);
        if (item) {
          const saldo = Number(item.quantidade_disponivel ?? item.quantidade ?? 0);
          if (saldo <= 0) {
            showToast('Este lote já está 100% baixado (sem saldo disponível).', 'warning');
            return;
          }
          openBaixaModal(item);
        }
      }
    });
  }

  // ----------------------------------------------------
  // CLIQUES NA TABELA DE SAÍDAS
  // ----------------------------------------------------
  const saidasTbody = document.getElementById('saidasTableBody');
  if (saidasTbody) {
    saidasTbody.addEventListener('click', async (e) => {
      // 1. Excluir Saída (Estorna o saldo!)
      const deleteBtn = e.target.closest('[data-action="delete-saida"]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
        const desc = deleteBtn.getAttribute('data-desc') || '';
        openDeleteModal('saida', id, desc);
        return;
      }

      // 2. Editar Saída
      const editBtn = e.target.closest('[data-action="edit-saida"]');
      if (editBtn) {
        e.stopPropagation();
        const saidaId = parseInt(editBtn.getAttribute('data-id'), 10);
        const saida = _saidasItems.find((s) => s.id === saidaId);
        if (saida) {
          try {
            const res = await apiFetch(`/app/api/index.php?route=estoque&id=${saida.estoque_material_id}`);
            const json = await res.json();
            if (json.success && json.data) {
              openBaixaModal(json.data, saida);
            } else {
              showToast('Lote de origem não encontrado', 'error');
            }
          } catch (err) {
            console.error('Erro ao buscar dados do lote pai:', err);
          }
        }
        return;
      }

      // 3. Ignora cliques na coluna de ações ou botões não tratados
      if (e.target.closest('button') || e.target.closest('td:last-child')) {
        return;
      }

      // 4. Clique no corpo da linha (atalho para editar saída)
      const row = e.target.closest('tr[data-id]');
      if (row) {
        const saidaId = parseInt(row.getAttribute('data-id'), 10);
        const saida = _saidasItems.find((s) => s.id === saidaId);
        if (saida) {
          try {
            const res = await apiFetch(`/app/api/index.php?route=estoque&id=${saida.estoque_material_id}`);
            const json = await res.json();
            if (json.success && json.data) {
              openBaixaModal(json.data, saida);
            } else {
              showToast('Lote de origem não encontrado', 'error');
            }
          } catch (err) {
            console.error('Erro ao buscar dados do lote pai:', err);
          }
        }
      }
    });
  }

  // ----------------------------------------------------
  // MODAL DE EXCLUSÃO
  // ----------------------------------------------------
  function openDeleteModal(type, id, desc) {
    _currentDelete = { type, id, desc };

    const titleEl = document.getElementById('estoqueDeleteTitle');
    const descEl = document.getElementById('estoqueDeleteDesc');
    const msgEl = document.getElementById('estoqueDeleteMessage');

    if (titleEl) {
      titleEl.textContent = type === 'saida' ? 'Excluir Saída / Baixa' : 'Excluir Lote de Estoque';
    }

    if (descEl) descEl.textContent = desc;

    if (msgEl) {
      if (type === 'saida') {
        msgEl.innerHTML = `Tem certeza que deseja excluir a saída <strong class="text-slate-800">${escapeHtml(desc)}</strong>? O saldo será estornado automaticamente para o lote no estoque.`;
      } else {
        msgEl.innerHTML = `Tem certeza que deseja excluir o lote <strong class="text-slate-800">${escapeHtml(desc)}</strong>? Esta ação excluirá também todas as saídas associadas a ele.`;
      }
    }

    showModal('estoqueDeleteModal');
  }

  const deleteCancelBtn = document.getElementById('estoqueDeleteCancelBtn');
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', () => {
      hideModal('estoqueDeleteModal');
      _currentDelete = null;
    });
  }

  const deleteConfirmBtn = document.getElementById('estoqueDeleteConfirmBtn');
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', async () => {
      if (!_currentDelete) return;

      const { type, id } = _currentDelete;
      const route = type === 'saida' ? 'estoque-saidas' : 'estoque';

      try {
        const res = await apiFetch(`/app/api/index.php?route=${route}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const json = await res.json();
        hideModal('estoqueDeleteModal');

        if (json.success) {
          showToast(type === 'saida' ? 'Saída excluída e saldo estornado!' : 'Lote excluído do estoque!', 'success');
          _currentDelete = null;
          fetchEstoqueData();
          fetchSaidasData();
        } else {
          showToast(json.message || 'Erro ao excluir item', 'error');
        }
      } catch (err) {
        console.error('Erro ao excluir:', err);
        showToast('Erro ao comunicar com o servidor', 'error');
      }
    });
  }
}

// Global exposure for testing and inline calls
if (typeof globalThis !== 'undefined') {
  globalThis.resolveEquipmentPick = resolveEquipmentPick;
  globalThis.formatPctEstoque = formatPctEstoque;
  globalThis.buildEstoqueRowHtml = buildEstoqueRowHtml;
  globalThis.buildSaidaRowHtml = buildSaidaRowHtml;
  globalThis.triggerEstoqueCsvExport = triggerEstoqueCsvExport;
  globalThis.triggerSaidasCsvExport = triggerSaidasCsvExport;
  globalThis.initEstoqueList = initEstoqueList;
}
