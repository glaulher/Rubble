// public/js/sc/list.js

import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { PollingManager } from '/public/js/core/polling.js';
import { debounce } from '/public/js/components/infinite-scroll.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js?v=1';
import { buttonHtml, iconButtonHtml } from '/public/js/components/button.js';
import { downloadCSV } from '/public/js/utils/csv.js';
import { SC_STATUSES, scSteps, formatPct, scStatusBadgeClass } from './constants.js?v=1';
import { initScForm } from './form.js?v=1';

export const scPollingInterval = 10000;

let _scItems = [];
let _scTotal = 0;
let _scStatusCounts = {};
let _scSearch = '';
let _scStatusFilter = '';
let _scSiteFilter = new Set();
let _scEditingCount = 0;
let _scSiteDocListenerBound = false;
const _scOpenEdits = new Set();
const _scExpandedCards = new Set();

let _scSiteOptions = [];
let _scEquipmentOptions = [];

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

function cancelOpenEdits() {
  Array.from(_scOpenEdits).forEach((cancel) => cancel());
  _scOpenEdits.clear();
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

/*
|--------------------------------------------------------------------------
| HELPERS DE FORMATAÇÃO
|--------------------------------------------------------------------------
*/

function formatDateBr(value) {
  if (!value) return '—';
  const parts = String(value).split('-');
  if (parts.length !== 3) return escapeHtml(String(value));
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function equipmentLabel(equipment) {
  let label = '';
  if (equipment.equipamento) {
    label = String(equipment.equipamento);
  }
  if (equipment.capacidade !== null && equipment.capacidade !== undefined && equipment.capacidade !== '') {
    label += (label ? ' — ' : '') + `${equipment.capacidade} TR`;
  }
  if (equipment.localidade) {
    label += (label ? ' - ' : '') + String(equipment.localidade);
  }
  return label;
}

function formatEquipamento(item) {
  if (item.equipamento_texto) {
    return escapeHtml(item.equipamento_texto);
  }

  const label = equipmentLabel(item);

  return label === '' ? '—' : escapeHtml(label);
}

function currentStatusLabel(status) {
  const found = SC_STATUSES.find((s) => s.key === status);

  return found ? found.label : status || '—';
}

/*
|--------------------------------------------------------------------------
| CARREGAMENTO DE APOIOS
|--------------------------------------------------------------------------
*/

async function loadScSiteOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=locals');
    const result = await res.json();
    _scSiteOptions = result.success ? (result.data || []) : [];
  } catch {
    _scSiteOptions = [];
  }
}

async function loadScEquipmentOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=equipment&limit=9999&offset=0');
    const result = await res.json();
    _scEquipmentOptions = (result.data || [])
      .map((e) => ({ id: e.id, label: equipmentLabel(e) }))
      .filter((e) => e.label !== '');
  } catch {
    _scEquipmentOptions = [];
  }
}

/*
|--------------------------------------------------------------------------
| FILTROS
|--------------------------------------------------------------------------
*/

