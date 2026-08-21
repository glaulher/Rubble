import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, confirmAction } from '/public/js/core/dom.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { downloadCSV } from '/public/js/utils/csv.js';
import { PlanModal } from '/public/js/components/plan-modal.js';
import { formatDate } from '/public/js/pv/form-utils.js';
import { PV_STATUS_COLORS } from '/public/js/pv/constants.js';

var _pendingScroll = null;
var pendingSearch = '';
var pendingStatusFilter = new Set();
var pendingStatusTodosChecked = true;
var pendingOsFilter = '';
var pendingSortBy = 'e.local';
var pendingSortDir = 'ASC';
var pendingLoading = false;
var pendingAllLoaded = false;
var pendingDateColumn = '';
var pendingDateFrom = '';
var pendingDateTo = '';
var _pendingItemsById = {};
var _pendingStepOptions = [];
var _pendingResponsavelOptions = [];

const PENDING_COLUMNS = 20;
const CSR_COLUMNS = [
  'SITE', 'OS', 'EQUIPAMENTO', 'LOCALIDADE', 'CATEGORIA', 'STATUS', 'STEP', 'RESPONSAVEL', 'PRIORIDADE',
  'DATA_ABERTURA', 'DATA_PV_ENVIADA', 'DATA_PV_APROVADA',
  'DATA_PROGRAMADA', 'DATA_REAL_INICIO', 'DATA_PREVISTA_CONCLUSAO',
  'DATA_CONCLUSAO', 'TECNICO', 'MATERIAL', 'STATUS_DA_PV', 'OBSERVACAO',
];

const PENDING_STATUS_OPTIONS = ['pendente', 'planejado', 'em andamento', 'projeto clean up', 'concluído'];
const PENDING_PRIORITY_OPTIONS = ['0', '0-A', '0-B', '0-C', '0-D', '0-E', '1', '3', '4', '5'];

const PENDING_COLUMNS_DEF = [
  { key: 'local', label: 'Site' },
  { key: 'os', label: 'OS' },
  { key: 'equipamento', label: 'Equipamento' },
  { key: 'localidade', label: 'Localidade' },
  { key: 'tipo', label: 'Categoria' },
  { key: 'status', label: 'Status' },
  { key: 'step', label: 'Step' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'data', label: 'Data Abertura' },
  { key: 'data_pv_enviada', label: 'Data PV Enviada' },
  { key: 'data_pv_aprovada', label: 'Data PV Aprovada' },
  { key: 'data_planejada', label: 'Data Programada' },
  { key: 'data_real_inicio', label: 'Data Real Início' },
  { key: 'data_prevista_conclusao', label: 'Data Prevista Conclusão' },
  { key: 'data_concluido', label: 'Data Conclusão' },
  { key: 'equipe', label: 'Técnico' },
  { key: 'material', label: 'Material' },
  { key: 'pv_status', label: 'Status da PV' },
];

var pendingHiddenColumns = new Set();
var pendingColTodosChecked = true;

const PENDING_EDITABLE_TYPES = {
  status: 'select',
  step: 'managed',
  responsavel: 'managed',
  prioridade: 'select',
  data: 'date',
  data_pv_enviada: 'date',
  data_pv_aprovada: 'date',
  data_planejada: 'date',
  data_real_inicio: 'date',
  data_prevista_conclusao: 'date',
  data_concluido: 'date',
  equipe: 'text',
  material: 'text',
};

