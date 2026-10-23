import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { downloadCSV } from '/public/js/utils/csv.js';
import { formatDate } from '/public/js/pv/form-utils.js';
import { createAutocomplete } from '/public/js/pv/form-autocomplete.js';

export const DIARIO_COLUMNS = [
  'SITE', 'EQUIPAMENTO', 'LOCALIDADE', 'OS', 'DATA', 'CATEGORIA', 'STATUS', 'EQUIPE', 'OBSERVACAO', 'CRIADO_POR', 'DATA_CRIACAO'
];

export const DIARIO_STATUS_OPTIONS = [
  'Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up', 'Cancelado'
];

export const DIARIO_CATEGORY_OPTIONS = [
  'corretiva', 'preventiva'
];

export function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

var _diarioScroll = null;
var diarioSearch = '';
var diarioStatusFilter = new Set();
var diarioStatusTodosChecked = true;
var diarioCategoryFilter = new Set();
var diarioCategoryTodosChecked = true;
var diarioDateFrom = '';
var diarioDateTo = '';
var diarioSortBy = 'd.data';
var diarioSortDir = 'DESC';
var _diarioItemsById = {};
var _localsCache = null;

export function getDiarioStatusBadgeClass(status) {
  var s = (status || '').toLowerCase().trim();
  if (s === 'concluído' || s === 'concluido') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  if (s === 'pendente') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  if (s === 'em andamento') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
  if (s === 'planejado') return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300';
  if (s === 'projeto clean up') return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
  if (s === 'cancelado') return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
  return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
}

