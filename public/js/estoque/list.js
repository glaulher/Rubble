// public/js/estoque/list.js

import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, showModal, hideModal, confirmDelete } from '/public/js/core/dom.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { debounce } from '/public/js/components/infinite-scroll.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js?v=1';
import { downloadCSV } from '/public/js/utils/csv.js';

let _estoqueItems = [];
let _estoqueTotal = 0;
let _estoqueTotals = {};
let _estoqueStatusCounts = {};
let _estoqueLimit = 50;
let _estoqueOffset = 0;
let _estoqueSearch = '';
let _estoqueStatusFilter = '';
let _estoquePvFilter = '';
let _currentDeleteId = null;
let _currentSelectedItem = null;

let _siteOptions = [];
let _equipmentCatalog = [];

export const ESTOQUE_STATUS_MAP = {
  em_estoque: { label: 'Em Estoque', badge: 'bg-emerald-100 text-emerald-800' },
  aguardando_chegada: { label: 'Aguardando Chegada', badge: 'bg-amber-100 text-amber-800' },
  reservado: { label: 'Reservado PV', badge: 'bg-sky-100 text-sky-800' },
  aplicado: { label: 'Aplicado', badge: 'bg-blue-100 text-blue-800' },
  devolvido: { label: 'Devolvido / Sobra', badge: 'bg-slate-200 text-slate-800' },
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

export function buildEstoqueRowHtml(item) {
  const user = typeof getUser === 'function' ? getUser() : null;
  const isAdmin = user && user.role === 'admin';

  const statusInfo = ESTOQUE_STATUS_MAP[item.status] || {
    label: item.status,
    badge: 'bg-slate-100 text-slate-700',
  };

  const equipamentoExibicao = item.equipamento
    ? `${item.equipamento}${item.capacidade ? ' — ' + item.capacidade + ' TR' : ''}${item.localidade ? ' - ' + item.localidade : ''}`
    : (item.equipamento_texto || '—');

  const pvItemExibicao = item.pv_item_descricao ? item.pv_item_descricao : '—';

  return `
    <tr class="border-b border-slate-100 hover:bg-slate-100 transition cursor-pointer" data-id="${item.id}" title="Clique para Dar Baixa neste material">
      <!-- ENTRADA -->
      <td class="px-3 py-2.5">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.badge}">
          ${escapeHtml(statusInfo.label)}
        </span>
      </td>
      <td class="px-3 py-2.5 font-medium text-slate-800" title="${escapeHtml(item.material_descricao)}">
        ${escapeHtml(item.material_descricao)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono">${Number(item.quantidade).toFixed(2)}</td>
      <td class="px-3 py-2.5 text-slate-500">${escapeHtml(item.unidade || 'UN')}</td>
      <td class="px-3 py-2.5 text-right font-mono">${formatMoney(item.preco_compra)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">${formatMoney(item.total_compra)}</td>
      <td class="px-3 py-2.5 border-r border-slate-300 text-slate-500">${formatDateBr(item.data_entrada)}</td>

      <!-- BAIXA / APLICAÇÃO -->
      <td class="px-3 py-2.5 text-slate-500">${formatDateBr(item.data_saida)}</td>
      <td class="px-3 py-2.5 text-slate-600">${escapeHtml(item.tecnico_nome || '—')}</td>
      <td class="px-3 py-2.5 text-slate-600 font-mono">${escapeHtml(item.numero_os || '—')}</td>
      <td class="px-3 py-2.5 font-semibold text-slate-800">${escapeHtml(item.site || '—')}</td>
      <td class="px-3 py-2.5 text-slate-600" title="${escapeHtml(equipamentoExibicao)}">
        ${escapeHtml(equipamentoExibicao)}
      </td>
      <td class="px-3 py-2.5 font-mono text-blue-600 font-medium">
        ${item.numero_pv ? escapeHtml(item.numero_pv) : '—'}
      </td>
      <td class="px-3 py-2.5 text-slate-600 truncate max-w-[180px]" title="${escapeHtml(pvItemExibicao)}">
        ${escapeHtml(pvItemExibicao)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono">${formatMoney(item.preco_venda)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">${formatMoney(item.total_venda)}</td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold ${item.lucro_bruto > 0 ? 'text-emerald-600' : (item.lucro_bruto < 0 ? 'text-red-600' : 'text-slate-600')}">
        ${formatMoney(item.lucro_bruto)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600">
        ${formatPctEstoque(item.margem_percent)}
      </td>
      <td class="px-3 py-2.5 text-right font-mono font-semibold text-indigo-600 border-r border-slate-300">
        ${formatPctEstoque(item.markup_percent)}
      </td>

      <!-- AÇÕES -->
      <td class="px-3 py-2.5 text-center">
        <div class="flex items-center justify-center gap-1.5">
          ${iconButtonHtml('baixa', 'Dar Baixa / Aplicação', { 'data-action': 'baixa', 'data-id': item.id })}
          ${
            isAdmin
              ? iconButtonHtml(
                  'delete',
                  'Excluir item',
                  {
                    'data-action': 'delete',
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

export function triggerEstoqueCsvExport(items) {
  const filename = `estoque_materiais_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Status',
    'Material',
    'Qtd',
    'Unidade',
    'Preço Compra Unit.',
    'Total Compra',
    'Data Entrada',
    'Fornecedor / NF',
    'Data Saída',
    'Técnico',
    'OS',
    'Site',
    'Equipamento',
    'PV',
    'Item PV',
    'Preço Venda Unit.',
    'Total Venda',
    'Lucro Bruto',
    '% Margem',
    '% Markup',
    'Observações',
  ];

  downloadCSV(filename, headers, (writeRow) => {
    (items || []).forEach((item) => {
      const statusLabel = ESTOQUE_STATUS_MAP[item.status]?.label || item.status;
      const eq = item.equipamento || item.equipamento_texto || '';

      writeRow([
        sanitizeCSV(statusLabel),
        sanitizeCSV(item.material_descricao),
        Number(item.quantidade).toFixed(2),
        sanitizeCSV(item.unidade || 'UN'),
        Number(item.preco_compra || 0).toFixed(2),
        Number(item.total_compra || 0).toFixed(2),
        item.data_entrada || '',
        sanitizeCSV(item.fornecedor_nf || ''),
        item.data_saida || '',
        sanitizeCSV(item.tecnico_nome || ''),
        sanitizeCSV(item.numero_os || ''),
        sanitizeCSV(item.site),
        sanitizeCSV(eq),
        sanitizeCSV(item.numero_pv || ''),
        sanitizeCSV(item.pv_item_descricao || ''),
        item.preco_venda !== null ? Number(item.preco_venda).toFixed(2) : '',
        item.total_venda !== null ? Number(item.total_venda).toFixed(2) : '',
        item.lucro_bruto !== null ? Number(item.lucro_bruto).toFixed(2) : '',
        item.margem_percent !== null ? formatPctEstoque(item.margem_percent) : '',
        item.markup_percent !== null ? formatPctEstoque(item.markup_percent) : '',
        sanitizeCSV(item.observacoes || ''),
      ]);
    });
  });
}

