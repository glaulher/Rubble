let currentPrice = null;
let isEditMode = false;

async function loadPriceForm() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const id = params.get('id');

  if (id) {
    isEditMode = true;
    currentPrice = await fetchPrice(id);

    if (!currentPrice) {
      showToast('Preço não encontrado', 'error');
      window.location.hash = '#/equipment-prices';
      return;
    }

    document.getElementById('formTitle').textContent = 'Editar Preço';
    document.getElementById('priceId').value = currentPrice.id;
    document.getElementById('priceNome').value = currentPrice.nome;
    document.getElementById('pricePattern').value = currentPrice.equipamento_pattern || '';
    document.getElementById('priceLocais').value = currentPrice.locais_especiais || '';
    document.getElementById('priceMercado').value = currentPrice.mercado || '';
    document.getElementById('priceValor').value = currentPrice.valor;
    document.getElementById('priceAtivo').value = currentPrice.ativo ? '1' : '0';
  } else {
    isEditMode = false;
    document.getElementById('formTitle').textContent = 'Novo Preço';
  }
}

async function fetchPrice(id) {
  try {
    const response = await fetch(`/app/api/index.php?route=equipment-prices&id=${id}`);
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Erro ao carregar preço:', error);
    return null;
  }
}

async function savePrice(e) {
  e.preventDefault();

  const id = document.getElementById('priceId').value;
  const data = {
    nome: document.getElementById('priceNome').value,
    equipamento_pattern: document.getElementById('pricePattern').value || null,
    locais_especiais: document.getElementById('priceLocais').value || null,
    mercado: document.getElementById('priceMercado').value || null,
    valor: parseFloat(document.getElementById('priceValor').value),
    ativo: parseInt(document.getElementById('priceAtivo').value),
  };

  if (!data.nome) {
    showToast('Nome é obrigatório', 'error');
    return;
  }

  if (isNaN(data.valor) || data.valor < 0) {
    showToast('Valor deve ser maior ou igual a zero', 'error');
    return;
  }

  try {
    const url = isEditMode
      ? `/app/api/index.php?route=equipment-prices&id=${id}`
      : '/app/api/index.php?route=equipment-prices';

    const response = await fetch(url, {
      method: isEditMode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showToast(isEditMode ? 'Preço atualizado com sucesso' : 'Preço criado com sucesso', 'success');
      window.location.hash = '#/equipment-prices';
    } else {
      showToast(result.message || 'Erro ao salvar', 'error');
    }
  } catch (error) {
    showToast('Erro ao salvar preço', 'error');
  }
}

function initPriceForm() {
  loadPriceForm();

  document.getElementById('priceForm')
    ?.addEventListener('submit', savePrice);
}