export function getDiarioCategoryBadgeClass(category) {
  var c = (category || '').toLowerCase().trim();
  if (c === 'corretiva') return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
  if (c === 'preventiva') return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function diarioValueRaw(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function formatDiarioObsDisplay(obs) {
  if (!obs || !obs.trim()) {
    return '<span class="text-slate-400 italic">Adicionar observação...</span>';
  }
  return escapeHtml(obs).replace(/\n\n/g, '<div class="my-1.5 border-t border-slate-200 dark:border-slate-700"></div>').replace(/\n/g, '<br>');
}

export function diarioEditBtn(field) {
  return '<button type="button" class="diario-edit-btn text-slate-400 hover:text-blue-500 ml-1 inline-flex items-center align-middle cursor-pointer" data-field="' + field + '" title="Editar" aria-label="Editar">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
    + '</button>';
}

export function renderDiarioRow(item) {
  var user = getUser() || {};
  var canDelete = user.role === 'admin' || (user.id && item.created_by && parseInt(item.created_by, 10) === parseInt(user.id, 10));

  var equipDisplay = item.equipamento_nome || item.equipamento || '-';
  var dateDisplay = formatDate(item.data) || '-';

  var deleteBtnHtml = canDelete
    ? '<button type="button" class="diario-delete-btn text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer" data-action="delete" data-id="' + item.id + '" title="Excluir" aria-label="Excluir">'
      + '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
      + '</button>'
    : '<span class="text-slate-300 dark:text-slate-600">-</span>';

  return '<tr class="diario-row border-b border-slate-200 dark:border-slate-700/60 hover:bg-slate-50/50 transition" data-id="' + item.id + '">'
    + '<td class="px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200" data-field="site">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.site)) + '">' + escapeHtml(item.site || '-') + '</span>'
      + diarioEditBtn('site')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200" data-field="equipamento_id">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.equipamento_id)) + '" data-equip-name="' + escapeHtml(equipDisplay) + '">' + escapeHtml(equipDisplay) + '</span>'
      + diarioEditBtn('equipamento_id')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300" data-field="localidade">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.localidade)) + '">' + escapeHtml(item.localidade || '-') + '</span>'
      + diarioEditBtn('localidade')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-200" data-field="os">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.os)) + '">' + escapeHtml(item.os || '-') + '</span>'
      + diarioEditBtn('os')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300" data-field="data">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.data)) + '">' + escapeHtml(dateDisplay) + '</span>'
      + diarioEditBtn('data')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm" data-field="categoria">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val px-2 py-0.5 rounded-full text-xs font-medium ' + getDiarioCategoryBadgeClass(item.categoria) + '" data-raw="' + escapeHtml(diarioValueRaw(item.categoria)) + '">' + escapeHtml(item.categoria || '-') + '</span>'
      + diarioEditBtn('categoria')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm" data-field="status">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val px-2 py-0.5 rounded-full text-xs font-medium ' + getDiarioStatusBadgeClass(item.status) + '" data-raw="' + escapeHtml(diarioValueRaw(item.status)) + '">' + escapeHtml(item.status || '-') + '</span>'
      + diarioEditBtn('status')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200" data-field="equipe">'
      + '<span class="inline-flex items-center gap-1">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.equipe)) + '">' + escapeHtml(item.equipe || '-') + '</span>'
      + diarioEditBtn('equipe')
      + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm min-w-[280px]" data-field="obs">'
      + '<div class="obs-wrap flex items-start gap-1.5" data-obs-for="' + item.id + '">'
      + '<div class="obs-value text-xs text-slate-700 dark:text-slate-300 break-words flex-1 min-w-0" data-raw="' + escapeHtml(diarioValueRaw(item.obs)) + '">' + formatDiarioObsDisplay(item.obs) + '</div>'
      + '<button type="button" class="diario-edit-obs text-slate-400 hover:text-blue-500 ml-1 shrink-0 cursor-pointer" data-action="edit-obs" title="Adicionar observação">'
      + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
      + '</button>'
      + '</div>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-center whitespace-nowrap">'
      + deleteBtnHtml
    + '</td>'
    + '</tr>';
}

export function renderDiarioTable(items, append) {
  var tbody = document.getElementById('diarioTableBody');
  var emptyEl = document.getElementById('diarioEmpty');
  if (!tbody) return;

  var list = items || [];
  if (!append) {
    _diarioItemsById = {};
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    _diarioItemsById[item.id] = item;
    html += renderDiarioRow(item);
  }

  if (!append) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }

  if (emptyEl) {
    if (tbody.querySelectorAll('tr.diario-row').length === 0) {
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
    }
  }
}

export function syncDiarioTable(newItems) {
  var tbody = document.getElementById('diarioTableBody');
  if (!tbody) return;

  var existingRows = tbody.querySelectorAll('tr.diario-row');
  var existingIds = {};
  for (var i = 0; i < existingRows.length; i++) {
    var id = existingRows[i].getAttribute('data-id');
    if (id) existingIds[id] = existingRows[i];
  }

  var newIds = {};
  for (var j = 0; j < newItems.length; j++) {
    newIds[newItems[j].id] = true;
  }

  for (var oldId in existingIds) {
    if (!newIds[oldId]) {
      existingIds[oldId].remove();
    }
  }
}

export function updateDiarioBadge(total) {
  var badge = document.getElementById('diarioBadge');
  if (badge) badge.textContent = total !== undefined ? total : 0;
}

export async function loadLocalsList() {
  if (_localsCache) return _localsCache;
  try {
    var res = await apiFetch('/app/api/index.php?route=locals');
    var json = await res.json();
    _localsCache = json.data || [];
    return _localsCache;
  } catch (e) {
    console.error('Erro ao carregar locais:', e);
    return [];
  }
}

export function enterDiarioEdit(td, field) {
  if (td.querySelector('.diario-edit-input')) return;
  var tr = td.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;
  var item = _diarioItemsById[id] || {};

  var valEl = td.querySelector('.diario-val');
  var raw = valEl ? valEl.getAttribute('data-raw') : '';
  td.setAttribute('data-prev-raw', raw);

  var inputHtml = '';
  if (field === 'categoria') {
    inputHtml = '<select class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800">';
    DIARIO_CATEGORY_OPTIONS.forEach(function (cat) {
      var sel = raw === cat ? ' selected' : '';
      inputHtml += '<option value="' + cat + '"' + sel + '>' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</option>';
    });
    inputHtml += '</select>';
  } else if (field === 'status') {
    inputHtml = '<select class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800">';
    DIARIO_STATUS_OPTIONS.forEach(function (st) {
      var sel = raw === st ? ' selected' : '';
      inputHtml += '<option value="' + st + '"' + sel + '>' + st + '</option>';
    });
    inputHtml += '</select>';
  } else if (field === 'data') {
    inputHtml = '<input type="date" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800" value="' + escapeHtml(raw) + '" />';
  } else {
    inputHtml = '<input type="text" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 w-full" value="' + escapeHtml(raw) + '" />';
  }

  td.innerHTML = '<div class="flex items-center gap-1">'
    + inputHtml
    + '<button type="button" class="diario-save-btn px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800 shrink-0 cursor-pointer" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
    + '<button type="button" class="diario-cancel-btn px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900 shrink-0 cursor-pointer" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
    + '</div>';

  var input = td.querySelector('.diario-edit-input');
  if (input) {
    input.focus();
    if (input.select && typeof input.select === 'function') input.select();
  }
}

export async function saveDiarioField(td) {
  var tr = td.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  var field = td.getAttribute('data-field');
  var input = td.querySelector('.diario-edit-input');
  if (!id || !field || !input) return;

  var value = input.value.trim();
  var item = _diarioItemsById[id] || {};

  try {
    if (field === 'status') {
      var res = await apiFetch('/app/api/index.php?route=diario&action=change-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id, 10), status: value }),
      });
      var result = await res.json();
      if (!result.success) {
        showToast(result.message || 'Erro ao alterar status', 'error');
        return;
      }
      item.status = result.data.status;
      item.obs = result.data.obs;
      refreshDiarioRow(id);
      showToast('Status alterado com sucesso', 'success');
      return;
    }

    var updateRes = await apiFetch('/app/api/index.php?route=diario', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: value }),
    });
    var updateResult = await updateRes.json();
    if (!updateResult.success) {
      showToast(updateResult.message || 'Erro ao salvar campo', 'error');
      return;
    }

    item[field] = updateResult.data.value;

    // D5: If setting OS on a corretiva row with empty obs, lookup OS text
    if (field === 'os' && value && value !== 'N/A' && item.categoria === 'corretiva' && (!item.obs || item.obs.trim() === '')) {
      try {
        var osRes = await apiFetch('/app/api/index.php?route=diario&action=lookup-os&os=' + encodeURIComponent(value));
        var osJson = await osRes.json();
        if (osJson.success && osJson.data && osJson.data.obs && osJson.data.obs.trim() !== '') {
          var appendRes = await apiFetch('/app/api/index.php?route=diario&action=append-obs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(id, 10), texto: osJson.data.obs }),
          });
          var appendJson = await appendRes.json();
          if (appendJson.success && appendJson.data) {
            item.obs = appendJson.data.obs;
          }
        }
      } catch (err) {
        console.error('Erro no lookup-os:', err);
      }
    }

    refreshDiarioRow(id);
    showToast('Campo atualizado', 'success');
  } catch (err) {
    console.error('Erro ao atualizar campo:', err);
    showToast('Erro ao salvar campo', 'error');
  }
}

