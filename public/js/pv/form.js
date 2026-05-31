async function loadPvForm() {
  const form = document.getElementById('pvForm');
  if (!form) return;

  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    currentDateEl.textContent = new Date().toLocaleDateString('pt-BR');
  }

  const cicloList = document.getElementById('cicloList');
  if (cicloList) {
    generateCicloOptions().forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      cicloList.appendChild(opt);
    });
  }

  const hash = window.location.hash;
  const queryString = hash.split('?')[1];
  const params = new URLSearchParams(queryString);
  const editId = params.get('id');

  resetForm();

  if (editId) {
    document.getElementById('formTitle').textContent = 'Editar PV';
    document.getElementById('buttonText').textContent = 'Atualizar PV';
    document.getElementById('numeroPvGroup').classList.remove('hidden');

    try {
      const response = await fetch(`/app/api/index.php?route=pv&id=${editId}`);
      const result = await response.json();

      if (!result.success || !result.data) {
        showToast('Erro ao carregar PV', 'error');
        return;
      }

      const pv = result.data;

      document.getElementById('pvId').value = pv.id;
      document.getElementById('numeroPv').value = pv.numero_pv || '';
      document.getElementById('numeroPv').placeholder = pv.numero_pv || 'Auto';
      document.getElementById('numeroPvHint').textContent = 'Nº PV definido, não é alterado na edição';
      document.getElementById('data').value = pv.data || '';
      document.getElementById('ciclo').value = pv.ciclo || '';
      document.getElementById('local').value = pv.local || '';
      document.getElementById('ral').value = pv.ral || '';
      document.getElementById('os').value = pv.os || '';

      populateStatusSelect('status', pv.status);

      await Promise.all([loadLocals(), loadOsList()]);
      await loadEquipamentos(pv.local || null);
      if (pv.equipamento_id) {
        document.getElementById('equipamentoId').value = pv.equipamento_id;
      }

      const lpuOptions = await resolveLpuMode(pv.local || '');

      if (pv.itens && pv.itens.length > 0) {
        pv.itens.forEach((item) => {
          const rawTotal = parseFloat(item.valor_total) || 0;
          item.valor_total_formatted = rawTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          addItemRow(item, lpuOptions);
          if (item.fatura === 'flpu') {
            const lastIndex = pvItemCounter - 1;
            toggleItemInvoice(lastIndex);
            calculateItemTotal(lastIndex);
          }
        });
      } else {
        addItemRow(lpuOptions);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar PV', 'error');
    }
  } else {
    populateStatusSelect('status');
    await Promise.all([loadLocals(), loadEquipamentos(), loadOsList()]);
    addItemRow(LPU_OPTIONS_ALL);
  }

  const cicloInput = document.getElementById('ciclo');
  if (cicloInput) {
    cicloInput.addEventListener('blur', function () {
      const match = this.value.trim().match(/^(\d{4})-(\d)$/);
      if (match) {
        this.value = match[1] + '-0' + match[2];
      }
    });
  }

  setupItemRowDelegation();

  if (form._submitController) {
    form._submitController.abort();
  }
  form._submitController = new AbortController();
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    await savePvForm();
  }, { signal: form._submitController.signal });
}

function resetForm() {
  document.getElementById('pvId').value = '';
  document.getElementById('numeroPv').value = '';
  document.getElementById('numeroPv').placeholder = 'Auto';
  document.getElementById('numeroPvHint').textContent = 'Gerado automaticamente ao salvar';
  document.getElementById('numeroPvGroup').classList.add('hidden');
  document.getElementById('data').value = '';
  document.getElementById('ciclo').value = '';
  document.getElementById('local').value = '';
  document.getElementById('os').value = '';
  document.getElementById('ral').value = '';
  document.getElementById('equipamentoId').value = '';

  const container = document.getElementById('pvItemsContainer');
  container.innerHTML = '';

  pvItemCounter = 0;

  document.getElementById('buttonText').textContent = 'Salvar PV';
  document.getElementById('formTitle').textContent = 'Nova PV';
}

function getFormData() {
  const itemRows = document.querySelectorAll('.item-row');
  const itens = [];

  itemRows.forEach((row) => {
    const index = parseInt(row.dataset.itemIndex);
    const data = getItemData(index);
    if (data) itens.push(data);
  });

  return {
    id: document.getElementById('pvId').value || null,
    numero_pv: document.getElementById('numeroPv').value,
    data: document.getElementById('data').value || null,
    ciclo: document.getElementById('ciclo').value || null,
    local: document.getElementById('local').value.trim(),
    status: document.getElementById('status').value,
    os: document.getElementById('os').value.trim(),
    ral: document.getElementById('ral').value.trim(),
    equipamento_id: document.getElementById('equipamentoId').value,
    itens,
  };
}