export function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendente':
      return 'bg-red-100 text-red-700';
    case 'planejado':
      return 'bg-yellow-100 text-yellow-700';
    case 'em andamento':
      return 'bg-blue-100 text-blue-700';
    case 'projeto clean up':
      return 'bg-purple-100 text-purple-700';
    case 'concluído':
    case 'concluido':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getCategoryBadgeClass(tipo) {
  switch ((tipo || '').toLowerCase()) {
    case 'corretiva':
      return 'bg-orange-100 text-orange-700';
    case 'preventiva':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getPriorityBadgeClass(priority) {
  var p = (priority || '').toUpperCase();
  if (p === '0' || p.indexOf('0-') === 0) return 'bg-red-100 text-red-700';
  if (p === '1') return 'bg-amber-100 text-amber-700';
  if (p === '3') return 'bg-blue-100 text-blue-700';
  if (p === '4') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-700';
}

export function getPvStatusBadgeClass(status) {
  if (!status || status === 'Sem PV') {
    return 'bg-slate-100 text-slate-700';
  }
  var colors = (typeof PV_STATUS_COLORS !== 'undefined' && PV_STATUS_COLORS)
    || (typeof globalThis !== 'undefined' && globalThis.PV_STATUS_COLORS)
    || {};
  return colors[status] || 'bg-slate-100 text-slate-700';
}

export function pendingValueRaw(value) {
  return value === null || value === undefined ? '' : value;
}

export function pendingFieldDisplay(field, value) {
  if (field.indexOf('data') === 0) return formatDate(value);
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

export function pendingBadgeClassFor(field, value) {
  if (field === 'status') return 'status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getStatusBadgeClass(value);
  if (field === 'tipo') return 'category-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getCategoryBadgeClass(value);
  if (field === 'prioridade') return 'priority-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getPriorityBadgeClass(value);
  if (field === 'step') return 'px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700';
  if (field === 'responsavel') return 'px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700';
  return '';
}

export async function loadPendingFieldOptions(field) {
  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets&action=options&field=' + field);
    var result = await resp.json();
    if (result && result.success && Array.isArray(result.data)) {
      if (field === 'step') _pendingStepOptions = result.data;
      else if (field === 'responsavel') _pendingResponsavelOptions = result.data;
    }
  } catch (e) {
    console.error('Erro ao carregar opções de ' + field, e);
  }
}

export function enterPendingManagedEdit(td, field) {
  if (td.querySelector('.managed-dropdown')) return;
  var valueEl = td.querySelector('.pending-value');
  var raw = valueEl ? valueEl.getAttribute('data-raw') : '';
  td.setAttribute('data-prev-raw', raw);
  delete td.dataset.pendingValue;

  var options = field === 'step' ? _pendingStepOptions : _pendingResponsavelOptions;
  var html = '<div class="managed-dropdown relative" style="min-width:180px">';
  html += '<div class="bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">';

  for (var i = 0; i < options.length; i++) {
    var opt = options[i];
    var selected = String(raw).toLowerCase() === String(opt.valor).toLowerCase();
    var bgClass = selected ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100';
    html += '<div class="flex items-center justify-between px-3 py-2 cursor-pointer ' + bgClass + '" data-option-value="' + escapeHtml(opt.valor) + '">';
    html += '<span class="text-sm">' + escapeHtml(opt.valor) + '</span>';
    if (opt.in_use) {
      html += '<span class="text-xs text-slate-400 italic">em uso</span>';
    } else {
      html += '<button type="button" class="managed-delete text-slate-400 hover:text-red-500 ml-2" data-option-id="' + opt.id + '" title="Excluir" aria-label="Excluir opção">';
      html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      html += '</button>';
    }
    html += '</div>';
  }

  html += '<div class="border-t border-slate-200">';
  html += '<div class="flex items-center gap-1 px-3 py-2 hover:bg-slate-50 cursor-pointer managed-add-row">';
  html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  html += '<span class="text-sm text-slate-500">Adicionar item</span>';
  html += '</div>';
  html += '<div class="managed-add-input hidden flex items-center gap-1 px-3 py-2">';
  html += '<input type="text" class="flex-1 px-2 py-1 text-sm border border-slate-300 rounded" placeholder="Novo valor" maxlength="100">';
  html += '<button type="button" class="managed-add-confirm px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></button>';
  html += '<button type="button" class="managed-add-cancel px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  html += '</div>';
  html += '<div class="border-t border-slate-200 flex items-center justify-end gap-1 px-3 py-2">';
  html += '<button type="button" class="managed-confirm px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800" title="Confirmar" aria-label="Confirmar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></button>';
  html += '<button type="button" class="managed-cancel-edit px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  html += '</div>';
  html += '</div>';

  html += '</div></div>';

  td.innerHTML = html;

  var dropdown = td.querySelector('.managed-dropdown');

  dropdown.addEventListener('click', function (e) {
    var optionRow = e.target.closest('[data-option-value]');
    if (optionRow && !e.target.closest('.managed-delete')) {
      var val = optionRow.getAttribute('data-option-value');
      td.dataset.pendingValue = val;
      var allOptions = dropdown.querySelectorAll('[data-option-value]');
      for (var j = 0; j < allOptions.length; j++) {
        allOptions[j].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
        allOptions[j].classList.add('text-slate-700', 'hover:bg-slate-100');
      }
      optionRow.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
      optionRow.classList.remove('text-slate-700', 'hover:bg-slate-100');
      return;
    }

    var delBtn = e.target.closest('.managed-delete');
    if (delBtn) {
      e.stopPropagation();
      var optId = parseInt(delBtn.getAttribute('data-option-id'), 10);
      deletePendingManagedOption(field, optId);
      return;
    }

    var addRow = e.target.closest('.managed-add-row');
    if (addRow) {
      addRow.classList.add('hidden');
      var inputRow = td.querySelector('.managed-add-input');
      if (inputRow) {
        inputRow.classList.remove('hidden');
        inputRow.querySelector('input').focus();
      }
      return;
    }

    var confirmBtn = e.target.closest('.managed-add-confirm');
    if (confirmBtn) {
      var input = td.querySelector('.managed-add-input input');
      if (input && input.value.trim() !== '') {
        addPendingManagedOption(td, field, input.value.trim());
      }
      return;
    }

    var cancelBtn = e.target.closest('.managed-add-cancel');
    if (cancelBtn) {
      var addRowEl = td.querySelector('.managed-add-row');
      var inputRowEl = td.querySelector('.managed-add-input');
      if (addRowEl) addRowEl.classList.remove('hidden');
      if (inputRowEl) {
        inputRowEl.classList.add('hidden');
        inputRowEl.querySelector('input').value = '';
      }
      return;
    }

    var confirmEditBtn = e.target.closest('.managed-confirm');
    if (confirmEditBtn) {
      var pendingVal = td.dataset.pendingValue;
      if (pendingVal !== undefined) {
        savePendingManagedOption(td, field, pendingVal);
      } else {
        cancelPendingEdit(td);
      }
      return;
    }

    var cancelEditBtn = e.target.closest('.managed-cancel-edit');
    if (cancelEditBtn) {
      cancelPendingEdit(td);
      return;
    }
  });

  dropdown.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var input = td.querySelector('.managed-add-input input');
      if (input && document.activeElement === input && input.value.trim() !== '') {
        e.preventDefault();
        addPendingManagedOption(td, field, input.value.trim());
      }
    } else if (e.key === 'Escape') {
      cancelPendingEdit(td);
    }
  });
}

export async function savePendingManagedOption(td, field, value) {
  var tr = td.closest('tr.pending-row');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao salvar campo', 'error');
      return;
    }
    refreshPendingCell(td, field, value);
    if (field === 'step' || field === 'responsavel') {
      await loadPendingFieldOptions(field);
    }
    showToast('Campo atualizado', 'success');
  } catch (e) {
    console.error('Erro ao salvar campo', e);
    showToast('Erro ao salvar campo', 'error');
  }
}