export function cancelDiarioEdit(td) {
  var tr = td.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (id) {
    refreshDiarioRow(id);
  }
}

export function refreshDiarioRow(id) {
  var item = _diarioItemsById[id];
  var tr = document.querySelector('tr.diario-row[data-id="' + id + '"]');
  if (!item || !tr) return;

  var newTrHtml = renderDiarioRow(item);
  var temp = document.createElement('tbody');
  temp.innerHTML = newTrHtml;
  var newRow = temp.firstElementChild;
  if (newRow) {
    tr.replaceWith(newRow);
  }
}

export function enterDiarioObsEdit(wrap) {
  if (wrap.querySelector('.diario-obs-input')) return;
  var tr = wrap.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (!id) return;

  wrap.innerHTML = '<div class="flex-1 min-w-0">'
    + '<textarea rows="3" class="diario-obs-input w-full px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 resize-y" placeholder="Adicionar nova observação ao log..."></textarea>'
    + '<div class="flex items-center gap-1.5 mt-1">'
      + '<button type="button" class="diario-save-obs px-2 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800 text-xs font-semibold cursor-pointer">Salvar</button>'
      + '<button type="button" class="diario-cancel-obs px-2 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900 text-xs cursor-pointer">Cancelar</button>'
    + '</div>'
    + '</div>';

  var textarea = wrap.querySelector('.diario-obs-input');
  if (textarea) textarea.focus();
}

