let prices = [];
let priceToDelete = null;

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
          <button onclick="editPrice(${p.id})"
            class="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-xl transition" title="Editar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onclick="confirmDeletePrice(${p.id})"
            class="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-xl transition" title="Excluir">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editPrice(id) {
  window.location.hash = `#/equipment-prices-form?id=${id}`;
}

function confirmDeletePrice(id) {
  priceToDelete = id;
  const price = prices.find(p => p.id === id);
  if (!price) return;

  showMessageBox(
    `Deseja excluir a regra "${price.nome}"?`,
    'Excluir Preço',
    () => deletePrice(id),
    () => { priceToDelete = null; }
  );
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
    ?.addEventListener('click', () => {
      window.location.hash = '#/equipment-prices-form';
    });
}
