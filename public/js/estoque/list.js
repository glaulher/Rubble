// public/js/estoque/list.js

import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
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
    <tr class="hover:bg-slate-50/80 transition-colors" data-id="${item.id}">
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
          <button
            type="button"
            data-action="edit"
            data-id="${item.id}"
            class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
            title="Editar item"
            aria-label="Editar item"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>

          ${
            isAdmin
              ? `
            <button
              type="button"
              data-action="delete"
              data-id="${item.id}"
              data-desc="${escapeHtml(item.material_descricao)}"
              class="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
              title="Excluir item"
              aria-label="Excluir item"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          `
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
  const pvItemSelect = document.getElementById('formPvItemId');
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

function openModal(item = null) {
  const modal = document.getElementById('estoqueModal');
  const title = document.getElementById('estoqueModalTitle');
  const form = document.getElementById('estoqueForm');

  if (!modal || !form) return;

  form.reset();

  const idInput = document.getElementById('estoqueFormId');
  const matInput = document.getElementById('formMaterialDescricao');
  const statusSelect = document.getElementById('formStatus');
  const qtdInput = document.getElementById('formQuantidade');
  const unInput = document.getElementById('formUnidade');
  const compraInput = document.getElementById('formPrecoCompra');
  const dataEntradaInput = document.getElementById('formDataEntrada');
  const fornecedorInput = document.getElementById('formFornecedorNf');

  const dataSaidaInput = document.getElementById('formDataSaida');
  const tecnicoInput = document.getElementById('formTecnicoNome');
  const osInput = document.getElementById('formNumeroOs');
  const siteInput = document.getElementById('formSite');
  const eqInput = document.getElementById('formEquipamento');
  const eqIdInput = document.getElementById('formEquipamentoId');

  const pvInput = document.getElementById('formNumeroPv');
  const pvItemSelect = document.getElementById('formPvItemId');
  const vendaInput = document.getElementById('formPrecoVenda');
  const obsInput = document.getElementById('formObservacoes');

  if (item) {
    if (title) title.textContent = 'Editar Material no Estoque';
    if (idInput) idInput.value = item.id;
    if (matInput) matInput.value = item.material_descricao || '';
    if (statusSelect) statusSelect.value = item.status || 'em_estoque';
    if (qtdInput) qtdInput.value = item.quantidade;
    if (unInput) unInput.value = item.unidade || 'UN';
    if (compraInput) compraInput.value = item.preco_compra ?? 0.00;
    if (dataEntradaInput) dataEntradaInput.value = item.data_entrada || '';
    if (fornecedorInput) fornecedorInput.value = item.fornecedor_nf || '';

    if (dataSaidaInput) dataSaidaInput.value = item.data_saida || '';
    if (tecnicoInput) tecnicoInput.value = item.tecnico_nome || '';
    if (osInput) osInput.value = item.numero_os || '';
    if (siteInput) siteInput.value = item.site || '';

    if (item.equipamento_id) {
      if (eqIdInput) eqIdInput.value = item.equipamento_id;
      const found = _equipmentCatalog.find((e) => e.id === item.equipamento_id);
      if (eqInput) eqInput.value = found ? found.label : (item.equipamento || '');
    } else {
      if (eqIdInput) eqIdInput.value = '';
      if (eqInput) eqInput.value = item.equipamento_texto || '';
    }

    if (pvInput) pvInput.value = item.numero_pv || '';
    if (vendaInput) vendaInput.value = item.preco_venda ?? '';
    if (obsInput) obsInput.value = item.observacoes || '';

    if (item.numero_pv) {
      handlePvLookup(item.numero_pv).then(() => {
        if (pvItemSelect && item.pv_item_id) {
          pvItemSelect.value = String(item.pv_item_id);
        }
      });
    }
  } else {
    if (title) title.textContent = 'Nova Entrada de Material';
    if (idInput) idInput.value = '';
    if (statusSelect) statusSelect.value = 'em_estoque';
    if (qtdInput) qtdInput.value = '1.00';
    if (unInput) unInput.value = 'UN';
    if (compraInput) compraInput.value = '0.00';
    if (dataEntradaInput) dataEntradaInput.value = new Date().toISOString().slice(0, 10);
    if (eqIdInput) eqIdInput.value = '';
    if (pvItemSelect) pvItemSelect.innerHTML = '<option value="">Nenhum item selecionado</option>';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('estoqueModal');
  if (modal) modal.classList.add('hidden');
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

  // New Button
  const newBtn = document.getElementById('estoqueNewBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => openModal(null));
  }

  // Modal close buttons
  const modalCloseBtn = document.getElementById('estoqueModalCloseBtn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  const modalCancelBtn = document.getElementById('estoqueModalCancelBtn');
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  // PV Input reactive change in modal
  const pvInput = document.getElementById('formNumeroPv');
  if (pvInput) {
    pvInput.addEventListener('blur', (e) => {
      handlePvLookup(e.target.value);
    });
  }

  // PV Item selection auto-fills price and description
  const pvItemSelect = document.getElementById('formPvItemId');
  if (pvItemSelect) {
    pvItemSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;

      const valor = selectedOption.getAttribute('data-valor');
      const desc = selectedOption.getAttribute('data-desc');

      const precoVendaInput = document.getElementById('formPrecoVenda');
      if (precoVendaInput && valor !== null && valor !== undefined) {
        precoVendaInput.value = parseFloat(valor).toFixed(2);
      }

      const matInput = document.getElementById('formMaterialDescricao');
      if (matInput && !matInput.value.trim() && desc) {
        matInput.value = desc;
      }
    });
  }

  // Autocomplete Site & Equipment in modal
  const siteInput = document.getElementById('formSite');
  const siteSug = document.getElementById('formSiteSuggestions');
  if (siteInput && siteSug && typeof createAutocomplete === 'function') {
    createAutocomplete(siteInput, siteSug, () => _siteOptions);
  }

  const eqInput = document.getElementById('formEquipamento');
  const eqIdInput = document.getElementById('formEquipamentoId');
  const eqSug = document.getElementById('formEquipamentoSuggestions');
  if (eqInput && eqSug && typeof createAutocomplete === 'function') {
    createAutocomplete(
      eqInput,
      eqSug,
      () => {
        const currentSite = siteInput ? siteInput.value.trim().toUpperCase() : '';
        if (currentSite) {
          return _equipmentCatalog.filter((e) => (e.site || '').toUpperCase() === currentSite).map((e) => e.label);
        }
        return _equipmentCatalog.map((e) => e.label);
      },
      (selected) => {
        const res = resolveEquipmentPick(_equipmentCatalog, selected);
        if (eqIdInput) eqIdInput.value = res.equipamento_id || '';
      }
    );
  }

  // Modal Form Submit
  const form = document.getElementById('estoqueForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('estoqueFormId')?.value;
      const mat = document.getElementById('formMaterialDescricao')?.value.trim();
      const status = document.getElementById('formStatus')?.value;
      const qtd = parseFloat(document.getElementById('formQuantidade')?.value || '1');
      const un = document.getElementById('formUnidade')?.value.trim() || 'UN';
      const precoCompra = parseFloat(document.getElementById('formPrecoCompra')?.value || '0');
      const dataEntrada = document.getElementById('formDataEntrada')?.value;
      const fornecedor = document.getElementById('formFornecedorNf')?.value.trim();

      const dataSaida = document.getElementById('formDataSaida')?.value || null;
      const tecnico = document.getElementById('formTecnicoNome')?.value.trim() || null;
      const numeroOs = document.getElementById('formNumeroOs')?.value.trim() || null;
      const site = document.getElementById('formSite')?.value.trim();

      const eqTextoRaw = document.getElementById('formEquipamento')?.value.trim();
      const eqIdRaw = document.getElementById('formEquipamentoId')?.value;

      let equipamentoId = null;
      let equipamentoTexto = null;

      if (eqIdRaw && parseInt(eqIdRaw, 10) > 0) {
        equipamentoId = parseInt(eqIdRaw, 10);
      } else if (eqTextoRaw) {
        const pick = resolveEquipmentPick(_equipmentCatalog, eqTextoRaw);
        equipamentoId = pick.equipamento_id;
        equipamentoTexto = pick.equipamento_texto;
      }

      const numeroPv = document.getElementById('formNumeroPv')?.value.trim() || null;
      const pvItemIdRaw = document.getElementById('formPvItemId')?.value;
      const pvItemId = pvItemIdRaw ? parseInt(pvItemIdRaw, 10) : null;

      const precoVendaRaw = document.getElementById('formPrecoVenda')?.value;
      const precoVenda = precoVendaRaw !== '' && precoVendaRaw !== null ? parseFloat(precoVendaRaw) : null;
      const observacoes = document.getElementById('formObservacoes')?.value.trim() || null;

      const payload = {
        material_descricao: mat,
        status: status || 'em_estoque',
        quantidade: qtd,
        unidade: un,
        preco_compra: precoCompra,
        data_entrada: dataEntrada,
        fornecedor_nf: fornecedor || null,
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

      try {
        let res;
        if (id) {
          payload.id = parseInt(id, 10);
          res = await apiFetch(`/app/api/index.php?route=estoque`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          res = await apiFetch(`/app/api/index.php?route=estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        const json = await res.json();
        if (json.success) {
          showToast(id ? 'Material atualizado com sucesso' : 'Material adicionado com sucesso', 'success');
          closeModal();
          fetchEstoqueData();
        } else {
          showToast(json.message || 'Erro ao salvar material', 'error');
        }
      } catch (err) {
        console.error('Erro ao salvar material:', err);
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  // Delegated clicks for Edit and Delete in Table
  const tbody = document.getElementById('estoqueTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const id = parseInt(editBtn.getAttribute('data-id'), 10);
        const item = _estoqueItems.find((it) => it.id === id);
        if (item) openModal(item);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
        const desc = deleteBtn.getAttribute('data-desc') || '';
        _currentDeleteId = id;

        const deleteModal = document.getElementById('estoqueDeleteModal');
        const descEl = document.getElementById('estoqueDeleteDesc');
        if (descEl) descEl.textContent = desc;
        if (deleteModal) deleteModal.classList.remove('hidden');
      }
    });
  }

  // Delete modal cancel & confirm
  const deleteCancelBtn = document.getElementById('estoqueDeleteCancelBtn');
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', () => {
      const deleteModal = document.getElementById('estoqueDeleteModal');
      if (deleteModal) deleteModal.classList.add('hidden');
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
        const deleteModal = document.getElementById('estoqueDeleteModal');
        if (deleteModal) deleteModal.classList.add('hidden');

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
}

// Global exposure for testing and inline calls
if (typeof globalThis !== 'undefined') {
  globalThis.resolveEquipmentPick = resolveEquipmentPick;
  globalThis.formatPctEstoque = formatPctEstoque;
  globalThis.buildEstoqueRowHtml = buildEstoqueRowHtml;
  globalThis.triggerEstoqueCsvExport = triggerEstoqueCsvExport;
  globalThis.initEstoqueList = initEstoqueList;
}