export async function saveDiarioObs(wrap) {
  var tr = wrap.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  var textarea = wrap.querySelector('.diario-obs-input');
  if (!id || !textarea) return;

  var texto = textarea.value.trim();
  if (!texto) {
    showToast('Digite uma observação para salvar', 'error');
    return;
  }

  try {
    var res = await apiFetch('/app/api/index.php?route=diario&action=append-obs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), texto: texto }),
    });
    var json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Erro ao adicionar observação', 'error');
      return;
    }

    if (_diarioItemsById[id]) {
      _diarioItemsById[id].obs = json.data.obs;
    }
    refreshDiarioRow(id);
    showToast('Observação adicionada com sucesso', 'success');
  } catch (e) {
    console.error('Erro ao salvar observação:', e);
    showToast('Erro ao salvar observação', 'error');
  }
}

export function cancelDiarioObs(wrap) {
  var tr = wrap.closest('tr');
  var id = tr ? tr.getAttribute('data-id') : null;
  if (id) {
    refreshDiarioRow(id);
  }
}

export async function createDiarioLine() {
  try {
    var res = await apiFetch('/app/api/index.php?route=diario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    var json = await res.json();
    if (!json.success || !json.data || !json.data.item) {
      showToast(json.message || 'Erro ao criar linha', 'error');
      return;
    }

    var newItem = json.data.item;
    _diarioItemsById[newItem.id] = newItem;

    var tbody = document.getElementById('diarioTableBody');
    if (tbody) {
      var rowHtml = renderDiarioRow(newItem);
      tbody.insertAdjacentHTML('afterbegin', rowHtml);
    }

    var emptyEl = document.getElementById('diarioEmpty');
    if (emptyEl) emptyEl.classList.add('hidden');

    var badge = document.getElementById('diarioBadge');
    if (badge) {
      var current = parseInt(badge.textContent || '0', 10);
      badge.textContent = current + 1;
    }

    showToast('Nova linha criada', 'success');
  } catch (e) {
    console.error('Erro ao criar linha:', e);
    showToast('Erro ao criar linha', 'error');
  }
}

export async function deleteDiarioLine(id) {
  var confirmed = await confirmDelete('Excluir atividade', 'Deseja realmente excluir esta atividade do diário?', 'Atividade');
  if (!confirmed) return;

  try {
    var res = await apiFetch('/app/api/index.php?route=diario&id=' + id, {
      method: 'DELETE',
    });
    var json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Erro ao excluir atividade', 'error');
      return;
    }

    delete _diarioItemsById[id];
    var row = document.querySelector('tr.diario-row[data-id="' + id + '"]');
    if (row) row.remove();

    var badge = document.getElementById('diarioBadge');
    if (badge) {
      var current = Math.max(0, parseInt(badge.textContent || '0', 10) - 1);
      badge.textContent = current;
    }

    var tbody = document.getElementById('diarioTableBody');
    var emptyEl = document.getElementById('diarioEmpty');
    if (tbody && emptyEl && tbody.querySelectorAll('tr.diario-row').length === 0) {
      emptyEl.classList.remove('hidden');
    }

    showToast('Atividade excluída com sucesso', 'success');
  } catch (e) {
    console.error('Erro ao excluir:', e);
    showToast('Erro ao excluir atividade', 'error');
  }
}