async function savePvForm() {
  const data = getFormData();

  if (!data.local) {
    showToast('Informe o local', 'error');
    return;
  }

  if (!data.status) {
    showToast('Selecione o status', 'error');
    return;
  }

  if (data.ciclo && !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.ciclo)) {
    showToast('Formato de ciclo inv\u00e1lido. Use AAAA-MM (ex: 2026-06)', 'error');
    return;
  }

  if (!data.os) {
    showToast('Informe pelo menos uma OS', 'error');
    return;
  }

  const osList = data.os.split(',').map(s => s.trim()).filter(s => s);
  for (const os of osList) {
    if (!/^\d{4,7}$/.test(os)) {
      showToast(`OS "${os}" tem formato inválido. Use apenas números (4 a 7 dígitos)`, 'error');
      return;
    }
  }

  if (!data.itens || data.itens.length === 0) {
    showToast('Adicione pelo menos um item', 'error');
    return;
  }

  for (const item of data.itens) {
    if (!item.fatura) {
      showToast('Selecione o tipo de fatura para todos os itens', 'error');
      return;
    }
    if (!item.quantidade || item.quantidade <= 0) {
      showToast('Informe a quantidade para todos os itens', 'error');
      return;
    }

    if (item.fatura === 'lpu') {
      if (!item.lpu_origem) {
        showToast('Selecione a LPU Origem para todos os itens LPU', 'error');
        return;
      }
      if (!item.numero_item || item.numero_item <= 0) {
        showToast('Informe o N\u00ba Item para todos os itens LPU', 'error');
        return;
      }
      if (!item.descricao_lpu) {
        showToast(`Item LPU n\u00e3o encontrado na base (item #${data.itens.indexOf(item) + 1})`, 'error');
        return;
      }
    }
  }

  try {
    const response = await fetch('/app/api/index.php?route=pv', {
      method: data.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast(result.message, 'success');

    setTimeout(() => {
      window.location.hash = '#/pv';
    }, 800);
  } catch {
    showToast('Erro ao salvar PV', 'error');
  }
}

function uploadOsFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf';
  input.multiple = true;
  input.onchange = async function () {
    const files = this.files;
    if (!files || files.length === 0) return;
    const osField = document.getElementById('os');
    const names = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'os');
      let res;
      try {
        res = await fetch('/app/api/index.php?route=pv&action=upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          names.push(data.data.filename);
        } else {
          showToast(file.name + ': ' + data.message, 'error');
        }
      } catch (e) {
        console.error('Upload error:', e);
        if (res) {
          const text = await res.text().catch(() => '');
          console.error('Response body:', text);
        }
        showToast('Erro de conexao ao enviar ' + file.name, 'error');
      }
    }
    if (names.length > 0) {
      osField.value = names.join(', ');
      showToast(names.length + ' OS anexada(s)', 'success');
    }
  };
  input.click();
}

function setupItemRowDelegation() {
  var container = document.getElementById('pvItemsContainer');
  if (!container) return;

  container.addEventListener('click', function (e) {
    var target = e.target;
    var action = target.getAttribute('data-action');
    var itemIndex = target.getAttribute('data-item-index');
    if (itemIndex === null) itemIndex = target.getAttribute('data-index');

    if (action === 'remove-item') {
      if (itemIndex !== null) removeItemRow(parseInt(itemIndex));
    } else if (action === 'upload-report') {
      if (itemIndex !== null) uploadReportFile(parseInt(itemIndex));
    } else if (action === 'remove-filter') {
      if (itemIndex !== null) removeFilterData(parseInt(itemIndex));
    } else if (target.classList.contains('item-filter-btn')) {
      var idx = target.getAttribute('data-index');
      if (idx !== null) openFilterModal(parseInt(idx));
    }
  });

  container.addEventListener('change', function (e) {
    var target = e.target;
    if (target.classList.contains('item-fatura')) {
      var idx = target.getAttribute('data-index');
      if (idx !== null) toggleItemInvoice(parseInt(idx));
    } else if (target.classList.contains('item-filter-checkbox')) {
      var idx = target.getAttribute('data-index');
      if (idx !== null) toggleFilterButton(parseInt(idx));
    }
  });

  container.addEventListener('input', function (e) {
    var target = e.target;
    if (target.classList.contains('item-valor-flpu') ||
        target.classList.contains('item-bdi') ||
        target.classList.contains('item-quantidade')) {
      var idx = target.getAttribute('data-index');
      if (idx !== null) calculateItemTotal(parseInt(idx));
    }
  });
}