export async function deletePendingManagedOption(field, id) {
  var confirmed = await confirmAction('Excluir opção', 'Tem certeza que deseja excluir esta opção?');
  if (!confirmed) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-option', field: field, id: id }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao excluir opção', 'error');
      return;
    }
    await loadPendingFieldOptions(field);
    var td = document.querySelector('td[data-field="' + field + '"].managed-active');
    if (td) enterPendingManagedEdit(td, field);
    showToast('Opção excluída', 'success');
  } catch (e) {
    console.error('Erro ao excluir opção', e);
    showToast('Erro ao excluir opção', 'error');
  }
}

export async function addPendingManagedOption(td, field, value) {
  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-option', field: field, value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao adicionar opção', 'error');
      return;
    }
    await loadPendingFieldOptions(field);
    enterPendingManagedEdit(td, field);
    showToast('Opção adicionada', 'success');
  } catch (e) {
    console.error('Erro ao adicionar opção', e);
    showToast('Erro ao adicionar opção', 'error');
  }
}

export function pendingEditBtn(field) {
  return '<button type="button" class="pending-edit text-slate-400 hover:text-blue-500 ml-1 align-middle" data-field="' + field + '" title="Editar" aria-label="Editar">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
    + '</button>';
}

export function buildPendingSelect(options, selected, capitalize) {
  var html = '<select class="pending-edit-input pending-select px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800">';
  if (selected === '') {
    html += '<option value="">Selecionar</option>';
  }
  for (var i = 0; i < options.length; i++) {
    var opt = options[i];
    var label = capitalize ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
    var sel = String(selected).toLowerCase() === opt.toLowerCase() ? ' selected' : '';
    html += '<option value="' + opt + '"' + sel + '>' + escapeHtml(label) + '</option>';
  }
  html += '</select>';
  return html;
}

export function pendingEditableCellHtml(field, value) {
  var raw = pendingValueRaw(value);
  var display = pendingFieldDisplay(field, value);
  var badge = pendingBadgeClassFor(field, value);
  var hidden = pendingHiddenColumns.has(field) ? ' hidden' : '';
  return '<td class="px-3 py-2.5 text-sm text-slate-600' + hidden + '" data-field="' + field + '" data-col="' + field + '">'
    + '<span class="inline-flex items-center gap-1">'
    + '<span class="pending-value' + (badge ? ' ' + badge : '') + '" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
    + pendingEditBtn(field)
    + '</span>'
    + '</td>';
}

export function enterPendingEdit(td, field) {
  if (td.querySelector('.pending-edit-input') || td.querySelector('.managed-dropdown')) return;
  var type = PENDING_EDITABLE_TYPES[field] || 'text';

  if (type === 'managed') {
    td.classList.add('managed-active');
    enterPendingManagedEdit(td, field);
    return;
  }

  var valueEl = td.querySelector('.pending-value');
  var raw = valueEl ? valueEl.getAttribute('data-raw') : '';
  td.setAttribute('data-prev-raw', raw);

  var type = PENDING_EDITABLE_TYPES[field] || 'text';
  var inputHtml;
  if (type === 'select') {
    if (field === 'status') {
      inputHtml = buildPendingSelect(PENDING_STATUS_OPTIONS, raw, true);
    } else {
      inputHtml = buildPendingSelect(PENDING_PRIORITY_OPTIONS, raw, false);
    }
  } else if (type === 'date') {
    inputHtml = '<input type="date" class="pending-edit-input pending-date px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800" value="' + escapeHtml(raw) + '" />';
  } else {
    inputHtml = '<input type="text" class="pending-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800" value="' + escapeHtml(raw) + '" />';
  }

  td.innerHTML = inputHtml
    + '<button type="button" class="pending-save ml-1 px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
    + '<button type="button" class="pending-cancel ml-1 px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
}

export function refreshPendingCell(td, field, value) {
  var raw = pendingValueRaw(value);
  var display = pendingFieldDisplay(field, value);
  var badge = pendingBadgeClassFor(field, value);
  td.classList.remove('managed-active');
  delete td.dataset.pendingValue;
  td.removeAttribute('data-prev-raw');
  td.innerHTML = '<span class="inline-flex items-center gap-1">'
    + '<span class="pending-value' + (badge ? ' ' + badge : '') + '" data-raw="' + escapeHtml(raw) + '">' + escapeHtml(display) + '</span>'
    + pendingEditBtn(field)
    + '</span>';
}

export function cancelPendingEdit(td) {
  var field = td.getAttribute('data-field');
  var prev = td.getAttribute('data-prev-raw') || '';
  td.classList.remove('managed-active');
  refreshPendingCell(td, field, prev);
}

export function obsDisplayHtml(value) {
  var display = value === null || value === undefined || value === '' ? '-' : value;
  return escapeHtml(display).replace(/\n/g, '<br>');
}

export function refreshPendingObs(wrap, value) {
  var raw = pendingValueRaw(value);
  wrap.removeAttribute('data-prev-raw');
  wrap.innerHTML = '<span class="obs-value text-slate-700" data-raw="' + escapeHtml(raw) + '">' + obsDisplayHtml(value) + '</span>'
    + pendingEditBtn('obs');
}