export function buildDiarioQuery(limit, offset) {
  var url = '/app/api/index.php?route=diario&limit=' + limit + '&offset=' + offset;
  if (diarioSearch) url += '&search=' + encodeURIComponent(diarioSearch);
  if (diarioDateFrom) url += '&data_from=' + encodeURIComponent(diarioDateFrom);
  if (diarioDateTo) url += '&data_to=' + encodeURIComponent(diarioDateTo);

  if (!diarioStatusTodosChecked && diarioStatusFilter.size > 0) {
    Array.from(diarioStatusFilter).forEach(function (st) {
      url += '&status[]=' + encodeURIComponent(st);
    });
  }

  if (!diarioCategoryTodosChecked && diarioCategoryFilter.size > 0) {
    Array.from(diarioCategoryFilter).forEach(function (cat) {
      url += '&categoria[]=' + encodeURIComponent(cat);
    });
  }

  url += '&sort=' + encodeURIComponent(diarioSortBy) + '&dir=' + encodeURIComponent(diarioSortDir);
  return url;
}

export async function exportDiarioCsv() {
  try {
    var allItems = [];
    var offset = 0;
    var limit = 500;
    var total = 1;

    while (offset < total) {
      var url = buildDiarioQuery(limit, offset);
      var res = await apiFetch(url);
      var json = await res.json();
      if (!json.success || !json.data) break;

      var batch = json.data.items || [];
      total = json.data.total || 0;
      allItems = allItems.concat(batch);
      offset += limit;
      if (batch.length === 0) break;
    }

    if (allItems.length === 0) {
      showToast('Nenhum dado encontrado para exportação.', 'error');
      return;
    }

    var fileName = 'diario_atividades_' + new Date().toISOString().slice(0, 10) + '.csv';
    var header = DIARIO_COLUMNS.join(';');

    downloadCSV(fileName, header, function (_addRow) {
      for (var i = 0; i < allItems.length; i++) {
        var it = allItems[i];
        _addRow([
          sanitizeCSV(it.site || ''),
          sanitizeCSV(it.equipamento_nome || it.equipamento || ''),
          sanitizeCSV(it.localidade || ''),
          sanitizeCSV(it.os || ''),
          sanitizeCSV(it.data || ''),
          sanitizeCSV(it.categoria || ''),
          sanitizeCSV(it.status || ''),
          sanitizeCSV(it.equipe || ''),
          sanitizeCSV(it.obs || ''),
          sanitizeCSV(it.created_by_name || ''),
          sanitizeCSV(it.created_at || ''),
        ]);
      }
    });

    showToast('CSV exportado com sucesso!', 'success');
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    showToast('Erro ao exportar CSV', 'error');
  }
}

export function renderDiarioCategoryDropdown() {
  var dropdown = document.getElementById('diarioCategoryDropdown');
  if (!dropdown) return;

  var html = '<div class="p-2 border-b border-slate-100 dark:border-slate-700/60 font-medium text-xs text-slate-500 uppercase tracking-wider">Filtrar por Categoria</div>';
  html += '<div class="p-1 space-y-0.5">'
    + '<label class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer select-none text-slate-700 dark:text-slate-200">'
    + '<input type="checkbox" id="diarioCatTodos" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"' + (diarioCategoryTodosChecked ? ' checked' : '') + ' />'
    + '<span class="font-medium">Todas</span>'
    + '</label>';

  DIARIO_CATEGORY_OPTIONS.forEach(function (cat) {
    var isChecked = diarioCategoryTodosChecked || diarioCategoryFilter.has(cat);
    html += '<label class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer select-none text-slate-700 dark:text-slate-200">'
      + '<input type="checkbox" class="diario-cat-cb rounded border-slate-300 text-blue-600 focus:ring-blue-500" value="' + cat + '"' + (isChecked ? ' checked' : '') + ' />'
      + '<span>' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</span>'
      + '</label>';
  });
  html += '</div>';
  dropdown.innerHTML = html;
}