function setupScSiteFilterAutocomplete() {
  const button = document.getElementById('scSiteBtn');
  const dropdown = document.getElementById('scSiteDropdown');
  const label = document.getElementById('scSiteLabel');

  if (!button || !dropdown) return;

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

  button.addEventListener('click', (e) => {
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

  if (!_scSiteDocListenerBound) {
    _scSiteDocListenerBound = true;
    document.addEventListener('click', (e) => {
      const currentButton = document.getElementById('scSiteBtn');
      const currentDropdown = document.getElementById('scSiteDropdown');
      if (!currentButton || !currentDropdown) return;
      if (!currentDropdown.contains(e.target) && !currentButton.contains(e.target)) {
        currentDropdown.classList.add('hidden');
      }
    });
  }

  updateLabel();
}

/*
|--------------------------------------------------------------------------
| HTML DO CARD
|--------------------------------------------------------------------------
*/

function pencilHtml(field) {
  return `<button type="button" data-sc-edit="${field}" class="ml-1 text-slate-300 hover:text-slate-600 transition-colors" aria-label="Editar campo" title="Editar">
    <svg class="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
    </svg>
  </button>`;
}

function buildStatusOptions(current) {
  return SC_STATUSES.map(
    (s) => `<option value="${s.key}" ${s.key === current ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
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

function fieldCell(field, label, display, raw, editable = true) {
  const pencil = editable ? pencilHtml(field) : '';

  return `
    <div>
      <span class="block text-xs text-slate-400">${escapeHtml(label)}</span>
      <span class="font-medium text-slate-800" data-sc-field="${field}" data-sc-value="${escapeHtml(String(raw ?? ''))}">${display}</span>${pencil}
    </div>`;
}

export function buildScCardHtml(item) {
  const statusLabel = currentStatusLabel(item.status);
  const overdueDays = Number(item.overdue_days) || 0;
  const overdueHtml =
    overdueDays > 0
      ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">${overdueDays} dia(s) de atraso</span>`
      : '';

  const slaHtml =
    item.sla_dias === null || item.sla_dias === undefined
      ? '—'
      : `${escapeHtml(String(item.sla_dias))} dia(s)`;
  const equipmentRaw = item.equipamento_texto || equipmentLabel(item);
  const isExpanded = _scExpandedCards.has(Number(item.id));

  const scDisplay = item.numero_sc ? `SC ${escapeHtml(item.numero_sc)}` : 'SC —';
  const scValorDisplay = formatMoney(item.valor_sc);
  const pvDisplay = item.numero_pv ? `PV ${escapeHtml(item.numero_pv)}` : 'PV —';
  const pvValorDisplay = formatMoney(item.pv_valor_total);

  return `
    <article class="card-item relative bg-white rounded-xl border border-slate-200 p-4" data-sc-id="${item.id}">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-bold text-slate-900">${scDisplay}</h3>
          <span class="text-slate-400" aria-hidden="true">—</span>
          <span class="font-semibold text-slate-700 text-sm">${scValorDisplay}</span>
          <span class="text-slate-400" aria-hidden="true">—</span>
          <span class="text-xs text-slate-500 font-medium">${formatEquipamento(item)}</span>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <span class="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-xl text-xs font-medium">${pvDisplay}</span>
          <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xl text-xs font-medium">${pvValorDisplay}</span>
          <span class="px-2 py-0.5 rounded-xl text-xs font-medium ${Number(item.markup_pct) < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">Markup: ${formatPct(item.markup_pct)}</span>
          <span class="px-2 py-0.5 rounded-xl text-xs font-medium ${Number(item.margem_pct) < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">Margem: ${formatPct(item.margem_pct)}</span>
          <span class="text-xs px-2.5 py-0.5 rounded-xl font-semibold ${scStatusBadgeClass(item.status)}">${escapeHtml(statusLabel)}</span>
          ${(typeof getUser === 'function' && getUser()?.role === 'admin') ? `
          ${iconButtonHtml('delete', 'Excluir', { 'class': 'sc-delete-btn', 'data-sc-delete': item.id }, 'right')}` : ''}
        </div>
      </div>

      <div class="mt-3 flex gap-3">
        ${buttonHtml('neutral', isExpanded ? 'Ocultar' : 'Ver', { class: 'sc-toggle-btn text-sm', 'data-sc-toggle': item.id, type: 'button' })}
      </div>

      <div class="sc-details ${isExpanded ? '' : 'hidden'} mt-3 border-t border-slate-100 pt-3 space-y-3" id="scDet${item.id}">
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h4 class="font-medium text-slate-900 truncate">
              <span data-sc-field="titulo_email" data-sc-value="${escapeHtml(item.titulo_email || '')}">${escapeHtml(item.titulo_email || '—')}</span>${pencilHtml('titulo_email')}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5 truncate">
              <span class="text-slate-400">Site:</span>
              <span data-sc-field="site" data-sc-value="${escapeHtml(item.site || '')}">${escapeHtml(item.site || '—')}</span>${pencilHtml('site')}
              <span aria-hidden="true" class="mx-1">·</span>
              <span class="text-slate-400">Equipamento:</span>
              <span data-sc-field="equipamento" data-sc-value="${escapeHtml(equipmentRaw)}">${formatEquipamento(item)}</span>${pencilHtml('equipamento')}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-slate-400">Status:</span>
            <select class="bg-white text-xs rounded-lg px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-500" data-sc-field="status" data-sc-value="${escapeHtml(item.status || '')}" aria-label="Status da solicitação">
              ${buildStatusOptions(item.status)}
            </select>
          </div>
        </header>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          ${fieldCell('numero_sc', 'SC', escapeHtml(item.numero_sc || '—'), item.numero_sc || '')}
          ${fieldCell('numero_pc', 'PC', escapeHtml(item.numero_pc || '—'), item.numero_pc || '')}
          ${fieldCell('numero_pv', 'PV', escapeHtml(item.numero_pv || '—'), item.numero_pv || '')}
          ${fieldCell('sla_dias', 'SLA', slaHtml, item.sla_dias ?? '')}
          ${fieldCell('valor_sc', 'Valor SC', formatMoney(item.valor_sc), item.valor_sc ?? '')}
          ${fieldCell('pv_valor_total', 'Valor PV', formatMoney(item.pv_valor_total), item.pv_valor_total ?? '', false)}
          <div>
            <span class="block text-xs text-slate-400">Markup (sobre SC)</span>
            <span class="font-medium ${Number(item.markup_pct) < 0 ? 'text-red-600' : 'text-slate-800'}">${formatPct(item.markup_pct)}</span>
          </div>
          <div>
            <span class="block text-xs text-slate-400">Margem (sobre PV)</span>
            <span class="font-medium ${Number(item.margem_pct) < 0 ? 'text-red-600' : 'text-slate-800'}">${formatPct(item.margem_pct)}</span>
          </div>
        </div>

        ${overdueHtml ? `<div class="flex flex-wrap items-center gap-2">${overdueHtml}</div>` : ''}

        <footer class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
          ${fieldCell('data', 'Data', formatDateBr(item.data), item.data || '')}
          ${fieldCell('data_status', 'Data do status', formatDateBr(item.data_status), item.data_status || '')}
          <div>
            <span class="block text-slate-400">Atraso</span>
            <span>${overdueDays > 0 ? `${overdueDays} dia(s)` : '—'}</span>
          </div>
          <div>
            <span class="block text-slate-400">Observação</span>
            <span class="line-clamp-2" data-sc-field="observacao" data-sc-value="${escapeHtml(item.observacao || '')}">${escapeHtml(item.observacao || '—')}</span>${pencilHtml('observacao')}
          </div>
        </footer>
      </div>
    </article>
  `;
}

export function buildScGroupHtml(site, items) {
  const cards = items.map((item) => buildScCardHtml(item)).join('');

  return `
    <section class="space-y-3" data-sc-site="${escapeHtml(site)}">
      <h2 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        ${escapeHtml(site)}
        <span class="ml-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">${items.length}</span>
      </h2>
      <div class="space-y-3">${cards}</div>
    </section>
  `;
}

/*
|--------------------------------------------------------------------------
| EDIÇÃO INLINE
|--------------------------------------------------------------------------
*/

export async function saveScField(id, field, value) {
  try {
    const response = await apiFetch('/app/api/index.php?route=sc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value }),
    });

    const res = await response.json();

    if (!res.success) {
      showToast(res.message || 'Erro ao salvar', 'error');
      return false;
    }

    const index = _scItems.findIndex((item) => Number(item.id) === Number(id));
    if (index >= 0 && res.data) {
      _scItems[index] = res.data;
    }

    return true;
  } catch (e) {
    showToast(e.message || 'Erro de rede', 'error');
    return false;
  }
}

export function startScEdit(card, field) {
  if (!card || !field) return;

  const target = card.querySelector(`[data-sc-field="${field}"]`);
  if (!target || target.dataset.scEditing === '1' || target.tagName === 'SELECT') return;

  const id = Number(card.dataset.scId);
  const current = target.dataset.scValue || '';
  const isDate = field === 'data' || field === 'data_status';
  const isLong = field === 'observacao';

  const editor = document.createElement(isLong ? 'textarea' : 'input');
  if (!isLong) {
    editor.type = isDate ? 'date' : 'text';
  }
  editor.value = current;
  editor.className =
    'w-full mt-1 px-2 py-1 text-sm border border-sky-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-900';
  if (isLong) {
    editor.rows = 2;
  }

  target.dataset.scEditing = '1';
  target.classList.add('hidden');
  target.insertAdjacentElement('afterend', editor);

  let dropdown = null;
  if (field === 'site' || field === 'equipamento') {
    editor.id = `sc-inline-${field}-${id}`;
    dropdown = document.createElement('div');
    dropdown.id = `sc-inline-dd-${field}-${id}`;
    dropdown.className =
      'autocomplete-dropdown hidden absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto min-w-[240px]';

    // Fica no card (não dentro do <p truncate>) para não ser cortado.
    card.appendChild(dropdown);

    const inputRect = editor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    dropdown.style.left = `${Math.max(0, inputRect.left - cardRect.left)}px`;
    dropdown.style.top = `${inputRect.bottom - cardRect.top + 4}px`;
    dropdown.style.width = `${Math.max(240, Math.min(360, inputRect.width))}px`;

    createAutocomplete({
      inputSelector: `#${editor.id}`,
      dropdownSelector: `#${dropdown.id}`,
      dataSource: () => (field === 'site' ? _scSiteOptions : _scEquipmentOptions.map((o) => o.label)),
      onSelect: (item, input) => {
        input.value = typeof item === 'string' ? item : item.label;
        input.blur();
      },
      onBlur: ({ hide }) => hide(),
    });
  }

  setScEditing(true);

  let cancelled = false;
  let finished = false;

  const teardown = () => {
    finished = true;
    target.dataset.scEditing = '0';
    editor.remove();
    if (dropdown) dropdown.remove();
    target.classList.remove('hidden');
    setScEditing(false);
    _scOpenEdits.delete(cancel);
  };

  // Chamado quando a lista é re-renderizada por outro motivo (polling, save
  // de outro campo, navegação): descarta a edição em vez de vazar contador.
  const cancel = () => {
    if (finished) return;
    cancelled = true;
    teardown();
  };

  _scOpenEdits.add(cancel);

  const finish = async () => {
    if (finished) return;

    const next = editor.value.trim();
    teardown();

    if (cancelled || next === current) return;

    if (field === 'equipamento') {
      const pick = resolveEquipmentPick(_scEquipmentOptions, next);
      const okId = pick.equipamento_id !== null;

      const saved = okId
        ? await saveScField(id, 'equipamento_id', pick.equipamento_id)
        : await saveScField(id, 'equipamento_texto', pick.equipamento_texto);

      if (!saved) {
        await loadSc();
        return;
      }

      // O service já zera o campo oposto; a segunda chamada só garante o
      // estado quando o primeiro PATCH não tocou nos dois campos.
      await saveScField(id, okId ? 'equipamento_texto' : 'equipamento_id', null);
    } else {
      const value = next === '' ? null : next;
      const ok = await saveScField(id, field, value);
      if (!ok) {
        await loadSc();
        return;
      }
    }

    await loadSc();
  };

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isLong) {
      e.preventDefault();
      editor.blur();
    } else if (e.key === 'Escape') {
      cancelled = true;
      editor.blur();
    }
  });

  editor.addEventListener('blur', () => {
    setTimeout(finish, 150);
  });

  editor.focus();
  if (editor.select) editor.select();
}

