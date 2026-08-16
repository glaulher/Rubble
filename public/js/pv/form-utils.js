import { getQuantityAttrs, LPU_OPTIONS_ALL, LPU_OPTIONS_CHILLER, LPU_OPTIONS_CLIMA, PV_STATUSES, PV_STATUS_COLORS, setCurrentLpuOptions, getCurrentLpuOptions } from './constants.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { showToast, updateToastProgress, dismissToast } from '/public/js/core/dom.js';
import { uploadFile } from '/public/js/utils/upload.js';

export function updateItemUnit(row, unidade) {
  if (!row) return;
  row.dataset.unit = unidade || '';
  const qtyInput = row.querySelector('.item-quantidade');
  if (qtyInput) {
    const attrs = getQuantityAttrs(unidade);
    const stepMatch = attrs.match(/step="([^"]+)"/);
    const minMatch = attrs.match(/min="([^"]+)"/);
    if (stepMatch) qtyInput.step = stepMatch[1];
    if (minMatch) qtyInput.min = minMatch[1];
  }
}

export function getLpuOptionsForLocal(local) {
  if (!local || local === '' || local.toLowerCase() === 'fornecimento')
    return 'all';
  return 'check';
}

export async function resolveLpuMode(local) {
  const mode = getLpuOptionsForLocal(local);
  if (mode === 'all') return LPU_OPTIONS_ALL;
  if (mode === 'check') {
    const has = await checkChiller(local);
    return has ? LPU_OPTIONS_CHILLER : LPU_OPTIONS_CLIMA;
  }
  return LPU_OPTIONS_ALL;
}

export function getLpuOptions(mode) {
  if (mode === 'all') return LPU_OPTIONS_ALL;
  if (mode === 'chiller') return LPU_OPTIONS_CHILLER;
  return LPU_OPTIONS_CLIMA;
}

export function updateSelectOptions(select, options, selectedValue) {
  select.innerHTML = '<option value="">Selecione...</option>';
  options.forEach(([v, t]) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = t;
    if (v === selectedValue) opt.selected = true;
    select.appendChild(opt);
  });
}

export function getStatusBadge(status) {
  const color = PV_STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
  return `<span class="inline-block ${color} px-3 py-1 rounded-full text-sm font-semibold">${escapeHtml(status)}</span>`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function updatePvCounter(total, totalValor) {
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

export function generateCicloOptions(referenceYear) {
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

export function populateStatusSelect(selectId, selected) {
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

let pvLocalOptions = [];
let pvOsOptions = [];

export function getPvLocalOptions() {
  return pvLocalOptions;
}

export function getPvOsOptions() {
  return pvOsOptions;
}

export async function loadLocals() {
  try {
    const response = await fetch('/app/api/index.php?route=locals');
    const result = await response.json();
    pvLocalOptions = result.data || [];
    return pvLocalOptions;
  } catch (err) {
    console.error('Erro ao carregar locais:', err);
    pvLocalOptions = [];
    return pvLocalOptions;
  }
}

export async function loadOsList() {
  try {
    const response = await fetch(
      '/app/api/index.php?route=pv&action=search-os&q='
    );
    const result = await response.json();
    const items = result.data || [];
    pvOsOptions = items.filter((r) => r.os).map((r) => ({
      os: r.os,
      display: r.equipamento_nome ? `${r.os} — ${r.equipamento_nome}` : r.os,
      equipamento: r.equipamento_nome,
      local: r.equipamento_local
    }));
    return pvOsOptions;
  } catch (err) {
    console.error('Erro ao carregar lista de OS:', err);
    pvOsOptions = [];
    return pvOsOptions;
  }
}

export async function loadEquipamentos(local) {
  const select = document.getElementById('equipamentoId');
  if (!select) return;

  try {
    let url;
    if (local && local.toLowerCase() === 'fornecimento') {
      url = '/app/api/index.php?route=equipment&limit=1&equipamento=N/A';
    } else {
      url = '/app/api/index.php?route=equipment&limit=9999&offset=0';
      if (local) {
        url += `&local=${encodeURIComponent(local)}`;
      }
    }

    const response = await fetch(url);
    const result = await response.json();
    const items = result.data || [];

    select.innerHTML = '<option value="">Selecione...</option>';

    items.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.id;
      const parts = [];
      if (e.capacidade != null) parts.push(`${e.capacidade} TR`);
      if (e.localidade) parts.push(e.localidade);
      opt.textContent =
        parts.length > 0
          ? `${e.equipamento} — ${parts.join(' - ')}`
          : e.equipamento;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar equipamentos:', err);
  }
}

export async function checkChiller(local) {
  try {
    const response = await fetch(
      `/app/api/index.php?route=equipment&action=check-chiller&local=${encodeURIComponent(local)}`
    );
    const result = await response.json();
    return result.data?.has_chiller || false;
  } catch (err) {
    console.error('Erro ao verificar chiller:', err);
    return false;
  }
}

export async function filterEquipamentos() {
  const local = document.getElementById('local').value.trim();
  await loadEquipamentos(local || null);
  await updateAllItemLpuOptions(local);
}

export async function updateAllItemLpuOptions(local) {
  setCurrentLpuOptions(await resolveLpuMode(local));
  document.querySelectorAll('.item-row').forEach((row) => {
    const select = row.querySelector('.item-lpu-origem');
    updateSelectOptions(select, getCurrentLpuOptions(), select.value);
  });
}

export async function updateHeaderTotal() {
  const search = pvSearch || '';
  const status = pvStatusFilter || '';
  const cycle = pvCycleFilter || '';
  try {
    const response = await fetch(
      `/app/api/index.php?route=pv&limit=1&offset=0&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&ciclo=${encodeURIComponent(cycle)}&count_only=1`
    );
    const result = await response.json();
    updatePvCounter(result.total, result.total_valor);
  } catch (err) {
    console.error('Erro ao atualizar header:', err);
  }
}

export async function uploadReportFile(index) {
  await uploadFile({
    accept: '.pdf',
    uploadType: 'laudo',
    onStart() {
      showToast('Enviando laudo...', 'loading');
    },
    onProgress(pct) {
      updateToastProgress(pct, pct + '%');
    },
    onSuccess(filename) {
      const laudoInput = document.querySelector(
        `.item-row[data-item-index="${index}"] .item-laudo`
      );
      if (laudoInput) {
        laudoInput.value = filename;
      }
      dismissToast();
      showToast('Laudo anexado: ' + filename, 'success');
    },
    onError(msg) {
      showToast(msg, 'error');
    },
  });
}

export async function uploadOrcamentoFile(index) {
  await uploadFile({
    accept: '.pdf',
    uploadType: 'orcamento',
    onStart() {
      showToast('Enviando orçamento...', 'loading');
    },
    onProgress(pct) {
      updateToastProgress(pct, pct + '%');
    },
    onSuccess(filename) {
      const orcamentoInput = document.querySelector(
        `.item-row[data-item-index="${index}"] .item-orcamento`
      );
      if (orcamentoInput) {
        const current = orcamentoInput.value.trim();
        orcamentoInput.value = current ? current + ', ' + filename : filename;
      }
      dismissToast();
      showToast('Orçamento anexado: ' + filename, 'success');
    },
    onError(msg) {
      showToast(msg, 'error');
    },
  });
}

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'pvLocalOptions', {
    get: function () { return pvLocalOptions; },
    set: function (v) { pvLocalOptions = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'pvOsOptions', {
    get: function () { return pvOsOptions; },
    set: function (v) { pvOsOptions = v; },
    configurable: true,
  });
}