export function updateDiarioCategoryLabel() {
  var label = document.getElementById('diarioCategoryLabel');
  if (!label) return;
  if (diarioCategoryTodosChecked || diarioCategoryFilter.size === 0) {
    label.textContent = 'Todas';
    label.classList.remove('text-blue-600');
  } else {
    label.textContent = diarioCategoryFilter.size + ' selecionada(s)';
    label.classList.add('text-blue-600');
  }
}

export function renderDiarioStatusDropdown() {
  var dropdown = document.getElementById('diarioStatusDropdown');
  if (!dropdown) return;

  var html = '<div class="p-2 border-b border-slate-100 dark:border-slate-700/60 font-medium text-xs text-slate-500 uppercase tracking-wider">Filtrar por Status</div>';
  html += '<div class="p-1 space-y-0.5">'
    + '<label class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer select-none text-slate-700 dark:text-slate-200">'
    + '<input type="checkbox" id="diarioStatusTodos" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"' + (diarioStatusTodosChecked ? ' checked' : '') + ' />'
    + '<span class="font-medium">Todos</span>'
    + '</label>';

  DIARIO_STATUS_OPTIONS.forEach(function (st) {
    var isChecked = diarioStatusTodosChecked || diarioStatusFilter.has(st);
    html += '<label class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer select-none text-slate-700 dark:text-slate-200">'
      + '<input type="checkbox" class="diario-status-cb rounded border-slate-300 text-blue-600 focus:ring-blue-500" value="' + st + '"' + (isChecked ? ' checked' : '') + ' />'
      + '<span>' + st + '</span>'
      + '</label>';
  });
  html += '</div>';
  dropdown.innerHTML = html;
}

export function updateDiarioStatusLabel() {
  var label = document.getElementById('diarioStatusLabel');
  if (!label) return;
  if (diarioStatusTodosChecked || diarioStatusFilter.size === 0) {
    label.textContent = 'Todos';
    label.classList.remove('text-blue-600');
  } else {
    label.textContent = diarioStatusFilter.size + ' selecionado(s)';
    label.classList.add('text-blue-600');
  }
}