export function enterPendingObsEdit(wrap) {
  if (wrap.querySelector('.pending-edit-input')) return;
  var valueEl = wrap.querySelector('.obs-value');
  var raw = valueEl ? valueEl.getAttribute('data-raw') : '';
  wrap.setAttribute('data-prev-raw', raw);
  wrap.innerHTML = '<textarea rows="3" class="pending-edit-input obs-input flex-1 min-w-0 px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 resize-y" placeholder="Observa\u00e7\u00e3o">' + escapeHtml(raw) + '</textarea>'
    + '<button type="button" class="pending-save ml-1 px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
    + '<button type="button" class="pending-cancel ml-1 px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
}

export async function savePendingObs(wrap) {
  var input = wrap.querySelector('.pending-edit-input');
  if (!input) return;
  var value = input.value;
  var tr = wrap.closest('tr.pending-details');
  var id = tr ? tr.getAttribute('data-detail-for') : null;
  if (!id) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: 'obs', value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao salvar campo', 'error');
      return;
    }
    refreshPendingObs(wrap, value);
    showToast('Campo atualizado', 'success');
  } catch (e) {
    console.error('Erro ao salvar campo', e);
    showToast('Erro ao salvar campo', 'error');
  }
}

export function cancelPendingObs(wrap) {
  var prev = wrap.getAttribute('data-prev-raw') || '';
  refreshPendingObs(wrap, prev);
}

export function copyOs(os) {
  if (!os || os === '-') return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(os)
      .then(function () { showToast('N\u00ba OS copiado: ' + os, 'success'); })
      .catch(function () { fallbackCopy(os); });
  } else {
    fallbackCopy(os);
  }
}

export function fallbackCopy(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('N\u00ba OS copiado: ' + text, 'success');
  } catch (e) {
    showToast('Erro ao copiar', 'error');
  }
  document.body.removeChild(textarea);
}

export function pendingPlanActionHtml(item) {
  if (typeof getUser !== 'function') return '<td class="px-3 py-2.5 text-sm"></td>';
  var role = (getUser().role || '').toLowerCase();
  if (role !== 'admin' && role !== 'coordenador') return '<td class="px-3 py-2.5 text-sm"></td>';
  if (typeof iconButtonHtml !== 'function') return '<td class="px-3 py-2.5 text-sm"></td>';
  return '<td class="px-3 py-2.5 text-sm">'
    + iconButtonHtml('plan', 'Planejar', { 'data-action': 'plan', 'data-plan-id': item.id }, 'below-left')
    + '</td>';
}

export function handlePendingPlanned(ticket, data) {
  if (!data) return;
  var newStatus = (data.item && data.item.status) || 'Planejado';
  var filterMatch = pendingStatusFilter.size === 0
    || pendingStatusFilter.has(String(newStatus).toLowerCase());
  if (!filterMatch) {
    _pendingReset();
    showToast('Atividade planejada com sucesso!', 'success');
    return;
  }

  var row = document.querySelector('tr.pending-row[data-id="' + ticket.id + '"]');
  if (row) {
    var statusTd = row.querySelector('td[data-field="status"]');
    if (statusTd) refreshPendingCell(statusTd, 'status', newStatus);
    var plannedDate = data.item ? (data.item.data_planejada || '') : '';
    var dataTd = row.querySelector('td[data-field="data_planejada"]');
    if (dataTd) refreshPendingCell(dataTd, 'data_planejada', plannedDate);
  }
  showToast('Atividade planejada com sucesso!', 'success');
}

export async function savePendingField(td) {
  var input = td.querySelector('.pending-edit-input');
  if (!input) return;
  var value = input.value;
  var field = td.getAttribute('data-field');
  var tr = td.closest('tr.pending-row');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;

  try {
    var resp = await apiFetch('/app/api/index.php?route=pending-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: value }),
    });
    var result = await resp.json();
    if (!result.success) {
      showToast(result.message || 'Erro ao salvar campo', 'error');
      return;
    }
    refreshPendingCell(td, field, value);
    showToast('Campo atualizado', 'success');
  } catch (e) {
    console.error('Erro ao salvar campo', e);
    showToast('Erro ao salvar campo', 'error');
  }
}