/*
|--------------------------------------------------------------------------
| LISTAGEM
|--------------------------------------------------------------------------
*/

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
      cancelOpenEdits();

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

    const totalEl = document.getElementById('scCounter') || document.getElementById('scTotal');
    const overdueEl = document.getElementById('scOverdue');
    if (totalEl) totalEl.textContent = String(_scTotal);
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

export async function deleteSc(id) {
  const ok = await confirmDelete('Excluir Solicitação', 'Tem certeza que deseja excluir esta solicitação de compra?', `SC #${id}`);
  if (!ok) return;

  try {
    const response = await apiFetch('/app/api/index.php?route=sc', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id) }),
    });
    const res = await response.json();
    if (res.success) {
      showToast('Solicitação excluída com sucesso');
      _scExpandedCards.delete(Number(id));
      await loadSc();
    } else {
      showToast(res.message || 'Erro ao excluir solicitação', 'error');
    }
  } catch (error) {
    showToast(error.message || 'Erro ao excluir solicitação', 'error');
  }
}

function bindListEvents() {
  const listEl = document.getElementById('scList');
  if (!listEl || listEl.dataset.delegated === '1') return;
  listEl.dataset.delegated = '1';

  listEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.sc-delete-btn');
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.scDelete);
      deleteSc(id);
      return;
    }

    const toggleBtn = e.target.closest('.sc-toggle-btn');
    if (toggleBtn) {
      const id = Number(toggleBtn.dataset.scToggle);
      const details = document.getElementById(`scDet${id}`);
      if (details) {
        const wasHidden = details.classList.contains('hidden');
        if (wasHidden) {
          details.classList.remove('hidden');
          _scExpandedCards.add(id);
          toggleBtn.textContent = 'Ocultar';
        } else {
          details.classList.add('hidden');
          _scExpandedCards.delete(id);
          toggleBtn.textContent = 'Ver';
        }
      }
      return;
    }

    const trigger = e.target.closest('[data-sc-edit]');
    if (!trigger) return;

    startScEdit(trigger.closest('[data-sc-id]'), trigger.dataset.scEdit);
  });

  listEl.addEventListener('change', async (e) => {
    const select = e.target.closest('select[data-sc-field="status"]');
    if (!select) return;

    const card = select.closest('[data-sc-id]');
    if (!card) return;

    const ok = await saveScField(Number(card.dataset.scId), 'status', select.value);
    if (!ok) {
      await loadSc();
      return;
    }

    await loadSc();
  });
}

