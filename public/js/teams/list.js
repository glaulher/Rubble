import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { invalidateTeamCache } from '/public/js/components/team-autocomplete.js';

let teams = [];
let teamSearch = '';

export async function initTeams() {
  teamSearch = '';
  const searchInput = document.getElementById('teamSearchInput');
  if (searchInput) searchInput.value = '';

  await loadTeams();
  setupSearch();
  attachListeners();
}

async function loadTeams() {
  try {
    let url = '/app/api/index.php?route=teams&limit=9999';
    if (teamSearch) {
      url += '&search=' + encodeURIComponent(teamSearch);
    }
    const response = await fetch(url);
    const result   = await response.json();
    if (!result.success) {
      showToast('Erro ao carregar equipes', 'error');
      return;
    }
    const all = result.data || [];
    teams = teamSearch
      ? all.filter(item => {
          const s = teamSearch.toLowerCase();
          return (item.nome || item.name || '').toLowerCase().includes(s)
            || (item.tecnico || '').toLowerCase().includes(s)
            || (item.placa || '').toLowerCase().includes(s)
            || (item.veiculo || '').toLowerCase().includes(s)
            || (item.contrato || '').toLowerCase().includes(s);
        })
      : all;
    renderTeams();
  } catch {
    showToast('Erro ao carregar equipes', 'error');
  }
}

function renderTeams() {
  const tableBody = document.getElementById('teamTableBody');
  const emptyState = document.getElementById('teamEmpty');
  const counter   = document.getElementById('teamCounter');

  if (!tableBody) return;

  if (counter) counter.textContent = teams.length;

  if (teams.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = teams.map(team => {
    const isActive = team.ativo == 1 || team.active == 1;
    const statusBadge = isActive
      ? '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Ativo</span>'
      : '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inativo</span>';
    const teamName = team.nome || team.name || '';
    const tecnico = team.tecnico ? escapeHtml(team.tecnico) : '<span class="text-slate-400">-</span>';
    const placa = team.placa
      ? '<span class="inline-block px-2 py-0.5 rounded font-mono text-xs bg-slate-100 text-slate-700 font-semibold">' + escapeHtml(team.placa) + '</span>'
      : '<span class="text-slate-400">-</span>';
    const veiculo = team.veiculo ? escapeHtml(team.veiculo) : '<span class="text-slate-400">-</span>';
    const contrato = team.contrato ? escapeHtml(team.contrato) : '<span class="text-slate-400">-</span>';

    return '<tr data-team-id="' + team.id + '">' +
      '<td class="px-4 py-4 text-slate-900 font-medium">' + escapeHtml(teamName) + '</td>' +
      '<td class="px-4 py-4 text-slate-700">' + tecnico + '</td>' +
      '<td class="px-4 py-4">' + placa + '</td>' +
      '<td class="hidden sm:table-cell px-4 py-4 text-slate-600">' + veiculo + '</td>' +
      '<td class="hidden md:table-cell px-4 py-4 text-slate-600">' + contrato + '</td>' +
      '<td class="px-4 py-4">' + statusBadge + '</td>' +
      '<td class="px-4 py-4 text-right">' +
        '<div class="flex items-center justify-end gap-2">' +
          iconButtonHtml('edit', 'Editar', { 'data-action': 'edit-team', 'data-team-id': team.id }) +
          iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete-team', 'data-team-id': team.id }, 'right') +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function attachListeners() {
  const openBtn = document.querySelector('[data-action="open-team-modal-create"]');
  if (openBtn && !openBtn._listenerAttached) {
    openBtn._listenerAttached = true;
    openBtn.addEventListener('click', () => openModal());
  }

  const closeBtn = document.querySelector('[data-action="close-team-modal"]');
  if (closeBtn && !closeBtn._listenerAttached) {
    closeBtn._listenerAttached = true;
    closeBtn.addEventListener('click', () => closeModal());
  }

  const saveBtn = document.querySelector('[data-action="save-team"]');
  if (saveBtn && !saveBtn._listenerAttached) {
    saveBtn._listenerAttached = true;
    saveBtn.addEventListener('click', () => saveTeam());
  }

  const tableBody = document.getElementById('teamTableBody');
  if (tableBody && !tableBody._listenerAttached) {
    tableBody._listenerAttached = true;
    tableBody.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      switch (button.dataset.action) {
        case 'edit-team':
          editTeam(parseInt(button.dataset.teamId, 10));
          break;
        case 'delete-team':
          deleteTeam(parseInt(button.dataset.teamId, 10));
          break;
      }
    });
  }
}

function setupSearch() {
  const searchInput = document.getElementById('teamSearchInput');
  if (!searchInput || searchInput._listenerAttached) return;
  searchInput._listenerAttached = true;

  searchInput.addEventListener('click', function () {
    if (this.value !== '') {
      this.value = '';
      teamSearch = '';
      loadTeams();
    }
  });

  let debounceTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      teamSearch = searchInput.value.trim();
      loadTeams();
    }, 400);
  });
}

