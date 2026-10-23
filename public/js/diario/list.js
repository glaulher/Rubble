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
var _equipmentsCache = null;

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

export function formatEquipamentoDisplay(nome, capacidade) {
  if (!nome || nome === '-' || nome === 'N/A') return '-';
  if (capacidade !== null && capacidade !== undefined && capacidade !== '') {
    var cap = parseFloat(capacidade);
    if (!isNaN(cap)) {
      return nome + ' \u2014 ' + cap + ' TR';
    }
  }
  return nome;
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

  var equipDisplay = formatEquipamentoDisplay(item.equipamento_nome || item.equipamento, item.equipamento_capacidade);
  var dateDisplay = formatDate(item.data) || '-';

  var deleteBtnHtml = canDelete
    ? '<button type="button" class="diario-delete-btn text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer" data-action="delete" data-id="' + item.id + '" title="Excluir" aria-label="Excluir">'
      + '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
      + '</button>'
    : '<span class="text-slate-300 dark:text-slate-600">-</span>';

  return '<tr class="diario-row border-b border-slate-100 hover:bg-slate-100 transition cursor-pointer" data-id="' + item.id + '">'
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

export async function loadDiarioEquipments() {
  if (_equipmentsCache) return _equipmentsCache;
  try {
    var res = await apiFetch('/app/api/index.php?route=equipment&limit=9999');
    var json = await res.json();
    _equipmentsCache = json.data || [];
    return _equipmentsCache;
  } catch (e) {
    console.error('Erro ao carregar equipamentos:', e);
    return [];
  }
}

export function getDiarioSites(equipments) {
  if (!Array.isArray(equipments)) return [];
  var set = new Set();
  for (var i = 0; i < equipments.length; i++) {
    var eq = equipments[i];
    var s = eq && eq.local ? String(eq.local).trim() : '';
    if (s && s !== '-' && s.toUpperCase() !== 'N/A') {
      set.add(s);
    }
  }
  return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
}

export function formatPvEquipmentLabel(equipamento, capacidade, localidade) {
  var parts = [];
  if (capacidade !== null && capacidade !== undefined && capacidade !== '') {
    var cap = parseFloat(capacidade);
    if (!isNaN(cap)) {
      parts.push(cap + ' TR');
    }
  }
  if (localidade && String(localidade).trim() && String(localidade).trim() !== '-' && String(localidade).trim().toUpperCase() !== 'N/A') {
    parts.push(String(localidade).trim());
  }
  return parts.length > 0 ? equipamento + ' \u2014 ' + parts.join(' - ') : equipamento;
}

export function getDiarioEquipmentsForSite(equipments, currentSite) {
  if (!Array.isArray(equipments)) return [];
  if (!currentSite || currentSite === 'N/A' || currentSite === '-') {
    return equipments.slice();
  }
  var siteLower = String(currentSite).toLowerCase().trim();
  var matching = [];
  for (var i = 0; i < equipments.length; i++) {
    var eq = equipments[i];
    if (eq && eq.local && String(eq.local).toLowerCase().trim() === siteLower) {
      matching.push(eq);
    }
  }
  return matching;
}

export function getDiarioLocalidades(equipments, currentSite) {
  if (!Array.isArray(equipments)) return [];
  var siteLower = (currentSite && currentSite !== 'N/A' && currentSite !== '-')
    ? String(currentSite).toLowerCase().trim()
    : '';
  var siteLocs = new Set();
  var otherLocs = new Set();
  for (var i = 0; i < equipments.length; i++) {
    var eq = equipments[i];
    var loc = eq && eq.localidade ? String(eq.localidade).trim() : '';
    if (!loc || loc === '-' || loc.toUpperCase() === 'N/A') continue;
    if (siteLower && eq.local && String(eq.local).toLowerCase().trim() === siteLower) {
      siteLocs.add(loc);
    } else {
      otherLocs.add(loc);
    }
  }
  var list1 = Array.from(siteLocs).sort(function (a, b) { return a.localeCompare(b); });
  if (siteLower && list1.length > 0) {
    return list1;
  }
  var list2 = Array.from(otherLocs)
    .filter(function (l) { return !siteLocs.has(l); })
    .sort(function (a, b) { return a.localeCompare(b); });
  return list1.concat(list2);
}

export function initDiarioCellAutocomplete(td, field, item) {
  var wrap = td.querySelector('.diario-autocomplete-wrap');
  var input = td.querySelector('.diario-edit-input');
  var dropdown = td.querySelector('.diario-autocomplete-dropdown');
  if (!wrap || !input || !dropdown) return;

  function bindWithOptions(equipments) {
    var allOptions = [];
    if (field === 'site') {
      var rawSites = getDiarioSites(equipments);
      allOptions.push({ label: 'N/A', value: null, isNa: true });
      for (var s = 0; s < rawSites.length; s++) {
        allOptions.push({ label: rawSites[s], value: rawSites[s], isNa: false });
      }
    } else if (field === 'localidade') {
      var rawLocs = getDiarioLocalidades(equipments, item.site);
      allOptions.push({ label: 'N/A', value: null, isNa: true });
      for (var l = 0; l < rawLocs.length; l++) {
        allOptions.push({ label: rawLocs[l], value: rawLocs[l], isNa: false });
      }
    } else if (field === 'equipamento_id') {
      var rawEquips = getDiarioEquipmentsForSite(equipments, item.site);
      allOptions.push({ label: 'N/A', value: null, isNa: true, eq: null });
      for (var e = 0; e < rawEquips.length; e++) {
        var eq = rawEquips[e];
        var display = formatEquipamentoDisplay(eq.equipamento, eq.capacidade);
        var label = formatPvEquipmentLabel(eq.equipamento, eq.capacidade, eq.localidade);
        allOptions.push({
          label: label,
          display: display,
          value: eq.id,
          isNa: false,
          eq: eq,
          search: (eq.equipamento + ' ' + (eq.capacidade || '') + ' ' + (eq.localidade || '')).toLowerCase(),
        });
      }
    }

    var activeIndex = -1;
    var currentFiltered = [];

    function updateDropdownPosition() {
      if (dropdown.classList.contains('hidden')) return;
      if (typeof input.getBoundingClientRect !== 'function') return;
      var rect = input.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0)) {
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '99999';
        return;
      }

      var minW = field === 'equipamento_id' ? 320 : 200;
      var width = Math.max(rect.width, minW);

      var winW = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1024);
      var left = rect.left;
      if (left + width > winW - 12) {
        left = Math.max(12, winW - width - 12);
      }

      var winH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 768);
      var spaceBelow = winH - rect.bottom;
      var spaceAbove = rect.top;
      var dropdownMaxH = 224;

      dropdown.style.position = 'fixed';
      dropdown.style.zIndex = '99999';
      dropdown.style.left = Math.round(left) + 'px';
      dropdown.style.width = Math.round(width) + 'px';

      if (spaceBelow < dropdownMaxH && spaceAbove > spaceBelow) {
        var maxH = Math.min(dropdownMaxH, Math.max(80, spaceAbove - 16));
        dropdown.style.maxHeight = maxH + 'px';
        var approxH = Math.min(currentFiltered.length * 28 + 8, maxH);
        var currentH = dropdown.offsetHeight > 0 ? dropdown.offsetHeight : approxH;
        dropdown.style.top = Math.max(8, Math.round(rect.top - currentH - 4)) + 'px';
      } else {
        var maxH = Math.min(dropdownMaxH, Math.max(80, spaceBelow - 16));
        dropdown.style.maxHeight = maxH + 'px';
        dropdown.style.top = Math.round(rect.bottom + 4) + 'px';
      }
    }

    function onScrollOrResize() {
      if (dropdown.classList.contains('hidden')) return;
      if (typeof input.getBoundingClientRect !== 'function') return;
      var rect = input.getBoundingClientRect();
      var winH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 768);
      if (rect.bottom < 0 || rect.top > winH) {
        dropdown.classList.add('hidden');
      } else {
        updateDropdownPosition();
      }
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    var scrollContainer = document.getElementById('diarioScrollContainer');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScrollOrResize, { passive: true });
    }

    function filterOptions(q) {
      var query = (q || '').toLowerCase().trim();
      if (!query) {
        return allOptions.slice(0, 60);
      }
      var res = [];
      if ('n/a'.includes(query) || 'na'.includes(query)) {
        res.push(allOptions[0]);
      }
      for (var i = 1; i < allOptions.length; i++) {
        var opt = allOptions[i];
        var searchText = opt.search || opt.label.toLowerCase();
        if (searchText.indexOf(query) !== -1) {
          res.push(opt);
          if (res.length >= 60) break;
        }
      }
      if (res.length === 0 && 'n/a'.startsWith(query)) {
        res.push(allOptions[0]);
      }
      return res;
    }

    function renderDropdown() {
      dropdown.innerHTML = '';
      if (currentFiltered.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }
      dropdown.classList.remove('hidden');

      for (var i = 0; i < currentFiltered.length; i++) {
        var opt = currentFiltered[i];
        var div = document.createElement('div');
        div.className = 'diario-autocomplete-item px-3 py-1.5 text-xs cursor-pointer select-none '
          + (i === activeIndex
              ? 'bg-sky-100 text-sky-900 font-medium dark:bg-sky-950/70 dark:text-sky-200'
              : (opt.isNa ? 'text-amber-600 dark:text-amber-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/60' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'));
        div.textContent = opt.label;
        div.dataset.index = String(i);

        (function (optionItem, idx) {
          div.addEventListener('mouseenter', function () {
            activeIndex = idx;
            updateActiveItemHighlight();
          });
          div.addEventListener('mousedown', function (e) {
            e.preventDefault();
            selectOption(optionItem);
          });
        })(opt, i);

        dropdown.appendChild(div);
      }
      updateDropdownPosition();
      scrollActiveIntoView();
    }

    function updateActiveItemHighlight() {
      var items = dropdown.children;
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        var isAct = j === activeIndex;
        var opt = currentFiltered[j];
        it.className = 'diario-autocomplete-item px-3 py-1.5 text-xs cursor-pointer select-none '
          + (isAct
              ? 'bg-sky-100 text-sky-900 font-medium dark:bg-sky-950/70 dark:text-sky-200'
              : (opt && opt.isNa ? 'text-amber-600 dark:text-amber-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/60' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'));
      }
    }

    function scrollActiveIntoView() {
      if (activeIndex >= 0 && dropdown.children[activeIndex]) {
        dropdown.children[activeIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    function selectOption(opt) {
      if (opt.isNa) {
        input.value = 'N/A';
        if (field === 'equipamento_id') {
          input.dataset.selectedId = '';
          input.dataset.selectedEq = '';
        }
      } else if (field === 'equipamento_id') {
        input.value = opt.display || opt.label;
        input.dataset.selectedId = String(opt.value);
        input.dataset.selectedEq = JSON.stringify(opt.eq);
      } else {
        input.value = opt.value;
      }
      dropdown.classList.add('hidden');
      saveDiarioField(td);
    }

    input.addEventListener('focus', function () {
      currentFiltered = filterOptions(input.value);
      activeIndex = -1;
      renderDropdown();
    });

    input.addEventListener('input', function () {
      if (field === 'equipamento_id') {
        input.dataset.selectedId = '';
        input.dataset.selectedEq = '';
      }
      currentFiltered = filterOptions(input.value);
      activeIndex = -1;
      renderDropdown();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (dropdown.classList.contains('hidden')) {
          currentFiltered = filterOptions(input.value);
          renderDropdown();
        }
        activeIndex = Math.min(activeIndex + 1, currentFiltered.length - 1);
        updateActiveItemHighlight();
        scrollActiveIntoView();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (dropdown.classList.contains('hidden')) {
          currentFiltered = filterOptions(input.value);
          renderDropdown();
        }
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveItemHighlight();
        scrollActiveIntoView();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!dropdown.classList.contains('hidden') && activeIndex >= 0 && currentFiltered[activeIndex]) {
          selectOption(currentFiltered[activeIndex]);
        } else {
          dropdown.classList.add('hidden');
          saveDiarioField(td);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.add('hidden');
        cancelDiarioEdit(td);
      }
    });
  }

  if (_equipmentsCache) {
    bindWithOptions(_equipmentsCache);
  } else {
    loadDiarioEquipments().then(bindWithOptions).catch(function (err) {
      console.error('Erro ao carregar equipamentos para autocomplete:', err);
      bindWithOptions([]);
    });
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
    inputHtml = '<select class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">';
    DIARIO_CATEGORY_OPTIONS.forEach(function (cat) {
      var sel = raw === cat ? ' selected' : '';
      inputHtml += '<option value="' + cat + '"' + sel + '>' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</option>';
    });
    inputHtml += '</select>';
  } else if (field === 'status') {
    inputHtml = '<select class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">';
    DIARIO_STATUS_OPTIONS.forEach(function (st) {
      var sel = raw === st ? ' selected' : '';
      inputHtml += '<option value="' + st + '"' + sel + '>' + st + '</option>';
    });
    inputHtml += '</select>';
  } else if (field === 'data') {
    inputHtml = '<input type="date" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" value="' + escapeHtml(raw) + '" />';
  } else if (field === 'site' || field === 'equipamento_id' || field === 'localidade') {
    var initialVal = raw;
    var selectedId = '';
    var selectedEq = '';
    if (field === 'equipamento_id') {
      initialVal = item.equipamento_nome
        ? formatEquipamentoDisplay(item.equipamento_nome, item.equipamento_capacidade)
        : (item.equipamento ? formatEquipamentoDisplay(item.equipamento, item.equipamento_capacidade) : '');
      selectedId = item.equipamento_id ? String(item.equipamento_id) : '';
    } else {
      if (initialVal === 'N/A' || initialVal === '-') initialVal = '';
    }

    var minW = field === 'equipamento_id' ? 'min-w-[240px]' : 'min-w-[150px]';

    td.innerHTML = '<div class="diario-autocomplete-wrap relative flex items-center gap-1 w-full ' + minW + '">'
      + '<input type="text" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-full" value="' + escapeHtml(initialVal) + '" data-selected-id="' + escapeHtml(selectedId) + '" data-selected-eq="' + escapeHtml(selectedEq) + '" autocomplete="off" placeholder="Selecione ou digite..." />'
      + '<button type="button" class="diario-save-btn px-1.5 py-1 rounded-lg bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800 shrink-0 cursor-pointer" title="Salvar" aria-label="Salvar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>'
      + '<button type="button" class="diario-cancel-btn px-1.5 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900 shrink-0 cursor-pointer" title="Cancelar" aria-label="Cancelar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
      + '<div class="diario-autocomplete-dropdown border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl bg-white dark:bg-slate-800 overflow-y-auto hidden" style="position: fixed; z-index: 99999;"></div>'
      + '</div>';

    var inputEl = td.querySelector('.diario-edit-input');
    if (inputEl) {
      inputEl.focus();
      if (inputEl.select && typeof inputEl.select === 'function') inputEl.select();
    }
    initDiarioCellAutocomplete(td, field, item);
    return;
  } else {
    inputHtml = '<input type="text" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-full" value="' + escapeHtml(raw) + '" />';
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

    if (field === 'equipamento_id') {
      var selectedId = input.dataset.selectedId;
      var selectedEqStr = input.dataset.selectedEq;
      var selectedEq = selectedEqStr ? JSON.parse(selectedEqStr) : null;
      var equipId = null;

      if (value === '' || value.toUpperCase() === 'N/A' || value === '-') {
        equipId = null;
        selectedEq = null;
      } else if (selectedId) {
        equipId = parseInt(selectedId, 10);
        if (!selectedEq && _equipmentsCache) {
          selectedEq = _equipmentsCache.find(function (e) { return e.id === equipId; });
        }
      } else if (_equipmentsCache) {
        var match = _equipmentsCache.find(function (e) {
          return e.equipamento.toLowerCase() === value.toLowerCase() ||
            formatEquipamentoDisplay(e.equipamento, e.capacidade).toLowerCase() === value.toLowerCase();
        });
        if (match) {
          equipId = match.id;
          selectedEq = match;
        }
      }

      var equipUpdateRes = await apiFetch('/app/api/index.php?route=diario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id, 10), field: 'equipamento_id', value: equipId }),
      });
      var equipUpdateResult = await equipUpdateRes.json();
      if (!equipUpdateResult.success) {
        showToast(equipUpdateResult.message || 'Erro ao salvar equipamento', 'error');
        return;
      }

      item.equipamento_id = equipId;
      item.equipamento_nome = selectedEq ? selectedEq.equipamento : null;
      item.equipamento_capacidade = selectedEq && selectedEq.capacidade != null ? String(parseFloat(selectedEq.capacidade)) : null;

      // Smart Cascade (Option 1): auto-fill site and localidade if currently empty/N/A
      if (selectedEq) {
        if ((!item.site || item.site === 'N/A' || item.site === '-') && selectedEq.local) {
          try {
            await apiFetch('/app/api/index.php?route=diario', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: parseInt(id, 10), field: 'site', value: selectedEq.local }),
            });
            item.site = selectedEq.local;
          } catch (errCascadeSite) {
            console.error('Erro no cascateamento de site:', errCascadeSite);
          }
        }
        if ((!item.localidade || item.localidade === 'N/A' || item.localidade === '-') && selectedEq.localidade) {
          try {
            await apiFetch('/app/api/index.php?route=diario', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: parseInt(id, 10), field: 'localidade', value: selectedEq.localidade }),
            });
            item.localidade = selectedEq.localidade;
          } catch (errCascadeLoc) {
            console.error('Erro no cascateamento de localidade:', errCascadeLoc);
          }
        }
      }

      refreshDiarioRow(id);
      showToast('Equipamento atualizado', 'success');
      return;
    }

    var normalizedValue = value;
    if (field === 'site' || field === 'localidade') {
      if (normalizedValue === '' || normalizedValue.toUpperCase() === 'N/A' || normalizedValue === '-') {
        normalizedValue = null;
      }
    }

    var updateRes = await apiFetch('/app/api/index.php?route=diario', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10), field: field, value: normalizedValue }),
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
          sanitizeCSV(formatEquipamentoDisplay(it.equipamento_nome || it.equipamento, it.equipamento_capacidade) === '-' ? '' : formatEquipamentoDisplay(it.equipamento_nome || it.equipamento, it.equipamento_capacidade)),
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

  // Pre-load equipments cache for instant autocomplete
  loadDiarioEquipments().catch(function () {});

  // Close open autocomplete dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.diario-autocomplete-wrap')) {
      var openDds = document.querySelectorAll('.diario-autocomplete-dropdown:not(.hidden)');
      for (var d = 0; d < openDds.length; d++) {
        openDds[d].classList.add('hidden');
      }
    }
  });

  if (_diarioScroll) _diarioScroll.init();
}
