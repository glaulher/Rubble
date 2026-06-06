async function loadUserForm() {
  const form = document.getElementById('userForm');
  if (!form) return;

  const hash = window.location.hash;
  const queryString = hash.split('?')[1];
  const params = new URLSearchParams(queryString);
  const editId = params.get('id');

  document.getElementById('userId').value = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userNome').value = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').value = '';

  if (editId) {
    document.getElementById('userFormTitle').textContent = 'Editar Usuário';
    document.getElementById('userFormSubmit').textContent = 'Atualizar';

    try {
      const response = await fetch('/app/api/index.php?route=users&id=' + editId);
      const result = await response.json();

      if (!result.success || !result.data) {
        showToast('Erro ao carregar usuário', 'error');
        return;
      }

      const user = result.data;
      document.getElementById('userId').value = user.id;
      document.getElementById('userUsername').value = user.username || '';
      document.getElementById('userNome').value = user.nome || '';
      document.getElementById('userRole').value = user.role || '';
    } catch (e) {
      showToast('Erro ao carregar usuário', 'error');
      return;
    }
  }

  document.querySelector('[data-action="navigate-users"]')
    ?.addEventListener('click', function () { window.location.hash = '#/users'; });

  form.addEventListener('submit', saveUserForm);
}

function saveUserForm(e) {
  e.preventDefault();

  const id = document.getElementById('userId').value;
  const username = document.getElementById('userUsername').value.trim();
  const nome = document.getElementById('userNome').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;

  if (!username) { showToast('Informe o e-mail', 'error'); return; }
  if (!nome) { showToast('Informe o nome', 'error'); return; }
  if (!password || password.length < 6) { showToast('Senha deve ter no mínimo 6 caracteres', 'error'); return; }

  var passwordConfirm = document.getElementById('userPasswordConfirm').value;
  if (password !== passwordConfirm) { showToast('Senhas não conferem', 'error'); return; }

  if (!role) { showToast('Selecione a permissão', 'error'); return; }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    showToast('Informe um e-mail válido', 'error');
    return;
  }

  var method = id ? 'PUT' : 'POST';
  var body = { username: username, nome: nome, password: password, role: role };
  if (id) body.id = parseInt(id);

  fetch('/app/api/index.php?route=users', {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      showToast(id ? 'Usuário atualizado com sucesso' : 'Usuário cadastrado com sucesso', 'success');
      window.location.hash = '#/users';
    } else {
      showToast(result.message || 'Erro ao salvar', 'error');
    }
  })
  .catch(function() {
    showToast('Erro ao salvar', 'error');
  });
}