export function renderPendingTable(list, append) {
  append = append || false;
  var tbody = document.getElementById('pendingTableBody');
  var empty = document.getElementById('pendingEmpty');

  if (!tbody) return;

  if (!append) {
    tbody.innerHTML = '';
  }

  if (list.length === 0 && !append) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  if (!append) {
    _pendingItemsById = {};
  }

  var html = '';

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    _pendingItemsById[item.id] = item;
    var pvStatus = item.pv_status || 'Sem PV';
    var pvBadgeClass = getPvStatusBadgeClass(pvStatus);

    html += '<tr class="pending-row border-b border-slate-200 hover:bg-slate-50 cursor-pointer"'
      + ' data-id="' + item.id + '" data-expandable="true">'
      + pendingPlanActionHtml(item)
      + '<td class="px-3 py-2.5 text-sm text-slate-800' + (pendingHiddenColumns.has('local') ? ' hidden' : '') + '" data-col="local">'
      + '<span class="expand-icon text-slate-400 mr-2">&#9654;</span>'
      + escapeHtml(item.local) + '</td>'
      + '<td class="px-3 py-2.5 text-sm font-medium text-slate-800' + (pendingHiddenColumns.has('os') ? ' hidden' : '') + '" data-col="os">'
      + '<span class="relative group inline-flex cursor-pointer hover:text-blue-600 hover:underline transition" data-action="copy-os" data-os="' + escapeHtml(item.os || '') + '" aria-label="Clique para copiar">' + escapeHtml(item.os || '-')
      + '<span class="absolute top-full mt-2 left-1/2 -translate-x-1/2 origin-top scale-0 group-hover:scale-100 transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Clique para copiar</span>'
      + '</span>'
      + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600' + (pendingHiddenColumns.has('equipamento') ? ' hidden' : '') + '" data-col="equipamento">'
      + escapeHtml(item.equipamento || '') + '</td>'
      + '<td class="px-3 py-2.5 text-sm text-slate-600' + (pendingHiddenColumns.has('localidade') ? ' hidden' : '') + '" data-col="localidade">' + escapeHtml(item.localidade || '-') + '</td>'
      + '<td class="px-3 py-2.5 text-sm' + (pendingHiddenColumns.has('tipo') ? ' hidden' : '') + '" data-col="tipo">'
      + '<span class="category-badge px-2 py-0.5 rounded-full text-xs font-medium ' + getCategoryBadgeClass(item.tipo) + '">'
      + escapeHtml(item.tipo || '-') + '</span></td>'
      + pendingEditableCellHtml('status', item.status)
      + pendingEditableCellHtml('step', item.step)
      + pendingEditableCellHtml('responsavel', item.responsavel)
      + pendingEditableCellHtml('prioridade', item.prioridade)
      + pendingEditableCellHtml('data', item.data)
      + pendingEditableCellHtml('data_pv_enviada', item.data_pv_enviada)
      + pendingEditableCellHtml('data_pv_aprovada', item.data_pv_aprovada)
      + pendingEditableCellHtml('data_planejada', item.data_planejada)
      + pendingEditableCellHtml('data_real_inicio', item.data_real_inicio)
      + pendingEditableCellHtml('data_prevista_conclusao', item.data_prevista_conclusao)
      + pendingEditableCellHtml('data_concluido', item.data_concluido)
      + pendingEditableCellHtml('equipe', item.equipe)
      + pendingEditableCellHtml('material', item.material)
      + '<td class="px-3 py-2.5 text-sm' + (pendingHiddenColumns.has('pv_status') ? ' hidden' : '') + '" data-col="pv_status">'
      + '<span class="pv-status-badge px-2 py-0.5 rounded-full text-xs font-medium ' + pvBadgeClass + '">'
      + escapeHtml(pvStatus)
      + '</span></td>'
      + '</tr>';

    html += '<tr class="pending-details hidden" data-detail-for="' + item.id + '">'
      + '<td colspan="' + pendingColspan() + '" class="px-3 py-2.5 bg-slate-50">'
      + '<div class="text-sm"><span class="text-slate-500">Observa\u00e7\u00e3o:</span> '
      + '<span class="obs-wrap flex items-center gap-1" data-obs-for="' + item.id + '">'
      + '<span class="obs-value text-slate-700" data-raw="' + escapeHtml(item.obs || '') + '">' + obsDisplayHtml(item.obs) + '</span>'
      + pendingEditBtn('obs')
      + '</span></div>'
      + '</td></tr>';
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }

  applyPendingColumnVisibility();
}

export function syncPendingTable(newItems) {
  var tbody = document.getElementById('pendingTableBody');
  if (!tbody) return;

  var existingRows = tbody.querySelectorAll('tr.pending-row');
  var existingIds = {};
  for (var i = 0; i < existingRows.length; i++) {
    var id = existingRows[i].getAttribute('data-id');
    if (id) existingIds[id] = existingRows[i];
  }

  var newIds = {};
  for (var i = 0; i < newItems.length; i++) {
    newIds[newItems[i].id] = true;
  }

  for (var id in existingIds) {
    if (!newIds[id]) {
      var row = existingIds[id];
      var detail = tbody.querySelector('tr.pending-details[data-detail-for="' + id + '"]');
      if (row) row.remove();
      if (detail) detail.remove();
    }
  }
}

export function togglePendingRow(id) {
  var row = document.querySelector('tr.pending-row[data-id="' + id + '"]');
  var detail = document.querySelector('tr.pending-details[data-detail-for="' + id + '"]');
  if (!row || !detail) return;

  detail.classList.toggle('hidden');
  var icon = row.querySelector('.expand-icon');
  if (icon) {
    icon.innerHTML = detail.classList.contains('hidden') ? '&#9654;' : '&#9660;';
  }
}

export function updatePendingBadge(data) {
  var badge = document.getElementById('pendingBadge');
  if (badge) badge.textContent = data.total || 0;
}

export function pendingColspan() {
  return PENDING_COLUMNS - pendingHiddenColumns.size;
}

export function applyPendingColumnVisibility() {
  for (var i = 0; i < PENDING_COLUMNS_DEF.length; i++) {
    var col = PENDING_COLUMNS_DEF[i].key;
    var hidden = pendingHiddenColumns.has(col);
    var ths = document.querySelectorAll('#pendingTable thead th[data-col="' + col + '"]');
    var tds = document.querySelectorAll('#pendingTable tbody td[data-col="' + col + '"]');
    for (var t = 0; t < ths.length; t++) ths[t].classList.toggle('hidden', hidden);
    for (var d = 0; d < tds.length; d++) tds[d].classList.toggle('hidden', hidden);
  }
  var detail = document.querySelectorAll('#pendingTable tr.pending-details > td');
  for (var i2 = 0; i2 < detail.length; i2++) {
    detail[i2].colSpan = pendingColspan();
  }
}

export function updatePendingColumnLabel() {
  var label = document.getElementById('pendingColLabel');
  if (!label) return;
  if (pendingColTodosChecked) {
    label.textContent = 'Todas';
    label.classList.remove('text-blue-600');
  } else {
    label.textContent = pendingHiddenColumns.size + ' oculta(s)';
    label.classList.add('text-blue-600');
  }
}

