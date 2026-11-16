import { createInfiniteScroll, debounce } from '/public/js/components/infinite-scroll.js';
import { apiFetch, getUser } from '/public/js/core/auth.js';
import { escapeHtml, sanitizeCSV } from '/public/js/core/utils.js';
import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { downloadCSV } from '/public/js/utils/csv.js';
import { formatDate } from '/public/js/pv/form-utils.js';
import { createAutocomplete } from '/public/js/pv/form-autocomplete.js';
import { iconButtonHtml } from '/public/js/components/button.js';

export const DIARIO_COLUMNS = [
  'TECNICO', 'EQUIPE', 'PLACA', 'DATA', 'TIPO_ATIVIDADE', 'SITE', 'EQUIPAMENTO', 'LOCALIDADE', 'STATUS', 'HORA_INICIO', 'HORA_SAIDA', 'OS', 'OBSERVACAO', 'CRIADO_POR', 'DATA_CRIACAO'
];

export const DIARIO_STATUS_OPTIONS = [
  'Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up', 'Cancelado'
];

export const DIARIO_CATEGORY_OPTIONS = [
  'corretiva', 'preventiva', 'emergencial', 'administrativa'
];

var _diarioScroll = null;
var diarioSearch = '';
var diarioStatusFilter = new Set();
var diarioStatusTodosChecked = true;
var diarioCategoryFilter = new Set();
var diarioCategoryTodosChecked = true;
var diarioDateFrom = '';
var diarioDateTo = '';
var diarioSortBy = 'data';
var diarioSortDir = 'DESC';
var _diarioItemsById = {};
var _localsCache = null;
var _equipmentsCache = null;
var _teamsListCache = null;

export function getCachedTeams() {
  return _teamsListCache;
}

export function setCachedTeams(teams) {
  _teamsListCache = teams;
}

export async function loadDiarioTeams() {
  if (_teamsListCache) return _teamsListCache;
  try {
    var res = await apiFetch('/app/api/index.php?route=teams&limit=9999');
    var json = await res.json();
    var list = Array.isArray(json.data) ? json.data : (json.data && Array.isArray(json.data.items) ? json.data.items : []);
    _teamsListCache = list.filter(function (t) { return t.ativo == 1 || t.active == 1; });
    return _teamsListCache;
  } catch (e) {
    console.error('Erro ao carregar equipes:', e);
    return [];
  }
}

export function refreshDiarioList() {
  var tbody = document.getElementById('diarioTableBody');
  if (tbody) tbody.innerHTML = '';
  _diarioItemsById = {};
  if (_diarioScroll) {
    _diarioScroll.reset().init();
  }
}

export function getDiarioStatusBadgeClass(status) {
  var s = (status || '').toLowerCase().trim();
  if (s === 'concluído' || s === 'concluido') return 'bg-emerald-100 text-emerald-800';
  if (s === 'pendente') return 'bg-amber-100 text-amber-800';
  if (s === 'em andamento') return 'bg-blue-100 text-blue-800';
  if (s === 'planejado') return 'bg-sky-100 text-sky-800';
  if (s === 'projeto clean up') return 'bg-purple-100 text-purple-800';
  if (s === 'cancelado') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-800';
}

export function getDiarioCategoryBadgeClass(category) {
  var c = (category || '').toLowerCase().trim();
  if (c === 'corretiva') return 'bg-orange-100 text-orange-800';
  if (c === 'preventiva') return 'bg-sky-100 text-sky-800';
  if (c === 'emergencial') return 'bg-red-100 text-red-800';
  if (c === 'administrativa') return 'bg-purple-100 text-purple-800';
  return 'bg-slate-100 text-slate-700';
}

