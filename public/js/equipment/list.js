let equipmentPage = 0;
let equipmentLimit = 20;
let equipmentLoading = false;
let equipmentAllLoaded = false;
let equipmentList = [];
let equipmentSearch = '';

async function initEquipmentManager() {
  equipmentPage = 0;
  equipmentLoading = false;
  equipmentAllLoaded = false;
  equipmentList = [];
  equipmentSearch = '';
  const input = document.getElementById('equipmentSearchInput');
  if (input) input.value = '';
  document.querySelector('[data-action="navigate-equipment-form"]')
    ?.addEventListener('click', function () { window.location.hash = '#/equipmentForm'; });
  await loadEquipments();
  setupEquipmentSearch();
  createInfiniteScroll('sentinel', loadEquipments);
}

async function loadEquipments() {
  if (equipmentLoading || equipmentAllLoaded) return;

  equipmentLoading = true;
  var el = document.getElementById('equipmentLoading');
  if (el) el.classList.remove('hidden');

  try {
    const offset = equipmentPage * equipmentLimit;
    let url = '/app/api/index.php?route=equipment-management&limit=' + equipmentLimit + '&offset=' + offset;
    if (equipmentSearch) {
      url += '&search=' + encodeURIComponent(equipmentSearch);
    }

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      showToast('Erro ao carregar equipamentos', 'error');
      return;
    }

    const items = result.data || [];
    if (items.length < equipmentLimit) {
      equipmentAllLoaded = true;
    }

    equipmentList = equipmentPage === 0 ? items : equipmentList.concat(items);
    equipmentPage++;
    renderEquipments();
  } catch (e) {
    showToast('Erro ao carregar equipamentos', 'error');
  } finally {
    equipmentLoading = false;
    var el = document.getElementById('equipmentLoading');
    if (el) el.classList.add('hidden');
  }
}

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
      '<div class="relative group">' +
        '<button data-action="edit" data-equipment-id="' + eq.id + '" class="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-xl transition">' +
          '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
          '</svg>' +
        '</button>' +
        '<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Editar</span>' +
      '</div>';
    if (canDelete) {
      actions +=
      '<div class="relative group">' +
        '<button data-action="delete" data-equipment-id="' + eq.id + '" class="bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition">' +
          '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="3 6 5 6 21 6"></polyline>' +
            '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
          '</svg>' +
        '</button>' +
        '<span class="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 origin-bottom-right transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Excluir</span>' +
      '</div>';
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

function setupEquipmentSearch() {
  var input = document.getElementById('equipmentSearchInput');
  if (!input) return;

  input.addEventListener('click', function() {
    if (this.value !== '') {
      this.value = '';
      equipmentSearch = '';
      equipmentPage = 0;
      equipmentAllLoaded = false;
      equipmentList = [];
      loadEquipments();
    }
  });

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      equipmentSearch = input.value.trim();
      equipmentPage = 0;
      equipmentAllLoaded = false;
      equipmentList = [];
      loadEquipments();
    }, 500);
  });
}

function editEquipment(id) {
  window.location.hash = '#/equipmentForm?id=' + id;
}

async function deleteEquipment(id) {
  const confirmed = await confirmAction('Tem certeza que deseja excluir este equipamento?');
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
      equipmentPage = 0;
      equipmentAllLoaded = false;
      equipmentList = [];
      await loadEquipments();
    } else {
      showToast(result.message || 'Erro ao excluir', 'error');
    }
  } catch {
    showToast('Erro ao excluir', 'error');
  }
}
