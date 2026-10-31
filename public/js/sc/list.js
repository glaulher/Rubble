// public/js/sc/list.js

import { escapeHtml } from '/public/js/core/utils.js';
import { showToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';
import { PollingManager } from '/public/js/core/polling.js';
import { debounce } from '/public/js/components/infinite-scroll.js';
import { SC_STATUSES, scSteps, formatPct, scStatusBadgeClass } from './constants.js';
import { initScForm } from './form.js';

export const scPollingInterval = 10000;

let _scItems = [];
let _scTotal = 0;
let _scStatusCounts = {};
let _scSearch = '';
let _scStatusFilter = '';
let _scSiteFilter = new Set();
let _scEditingCount = 0;

let _scSiteOptions = [];

export function setScEditing(flag) {
  if (flag) {
    _scEditingCount++;
  } else {
    _scEditingCount = Math.max(0, _scEditingCount - 1);
  }
}

export function isScEditing() {
  return _scEditingCount > 0;
}

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

async function loadScSiteOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=locals');
    const result = await res.json();
    _scSiteOptions = result.success ? (result.data || []) : [];
  } catch {
    _scSiteOptions = [];
  }
}
function setupScSiteFilterAutocomplete() {
  const input = document.getElementById('scSiteBtn');
  const dropdown = document.getElementById('scSiteDropdown');
  const label = document.getElementById('scSiteLabel');

  if (!input || !dropdown) return;

  function renderDropdown() {
    if (_scSiteOptions.length === 0) {
      dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-slate-400">Nenhum site</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = _scSiteOptions
      .map(
        (site) =>
          `<label class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-sky-100 cursor-pointer">
             <input type="checkbox" value="${escapeHtml(site)}" ${_scSiteFilter.has(site) ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500">
             <span class="truncate">${escapeHtml(site)}</span>
           </label>`
      )
      .join('');
    dropdown.classList.remove('hidden');
  }

  function updateLabel() {
    if (label) {
      label.textContent = _scSiteFilter.size > 0 ? `${_scSiteFilter.size} selecionado(s)` : 'Todos';
    }
  }

  input.addEventListener('click', (e) => {
    e.stopPropagation();
    renderDropdown();
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    if (checkbox.checked) {
      _scSiteFilter.add(checkbox.value);
    } else {
      _scSiteFilter.delete(checkbox.value);
    }

    updateLabel();
    loadSc();
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !input.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  updateLabel();
}

function formatDateBr(value) {
  if (!value) return '—';
  const parts = String(value).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildStatusOptions(current) {
  return SC_STATUSES.map(
    (s) => `<option value="${s.key}" ${s.key === current ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatEquipamento(item) {
  if (item.equipamento_texto) {
    return escapeHtml(item.equipamento_texto);
  }

  let label = '';
  if (item.equipamento) {
    label = String(item.equipamento);
  }
  if (item.capacidade) {
    label += (label ? ' — ' : '') + `${item.capacidade} TR`;
  }
  if (item.localidade) {
    label += (label ? ' - ' : '') + String(item.localidade);
  }

  return label === '' ? '—' : escapeHtml(label);
}

function buildStepsHtml(status) {
  return scSteps(status)
    .map(
      (step) => `
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}">
        <span aria-hidden="true">${step.done ? '✓' : '○'}</span>
        <span class="hidden sm:inline">${escapeHtml(step.label)}</span>
      </span>`
    )
    .join('');
}

export function buildScCardHtml(item) {
  const statusLabel = (SC_STATUSES.find((s) => s.key === item.status) || {}).label || item.status || '—';
  const overdueHtml =
    Number(item.overdue_days) > 0
      ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">${item.overdue_days} dia(s) de atraso</span>`
      : '';

  const slaHtml = item.sla_dias === null || item.sla_dias === undefined ? '—' : `${item.sla_dias} dia(s)`;

  return `
    <article class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3" data-sc-id="${item.id}">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-medium text-slate-900 truncate" data-sc-field="titulo_email" data-sc-value="${escapeHtml(item.titulo_email || '')}">${escapeHtml(item.titulo_email || '—')}</h3>
          <p class="text-xs text-slate-500 mt-0.5 truncate">
            <span data-sc-field="site" data-sc-value="${escapeHtml(item.site || '')}">${escapeHtml(item.site || '—')}</span>
            <span aria-hidden="true" class="mx-1">·</span>
            <span>${formatEquipamento(item)}</span>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="${scStatusBadgeClass(item.status)} px-2 py-0.5 rounded-full text-xs font-semibold">${escapeHtml(statusLabel)}</span>
          <select class="bg-white text-xs rounded-lg px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-500" data-sc-field="status" data-sc-value="${escapeHtml(item.status || '')}" aria-label="Status da solicitação">
            ${buildStatusOptions(item.status)}
          </select>
        </div>
      </header>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span class="block text-xs text-slate-400">SC</span>
          <span class="font-medium text-slate-800" data-sc-field="numero_sc" data-sc-value="${escapeHtml(item.numero_sc || '')}">${escapeHtml(item.numero_sc || '—')}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">PC</span>
          <span class="font-medium text-slate-800" data-sc-field="numero_pc" data-sc-value="${escapeHtml(item.numero_pc || '')}">${escapeHtml(item.numero_pc || '—')}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">PV</span>
          <span class="font-medium text-slate-800" data-sc-field="numero_pv" data-sc-value="${escapeHtml(item.numero_pv || '')}">${escapeHtml(item.numero_pv || '—')}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">SLA</span>
          <span class="font-medium text-slate-800" data-sc-field="sla_dias" data-sc-value="${escapeHtml(String(item.sla_dias ?? ''))}">${slaHtml}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">Valor SC</span>
          <span class="font-medium text-slate-800" data-sc-field="valor_sc" data-sc-value="${escapeHtml(String(item.valor_sc ?? ''))}">${formatMoney(item.valor_sc)}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">Valor PV</span>
          <span class="font-medium text-slate-800" data-sc-field="pv_valor_total" data-sc-value="${escapeHtml(String(item.pv_valor_total ?? ''))}">${formatMoney(item.pv_valor_total)}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">Markup (sobre SC)</span>
          <span class="font-medium ${Number(item.markup_pct) < 0 ? 'text-red-600' : 'text-slate-800'}" data-sc-field="markup_pct" data-sc-value="${escapeHtml(String(item.markup_pct ?? ''))}">${formatPct(item.markup_pct)}</span>
        </div>
        <div>
          <span class="block text-xs text-slate-400">Margem (sobre PV)</span>
          <span class="font-medium ${Number(item.margem_pct) < 0 ? 'text-red-600' : 'text-slate-800'}" data-sc-field="margem_pct" data-sc-value="${escapeHtml(String(item.margem_pct ?? ''))}">${formatPct(item.margem_pct)}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        ${overdueHtml}
        <div class="flex flex-wrap gap-1.5">${buildStepsHtml(item.status)}</div>
      </div>

      <footer class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
        <div>
          <span class="block text-slate-400">Data</span>
          <span data-sc-field="data" data-sc-value="${escapeHtml(item.data || '')}">${item.data ? formatDateBr(item.data) : '—'}</span>
        </div>
        <div>
          <span class="block text-slate-400">Data do status</span>
          <span data-sc-field="data_status" data-sc-value="${escapeHtml(item.data_status || '')}">${item.data_status ? formatDateBr(item.data_status) : '—'}</span>
        </div>
        <div>
          <span class="block text-slate-400">Atraso</span>
          <span>${Number(item.overdue_days) > 0 ? `${item.overdue_days} dia(s)` : '—'}</span>
        </div>
        <div>
          <span class="block text-slate-400">Observação</span>
          <span class="line-clamp-2" data-sc-field="observacao" data-sc-value="${escapeHtml(item.observacao || '')}">${escapeHtml(item.observacao || '—')}</span>
        </div>
      </footer>
    </article>
  `;
}

export function buildScGroupHtml(site, items) {
  const cards = items.map((item) => buildScCardHtml(item)).join('');
  const total = items.length;

  return `
    <section class="space-y-3" data-sc-site="${escapeHtml(site)}">
      <h2 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        ${escapeHtml(site)}
        <span class="ml-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">${total}</span>
      </h2>
      <div class="space-y-3">${cards}</div>
    </section>
  `;
}

export async function loadSc(silent = false) {
  if (silent && isScEditing()) return;

  const params = new URLSearchParams({ limit: '500', offset: '0' });

  if (_scSearch) params.set('search', _scSearch);
  if (_scStatusFilter) params.set('status', _scStatusFilter);
  if (_scSiteFilter.size > 0) params.set('site', Array.from(_scSiteFilter).join(','));

  try {
    const response = await apiFetch(`/app/api/index.php?route=sc&${params.toString()}`);
    const res = await response.json();
    if (!res.success) throw new Error(res.message || 'Erro ao carregar solicitações');

    _scItems = res.data || [];
    _scTotal = res.total || 0;
    _scStatusCounts = res.status_counts || {};

    const listEl = document.getElementById('scList');
    const emptyEl = document.getElementById('scEmpty');

    if (listEl) {
      if (_scItems.length === 0) {
        listEl.innerHTML = '';
      } else {
        const groups = {};
        _scItems.forEach((item) => {
          const site = item.site || 'Sem site';
          (groups[site] = groups[site] || []).push(item);
        });

        listEl.innerHTML = Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([site, items]) => buildScGroupHtml(site, items))
          .join('');
      }
    }

    if (emptyEl) {
      emptyEl.classList.toggle('hidden', _scItems.length > 0);
    }

    const totalEl = document.getElementById('scTotal');
    const overdueEl = document.getElementById('scOverdue');
    if (totalEl) totalEl.textContent = String(_scItems.length);
    if (overdueEl) {
      overdueEl.textContent = String(_scItems.filter((i) => Number(i.overdue_days) > 0).length);
    }

    updateStatusFilterCounts();
  } catch (e) {
    if (!silent) showToast(e.message || 'Erro ao carregar solicitações', 'error');
  }
}

function updateStatusFilterCounts() {
  const select = document.getElementById('scStatusFilter');
  if (!select) return;

  select.querySelectorAll('option').forEach((option) => {
    const key = option.value;
    const baseLabel = option.dataset.label || option.textContent.replace(/ \(\d+\)$/, '');
    option.dataset.label = baseLabel;
    option.textContent = key ? `${baseLabel} (${_scStatusCounts[key] || 0})` : baseLabel;
  });
}

async function loadScSiteOptionsOnce() {
  await loadScSiteOptions();
}

export async function initSc() {
  const searchInput = document.getElementById('scSearch');
  const statusFilter = document.getElementById('scStatusFilter');
  const clearBtn = document.getElementById('scClearFilters');

  await loadScSiteOptionsOnce();
  setupScSiteFilterAutocomplete();

  if (typeof initScForm === 'function') {
    initScForm();
  }

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(() => {
        _scSearch = searchInput.value.trim();
        loadSc();
      }, 1000)
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      _scStatusFilter = statusFilter.value;
      loadSc();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      _scSearch = '';
      _scStatusFilter = '';
      _scSiteFilter.clear();
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      const label = document.getElementById('scSiteLabel');
      if (label) label.textContent = 'Todos';
      loadSc();
    });
  }

  await loadSc();

  if (typeof PollingManager !== 'undefined') {
    PollingManager.start('sc', () => loadSc(true), scPollingInterval);
  }
}