export function renderPendingColumnDropdown() {
  var dropdown = document.getElementById('pendingColDropdown');
  if (!dropdown) return;

  if (!dropdown.dataset.delegated) {
    dropdown.addEventListener('change', function (e) {
      var cb = e.target.closest('.pending-col-check');
      if (!cb) return;
      var val = cb.dataset.value;
      if (val === '__all__') {
        pendingColTodosChecked = cb.checked;
        if (cb.checked) {
          pendingHiddenColumns.clear();
        } else {
          pendingHiddenColumns = new Set(PENDING_COLUMNS_DEF.map(function (c) { return c.key; }));
        }
      } else {
        if (cb.checked) {
          pendingHiddenColumns.delete(val);
        } else {
          pendingHiddenColumns.add(val);
        }
        pendingColTodosChecked = pendingHiddenColumns.size === 0;
      }
      renderPendingColumnDropdown();
      updatePendingColumnLabel();
      applyPendingColumnVisibility();
    });
    dropdown.dataset.delegated = '1';
  }

  var html = '';
  var allChecked = pendingColTodosChecked ? 'checked' : '';
  html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">';
  html += '<input type="checkbox" class="pending-col-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="__all__" ' + allChecked + '>';
  html += '<span class="text-sm text-slate-700 font-medium">Todas</span>';
  html += '</label>';

  for (var i = 0; i < PENDING_COLUMNS_DEF.length; i++) {
    var col = PENDING_COLUMNS_DEF[i];
    var checked = pendingColTodosChecked || !pendingHiddenColumns.has(col.key) ? 'checked' : '';
    html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">';
    html += '<input type="checkbox" class="pending-col-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="' + col.key + '" ' + checked + '>';
    html += '<span class="text-sm text-slate-700">' + escapeHtml(col.label) + '</span>';
    html += '</label>';
  }

  dropdown.innerHTML = html;
}

export function initPendingColumnSelect() {
  var btn = document.getElementById('pendingColBtn');
  var dropdown = document.getElementById('pendingColDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  if (!document._pendingColGlobalListener) {
    document.addEventListener('click', function (e) {
      var container = document.getElementById('pendingColContainer');
      if (container && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
    document._pendingColGlobalListener = true;
  }

  renderPendingColumnDropdown();
  updatePendingColumnLabel();
  applyPendingColumnVisibility();
}

export function buildPendingCsvRow(item) {
  return [
    sanitizeCSV(item.local),
    sanitizeCSV(item.os || ''),
    sanitizeCSV(item.equipamento || ''),
    sanitizeCSV(item.localidade || ''),
    sanitizeCSV(item.tipo || ''),
    sanitizeCSV(item.status || ''),
    sanitizeCSV(item.step || ''),
    sanitizeCSV(item.responsavel || ''),
    sanitizeCSV(item.prioridade || ''),
    formatDate(item.data),
    formatDate(item.data_pv_enviada),
    formatDate(item.data_pv_aprovada),
    formatDate(item.data_planejada),
    formatDate(item.data_real_inicio),
    formatDate(item.data_prevista_conclusao),
    formatDate(item.data_concluido),
    sanitizeCSV(item.equipe || ''),
    sanitizeCSV(item.material || ''),
    sanitizeCSV(item.pv_status || 'Sem PV'),
    sanitizeCSV(item.obs || ''),
  ];
}

export async function exportPendingCsv() {
  try {
    var allRows = [];
    var offset = 0;
    var total;
    var CHUNK = 200;

    while (true) {
      var url = '/app/api/index.php?route=pending-tickets&limit=' + CHUNK
        + '&offset=' + offset
        + '&' + buildPendingQuery();

      var resp = await fetch(url);
      var result = await resp.json();
      var chunk = (result && result.data && result.data.items) || [];
      total = (result && result.data && result.data.total) || chunk.length;

      for (var i = 0; i < chunk.length; i++) {
        allRows.push(buildPendingCsvRow(chunk[i]));
      }

      if (chunk.length === 0) break;
      offset += chunk.length;
    }

    if (allRows.length === 0) {
      showToast('Nenhum dado encontrado', 'error');
      return;
    }

    var fileName = pendingSearch && pendingSearch.trim() !== ''
      ? 'os_corretivas_' + pendingSearch.trim().replace(/\s+/g, '_') + '.csv'
      : 'os_corretivas.csv';

    var header = CSR_COLUMNS.join(';');

    downloadCSV(fileName, header, function (_addRow) {
      for (var i = 0; i < allRows.length; i++) {
        _addRow(allRows[i]);
      }
    });

    showToast('CSV gerado: ' + allRows.length + ' registros', 'success');
  } catch (e) {
    console.error('Erro ao exportar CSV', e);
    showToast('Erro ao gerar CSV', 'error');
  }
}

var pendingDebouncedSearch = debounce(function (val) {
  pendingSearch = val;
  _pendingReset();
}, 1000);

var pendingDebouncedOsFilter = debounce(function (val) {
  pendingOsFilter = val;
  _pendingReset();
}, 1000);

export function buildPendingSortQuery() {
  return '&sort_by=' + encodeURIComponent(pendingSortBy)
    + '&sort_dir=' + encodeURIComponent(pendingSortDir);
}

export function buildPendingQuery() {
  var q = 'search=' + encodeURIComponent(pendingSearch)
    + '&os=' + encodeURIComponent(pendingOsFilter)
    + '&sort_by=' + encodeURIComponent(pendingSortBy)
    + '&sort_dir=' + encodeURIComponent(pendingSortDir);
  if (pendingDateColumn) {
    q += '&date_column=' + encodeURIComponent(pendingDateColumn);
    if (pendingDateFrom) q += '&date_from=' + encodeURIComponent(pendingDateFrom);
    if (pendingDateTo) q += '&date_to=' + encodeURIComponent(pendingDateTo);
  }
  if (pendingStatusTodosChecked) {
    return q;
  }
  if (pendingStatusFilter.size > 0) {
    q += '&status=' + Array.from(pendingStatusFilter).map(encodeURIComponent).join(',');
  } else {
    q += '&status=__none__';
  }
  return q;
}

export function clearPendingDateRange() {
  pendingDateFrom = '';
  pendingDateTo = '';
  var fromInput = document.getElementById('pendingDateFrom');
  if (fromInput) fromInput.value = '';
  var toInput = document.getElementById('pendingDateTo');
  if (toInput) toInput.value = '';
}

export function _pendingReset() {
  pendingLoading = false;
  pendingAllLoaded = false;
  _pendingItemsById = {};
  var tbody = document.getElementById('pendingTableBody');
  if (tbody) tbody.innerHTML = '';
  if (_pendingScroll) _pendingScroll.reset().init();
}

export function setupPendingSort() {
  document.querySelectorAll('#pendingTable thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.sort;
      if (pendingSortBy === col) {
        pendingSortDir = pendingSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        pendingSortBy = col;
        pendingSortDir = 'ASC';
      }
      document.querySelectorAll('#pendingTable thead th .sort-icon').forEach(function (el) {
        el.textContent = '';
      });
      var icon = this.querySelector('.sort-icon');
      if (icon) icon.textContent = pendingSortDir === 'ASC' ? '\u25B2' : '\u25BC';
      _pendingReset();
    });
  });
}

