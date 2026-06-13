let prices = [];

async function loadPrices() {
  try {
    const response = await fetch('/app/api/index.php?route=equipment-prices');
    const result = await response.json();

    if (result.success) {
      prices = result.data || [];
      renderPrices();
    }
  } catch (error) {
    console.error('Erro ao carregar preços:', error);
  }
}

function renderPrices() {
  const tbody = document.getElementById('priceTableBody');
  const counter = document.getElementById('priceCounter');
  const empty = document.getElementById('priceEmpty');

  if (!tbody) return;

  if (prices.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (counter) counter.textContent = '0';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (counter) counter.textContent = prices.length;

  tbody.innerHTML = prices.map(p => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-6 py-4">
        <span class="font-medium text-slate-900">${escapeHtml(p.nome)}</span>
      </td>
      <td class="px-6 py-4 text-slate-600">
        ${p.equipamento_pattern ? escapeHtml(p.equipamento_pattern) : '<span class="text-slate-400">—</span>'}
      </td>
      <td class="px-6 py-4 text-slate-600">
        ${p.locais_especiais ? escapeHtml(p.locais_especiais) : '<span class="text-slate-400">—</span>'}
      </td>
      <td class="px-6 py-4 text-slate-600">
        ${p.mercado ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">${escapeHtml(p.mercado)}</span>` : '<span class="text-slate-400">Todos</span>'}
      </td>
      <td class="px-6 py-4 text-right font-medium text-slate-900">
        R$ ${p.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
      </td>
      <td class="px-6 py-4 text-center">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
          ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
          ${p.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end gap-2">
          ${iconButtonHtml('edit', 'Editar', { 'data-action': 'edit', 'data-price-id': p.id })}
          ${iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete', 'data-price-id': p.id }, 'right')}
        </div>
      </td>
    </tr>
  `).join('');
}

function editPrice(id) {
  window.location.hash = '#/equipment-prices-form?id=' + id;
}

async function confirmDeletePrice(id) {
  const price = prices.find(p => p.id === id);
  if (!price) return;

  const confirmed = await confirmDelete('Excluir Preço', 'Tem certeza que deseja excluir a regra', price.nome);
  if (confirmed) deletePrice(id);
}

async function deletePrice(id) {
  try {
    const response = await fetch(`/app/api/index.php?route=equipment-prices&id=${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      showToast('Preço excluído com sucesso', 'success');
      loadPrices();
    } else {
      showToast(result.message || 'Erro ao excluir', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir preço', 'error');
  }
}

function initPriceList() {
  loadPrices();

  document.querySelector('[data-action="navigate-price-form"]')
    ?.removeEventListener('click', navigatePriceFormHandler);
  document.querySelector('[data-action="navigate-price-form"]')
    ?.addEventListener('click', navigatePriceFormHandler);

  var tbody = document.getElementById('priceTableBody');
  if (tbody && !tbody._listenerAttached) {
    tbody._listenerAttached = true;
    tbody.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var priceId = parseInt(btn.getAttribute('data-price-id'));
      if (action === 'edit' && priceId) editPrice(priceId);
      if (action === 'delete' && priceId) confirmDeletePrice(priceId);
    });
  }
}

function navigatePriceFormHandler() { window.location.hash = '#/equipment-prices-form'; }