export function initDiarioList() {
  renderDiarioCategoryDropdown();
  updateDiarioCategoryLabel();
  renderDiarioStatusDropdown();
  updateDiarioStatusLabel();

  // New line button
  var newBtn = document.getElementById('diarioNewBtn');
  if (newBtn && !newBtn._bound) {
    newBtn._bound = true;
    newBtn.addEventListener('click', createDiarioLine);
  }

  // CSV button
  var csvBtn = document.getElementById('diarioCsvBtn');
  if (csvBtn && !csvBtn._bound) {
    csvBtn._bound = true;
    csvBtn.addEventListener('click', exportDiarioCsv);
  }

  // Search input
  var searchInput = document.getElementById('diarioSearchInput');
  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', debounce(function () {
      diarioSearch = searchInput.value.trim();
      if (_diarioScroll) _diarioScroll.reset();
    }, 300));
  }

  // Date filters
  var dateFromInput = document.getElementById('diarioDateFrom');
  if (dateFromInput && !dateFromInput._bound) {
    dateFromInput._bound = true;
    dateFromInput.addEventListener('change', function () {
      diarioDateFrom = dateFromInput.value;
      if (_diarioScroll) _diarioScroll.reset();
    });
  }

  var dateToInput = document.getElementById('diarioDateTo');
  if (dateToInput && !dateToInput._bound) {
    dateToInput._bound = true;
    dateToInput.addEventListener('change', function () {
      diarioDateTo = dateToInput.value;
      if (_diarioScroll) _diarioScroll.reset();
    });
  }

  // Category dropdown toggle
  var catBtn = document.getElementById('diarioCategoryBtn');
  var catDropdown = document.getElementById('diarioCategoryDropdown');
  if (catBtn && catDropdown && !catBtn._bound) {
    catBtn._bound = true;
    catBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      catDropdown.classList.toggle('hidden');
    });
  }

  // Status dropdown toggle
  var statusBtn = document.getElementById('diarioStatusBtn');
  var statusDropdown = document.getElementById('diarioStatusDropdown');
  if (statusBtn && statusDropdown && !statusBtn._bound) {
    statusBtn._bound = true;
    statusBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      statusDropdown.classList.toggle('hidden');
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', function (e) {
    if (catDropdown && !catDropdown.contains(e.target) && !catBtn.contains(e.target)) {
      catDropdown.classList.add('hidden');
    }
    if (statusDropdown && !statusDropdown.contains(e.target) && !statusBtn.contains(e.target)) {
      statusDropdown.classList.add('hidden');
    }
  });

  // Category checkboxes delegation
  if (catDropdown && !catDropdown._bound) {
    catDropdown._bound = true;
    catDropdown.addEventListener('change', function (e) {
      if (e.target.id === 'diarioCatTodos') {
        diarioCategoryTodosChecked = e.target.checked;
        diarioCategoryFilter.clear();
        renderDiarioCategoryDropdown();
      } else if (e.target.classList.contains('diario-cat-cb')) {
        if (diarioCategoryTodosChecked) {
          diarioCategoryTodosChecked = false;
          diarioCategoryFilter.clear();
          DIARIO_CATEGORY_OPTIONS.forEach(function (c) { diarioCategoryFilter.add(c); });
        }
        if (e.target.checked) {
          diarioCategoryFilter.add(e.target.value);
        } else {
          diarioCategoryFilter.delete(e.target.value);
        }
        if (diarioCategoryFilter.size === DIARIO_CATEGORY_OPTIONS.length) {
          diarioCategoryTodosChecked = true;
          diarioCategoryFilter.clear();
        }
        renderDiarioCategoryDropdown();
      }
      updateDiarioCategoryLabel();
      if (_diarioScroll) _diarioScroll.reset();
    });
  }

  // Status checkboxes delegation
  if (statusDropdown && !statusDropdown._bound) {
    statusDropdown._bound = true;
    statusDropdown.addEventListener('change', function (e) {
      if (e.target.id === 'diarioStatusTodos') {
        diarioStatusTodosChecked = e.target.checked;
        diarioStatusFilter.clear();
        renderDiarioStatusDropdown();
      } else if (e.target.classList.contains('diario-status-cb')) {
        if (diarioStatusTodosChecked) {
          diarioStatusTodosChecked = false;
          diarioStatusFilter.clear();
          DIARIO_STATUS_OPTIONS.forEach(function (s) { diarioStatusFilter.add(s); });
        }
        if (e.target.checked) {
          diarioStatusFilter.add(e.target.value);
        } else {
          diarioStatusFilter.delete(e.target.value);
        }
        if (diarioStatusFilter.size === DIARIO_STATUS_OPTIONS.length) {
          diarioStatusTodosChecked = true;
          diarioStatusFilter.clear();
        }
        renderDiarioStatusDropdown();
      }
      updateDiarioStatusLabel();
      if (_diarioScroll) _diarioScroll.reset();
    });
  }

  // Table header sorting
  var ths = document.querySelectorAll('#diarioTable thead th[data-sort]');
  ths.forEach(function (th) {
    if (th._bound) return;
    th._bound = true;
    th.addEventListener('click', function () {
      var col = th.getAttribute('data-sort');
      if (diarioSortBy === col) {
        diarioSortDir = diarioSortDir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        diarioSortBy = col;
        diarioSortDir = 'ASC';
      }

      document.querySelectorAll('#diarioTable thead th .sort-icon').forEach(function (el) { el.textContent = ''; });
      var icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = diarioSortDir === 'ASC' ? ' \u2191' : ' \u2193';

      if (_diarioScroll) _diarioScroll.reset();
    });
  });

  // Table body event delegation (inline edits, obs, delete)
  var tbody = document.getElementById('diarioTableBody');
  if (tbody && !tbody._bound) {
    tbody._bound = true;

    tbody.addEventListener('click', function (e) {
      // Delete button
      var delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        var delId = delBtn.getAttribute('data-id');
        if (delId) deleteDiarioLine(parseInt(delId, 10));
        return;
      }

      // Edit Obs
      var editObsBtn = e.target.closest('[data-action="edit-obs"]');
      if (editObsBtn) {
        var wrap = editObsBtn.closest('.obs-wrap');
        if (wrap) enterDiarioObsEdit(wrap);
        return;
      }

      // Save Obs
      var saveObsBtn = e.target.closest('.diario-save-obs');
      if (saveObsBtn) {
        var obsWrap = saveObsBtn.closest('.obs-wrap');
        if (obsWrap) saveDiarioObs(obsWrap);
        return;
      }

      // Cancel Obs
      var cancelObsBtn = e.target.closest('.diario-cancel-obs');
      if (cancelObsBtn) {
        var cWrap = cancelObsBtn.closest('.obs-wrap');
        if (cWrap) cancelDiarioObs(cWrap);
        return;
      }

      // Save Field
      var saveFieldBtn = e.target.closest('.diario-save-btn');
      if (saveFieldBtn) {
        var saveTd = saveFieldBtn.closest('td');
        if (saveTd) saveDiarioField(saveTd);
        return;
      }

      // Cancel Field
      var cancelFieldBtn = e.target.closest('.diario-cancel-btn');
      if (cancelFieldBtn) {
        var cancelTd = cancelFieldBtn.closest('td');
        if (cancelTd) cancelDiarioEdit(cancelTd);
        return;
      }

      // Edit Field (pencil button or double-click / cell click)
      var editBtn = e.target.closest('.diario-edit-btn');
      if (editBtn) {
        var editTd = editBtn.closest('td');
        var field = editBtn.getAttribute('data-field') || (editTd ? editTd.getAttribute('data-field') : null);
        if (editTd && field) enterDiarioEdit(editTd, field);
        return;
      }

      var td = e.target.closest('td[data-field]');
      if (td && !td.querySelector('.diario-edit-input') && !td.querySelector('.obs-wrap')) {
        var fld = td.getAttribute('data-field');
        if (fld && fld !== 'obs') {
          enterDiarioEdit(td, fld);
        }
      }
    });

    // Keyboard support: Enter saves, Escape cancels
    tbody.addEventListener('keydown', function (e) {
      var input = e.target.closest('.diario-edit-input');
      if (!input) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        var td = input.closest('td');
        if (td) saveDiarioField(td);
      } else if (e.key === 'Escape') {
        var escTd = input.closest('td');
        if (escTd) cancelDiarioEdit(escTd);
      }
    });
  }

  // Infinite scroll initialization
  _diarioScroll = createInfiniteScroll({
    sentinelId: 'diarioSentinel',
    scrollContainerId: 'diarioScrollContainer',
    limit: 20,
    fetchFn: function (params) {
      var url = buildDiarioQuery(params.limit, params.offset);
      return apiFetch(url)
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success || !json.data) return { data: [], total: 0 };
          return { data: json.data.items || [], total: json.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderDiarioTable(items, true);
    },
    renderFullFn: function (items, total) {
      renderDiarioTable(items, false);
      updateDiarioBadge(total);
    },
    afterLoadFn: function (state) {
      updateDiarioBadge(state.total);
    },
    getFilterHash: function () {
      return diarioSearch + '|' + Array.from(diarioStatusFilter).sort().join(',')
        + '|' + Array.from(diarioCategoryFilter).sort().join(',')
        + '|' + diarioDateFrom + '|' + diarioDateTo + '|' + diarioSortBy + '|' + diarioSortDir;
    },
  });

  if (_diarioScroll) _diarioScroll.init();
}
