async function loadEquipmentForm() {
  const form = document.getElementById('equipmentForm');
  if (!form) return;

  const hash = window.location.hash;
  const queryString = hash.split('?')[1];
  const params = new URLSearchParams(queryString);
  const editId = params.get('id');

  document.getElementById('equipmentId').value = '';
  document.getElementById('eqEquipamento').value = '';
  document.getElementById('eqCapacidade').value = '';
  document.getElementById('eqLocal').value = '';
  document.getElementById('eqLocalidade').value = '';
  document.getElementById('eqLocalEndereco').value = '';
  document.getElementById('eqEndereco').value = '';
  document.getElementById('eqUf').value = '';
  document.getElementById('mercado').value = '';

  if (editId) {
    document.getElementById('equipmentFormTitle').textContent = 'Editar Equipamento';
    document.getElementById('equipmentFormSubmit').textContent = 'Atualizar';

    try {
      const response = await fetch('/app/api/index.php?route=equipment-management&id=' + editId);
      const result = await response.json();

      if (!result.success || !result.data) {
        showToast('Erro ao carregar equipamento', 'error');
        return;
      }

      const eq = result.data;
      document.getElementById('equipmentId').value = eq.id;
      document.getElementById('eqEquipamento').value = eq.equipamento || '';
      document.getElementById('eqCapacidade').value = eq.capacidade || '';
      document.getElementById('eqLocal').value = eq.local || '';
      document.getElementById('eqLocalidade').value = eq.localidade || '';
      document.getElementById('eqLocalEndereco').value = eq.local_do_endereco || '';
      document.getElementById('eqEndereco').value = eq.endereco_completo || '';
      document.getElementById('eqUf').value = eq.uf || '';
      document.getElementById('mercado').value = eq.mercado || '';
    } catch (e) {
      showToast('Erro ao carregar equipamento', 'error');
      return;
    }
  }

  form.removeEventListener('submit', saveEquipmentForm);
  form.addEventListener('submit', saveEquipmentForm);
}

function saveEquipmentForm(e) {
  e.preventDefault();

  const id = document.getElementById('equipmentId').value;
  const equipamento = document.getElementById('eqEquipamento').value.trim();
  const capacidade = document.getElementById('eqCapacidade').value.trim();
  const local = document.getElementById('eqLocal').value.trim();
  const localidade = document.getElementById('eqLocalidade').value.trim();
  const localEndereco = document.getElementById('eqLocalEndereco').value.trim();
  const endereco = document.getElementById('eqEndereco').value.trim();
  const uf = document.getElementById('eqUf').value.trim().toUpperCase();
  const mercado = document.getElementById('mercado').value;

  if (!equipamento) { showToast('Informe o equipamento', 'error'); return; }
  if (!local) { showToast('Informe o local', 'error'); return; }
  if (!localidade) { showToast('Informe a localidade', 'error'); return; }
  if (!localEndereco) { showToast('Informe o local do endereço', 'error'); return; }
  if (!endereco) { showToast('Informe o endereço', 'error'); return; }
  if (!uf || uf.length !== 2) { showToast('Informe a UF (2 caracteres)', 'error'); return; }
  if (!mercado) { showToast('Informe o mercado', 'error'); return; }

  var method = id ? 'PUT' : 'POST';
  var body = {
    equipamento: equipamento,
    capacidade: capacidade ? parseFloat(capacidade) : null,
    local: local,
    localidade: localidade,
    local_do_endereco: localEndereco,
    endereco: endereco,
    uf: uf,
    mercado: mercado,
  };
  if (id) body.id = parseInt(id);

  fetch('/app/api/index.php?route=equipment-management', {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      showToast(id ? 'Equipamento atualizado com sucesso' : 'Equipamento cadastrado com sucesso', 'success');
      window.location.hash = '#/equipment-manager';
    } else {
      showToast(result.message || 'Erro ao salvar', 'error');
    }
  })
  .catch(function() {
    showToast('Erro ao salvar', 'error');
  });
}