export function formatDiarioCategory(category) {
  if (!category) return '-';
  var c = String(category).trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
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

  var dateDisplay = formatDate(item.data) || '-';

  var editBtnHtml = iconButtonHtml('edit', 'Editar', {
    class: 'diario-edit-btn cursor-pointer',
    'data-action': 'edit',
    'data-id': item.id,
    type: 'button',
  });

  var duplicateBtnHtml = iconButtonHtml('copy', 'Duplicar', {
    class: 'diario-duplicate-btn cursor-pointer',
    'data-action': 'duplicate',
    'data-id': item.id,
    type: 'button',
  }, canDelete ? undefined : 'right');

  var deleteBtnHtml = canDelete
    ? iconButtonHtml('delete', 'Excluir', {
        class: 'diario-delete-btn cursor-pointer',
        'data-action': 'delete',
        'data-id': item.id,
        type: 'button',
      }, 'right')
    : '';

  return '<tr class="diario-row border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" data-id="' + item.id + '">'
    + '<td class="px-3 py-2.5 text-sm font-medium text-slate-800" data-field="tecnico">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.tecnico)) + '">' + escapeHtml(item.tecnico || '-') + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-700" data-field="equipe">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.equipe)) + '">' + escapeHtml(item.equipe || '-') + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm font-mono font-medium text-slate-700" data-field="placa">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.placa)) + '">' + escapeHtml(item.placa || '-') + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-600" data-field="data">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.data)) + '">' + escapeHtml(dateDisplay) + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-slate-800" data-field="site">'
      + '<span class="diario-val" data-raw="' + escapeHtml(diarioValueRaw(item.site)) + '">' + escapeHtml(item.site || '-') + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm" data-field="categoria">'
      + '<span class="diario-val px-2.5 py-1 rounded-full text-xs font-medium ' + getDiarioCategoryBadgeClass(item.categoria) + '" data-raw="' + escapeHtml(diarioValueRaw(item.categoria)) + '">' + escapeHtml(item.categoria || '-') + '</span>'
    + '</td>'
    + '<td class="px-3 py-2.5 text-sm text-center whitespace-nowrap">'
      + '<div class="inline-flex items-center justify-center gap-1.5">'
      + editBtnHtml
      + duplicateBtnHtml
      + deleteBtnHtml
      + '</div>'
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
  } else if (field === 'hora_inicio' || field === 'hora_saida') {
    inputHtml = '<input type="time" class="diario-edit-input px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" value="' + escapeHtml(raw) + '" />';
  } else if (field === 'placa') {
    inputHtml = '<input type="text" maxlength="30" class="diario-edit-input uppercase px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-28" value="' + escapeHtml(raw) + '" placeholder="AAA-0A00" />';
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
    if (field === 'placa' && normalizedValue) {
      normalizedValue = normalizedValue.toUpperCase();
    }
    if (field === 'site' || field === 'localidade' || field === 'os' || field === 'equipe' || field === 'placa' || field === 'hora_inicio' || field === 'hora_saida') {
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
  openDiarioModal(null);
}

export function initModalDropdownAutocomplete({ input, dropdown, getOptions, formatItem, onSelect, onInput }) {
  if (!input || !dropdown) return;

  var activeIndex = -1;
  var filtered = [];

  function hide() {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');

    for (var i = 0; i < filtered.length; i++) {
      (function (idx) {
        var opt = filtered[idx];
        var text = formatItem ? formatItem(opt) : String(opt);
        var div = document.createElement('div');
        div.className = 'px-3 py-2 text-sm cursor-pointer text-slate-700 hover:bg-slate-100 transition';
        div.textContent = text;

        div.addEventListener('mousedown', function (e) {
          e.preventDefault();
          input.value = text;
          hide();
          if (onSelect) onSelect(opt, input);
        });

        dropdown.appendChild(div);
      })(i);
    }
  }

  function filter(query) {
    var all = typeof getOptions === 'function' ? getOptions() : getOptions;
    if (!Array.isArray(all)) all = [];
    var q = (query || '').toLowerCase().trim();
    if (!q) {
      filtered = all.slice(0, 30);
    } else {
      filtered = all.filter(function (item) {
        var text = formatItem ? formatItem(item) : String(item);
        return text.toLowerCase().includes(q);
      }).slice(0, 30);
    }
    activeIndex = -1;
    render();
  }

  input.addEventListener('input', function () {
    filter(input.value);
    if (onInput) onInput(input.value);
  });

  input.addEventListener('focus', function () {
    filter(input.value);
  });

  input.addEventListener('blur', function () {
    setTimeout(hide, 200);
  });

  input.addEventListener('keydown', function (e) {
    if (dropdown.classList.contains('hidden')) return;
    var items = dropdown.children;
    if (!items || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        var opt = filtered[activeIndex];
        var text = formatItem ? formatItem(opt) : String(opt);
        input.value = text;
        hide();
        if (onSelect) onSelect(opt, input);
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  function updateActive() {
    var items = dropdown.children;
    for (var i = 0; i < items.length; i++) {
      if (i === activeIndex) {
        items[i].classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
        items[i].classList.remove('text-slate-700', 'hover:bg-slate-100');
        if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' });
      } else {
        items[i].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
        items[i].classList.add('text-slate-700', 'hover:bg-slate-100');
      }
    }
  }
}

export function syncTeamData(source) {
  var teams = _teamsListCache || [];
  if (!teams || teams.length === 0) return;

  var tecInput = document.getElementById('diarioModalTecnico');
  var eqInput = document.getElementById('diarioModalEquipe');
  var placaInput = document.getElementById('diarioModalPlaca');

  var tecVal = tecInput ? tecInput.value.trim().toLowerCase() : '';
  var eqVal = eqInput ? eqInput.value.trim().toLowerCase() : '';
  var placaVal = placaInput ? placaInput.value.trim().toUpperCase() : '';

  if (source === 'tecnico' && tecVal) {
    var match = teams.find(function (t) {
      return t.tecnico && String(t.tecnico).trim().toLowerCase() === tecVal;
    });
    if (!match) {
      match = teams.find(function (t) {
        return t.tecnico && String(t.tecnico).trim().toLowerCase().indexOf(tecVal) === 0;
      });
    }
    if (match) {
      if (eqInput && (!eqInput.value.trim() || source === 'tecnico')) {
        eqInput.value = match.nome || '';
      }
      if (placaInput && match.placa) {
        placaInput.value = match.placa;
      }
    }
  } else if (source === 'equipe' && eqVal) {
    var match = teams.find(function (t) {
      return t.nome && String(t.nome).trim().toLowerCase() === eqVal;
    });
    if (!match) {
      match = teams.find(function (t) {
        return t.nome && String(t.nome).trim().toLowerCase().indexOf(eqVal) === 0;
      });
    }
    if (!match) {
      match = teams.find(function (t) {
        return (t.nome && String(t.nome).trim().toLowerCase().includes(eqVal)) ||
               (t.tecnico && String(t.tecnico).trim().toLowerCase().includes(eqVal));
      });
    }
    if (match) {
      if (placaInput && match.placa) {
        placaInput.value = match.placa;
      }
      if (tecInput && match.tecnico) {
        tecInput.value = match.tecnico;
      }
    }
  } else if (source === 'placa' && placaVal) {
    var match = teams.find(function (t) {
      return t.placa && String(t.placa).trim().toUpperCase() === placaVal;
    });
    if (!match) {
      match = teams.find(function (t) {
        return t.placa && String(t.placa).trim().toUpperCase().indexOf(placaVal) === 0;
      });
    }
    if (match) {
      if (eqInput && match.nome && !eqInput.value.trim()) {
        eqInput.value = match.nome;
      }
      if (tecInput && match.tecnico && !tecInput.value.trim()) {
        tecInput.value = match.tecnico;
      }
    }
  }
}

export function setupDiarioModalAutocompletes() {
  var tecnicoInput = document.getElementById('diarioModalTecnico');
  var tecnicoDropdown = document.getElementById('diarioModalTecnicoDropdown');
  var equipeInput = document.getElementById('diarioModalEquipe');
  var equipeDropdown = document.getElementById('diarioModalEquipeDropdown');
  var placaInput = document.getElementById('diarioModalPlaca');
  var placaDropdown = document.getElementById('diarioModalPlacaDropdown');
  var siteInput = document.getElementById('diarioModalSite');
  var siteDropdown = document.getElementById('diarioModalSiteDropdown');
  var eqInput = document.getElementById('diarioModalEquipamento');
  var eqIdInput = document.getElementById('diarioModalEquipamentoId');
  var eqDropdown = document.getElementById('diarioModalEquipamentoDropdown');
  var locInput = document.getElementById('diarioModalLocalidade');
  var locDropdown = document.getElementById('diarioModalLocalidadeDropdown');
  var osInput = document.getElementById('diarioModalOs');
  var obsInput = document.getElementById('diarioModalObs');

  // 1. Técnico Autocomplete
  if (tecnicoInput && !tecnicoInput._bound) {
    tecnicoInput._bound = true;
    if (tecnicoDropdown) {
      initModalDropdownAutocomplete({
        input: tecnicoInput,
        dropdown: tecnicoDropdown,
        getOptions: function () {
          var teams = _teamsListCache || [];
          var set = new Set();
          for (var i = 0; i < teams.length; i++) {
            var tec = teams[i].tecnico ? String(teams[i].tecnico).trim() : '';
            if (tec) set.add(tec);
          }
          return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
        },
        onSelect: function () {
          syncTeamData('tecnico');
        },
        onInput: function () {
          syncTeamData('tecnico');
        }
      });
    }
    tecnicoInput.addEventListener('input', function () { syncTeamData('tecnico'); });
    tecnicoInput.addEventListener('blur', function () { syncTeamData('tecnico'); });
    tecnicoInput.addEventListener('change', function () { syncTeamData('tecnico'); });
  }

  // 2. Equipe Autocomplete
  if (equipeInput && !equipeInput._bound) {
    equipeInput._bound = true;
    if (equipeDropdown) {
      initModalDropdownAutocomplete({
        input: equipeInput,
        dropdown: equipeDropdown,
        getOptions: function () {
          var teams = _teamsListCache || [];
          var set = new Set();
          for (var i = 0; i < teams.length; i++) {
            var eq = teams[i].nome ? String(teams[i].nome).trim() : '';
            if (eq) set.add(eq);
          }
          return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
        },
        onSelect: function () {
          syncTeamData('equipe');
        },
        onInput: function () {
          syncTeamData('equipe');
        }
      });
    }
    equipeInput.addEventListener('input', function () { syncTeamData('equipe'); });
    equipeInput.addEventListener('blur', function () { syncTeamData('equipe'); });
    equipeInput.addEventListener('change', function () { syncTeamData('equipe'); });
  }

  // 3. Placa Autocomplete
  if (placaInput && !placaInput._bound) {
    placaInput._bound = true;
    if (placaDropdown) {
      initModalDropdownAutocomplete({
        input: placaInput,
        dropdown: placaDropdown,
        getOptions: function () {
          var teams = _teamsListCache || [];
          var set = new Set();
          for (var i = 0; i < teams.length; i++) {
            var pl = teams[i].placa ? String(teams[i].placa).trim() : '';
            if (pl) set.add(pl);
          }
          return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
        },
        onSelect: function () {
          syncTeamData('placa');
        },
        onInput: function () {
          syncTeamData('placa');
        }
      });
    }
    placaInput.addEventListener('input', function () { syncTeamData('placa'); });
    placaInput.addEventListener('blur', function () { syncTeamData('placa'); });
    placaInput.addEventListener('change', function () { syncTeamData('placa'); });
  }

  // 3. Site Autocomplete
  if (siteInput && siteDropdown && !siteInput._bound) {
    siteInput._bound = true;
    initModalDropdownAutocomplete({
      input: siteInput,
      dropdown: siteDropdown,
      getOptions: function () {
        return getDiarioSites(_equipmentsCache || []);
      }
    });
  }

  // 4. Equipamento Autocomplete
  if (eqInput && eqDropdown && !eqInput._bound) {
    eqInput._bound = true;
    initModalDropdownAutocomplete({
      input: eqInput,
      dropdown: eqDropdown,
      getOptions: function () {
        var currentSite = siteInput ? siteInput.value.trim() : '';
        return getDiarioEquipmentsForSite(_equipmentsCache || [], currentSite);
      },
      formatItem: function (eq) {
        return formatPvEquipmentLabel(eq.equipamento, eq.capacidade, eq.localidade);
      },
      onSelect: function (eq) {
        if (eqIdInput) eqIdInput.value = eq.id;
        if (eq.local && siteInput && !siteInput.value.trim()) {
          siteInput.value = eq.local;
        }
        if (eq.localidade && locInput && !locInput.value.trim()) {
          locInput.value = eq.localidade;
        }
      },
      onInput: function () {
        if (eqIdInput) eqIdInput.value = '';
      }
    });
  }

  // 5. Localidade Autocomplete
  if (locInput && locDropdown && !locInput._bound) {
    locInput._bound = true;
    initModalDropdownAutocomplete({
      input: locInput,
      dropdown: locDropdown,
      getOptions: function () {
        var currentSite = siteInput ? siteInput.value.trim() : '';
        return getDiarioLocalidades(_equipmentsCache || [], currentSite);
      }
    });
  }

  // 6. OS Lookup
  var targetObsInput = document.getElementById('diarioModalNewObs') || obsInput;
  if (osInput && targetObsInput && !osInput._bound) {
    osInput._bound = true;
    osInput.addEventListener('blur', async function () {
      var val = osInput.value.trim();
      var currentVal = targetObsInput.value ? targetObsInput.value.trim() : '';
      if (!val || val === 'N/A' || currentVal !== '') return;
      try {
        var res = await apiFetch('/app/api/index.php?route=diario&action=lookup-os&os=' + encodeURIComponent(val));
        var json = await res.json();
        if (json.success && json.data && json.data.obs && !targetObsInput.value.trim()) {
          targetObsInput.value = json.data.obs;
          if (obsInput && obsInput !== targetObsInput) obsInput.value = json.data.obs;
        }
      } catch (err) {
        console.error('Erro lookup-os:', err);
      }
    });
  }
}

export function updateCategoryTecnicoRequirement() {
  var catSelect = document.getElementById('diarioModalCategoria');
  var reqAsterisk = document.getElementById('diarioModalTecnicoReq');
  if (!catSelect || !reqAsterisk) return;
  var isAdm = catSelect.value === 'administrativa';
  if (isAdm) {
    reqAsterisk.classList.add('hidden');
  } else {
    reqAsterisk.classList.remove('hidden');
  }
}

var _currentDetailDiarioItem = null;

export function openDiarioDetailModal(item) {
  _currentDetailDiarioItem = item;
  var modal = document.getElementById('diarioDetailModal');
  if (!modal) return;

  var idEl = document.getElementById('diarioDetailId');
  var subEl = document.getElementById('diarioDetailSubtitle');
  var badgesEl = document.getElementById('diarioDetailBadges');
  var infoBody = document.getElementById('diarioDetailInfoBody');

  if (idEl) idEl.textContent = 'ID #' + item.id;

  var equipStr = formatEquipamentoDisplay(item.equipamento_nome || item.equipamento, item.equipamento_capacidade);
  var subtitleParts = [];
  if (item.site) subtitleParts.push(escapeHtml(item.site));
  if (equipStr && equipStr !== '-') subtitleParts.push(escapeHtml(equipStr));
  if (item.tecnico) subtitleParts.push(escapeHtml(item.tecnico));
  else if (item.equipe) subtitleParts.push(escapeHtml(item.equipe));

  if (subEl) subEl.textContent = subtitleParts.join(' · ') || 'Detalhes da Atividade';

  if (badgesEl) {
    badgesEl.innerHTML = '<span class="px-2.5 py-0.5 rounded-xl text-xs font-semibold ' + getDiarioCategoryBadgeClass(item.categoria) + '">' + escapeHtml(formatDiarioCategory(item.categoria)) + '</span>'
      + '<span class="px-2.5 py-0.5 rounded-xl text-xs font-semibold ' + getDiarioStatusBadgeClass(item.status) + '">' + escapeHtml(item.status || 'Pendente') + '</span>';
  }

  if (infoBody) {
    var osVal = escapeHtml(item.os || '—');
    var hiVal = item.hora_inicio ? escapeHtml(String(item.hora_inicio).slice(0, 5)) : '—';
    var hsVal = item.hora_saida ? escapeHtml(String(item.hora_saida).slice(0, 5)) : '—';
    var obsVal = item.obs ? escapeHtml(item.obs).replace(/\n/g, '<br>') : '<span class="text-slate-400 italic">Nenhum histórico diário informado.</span>';
    var dateVal = formatDate(item.data) || escapeHtml(item.data || '—');

    infoBody.innerHTML = ''
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Técnico</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + escapeHtml(item.tecnico || '—') + '</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Equipe</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + escapeHtml(item.equipe || '—') + '</td>'
      + '</tr>'
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Placa</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-mono font-medium">' + escapeHtml(item.placa || '—') + '</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Data</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + dateVal + '</td>'
      + '</tr>'
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Tipo Atividade</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">'
      + '    <span class="px-2.5 py-0.5 rounded-xl text-xs font-semibold ' + getDiarioCategoryBadgeClass(item.categoria) + '">' + escapeHtml(formatDiarioCategory(item.categoria)) + '</span>'
      + '  </td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Status</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">'
      + '    <span class="px-2.5 py-0.5 rounded-xl text-xs font-semibold ' + getDiarioStatusBadgeClass(item.status) + '">' + escapeHtml(item.status || 'Pendente') + '</span>'
      + '  </td>'
      + '</tr>'
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Site</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + escapeHtml(item.site || '—') + '</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Localidade</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + escapeHtml(item.localidade || '—') + '</td>'
      + '</tr>'
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Equipamento</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + (equipStr === '-' ? '—' : escapeHtml(equipStr)) + '</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Nº OS</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + osVal + '</td>'
      + '</tr>'
      + '<tr class="border-b border-slate-100">'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Hora Início</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + hiVal + '</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Hora Saída</td>'
      + '  <td class="w-1/4 px-4 py-2.5 text-slate-800 font-medium">' + hsVal + '</td>'
      + '</tr>'
      + '<tr>'
      + '  <td class="w-1/4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">Histórico Diário</td>'
      + '  <td class="px-4 py-2.5 text-slate-700 leading-relaxed" colspan="3">' + obsVal + '</td>'
      + '</tr>';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeDiarioDetailModal() {
  var modal = document.getElementById('diarioDetailModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  _currentDetailDiarioItem = null;
}

export function openDiarioModal(id = null) {
  var modal = document.getElementById('diarioModal');
  if (!modal) return;

  var idInput = document.getElementById('diarioModalId');
  var titleEl = document.getElementById('diarioModalTitle');
  var subtitleEl = document.getElementById('diarioModalSubtitle');
  var saveLabel = document.getElementById('diarioModalSaveLabel');

  var tecnicoInput = document.getElementById('diarioModalTecnico');
  var equipeInput = document.getElementById('diarioModalEquipe');
  var placaInput = document.getElementById('diarioModalPlaca');
  var dataInput = document.getElementById('diarioModalData');
  var catSelect = document.getElementById('diarioModalCategoria');
  var statusSelect = document.getElementById('diarioModalStatus');
  var siteInput = document.getElementById('diarioModalSite');
  var eqInput = document.getElementById('diarioModalEquipamento');
  var eqIdInput = document.getElementById('diarioModalEquipamentoId');
  var locInput = document.getElementById('diarioModalLocalidade');
  var osInput = document.getElementById('diarioModalOs');
  var hiInput = document.getElementById('diarioModalHoraInicio');
  var hsInput = document.getElementById('diarioModalHoraSaida');
  var obsInput = document.getElementById('diarioModalObs');
  var newObsInput = document.getElementById('diarioModalNewObs');
  var obsHistorySection = document.getElementById('diarioModalObsHistorySection');
  var obsHistoryContainer = document.getElementById('diarioModalObsHistoryContainer');
  var obsHistoryEl = document.getElementById('diarioModalObsHistory');
  var obsEmptyEl = document.getElementById('diarioModalObsEmpty');
  var newObsLabel = document.getElementById('diarioModalNewObsLabel');

  loadDiarioTeams().catch(function () {});
  loadDiarioEquipments().catch(function () {});

  if (id === null || id === undefined || id === '') {
    if (idInput) idInput.value = '';
    if (titleEl) titleEl.textContent = 'Nova Atividade';
    if (subtitleEl) subtitleEl.textContent = 'Preencha os dados da atividade';
    if (saveLabel) saveLabel.textContent = 'Salvar Atividade';

    if (tecnicoInput) tecnicoInput.value = '';
    if (equipeInput) equipeInput.value = '';
    if (placaInput) placaInput.value = '';
    if (dataInput) dataInput.value = new Date().toISOString().slice(0, 10);
    if (catSelect) catSelect.value = 'preventiva';
    if (statusSelect) statusSelect.value = 'Concluído';
    if (siteInput) siteInput.value = '';
    if (eqInput) eqInput.value = '';
    if (eqIdInput) eqIdInput.value = '';
    if (locInput) locInput.value = '';
    if (osInput) osInput.value = '';
    if (hiInput) hiInput.value = '';
    if (hsInput) hsInput.value = '';

    if (obsHistorySection) obsHistorySection.classList.add('hidden');
    if (obsHistoryContainer) obsHistoryContainer.classList.add('hidden');
    if (obsHistoryEl) obsHistoryEl.textContent = '';
    if (obsEmptyEl) obsEmptyEl.classList.add('hidden');
    if (newObsLabel) newObsLabel.textContent = 'Observação Inicial';
    if (newObsInput) {
      newObsInput.value = '';
      newObsInput.placeholder = 'Observação inicial da atividade (opcional)...';
    }
    if (obsInput) obsInput.value = '';
  } else {
    var item = _diarioItemsById[id] || {};
    if (idInput) idInput.value = item.id || id;
    if (titleEl) titleEl.textContent = 'Editar Atividade';
    if (subtitleEl) subtitleEl.textContent = 'Atividade #' + (item.id || id);
    if (saveLabel) saveLabel.textContent = 'Salvar Alterações';

    if (tecnicoInput) tecnicoInput.value = item.tecnico || '';
    if (equipeInput) equipeInput.value = item.equipe || '';
    if (placaInput) placaInput.value = item.placa || '';
    if (dataInput) dataInput.value = item.data || '';
    if (catSelect) catSelect.value = item.categoria || 'preventiva';
    if (statusSelect) statusSelect.value = item.status || 'Concluído';
    if (siteInput) siteInput.value = item.site || '';
    if (eqInput) eqInput.value = formatEquipamentoDisplay(item.equipamento_nome || item.equipamento, item.equipamento_capacidade) === '-' ? '' : formatEquipamentoDisplay(item.equipamento_nome || item.equipamento, item.equipamento_capacidade);
    if (eqIdInput) eqIdInput.value = item.equipamento_id || '';
    if (locInput) locInput.value = item.localidade || '';
    if (osInput) osInput.value = item.os || '';
    if (hiInput) hiInput.value = item.hora_inicio || '';
    if (hsInput) hsInput.value = item.hora_saida || '';

    if (obsHistorySection) obsHistorySection.classList.remove('hidden');
    var rawObs = (item.obs || '').trim();
    if (rawObs) {
      if (obsHistoryContainer) obsHistoryContainer.classList.remove('hidden');
      if (obsHistoryEl) obsHistoryEl.textContent = item.obs;
      if (obsEmptyEl) obsEmptyEl.classList.add('hidden');
    } else {
      if (obsHistoryContainer) obsHistoryContainer.classList.add('hidden');
      if (obsHistoryEl) obsHistoryEl.textContent = '';
      if (obsEmptyEl) obsEmptyEl.classList.remove('hidden');
    }
    if (newObsLabel) newObsLabel.textContent = 'Adicionar Nova Observação';
    if (newObsInput) {
      newObsInput.value = '';
      newObsInput.placeholder = 'Digite uma observação para adicionar ao histórico...';
    }
    if (obsInput) obsInput.value = item.obs || '';

    if (placaInput && !placaInput.value.trim()) {
      if (tecnicoInput && tecnicoInput.value.trim()) syncTeamData('tecnico');
      else if (equipeInput && equipeInput.value.trim()) syncTeamData('equipe');
    }
  }

  updateCategoryTecnicoRequirement();

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeDiarioModal() {
  var modal = document.getElementById('diarioModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export async function saveDiarioModal(e) {
  if (e) e.preventDefault();

  var idInput = document.getElementById('diarioModalId');
  var tecnicoInput = document.getElementById('diarioModalTecnico');
  var equipeInput = document.getElementById('diarioModalEquipe');
  var placaInput = document.getElementById('diarioModalPlaca');
  var dataInput = document.getElementById('diarioModalData');
  var catSelect = document.getElementById('diarioModalCategoria');
  var statusSelect = document.getElementById('diarioModalStatus');
  var siteInput = document.getElementById('diarioModalSite');
  var eqIdInput = document.getElementById('diarioModalEquipamentoId');
  var locInput = document.getElementById('diarioModalLocalidade');
  var osInput = document.getElementById('diarioModalOs');
  var hiInput = document.getElementById('diarioModalHoraInicio');
  var hsInput = document.getElementById('diarioModalHoraSaida');
  var obsInput = document.getElementById('diarioModalObs');
  var newObsInput = document.getElementById('diarioModalNewObs');

  var id = idInput && idInput.value ? parseInt(idInput.value, 10) : null;
  var categoria = catSelect ? catSelect.value : 'preventiva';
  var tecnico = tecnicoInput ? tecnicoInput.value.trim() : '';
  var equipe = equipeInput ? equipeInput.value.trim() : '';

  if (categoria !== 'administrativa') {
    if (!tecnico && !equipe) {
      showToast('Informe o Técnico ou a Equipe para esta atividade', 'warning');
      if (tecnicoInput) tecnicoInput.focus();
      return;
    }
  }

  var dataVal = dataInput ? dataInput.value.trim() : '';
  if (!dataVal) {
    showToast('Informe a data da atividade', 'warning');
    if (dataInput) dataInput.focus();
    return;
  }

  var newObsVal = newObsInput ? newObsInput.value.trim() : '';
  var obsVal = obsInput ? obsInput.value.trim() : '';

  var payload = {
    tecnico: tecnico || null,
    equipe: equipe || null,
    placa: placaInput ? placaInput.value.trim() || null : null,
    data: dataVal,
    categoria: categoria,
    status: statusSelect ? statusSelect.value : 'Concluído',
    site: siteInput ? siteInput.value.trim() || null : null,
    equipamento_id: eqIdInput && eqIdInput.value ? parseInt(eqIdInput.value, 10) : null,
    localidade: locInput ? locInput.value.trim() || null : null,
    os: osInput ? osInput.value.trim() || null : null,
    hora_inicio: hiInput ? hiInput.value.trim() || null : null,
    hora_saida: hsInput ? hsInput.value.trim() || null : null,
  };

  if (id) {
    payload.id = id;
    payload.nova_obs = newObsVal || null;
    if (!payload.nova_obs && obsVal && obsVal !== (_diarioItemsById[id] && _diarioItemsById[id].obs)) {
      payload.nova_obs = obsVal;
    }
  } else {
    payload.obs = newObsVal || obsVal || null;
  }

  var saveBtn = document.getElementById('btnDiarioModalSave');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (id) {
      var res = await apiFetch('/app/api/index.php?route=diario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var json = await res.json();
      if (!json.success || !json.data) {
        showToast(json.message || 'Erro ao atualizar atividade', 'error');
        return;
      }
      var updatedItem = json.data.item || json.data;
      if (updatedItem && updatedItem.id) {
        _diarioItemsById[updatedItem.id] = updatedItem;
        refreshDiarioRow(updatedItem.id);
        if (_currentDetailDiarioItem && _currentDetailDiarioItem.id === updatedItem.id) {
          openDiarioDetailModal(updatedItem);
        }
      }
      showToast('Atividade atualizada com sucesso', 'success');
      closeDiarioModal();
    } else {
      var resCreate = await apiFetch('/app/api/index.php?route=diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var jsonCreate = await resCreate.json();
      if (!jsonCreate.success || !jsonCreate.data || !jsonCreate.data.item) {
        showToast(jsonCreate.message || 'Erro ao criar atividade', 'error');
        return;
      }
      var newItem = jsonCreate.data.item;
      _diarioItemsById[newItem.id] = newItem;

      var tbody = document.getElementById('diarioTableBody');
      if (tbody) {
        var rowHtml = renderDiarioRow(newItem);
        var temp = document.createElement('tbody');
        temp.innerHTML = rowHtml;
        var newRow = temp.firstElementChild;
        if (newRow) {
          tbody.insertBefore(newRow, tbody.firstElementChild);
        }
      }

      var emptyEl = document.getElementById('diarioEmpty');
      if (emptyEl) emptyEl.classList.add('hidden');

      var badge = document.getElementById('diarioBadge');
      if (badge) {
        var current = parseInt(badge.textContent || '0', 10);
        badge.textContent = current + 1;
      }

      showToast('Atividade criada com sucesso', 'success');
      closeDiarioModal();
    }
  } catch (err) {
    console.error('Erro ao salvar modal diário:', err);
    showToast('Erro ao salvar atividade', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

export async function duplicateDiarioLine(id) {
  var item = _diarioItemsById[id];
  if (!item) return;

  var copyData = {
    tecnico: item.tecnico || null,
    site: item.site || null,
    equipamento_id: item.equipamento_id || null,
    localidade: item.localidade || null,
    os: item.os || null,
    data: item.data || null,
    categoria: item.categoria || null,
    hora_inicio: item.hora_inicio || null,
    hora_saida: item.hora_saida || null,
    equipe: item.equipe || null,
    placa: item.placa || null,
    status: item.status || 'Concluído',
  };

  try {
    var res = await apiFetch('/app/api/index.php?route=diario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copyData),
    });
    var json = await res.json();
    if (!json.success || !json.data || !json.data.item) {
      showToast(json.message || 'Erro ao duplicar atividade', 'error');
      return;
    }

    var newItem = json.data.item;
    _diarioItemsById[newItem.id] = newItem;

    var tbody = document.getElementById('diarioTableBody');
    if (tbody) {
      var rowHtml = renderDiarioRow(newItem);
      var tempDup = document.createElement('tbody');
      tempDup.innerHTML = rowHtml;
      var newDupRow = tempDup.firstElementChild;
      if (newDupRow) {
        tbody.insertBefore(newDupRow, tbody.firstElementChild);
      }
    }

    var emptyEl = document.getElementById('diarioEmpty');
    if (emptyEl) emptyEl.classList.add('hidden');

    var badge = document.getElementById('diarioBadge');
    if (badge) {
      var current = parseInt(badge.textContent || '0', 10);
      badge.textContent = current + 1;
    }

    showToast('Atividade duplicada com sucesso', 'success');
  } catch (e) {
    console.error('Erro ao duplicar atividade:', e);
    showToast('Erro ao duplicar atividade', 'error');
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

  if (!diarioStatusTodosChecked) {
    if (diarioStatusFilter.size > 0) {
      Array.from(diarioStatusFilter).forEach(function (st) {
        url += '&status[]=' + encodeURIComponent(st);
      });
    } else {
      url += '&status[]=__none__';
    }
  }

  if (!diarioCategoryTodosChecked) {
    if (diarioCategoryFilter.size > 0) {
      Array.from(diarioCategoryFilter).forEach(function (cat) {
        url += '&categoria[]=' + encodeURIComponent(cat);
      });
    } else {
      url += '&categoria[]=__none__';
    }
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
          sanitizeCSV(it.tecnico || ''),
          sanitizeCSV(it.equipe || ''),
          sanitizeCSV(it.placa || ''),
          sanitizeCSV(it.data || ''),
          sanitizeCSV(it.categoria || ''),
          sanitizeCSV(it.site || ''),
          sanitizeCSV(formatEquipamentoDisplay(it.equipamento_nome || it.equipamento, it.equipamento_capacidade) === '-' ? '' : formatEquipamentoDisplay(it.equipamento_nome || it.equipamento, it.equipamento_capacidade)),
          sanitizeCSV(it.localidade || ''),
          sanitizeCSV(it.status || ''),
          sanitizeCSV(it.hora_inicio || ''),
          sanitizeCSV(it.hora_saida || ''),
          sanitizeCSV(it.os || ''),
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

  // Set initial sort icon
  document.querySelectorAll('#diarioTable thead th .sort-icon').forEach(function (el) { el.textContent = ''; });
  var initialSortTh = document.querySelector('#diarioTable thead th[data-sort="' + diarioSortBy + '"] .sort-icon');
  if (initialSortTh) initialSortTh.textContent = diarioSortDir === 'ASC' ? ' \u2191' : ' \u2193';

  // New line button
  var newBtn = document.getElementById('diarioNewBtn');
  if (newBtn && !newBtn._bound) {
    newBtn._bound = true;
    newBtn.addEventListener('click', function () {
      openDiarioModal(null);
    });
  }

  // Modal bindings
  setupDiarioModalAutocompletes();

  var modalCloseBtn = document.getElementById('btnDiarioModalClose');
  if (modalCloseBtn && !modalCloseBtn._bound) {
    modalCloseBtn._bound = true;
    modalCloseBtn.addEventListener('click', closeDiarioModal);
  }

  var modalCancelBtn = document.getElementById('btnDiarioModalCancel');
  if (modalCancelBtn && !modalCancelBtn._bound) {
    modalCancelBtn._bound = true;
    modalCancelBtn.addEventListener('click', closeDiarioModal);
  }

  var modalEl = document.getElementById('diarioModal');
  if (modalEl && !modalEl._bound) {
    modalEl._bound = true;
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeDiarioModal();
    });
  }

  var modalForm = document.getElementById('diarioModalForm');
  if (modalForm && !modalForm._bound) {
    modalForm._bound = true;
    modalForm.addEventListener('submit', saveDiarioModal);
  }

  var modalCat = document.getElementById('diarioModalCategoria');
  if (modalCat && !modalCat._bound) {
    modalCat._bound = true;
    modalCat.addEventListener('change', updateCategoryTecnicoRequirement);
  }

  // Detail Modal bindings
  var closeDetailTop = document.getElementById('btnCloseDiarioDetailTop');
  if (closeDetailTop && !closeDetailTop._bound) {
    closeDetailTop._bound = true;
    closeDetailTop.addEventListener('click', closeDiarioDetailModal);
  }

  var closeDetailBtn = document.getElementById('btnDiarioDetailClose');
  if (closeDetailBtn && !closeDetailBtn._bound) {
    closeDetailBtn._bound = true;
    closeDetailBtn.addEventListener('click', closeDiarioDetailModal);
  }

  var detailModalEl = document.getElementById('diarioDetailModal');
  if (detailModalEl && !detailModalEl._bound) {
    detailModalEl._bound = true;
    detailModalEl.addEventListener('click', function (e) {
      if (e.target === detailModalEl) closeDiarioDetailModal();
    });
  }

  var editDetailBtn = document.getElementById('btnDiarioDetailEdit');
  if (editDetailBtn && !editDetailBtn._bound) {
    editDetailBtn._bound = true;
    editDetailBtn.addEventListener('click', function () {
      if (_currentDetailDiarioItem) {
        var it = _currentDetailDiarioItem;
        closeDiarioDetailModal();
        openDiarioModal(it.id);
      }
    });
  }

  // Pre-load teams cache
  loadDiarioTeams().catch(function () {});

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
      refreshDiarioList();
    }, 300));
  }

  // Date filters
  var dateFromInput = document.getElementById('diarioDateFrom');
  if (dateFromInput && !dateFromInput._bound) {
    dateFromInput._bound = true;
    dateFromInput.addEventListener('change', function () {
      diarioDateFrom = dateFromInput.value;
      refreshDiarioList();
    });
  }

  var dateToInput = document.getElementById('diarioDateTo');
  if (dateToInput && !dateToInput._bound) {
    dateToInput._bound = true;
    dateToInput.addEventListener('change', function () {
      diarioDateTo = dateToInput.value;
      refreshDiarioList();
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
      refreshDiarioList();
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
      refreshDiarioList();
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

      refreshDiarioList();
    });
  });

  // Table body event delegation (inline edits, obs, delete)
  var tbody = document.getElementById('diarioTableBody');
  if (tbody && !tbody._bound) {
    tbody._bound = true;

    tbody.addEventListener('click', function (e) {
      // Edit button (opens modal)
      var editBtn = e.target.closest('[data-action="edit"]') || e.target.closest('.diario-edit-btn');
      if (editBtn) {
        var editId = editBtn.getAttribute('data-id');
        if (editId) openDiarioModal(parseInt(editId, 10));
        return;
      }

      // Duplicate button
      var dupBtn = e.target.closest('[data-action="duplicate"]') || e.target.closest('.diario-duplicate-btn');
      if (dupBtn) {
        var dupId = dupBtn.getAttribute('data-id');
        if (dupId) duplicateDiarioLine(parseInt(dupId, 10));
        return;
      }

      // Delete button
      var delBtn = e.target.closest('[data-action="delete"]') || e.target.closest('.diario-delete-btn');
      if (delBtn) {
        var delId = delBtn.getAttribute('data-id');
        if (delId) deleteDiarioLine(parseInt(delId, 10));
        return;
      }

      // Row click: opens read-only detail modal (like solicitacao de material) if not clicking action button or selecting text
      if (window.getSelection && window.getSelection().toString().trim().length > 0) {
        return;
      }
      var tr = e.target.closest('tr.diario-row');
      if (tr) {
        var rowId = tr.getAttribute('data-id');
        if (rowId) {
          var item = _diarioItemsById[rowId];
          if (item) {
            openDiarioDetailModal(item);
          } else {
            openDiarioDetailModal({ id: parseInt(rowId, 10) });
          }
        }
        return;
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
  if (_diarioScroll) {
    _diarioScroll.destroy();
    _diarioScroll = null;
  }
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