export async function fetchEstoqueData() {
  try {
    const params = new URLSearchParams({
      route: 'estoque',
      action: 'list',
      limit: String(_estoqueLimit),
      offset: String(_estoqueOffset),
    });

    if (_estoqueSearch) params.set('search', _estoqueSearch);
    if (_estoqueStatusFilter) params.set('status', _estoqueStatusFilter);
    if (_estoquePvFilter) params.set('com_pv', _estoquePvFilter);

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

function updateEstoqueCards() {
  const cardTotalItens = document.getElementById('cardTotalItens');
  const cardItensEmEstoque = document.getElementById('cardItensEmEstoque');
  const cardTotalCompra = document.getElementById('cardTotalCompra');
  const cardTotalVenda = document.getElementById('cardTotalVenda');
  const cardMargemMedia = document.getElementById('cardMargemMedia');
  const cardLucroBruto = document.getElementById('cardLucroBruto');

  const estoqueCounter = document.getElementById('estoqueCounter');
  const estoqueEmEstoqueCounter = document.getElementById('estoqueEmEstoqueCounter');

  const totalItens = _estoqueTotals.total_itens ?? _estoqueTotal;
  const emEstoqueQtd = _estoqueStatusCounts['em_estoque'] ?? 0;

  if (cardTotalItens) cardTotalItens.textContent = totalItens.toLocaleString('pt-BR');
  if (cardItensEmEstoque) cardItensEmEstoque.textContent = emEstoqueQtd.toLocaleString('pt-BR');
  if (cardTotalCompra) cardTotalCompra.textContent = formatMoney(_estoqueTotals.total_compra || 0);
  if (cardTotalVenda) cardTotalVenda.textContent = formatMoney(_estoqueTotals.total_venda || 0);
  if (cardLucroBruto) cardLucroBruto.textContent = formatMoney(_estoqueTotals.lucro_bruto || 0);
  if (cardMargemMedia) cardMargemMedia.textContent = formatPctEstoque(_estoqueTotals.margem_media);

  if (estoqueCounter) estoqueCounter.textContent = totalItens.toLocaleString('pt-BR');
  if (estoqueEmEstoqueCounter) estoqueEmEstoqueCounter.textContent = emEstoqueQtd.toLocaleString('pt-BR');
}

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

      // Extrai sites únicos
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
    const res = await apiFetch(`/app/api/index.php?route=estoque&action=pv-items&numero_pv=${digits}`);
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

  const qtdVal = parseFloat(document.getElementById('baixaQuantidade')?.value || _currentSelectedItem.quantidade || '1');
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

// ----------------------------------------------------
// MODAL 1: ENTRADA DE MATERIAL
// ----------------------------------------------------
function openEntradaModal() {
  const modal = document.getElementById('estoqueEntradaModal');
  const form = document.getElementById('estoqueEntradaForm');
  if (!modal || !form) return;

  form.reset();

  const idInput = document.getElementById('entradaFormId');
  const qtdInput = document.getElementById('entradaQuantidade');
  const unInput = document.getElementById('entradaUnidade');
  const compraInput = document.getElementById('entradaPrecoCompra');
  const dataEntradaInput = document.getElementById('entradaDataEntrada');
  const siteInput = document.getElementById('entradaSite');

  if (idInput) idInput.value = '';
  if (qtdInput) qtdInput.value = '1.00';
  if (unInput) unInput.value = 'UN';
  if (compraInput) compraInput.value = '0.00';
  if (dataEntradaInput) dataEntradaInput.value = new Date().toISOString().slice(0, 10);
  if (siteInput) siteInput.value = 'Estoque Central';

  showModal('estoqueEntradaModal');
}

function closeEntradaModal() {
  hideModal('estoqueEntradaModal');
}

// ----------------------------------------------------
// MODAL 2: DAR BAIXA / APLICAÇÃO (CLICANDO NA LINHA)
// ----------------------------------------------------
function openBaixaModal(item) {
  _currentSelectedItem = item;
  const modal = document.getElementById('estoqueBaixaModal');
  const form = document.getElementById('estoqueBaixaForm');
  if (!modal || !form || !item) return;

  form.reset();

  // Cabeçalho / Resumo do item
  const tituloEl = document.getElementById('baixaMaterialTitulo');
  const infoQtd = document.getElementById('baixaInfoQtd');
  const infoPrecoCompra = document.getElementById('baixaInfoPrecoCompra');
  const infoTotalCompra = document.getElementById('baixaInfoTotalCompra');

  if (tituloEl) tituloEl.textContent = item.material_descricao;
  if (infoQtd) infoQtd.textContent = `${Number(item.quantidade).toFixed(2)} ${item.unidade || 'UN'}`;
  if (infoPrecoCompra) infoPrecoCompra.textContent = formatMoney(item.preco_compra);
  if (infoTotalCompra) infoTotalCompra.textContent = formatMoney(item.total_compra);

  // Preenchimento dos campos da baixa
  const idInput = document.getElementById('baixaFormId');
  const dataSaidaInput = document.getElementById('baixaDataSaida');
  const tecnicoInput = document.getElementById('baixaTecnicoNome');
  const osInput = document.getElementById('baixaNumeroOs');
  const siteInput = document.getElementById('baixaSite');
  const eqInput = document.getElementById('baixaEquipamento');
  const eqIdInput = document.getElementById('baixaEquipamentoId');
  const pvInput = document.getElementById('baixaNumeroPv');
  const pvItemSelect = document.getElementById('baixaPvItemId');
  const vendaInput = document.getElementById('baixaPrecoVenda');
  const statusSelect = document.getElementById('baixaStatus');
  const qtdInput = document.getElementById('baixaQuantidade');
  const obsInput = document.getElementById('baixaObservacoes');

  if (idInput) idInput.value = item.id;
  if (dataSaidaInput) dataSaidaInput.value = item.data_saida || new Date().toISOString().slice(0, 10);
  if (tecnicoInput) tecnicoInput.value = item.tecnico_nome || '';
  if (osInput) osInput.value = item.numero_os || '';
  if (siteInput) siteInput.value = (item.site && item.site !== 'Estoque Central') ? item.site : '';

  if (item.equipamento_id) {
    if (eqIdInput) eqIdInput.value = item.equipamento_id;
    const found = _equipmentCatalog.find((e) => e.id === item.equipamento_id);
    if (eqInput) eqInput.value = found ? found.label : (item.equipamento || '');
  } else {
    if (eqIdInput) eqIdInput.value = '';
    if (eqInput) eqInput.value = item.equipamento_texto || '';
  }

  if (pvInput) pvInput.value = item.numero_pv || '';
  if (vendaInput) vendaInput.value = item.preco_venda !== null && item.preco_venda !== undefined ? item.preco_venda : '';
  if (statusSelect) statusSelect.value = item.status === 'em_estoque' ? 'aplicado' : item.status;
  if (qtdInput) qtdInput.value = item.quantidade;
  if (obsInput) obsInput.value = item.observacoes || '';

  if (item.numero_pv) {
    handlePvLookup(item.numero_pv).then(() => {
      if (pvItemSelect && item.pv_item_id) {
        pvItemSelect.value = String(item.pv_item_id);
      }
    });
  } else if (pvItemSelect) {
    pvItemSelect.innerHTML = '<option value="">Nenhum item selecionado</option>';
  }

  updateBaixaCalculations();
  showModal('estoqueBaixaModal');
}

function closeBaixaModal() {
  hideModal('estoqueBaixaModal');
  _currentSelectedItem = null;
}

export function initEstoqueList() {
  _estoqueOffset = 0;
  loadCatalogs();
  fetchEstoqueData();

  // Search input debounced
  const searchInput = document.getElementById('estoqueSearch');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        _estoqueSearch = e.target.value.trim();
        _estoqueOffset = 0;
        fetchEstoqueData();
      }, 300)
    );
  }

  // Filters
  const statusFilter = document.getElementById('estoqueStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      _estoqueStatusFilter = e.target.value;
      _estoqueOffset = 0;
      fetchEstoqueData();
    });
  }

  const pvFilter = document.getElementById('estoquePvFilter');
  if (pvFilter) {
    pvFilter.addEventListener('change', (e) => {
      _estoquePvFilter = e.target.value;
      _estoqueOffset = 0;
      fetchEstoqueData();
    });
  }

  const clearBtn = document.getElementById('estoqueClearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (pvFilter) pvFilter.value = '';
      _estoqueSearch = '';
      _estoqueStatusFilter = '';
      _estoquePvFilter = '';
      _estoqueOffset = 0;
      fetchEstoqueData();
    });
  }

  // CSV Button
  const csvBtn = document.getElementById('estoqueCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', async () => {
      try {
        const params = new URLSearchParams({
          route: 'estoque',
          action: 'list',
          limit: '10000',
          offset: '0',
        });
        if (_estoqueSearch) params.set('search', _estoqueSearch);
        if (_estoqueStatusFilter) params.set('status', _estoqueStatusFilter);
        if (_estoquePvFilter) params.set('com_pv', _estoquePvFilter);

        const res = await apiFetch(`/app/api/index.php?${params.toString()}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          triggerEstoqueCsvExport(json.data);
        } else {
          showToast('Não há dados para exportar', 'warning');
        }
      } catch (err) {
        console.error('Erro na exportação CSV:', err);
        showToast('Erro ao exportar CSV', 'error');
      }
    });
  }

  // New Button -> Opens Modal 1 (Entrada)
  const newBtn = document.getElementById('estoqueNewBtn');
  if (newBtn) {
    newBtn.addEventListener('click', openEntradaModal);
  }

  // Entrada Modal close handlers
  const entradaCloseBtn = document.getElementById('estoqueEntradaModalCloseBtn');
  if (entradaCloseBtn) entradaCloseBtn.addEventListener('click', closeEntradaModal);

  const entradaCancelBtn = document.getElementById('estoqueEntradaCancelBtn');
  if (entradaCancelBtn) entradaCancelBtn.addEventListener('click', closeEntradaModal);

  // Baixa Modal close handlers
  const baixaCloseBtn = document.getElementById('estoqueBaixaModalCloseBtn');
  if (baixaCloseBtn) baixaCloseBtn.addEventListener('click', closeBaixaModal);

  const baixaCancelBtn = document.getElementById('estoqueBaixaCancelBtn');
  if (baixaCancelBtn) baixaCancelBtn.addEventListener('click', closeBaixaModal);

  // ----------------------------------------------------
  // CONFIGURAÇÃO DOS AUTOCOMPLETES (SITE & EQUIPAMENTO)
  // Aceitam seleção do dropdown OU digitação livre!
  // ----------------------------------------------------

  // Autocomplete Site na Entrada
  if (typeof createAutocomplete === 'function') {
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
      onBlur: ({ hide }) => {
        hide();
      },
    });

    // Autocomplete Site na Baixa (aceita texto livre)
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
      onBlur: ({ hide }) => {
        hide();
      },
    });

    // Autocomplete Equipamento na Baixa (aceita catálogo ou texto livre)
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
      onBlur: ({ hide }) => {
        hide();
      },
    });
  }

  // Se o usuário editar/digitar livremente no campo de equipamento, limpa o ID do catálogo
  const baixaEqInput = document.getElementById('baixaEquipamento');
  if (baixaEqInput) {
    baixaEqInput.addEventListener('input', () => {
      const eqIdInput = document.getElementById('baixaEquipamentoId');
      if (eqIdInput) eqIdInput.value = '';
    });
  }

  // PV Input reactive change no modal de baixa
  const baixaPvInput = document.getElementById('baixaNumeroPv');
  if (baixaPvInput) {
    baixaPvInput.addEventListener('blur', (e) => {
      handlePvLookup(e.target.value);
    });
  }

  // Ao selecionar item da proposta da PV, auto-preenche o preço de venda da LPU
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

  // Recalcula rentabilidade em tempo real ao alterar preço de venda ou quantidade na baixa
  const baixaPrecoVendaInput = document.getElementById('baixaPrecoVenda');
  if (baixaPrecoVendaInput) {
    baixaPrecoVendaInput.addEventListener('input', updateBaixaCalculations);
  }
  const baixaQtdInput = document.getElementById('baixaQuantidade');
  if (baixaQtdInput) {
    baixaQtdInput.addEventListener('input', updateBaixaCalculations);
  }

  // ----------------------------------------------------
  // SUBMIT DO FORM 1: ENTRADA DE MATERIAL
  // ----------------------------------------------------
  const entradaForm = document.getElementById('estoqueEntradaForm');
  if (entradaForm) {
    entradaForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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
        const res = await apiFetch(`/app/api/index.php?route=estoque`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success) {
          showToast('Material cadastrado no estoque com sucesso!', 'success');
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
  // SUBMIT DO FORM 2: DAR BAIXA / APLICAÇÃO
  // ----------------------------------------------------
  const baixaForm = document.getElementById('estoqueBaixaForm');
  if (baixaForm) {
    baixaForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('baixaFormId')?.value;
      if (!id) return;

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
      const status = document.getElementById('baixaStatus')?.value || 'aplicado';
      const qtd = parseFloat(document.getElementById('baixaQuantidade')?.value || (_currentSelectedItem?.quantidade ?? '1'));
      const observacoes = document.getElementById('baixaObservacoes')?.value.trim() || null;

      const payload = {
        id: parseInt(id, 10),
        data_saida: dataSaida,
        tecnico_nome: tecnico,
        numero_os: numeroOs,
        site: site,
        equipamento_id: equipamentoId,
        equipamento_texto: equipamentoTexto,
        numero_pv: numeroPv,
        pv_item_id: pvItemId,
        preco_venda: precoVenda,
        status: status,
        quantidade: qtd,
        observacoes: observacoes,
      };

      try {
        const res = await apiFetch(`/app/api/index.php?route=estoque`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success) {
          showToast('Baixa realizada com sucesso!', 'success');
          closeBaixaModal();
          fetchEstoqueData();
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
  // CLIQUE NA LINHA DA TABELA OU BOTÕES DE AÇÃO
  // Clicando em qualquer lugar da linha abre o Modal de Baixa!
  // ----------------------------------------------------
  const tbody = document.getElementById('estoqueTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      // 1. Se clicou no botão de exclusão (Admin)
      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
        const desc = deleteBtn.getAttribute('data-desc') || '';
        _currentDeleteId = id;

        const descEl = document.getElementById('estoqueDeleteDesc');
        if (descEl) descEl.textContent = desc;
        showModal('estoqueDeleteModal');
        return;
      }

      // 2. Clicou no botão de baixa OU em qualquer outro lugar da linha
      const baixaBtn = e.target.closest('[data-action="baixa"]');
      const row = e.target.closest('tr[data-id]');
      if (baixaBtn || row) {
        const targetEl = baixaBtn || row;
        const id = parseInt(targetEl.getAttribute('data-id'), 10);
        const item = _estoqueItems.find((it) => it.id === id);
        if (item) {
          openBaixaModal(item);
        }
      }
    });
  }

  // Delete modal cancel & confirm
  const deleteCancelBtn = document.getElementById('estoqueDeleteCancelBtn');
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', () => {
      hideModal('estoqueDeleteModal');
      _currentDeleteId = null;
    });
  }

  const deleteConfirmBtn = document.getElementById('estoqueDeleteConfirmBtn');
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', async () => {
      if (!_currentDeleteId) return;

      try {
        const res = await apiFetch(`/app/api/index.php?route=estoque`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: _currentDeleteId }),
        });

        const json = await res.json();
        hideModal('estoqueDeleteModal');

        if (json.success) {
          showToast('Item excluído com sucesso', 'success');
          _currentDeleteId = null;
          fetchEstoqueData();
        } else {
          showToast(json.message || 'Erro ao excluir item', 'error');
        }
      } catch (err) {
        console.error('Erro ao excluir material:', err);
        showToast('Erro ao comunicar com o servidor', 'error');
      }
    });
  }

  // Fechamento de modal ao clicar no backdrop escuro
  ['estoqueEntradaModal', 'estoqueBaixaModal', 'estoqueDeleteModal'].forEach((id) => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          hideModal(id);
          if (id === 'estoqueBaixaModal') _currentSelectedItem = null;
          if (id === 'estoqueDeleteModal') _currentDeleteId = null;
        }
      });
    }
  });
}

// Global exposure for testing and inline calls
if (typeof globalThis !== 'undefined') {
  globalThis.resolveEquipmentPick = resolveEquipmentPick;
  globalThis.formatPctEstoque = formatPctEstoque;
  globalThis.buildEstoqueRowHtml = buildEstoqueRowHtml;
  globalThis.triggerEstoqueCsvExport = triggerEstoqueCsvExport;
  globalThis.initEstoqueList = initEstoqueList;
}
