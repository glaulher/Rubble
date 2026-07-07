import { createInfiniteScroll } from '/public/js/components/infinite-scroll.js';

let equipmentLimit = 20;
let equipmentList = [];
let equipmentSearch = '';
var _equipmentScroll = null;

async function initEquipmentManager() {
  equipmentList = [];
  equipmentSearch = '';
  const input = document.getElementById('equipmentSearchInput');
  if (input) input.value = '';

  document.querySelector('[data-action="navigate-equipment-form"]')
    ?.removeEventListener('click', navigateEquipmentFormHandler);
  document.querySelector('[data-action="navigate-equipment-form"]')
    ?.addEventListener('click', navigateEquipmentFormHandler);

  const tbody = document.getElementById('equipmentTableBody');
  if (tbody && !tbody._listenerAttached) {
    tbody._listenerAttached = true;
    tbody.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      switch (btn.dataset.action) {
        case 'edit':
          editEquipment(parseInt(btn.dataset.equipmentId));
          break;
        case 'delete':
          deleteEquipment(parseInt(btn.dataset.equipmentId));
          break;
      }
    });
  }
  if (_equipmentScroll) _equipmentScroll.destroy();
  _equipmentScroll = createInfiniteScroll({
    sentinelId: 'sentinel',
    limit: equipmentLimit,
    fetchFn: async function (params, opts) {
      var url = '/app/api/index.php?route=equipment-management&limit=' + params.limit + '&offset=' + params.offset;
      if (equipmentSearch) {
        url += '&search=' + encodeURIComponent(equipmentSearch);
      }
      try {
        var response = await fetch(url, opts);
        var result = await response.json();
        if (!result.success) {
          showToast('Erro ao carregar equipamentos', 'error');
          return { data: [], total: 0 };
        }
        return { data: result.data || [], total: 0 };
      } catch (e) {
        showToast('Erro ao carregar equipamentos', 'error');
        return { data: [], total: 0 };
      }
    },
    renderFn: function () {
      equipmentList = _equipmentScroll.getState().data;
      renderEquipments();
    },
    onError: function () {
      showToast('Erro ao carregar equipamentos', 'error');
    }
  }).init();
  setupEquipmentSearch();
}

globalThis.initEquipmentManager = initEquipmentManager;

function navigateEquipmentFormHandler() { window.location.hash = '#/equipmentForm'; }

function renderEquipments() {
  const tbody = document.getElementById('equipmentTableBody');
  const empty = document.getElementById('equipmentEmpty');
  const counter = document.getElementById('equipmentCounter');

  if (!tbody) return;

  if (counter) counter.textContent = equipmentList.length;

  if (equipmentList.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : '';
  const canDelete = userRole === 'admin';

  tbody.innerHTML = equipmentList.map(function(eq) {
    var capacidade = eq.capacidade ? parseFloat(eq.capacidade).toFixed(2) + ' TR' : '-';
    var enderecoCompleto = [eq.local_do_endereco, eq.endereco_completo, eq.uf].filter(Boolean).join(', ') || '-';

    var actions = '<div class="flex items-center justify-end gap-2">' +
      iconButtonHtml('edit', 'Editar', { 'data-action': 'edit', 'data-equipment-id': eq.id });
    if (canDelete) {
      actions +=
      iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete', 'data-equipment-id': eq.id }, 'right');
    }
    actions += '</div>';

    return '<tr data-equipment-id="' + eq.id + '">' +
      '<td class="px-3 py-3 text-slate-900 font-medium whitespace-nowrap">' + escapeHtml(eq.equipamento || '-') + '</td>' +
      '<td class="hidden lg:table-cell px-3 py-3 text-slate-600 whitespace-nowrap">' + capacidade + '</td>' +
      '<td class="hidden lg:table-cell px-3 py-3 text-slate-600">' + escapeHtml(eq.local || '-') + '</td>' +
      '<td class="hidden xl:table-cell px-3 py-3 text-slate-600">' + escapeHtml(eq.local_scm || '-') + '</td>' +
      '<td class="px-3 py-3 text-slate-600">' + escapeHtml(eq.localidade || '-') + '</td>' +
      '<td class="hidden xl:table-cell px-3 py-3 text-slate-600">' + escapeHtml(eq.mercado || '-') + '</td>' +
      '<td class="hidden xl:table-cell px-3 py-3 text-slate-600 max-w-[200px] truncate">' + escapeHtml(enderecoCompleto) + '</td>' +
      '<td class="px-3 py-3 text-right">' + actions + '</td>' +
      '</tr>';
  }).join('');
}

function setupEquipmentSearch() {
  var input = document.getElementById('equipmentSearchInput');
  if (!input) return;

  input.addEventListener('click', function() {
    if (this.value !== '') {
      this.value = '';
      equipmentSearch = '';
      equipmentList = [];
      _equipmentScroll.reset().init();
    }
  });

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      equipmentSearch = input.value.trim();
      equipmentList = [];
      _equipmentScroll.reset().init();
    }, 500);
  });
}

function editEquipment(id) {
  window.location.hash = '#/equipmentForm?id=' + id;
}

async function deleteEquipment(id) {
  var eq = equipmentList.find(function(e) { return e.id === id; });
  var eqName = eq ? eq.equipamento : '';
  const confirmed = await confirmDelete('Excluir Equipamento', 'Tem certeza que deseja excluir', eqName);
  if (!confirmed) return;

  try {
    const response = await fetch('/app/api/index.php?route=equipment-management', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (result.success) {
      showToast('Equipamento excluído com sucesso', 'success');
      equipmentList = [];
      _equipmentScroll.reset().init();
    } else {
      showToast(result.message || 'Erro ao excluir', 'error');
    }
  } catch {
    showToast('Erro ao excluir', 'error');
  }
}