/*
|--------------------------------------------------------------------------
| EXPORTAÇÃO CSV
|--------------------------------------------------------------------------
*/

export async function exportScCsv() {
  try {
    const allItems = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (_scSearch) params.set('search', _scSearch);
      if (_scStatusFilter) params.set('status', _scStatusFilter);
      if (_scSiteFilter.size > 0) params.set('site', Array.from(_scSiteFilter).join(','));

      const response = await apiFetch(`/app/api/index.php?route=sc&${params.toString()}`);
      const res = await response.json();
      if (!res.success) {
        showToast(res.message || 'Erro ao exportar CSV', 'error');
        return;
      }

      const chunk = res.data || [];
      allItems.push(...chunk);

      if (chunk.length === 0 || allItems.length >= (res.total || 0)) {
        break;
      }
      offset += chunk.length;
    }

    if (allItems.length === 0) {
      showToast('Nenhuma solicitação encontrada para exportar', 'error');
      return;
    }

    const header = [
      'ID',
      'Título',
      'Site',
      'Equipamento',
      'Status',
      'Nº SC',
      'Nº PC',
      'Nº PV',
      'Valor SC',
      'Valor PV',
      'Markup (%)',
      'Margem (%)',
      'SLA (dias)',
      'Dias em atraso',
      'Data',
      'Data do status',
      'Observação',
    ].join(';');

    const formatVal = (v) =>
      v !== null && v !== undefined && v !== ''
        ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';

    const formatPctVal = (v) =>
      v !== null && v !== undefined && !Number.isNaN(Number(v))
        ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
        : '';

    const filename = _scSearch ? `sc_${_scSearch.replace(/\s+/g, '_')}.csv` : 'solicitacoes_compra.csv';

    downloadCSV(filename, header, (addRow) => {
      allItems.forEach((item) => {
        addRow([
          String(item.id || ''),
          sanitizeCSV(item.titulo_email || ''),
          sanitizeCSV(item.site || ''),
          sanitizeCSV(item.equipamento_texto || equipmentLabel(item) || ''),
          sanitizeCSV(currentStatusLabel(item.status)),
          sanitizeCSV(item.numero_sc || ''),
          sanitizeCSV(item.numero_pc || ''),
          sanitizeCSV(item.numero_pv || ''),
          formatVal(item.valor_sc),
          formatVal(item.pv_valor_total),
          formatPctVal(item.markup_pct),
          formatPctVal(item.margem_pct),
          item.sla_dias !== null && item.sla_dias !== undefined ? String(item.sla_dias) : '',
          item.overdue_days !== null && item.overdue_days !== undefined ? String(item.overdue_days) : '0',
          formatDateBr(item.data),
          formatDateBr(item.data_status),
          sanitizeCSV(item.observacao || ''),
        ]);
      });
    });

    showToast(`Relatório CSV gerado: ${allItems.length} solicitações`, 'success');
  } catch (err) {
    console.error('Erro ao exportar CSV de SC:', err);
    showToast('Erro ao exportar CSV', 'error');
  }
}

/*
|--------------------------------------------------------------------------
| INIT
|--------------------------------------------------------------------------
*/

export async function initSc() {
  const searchInput = document.getElementById('scSearch');
  const statusFilter = document.getElementById('scStatusFilter');
  const clearBtn = document.getElementById('scClearFilters');
  const csvBtn = document.getElementById('scCsvBtn');

  // A view é remontada a cada navegação: estado de edição não sobrevive.
  cancelOpenEdits();
  _scEditingCount = 0;
  _scExpandedCards.clear();

  // Restaura os filtros ativos (o módulo é singleton entre navegações).
  if (searchInput) searchInput.value = _scSearch;
  if (statusFilter) statusFilter.value = _scStatusFilter;

  await Promise.all([loadScSiteOptions(), loadScEquipmentOptions()]);
  setupScSiteFilterAutocomplete();
  bindListEvents();

  if (csvBtn && !csvBtn.dataset.bound) {
    csvBtn.dataset.bound = '1';
    csvBtn.addEventListener('click', exportScCsv);
  }

  globalThis.refreshScList = () => loadSc(false);

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
