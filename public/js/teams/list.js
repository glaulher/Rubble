import { showToast, confirmDelete } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { iconButtonHtml } from '/public/js/components/button.js';
import { invalidateTeamCache } from '/public/js/components/team-autocomplete.js';

let teams = [];
let teamSearch = '';
let listenerAttached = false;

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
      ? all.filter(item => (item.nome || item.name || '').toLowerCase().includes(teamSearch.toLowerCase()))
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
    const createdDate = team.created_at
      ? new Date(team.created_at + ' UTC').toLocaleDateString('pt-BR')
      : '-';
    const teamName = team.nome || team.name || '';

    return '<tr data-team-id="' + team.id + '">' +
      '<td class="px-6 py-4 text-slate-900 font-medium">' + escapeHtml(teamName) + '</td>' +
      '<td class="px-6 py-4">' + statusBadge + '</td>' +
      '<td class="hidden md:table-cell px-6 py-4 text-slate-500">' + createdDate + '</td>' +
      '<td class="px-6 py-4 text-right">' +
        '<div class="flex items-center justify-end gap-2">' +
          iconButtonHtml('edit', 'Editar', { 'data-action': 'edit-team', 'data-team-id': team.id }) +
          iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete-team', 'data-team-id': team.id }, 'right') +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function attachListeners() {
  document.querySelector('[data-action="open-team-modal-create"]')
    ?.addEventListener('click', () => openModal());

  document.querySelector('[data-action="close-team-modal"]')
    ?.addEventListener('click', () => closeModal());

  document.querySelector('[data-action="save-team"]')
    ?.addEventListener('click', () => saveTeam());

  const tableBody = document.getElementById('teamTableBody');
  if (tableBody && !listenerAttached) {
    listenerAttached = true;
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
  if (!searchInput) return;

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
  const id     = document.getElementById('teamModalId').value;
  const name   = document.getElementById('teamModalNome').value.trim();
  const active = document.getElementById('teamModalAtivo').checked ? 1 : 0;

  if (!name) {
    showToast('Nome da equipe é obrigatório', 'error');
    return;
  }

  try {
    const isEdit = Boolean(id);
    const body   = isEdit ? { id: parseInt(id, 10), nome: name, ativo: active } : { nome: name, ativo: active };

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