export function updatePendingStatusLabel() {
  var label = document.getElementById('pendingStatusLabel');
  if (!label) return;
  if (pendingStatusTodosChecked) {
    label.textContent = 'Todos';
    label.classList.remove('text-blue-600');
  } else {
    label.textContent = pendingStatusFilter.size + ' selecionado(s)';
    label.classList.add('text-blue-600');
  }
}

export function renderPendingStatusDropdown() {
  var dropdown = document.getElementById('pendingStatusDropdown');
  if (!dropdown) return;

  if (!dropdown.dataset.delegated) {
    dropdown.addEventListener('change', function (e) {
      var cb = e.target.closest('.pending-status-check');
      if (!cb) return;
      var val = cb.dataset.value;
      if (val === '__all__') {
        pendingStatusTodosChecked = cb.checked;
        pendingStatusFilter.clear();
      } else {
        if (cb.checked) {
          pendingStatusFilter.add(val);
        } else {
          if (pendingStatusFilter.size === 0) {
            pendingStatusFilter = new Set(PENDING_STATUS_OPTIONS);
          }
          pendingStatusFilter.delete(val);
        }
        pendingStatusTodosChecked = PENDING_STATUS_OPTIONS.every(function (opt) {
          return pendingStatusFilter.has(opt);
        });
      }
      renderPendingStatusDropdown();
      updatePendingStatusLabel();
      _pendingReset();
    });
    dropdown.dataset.delegated = '1';
  }

  var html = '';
  var allChecked = pendingStatusTodosChecked ? 'checked' : '';
  html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">';
  html += '<input type="checkbox" class="pending-status-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="__all__" ' + allChecked + '>';
  html += '<span class="text-sm text-slate-700 font-medium">Todos</span>';
  html += '</label>';

  for (var i = 0; i < PENDING_STATUS_OPTIONS.length; i++) {
    var opt = PENDING_STATUS_OPTIONS[i];
    var checked = pendingStatusTodosChecked || pendingStatusFilter.has(opt) ? 'checked' : '';
    var labelText = opt.charAt(0).toUpperCase() + opt.slice(1);
    html += '<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">';
    html += '<input type="checkbox" class="pending-status-check rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-value="' + opt + '" ' + checked + '>';
    html += '<span class="text-sm text-slate-700">' + escapeHtml(labelText) + '</span>';
    html += '</label>';
  }

  dropdown.innerHTML = html;
}

export function initPendingStatusSelect() {
  var btn = document.getElementById('pendingStatusBtn');
  var dropdown = document.getElementById('pendingStatusDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  if (!document._pendingStatusGlobalListener) {
    document.addEventListener('click', function (e) {
      var container = document.getElementById('pendingStatusContainer');
      if (container && !container.contains(e.target)) {
        var dd = document.getElementById('pendingStatusDropdown');
        if (dd) dd.classList.add('hidden');
      }
    });
    document._pendingStatusGlobalListener = true;
  }

  renderPendingStatusDropdown();
  updatePendingStatusLabel();
}