function openModal(team = null) {
  document.getElementById('teamModalId').value   = team ? team.id : '';
  document.getElementById('teamModalNome').value = team ? (team.nome || team.name || '') : '';
  const tecnicoEl = document.getElementById('teamModalTecnico');
  if (tecnicoEl) tecnicoEl.value = team ? (team.tecnico || '') : '';
  const placaEl = document.getElementById('teamModalPlaca');
  if (placaEl) placaEl.value = team ? (team.placa || '') : '';
  const veiculoEl = document.getElementById('teamModalVeiculo');
  if (veiculoEl) veiculoEl.value = team ? (team.veiculo || '') : '';
  const contratoEl = document.getElementById('teamModalContrato');
  if (contratoEl) contratoEl.value = team ? (team.contrato || '') : '';
  document.getElementById('teamModalAtivo').checked = team ? (team.ativo == 1 || team.active == 1) : true;
  document.getElementById('teamModalTitle').textContent = team ? 'Editar Equipe' : 'Nova Equipe';
  document.getElementById('teamModal').classList.remove('hidden');
  document.getElementById('teamModalNome').focus();
}

function closeModal() {
  document.getElementById('teamModal').classList.add('hidden');
}

function editTeam(id) {
  const team = teams.find(item => item.id === id);
  if (team) openModal(team);
}

async function saveTeam() {
  const id        = document.getElementById('teamModalId').value;
  const name      = document.getElementById('teamModalNome').value.trim();
  const tecnicoEl = document.getElementById('teamModalTecnico');
  const tecnico   = tecnicoEl ? tecnicoEl.value.trim() : '';
  const placaEl   = document.getElementById('teamModalPlaca');
  const placa     = placaEl ? placaEl.value.trim().toUpperCase() : '';
  const veiculoEl = document.getElementById('teamModalVeiculo');
  const veiculo   = veiculoEl ? veiculoEl.value.trim() : '';
  const contratoEl = document.getElementById('teamModalContrato');
  const contrato  = contratoEl ? contratoEl.value.trim() : '';
  const active    = document.getElementById('teamModalAtivo').checked ? 1 : 0;

  if (!name) {
    showToast('Nome da equipe é obrigatório', 'error');
    return;
  }

  try {
    const isEdit = Boolean(id);
    const body   = {
      nome: name,
      tecnico: tecnico || null,
      placa: placa || null,
      veiculo: veiculo || null,
      contrato: contrato || null,
      ativo: active,
    };
    if (isEdit) {
      body.id = parseInt(id, 10);
    }

    const response = await fetch('/app/api/index.php?route=teams', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (result.success) {
      invalidateTeamCache();
      showToast(isEdit ? 'Equipe atualizada' : 'Equipe cadastrada', 'success');
      closeModal();
      await loadTeams();
    } else {
      showToast(result.message || 'Erro ao salvar', 'error');
    }
  } catch {
    showToast('Erro ao salvar', 'error');
  }
}

async function deleteTeam(id) {
  const team = teams.find(item => item.id === id);
  const teamName = team ? (team.nome || team.name || '') : '';
  const confirmed = await confirmDelete('Excluir Equipe', 'Tem certeza que deseja excluir a equipe', teamName);
  if (!confirmed) return;

  try {
    const response = await fetch('/app/api/index.php?route=teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (result.success) {
      invalidateTeamCache();
      showToast('Equipe excluída', 'success');
      await loadTeams();
    } else {
      showToast(result.message || 'Erro ao excluir', 'error');
    }
  } catch {
    showToast('Erro ao excluir', 'error');
  }
}

// For test exposure
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, '_teams', {
    get: () => teams,
    set: v => { teams = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, '_teamSearch', {
    get: () => teamSearch,
    set: v => { teamSearch = v; },
    configurable: true,
  });
}
