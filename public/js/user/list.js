let users = [];
let userSearch = '';

async function initUsers() {
  userSearch = '';
  const input = document.getElementById('userSearchInput');
  if (input) input.value = '';
  await loadUsers();
  setupUserSearch();
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
        '<div class="relative group">' +
          '<button data-action="edit" data-user-id="' + u.id + '" class="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-xl transition">' +
            '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
            '</svg>' +
          '</button>' +
          '<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Editar</span>' +
        '</div>' +
        '<div class="relative group">' +
          '<button data-action="delete" data-user-id="' + u.id + '" class="bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition">' +
            '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="3 6 5 6 21 6"></polyline>' +
              '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
            '</svg>' +
          '</button>' +
          '<span class="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 origin-bottom-right transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Excluir</span>' +
        '</div>' +
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

  tbody.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
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
  const confirmed = await confirmAction('Tem certeza que deseja excluir este usuário?');
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