export function initPendingTickets() {
  pendingSearch = '';
  pendingStatusFilter = new Set();
  pendingStatusTodosChecked = true;
  pendingOsFilter = '';
  pendingSortBy = 'e.local';
  pendingSortDir = 'ASC';
  pendingDateColumn = '';
  pendingDateFrom = '';
  pendingDateTo = '';
  pendingLoading = false;
  pendingAllLoaded = false;
  pendingHiddenColumns = new Set();
  pendingColTodosChecked = true;
  _pendingItemsById = {};
  _pendingStepOptions = [];
  _pendingResponsavelOptions = [];

  loadPendingFieldOptions('step');
  loadPendingFieldOptions('responsavel');

  var searchInput = document.getElementById('pendingSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.addEventListener('click', function () {
      if (this.value.trim() !== '') {
        this.value = '';
        pendingSearch = '';
        _pendingReset();
      }
    });
    searchInput.addEventListener('input', function () {
      pendingDebouncedSearch(this.value);
    });
  }

  var osInput = document.getElementById('pendingOsFilter');
  if (osInput) {
    osInput.value = '';
    osInput.addEventListener('click', function () {
      if (this.value.trim() !== '') {
        this.value = '';
        pendingOsFilter = '';
        _pendingReset();
      }
    });
    osInput.addEventListener('input', function () {
      pendingDebouncedOsFilter(this.value);
    });
  }

  var dateColumnSelect = document.getElementById('pendingDateColumn');
  if (dateColumnSelect) {
    dateColumnSelect.value = pendingDateColumn;
    dateColumnSelect.addEventListener('change', function () {
      pendingDateColumn = this.value;
      if (pendingDateColumn) {
        clearPendingDateRange();
      }
      _pendingReset();
    });
  }

  var dateFromInput = document.getElementById('pendingDateFrom');
  if (dateFromInput) {
    dateFromInput.value = pendingDateFrom;
    dateFromInput.addEventListener('change', function () {
      pendingDateFrom = this.value;
      _pendingReset();
    });
  }

  var dateToInput = document.getElementById('pendingDateTo');
  if (dateToInput) {
    dateToInput.value = pendingDateTo;
    dateToInput.addEventListener('change', function () {
      pendingDateTo = this.value;
      _pendingReset();
    });
  }

  initPendingStatusSelect();

  var csvBtn = document.getElementById('pendingCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', exportPendingCsv);
  }

  var tbody = document.getElementById('pendingTableBody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var planBtn = e.target.closest('button[data-action="plan"]');
      if (planBtn) {
        var planId = planBtn.getAttribute('data-plan-id');
        var planTicket = planId != null ? _pendingItemsById[planId] : null;
        if (planTicket && typeof PlanModal !== 'undefined' && PlanModal.open) {
          PlanModal.open({
            mode: 'pending',
            ticket: planTicket,
            onSubmit: function (data) { handlePendingPlanned(planTicket, data); },
          });
        }
        return;
      }
      var editBtn = e.target.closest('button.pending-edit');
      if (editBtn) {
        var field = editBtn.getAttribute('data-field');
        if (field === 'obs') {
          enterPendingObsEdit(editBtn.closest('.obs-wrap'));
        } else {
          enterPendingEdit(editBtn.closest('td'), field);
        }
        return;
      }
      var saveBtn = e.target.closest('button.pending-save');
      if (saveBtn) {
        var obsWrap = saveBtn.closest('.obs-wrap');
        if (obsWrap) {
          savePendingObs(obsWrap);
        } else {
          savePendingField(saveBtn.closest('td'));
        }
        return;
      }
      var cancelBtn = e.target.closest('button.pending-cancel');
      if (cancelBtn) {
        var cancelWrap = cancelBtn.closest('.obs-wrap');
        if (cancelWrap) {
          cancelPendingObs(cancelWrap);
        } else {
          cancelPendingEdit(cancelBtn.closest('td'));
        }
        return;
      }
      var copyOsEl = e.target.closest('[data-action="copy-os"]');
      if (copyOsEl) {
        copyOs(copyOsEl.getAttribute('data-os'));
        return;
      }
      var row = e.target.closest('tr.pending-row');
      if (row) {
        var toggleTarget = e.target.closest('.expand-icon, td[data-col="local"]');
        if (toggleTarget) {
          var id = row.getAttribute('data-id');
          if (id) togglePendingRow(parseInt(id));
        }
      }
    });

    tbody.addEventListener('keydown', function (e) {
      var input = e.target.closest('.pending-edit-input');
      if (!input) return;
      var keyWrap = input.closest('.obs-wrap');
      var isTextarea = input.tagName === 'TEXTAREA';
      if (e.key === 'Enter') {
        if (isTextarea && !(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        if (keyWrap) {
          savePendingObs(keyWrap);
        } else {
          savePendingField(input.closest('td'));
        }
      } else if (e.key === 'Escape') {
        if (keyWrap) {
          cancelPendingObs(keyWrap);
        } else {
          cancelPendingEdit(input.closest('td'));
        }
      }
    });
  }

  setupPendingSort();
  initPendingColumnSelect();

  if (!document._pendingManagedGlobalListener) {
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.managed-dropdown') && !e.target.closest('button.pending-edit[data-field="step"]') && !e.target.closest('button.pending-edit[data-field="responsavel"]')) {
        var activeDropdowns = document.querySelectorAll('td.managed-active');
        for (var i = 0; i < activeDropdowns.length; i++) {
          var td = activeDropdowns[i];
          var field = td.getAttribute('data-field');
          var prev = td.getAttribute('data-prev-raw') || '';
          td.classList.remove('managed-active');
          refreshPendingCell(td, field, prev);
        }
      }
    });
    document._pendingManagedGlobalListener = true;
  }

  _pendingScroll = createInfiniteScroll({
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=pending-tickets&limit=' + params.limit
        + '&offset=' + params.offset
        + '&' + buildPendingQuery();

      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderPendingTable(items, true);
    },
    renderFullFn: function (items, total) {
      renderPendingTable(items, false);
      updatePendingBadge({ total: total });
    },
    afterLoadFn: function (state) {
      if (!state.isPolling) {
        updatePendingBadge({ total: state.total });
      }
    },
    getFilterHash: function () {
      return pendingSearch + '|' + Array.from(pendingStatusFilter).sort().join(',')
        + '|' + pendingOsFilter + '|' + pendingSortBy + '|' + pendingSortDir;
    },
    sentinelId: 'pendingSentinel',
    scrollContainerId: 'pendingScrollContainer',
    limit: 20,
  });

  _pendingScroll.init();
}
