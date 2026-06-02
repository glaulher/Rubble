let pvEmailBatchIds = null;
let pvEmailBatchUf = null;

function openDeleteModal(id, pvNumber) {
  document.getElementById('deletePvId').value = id;
  document.getElementById('deletePvNumber').textContent = pvNumber;
  showModal('deleteModal');
}

function closeDeleteModal() {
  hideModal('deleteModal');
}

async function confirmDelete() {
  const id = document.getElementById('deletePvId').value;
  closeDeleteModal();

  try {
    const response = await fetch('/app/api/index.php?route=pv', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast(result.message, 'success');

    const row = document.querySelector(`tr[data-pv-id="${id}"]`);
    if (row) row.remove();

    pvList = pvList.filter(p => p.id != id);

    updateHeaderTotal();
  } catch (err) {
    console.error(err);
    showToast('Erro ao excluir PV', 'error');
  }
}

async function deletePv(id) {
  try {
    const response = await fetch('/app/api/index.php?route=pv&id=' + id);
    const result = await response.json();
    const numeroPv = result.success && result.data ? result.data.numero_pv : id;
    openDeleteModal(id, numeroPv);
  } catch {
    openDeleteModal(id, id);
  }
}

function openStatusModal(id, pvNumber) {
  document.getElementById('statusPvId').value = id;
  document.getElementById('statusPvNumber').textContent = pvNumber;
  populateStatusSelect('statusSelect', '');
  showModal('statusModal');
}

function closeStatusModal() {
  hideModal('statusModal');
}

async function confirmStatusChange() {
  const pvId = document.getElementById('statusPvId').value;
  const status = document.getElementById('statusSelect').value;

  if (!status) {
    showToast('Selecione um status', 'error');
    return;
  }

  try {
    const response = await fetch('/app/api/index.php?route=pv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pv_id: parseInt(pvId), status }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast(result.message, 'success');
    closeStatusModal();
    resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
    await loadPvs();
  } catch (err) {
    console.error(err);
    showToast('Erro ao alterar status', 'error');
  }
}

async function openPvItemModal(id) {
  try {
    const response = await fetch(`/app/api/index.php?route=pv&id=${id}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      showToast('Erro ao carregar PV', 'error');
      return;
    }

    const pv = result.data;
    const itens = pv.itens || [];

    document.getElementById('pvItemModalNumero').textContent = pv.numero_pv || '';
    document.getElementById('pvItemModalSubtitle').textContent =
      `${escapeHtml(pv.local || '')}${pv.equipamento ? ' — ' + escapeHtml(pv.equipamento) : ''}`;

    const tbody = document.getElementById('pvItemModalBody');
    tbody.innerHTML = '';

    let totalGeral = 0;

    itens.forEach((item) => {
      const valor = parseFloat(item.valor) || 0;
      const quantidade = parseFloat(item.quantidade) || 0;
      const valorTotal = parseFloat(item.valor_total) || 0;
      totalGeral += valorTotal;

      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100';
      const lpuLabel = item.lpu_origem
        ? item.lpu_origem.replace('lpu_', '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '-';
      tr.innerHTML = `
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(lpuLabel)}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${item.numero_item || '-'}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.descricao_lpu || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.descricao || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td class="flpu-col px-3 py-3 text-sm text-slate-700">${item.valor_flpu != null ? parseFloat(item.valor_flpu).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
        <td class="flpu-col px-3 py-3 text-sm text-slate-700">${item.bdi != null ? item.bdi + '%' : '-'}</td>
        <td class="px-3 py-3 text-sm text-slate-700 laudo-col hidden">${escapeHtml(item.laudo || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${quantidade}</td>
        <td class="px-3 py-3 text-sm text-right font-medium text-slate-900">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('pvItemModalTotal').textContent =
      totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const hasLaudo = itens.some(item => item.laudo && item.laudo !== 'N/A');
    document.querySelectorAll('.laudo-col').forEach((el) => {
      if (hasLaudo) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    const hasFlpu = itens.some(item => item.fatura === 'flpu');
    document.querySelectorAll('.flpu-col').forEach((el) => {
      if (hasFlpu) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    pvEmailPvId = pv.id;
    pvEmailPvData = pv;

    showModal('pvItemModal');
  } catch (err) {
    console.error(err);
    showToast('Erro ao carregar itens', 'error');
  }
}

function closePvItemModal() {
  hideModal('pvItemModal');
}
