let users = [];
let userSearch = '';

async function initUsers() {
  userSearch = '';
  const input = document.getElementById('userSearchInput');
  if (input) input.value = '';
  document.querySelector('[data-action="navigate-user-form"]')
    ?.addEventListener('click', function () { window.location.hash = '#/usersForm'; });
  await loadUsers();
  setupUserSearch();
  var tbody = document.getElementById('userTableBody');
  if (tbody && !tbody._listenerAttached) {
    tbody._listenerAttached = true;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      switch (btn.dataset.action) {
        case 'edit':
          editUser(parseInt(btn.dataset.userId));
          break;
        case 'delete':
          deleteUser(parseInt(btn.dataset.userId));
          break;
      }
    });
  }
}

async function loadUsers() {
  try {
    let url = '/app/api/index.php?route=users&limit=999';
    if (userSearch) {
      url += '&search=' + encodeURIComponent(userSearch);
    }
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      showToast('Erro ao carregar usuários', 'error');
      return;
    }

    users = result.data || [];
    renderUsers();
  } catch (e) {
    showToast('Erro ao carregar usuários', 'error');
  }
}

function renderUsers() {
  const tbody = document.getElementById('userTableBody');
  const empty = document.getElementById('userEmpty');
  const counter = document.getElementById('userCounter');

  if (!tbody) return;

  if (counter) counter.textContent = users.length;

  if (users.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  const currentUser = getUser();
  const currentUserId = currentUser ? currentUser.id : null;

  tbody.innerHTML = users.map(function(u) {
    const roleBadge = getRoleBadge(u.role);
    const createdDate = u.created_at ? new Date(u.created_at + ' UTC').toLocaleDateString('pt-BR') : '-';

    let actions = '';
    if (currentUserId && currentUserId === u.id) {
      actions = '<span class="text-xs text-slate-400">Você</span>';
    } else {
      actions = '<div class="flex items-center justify-end gap-2">' +
        iconButtonHtml('edit', 'Editar', { 'data-action': 'edit', 'data-user-id': u.id }) +
        iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete', 'data-user-id': u.id }, 'right') +
      '</div>';
    }

    return '<tr data-user-id="' + u.id + '">' +
      '<td class="px-6 py-4 text-slate-900">' + escapeHtml(u.username) + '</td>' +
      '<td class="px-6 py-4 text-slate-900 font-medium">' + escapeHtml(u.nome) + '</td>' +
      '<td class="px-6 py-4">' + roleBadge + '</td>' +
      '<td class="hidden md:table-cell px-6 py-4 text-slate-500">' + createdDate + '</td>' +
      '<td class="px-6 py-4 text-right">' + actions + '</td>' +
      '</tr>';
  }).join('');

}

function getRoleBadge(role) {
  var colors = {
    'admin': 'bg-red-100 text-red-700',
    'supervisor': 'bg-yellow-100 text-yellow-700',
    'coordenador': 'bg-blue-100 text-blue-700',
    'cliente': 'bg-slate-100 text-slate-600',
  };
  var cls = colors[role] || 'bg-slate-100 text-slate-600';
  return '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + cls + '">' +
    escapeHtml(role.charAt(0).toUpperCase() + role.slice(1)) +
    '</span>';
}

function setupUserSearch() {
  var input = document.getElementById('userSearchInput');
  if (!input) return;

  input.addEventListener('click', function() {
    if (this.value !== '') {
      this.value = '';
      userSearch = '';
      loadUsers();
    }
  });

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      userSearch = input.value.trim();
      loadUsers();
    }, 500);
  });
}

function editUser(id) {
  window.location.hash = '#/usersForm?id=' + id;
}

async function deleteUser(id) {
  var u = users.find(function(u) { return u.id === id; });
  var userName = u ? u.nome : '';
  const confirmed = await confirmDelete('Excluir Usuário', 'Tem certeza que deseja excluir', userName);
  if (!confirmed) return;

  try {
    const response = await fetch('/app/api/index.php?route=users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (result.success) {
      showToast('Usuário excluído com sucesso', 'success');
      await loadUsers();
    } else {
      showToast(result.message || 'Erro ao excluir', 'error');
    }
  } catch {
    showToast('Erro ao excluir', 'error');
  }
}
