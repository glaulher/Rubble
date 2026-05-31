function getLpuOptionsForLocal(local) {
  if (!local || local === '' || local.toLowerCase() === 'fornecimento')
    return 'all';
  return 'check';
}

async function resolveLpuMode(local) {
  const mode = getLpuOptionsForLocal(local);
  if (mode === 'all') return LPU_OPTIONS_ALL;
  if (mode === 'check') {
    const has = await checkChiller(local);
    return has ? LPU_OPTIONS_CHILLER : LPU_OPTIONS_CLIMA;
  }
  return LPU_OPTIONS_ALL;
}

function getLpuOptions(mode) {
  if (mode === 'all') return LPU_OPTIONS_ALL;
  if (mode === 'chiller') return LPU_OPTIONS_CHILLER;
  return LPU_OPTIONS_CLIMA;
}

function updateSelectOptions(select, options, selectedValue) {
  select.innerHTML = '<option value="">Selecione...</option>';
  options.forEach(([v, t]) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = t;
    if (v === selectedValue) opt.selected = true;
    select.appendChild(opt);
  });
}

function getStatusBadge(status) {
  const color = PV_STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
  return `<span class="inline-block ${color} px-3 py-1 rounded-full text-sm font-semibold">${escapeHtml(status)}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function updatePvCounter(total, totalValor) {
  const counter = document.getElementById('pvCounter');
  const valueEl = document.getElementById('pvTotalValue');
  if (counter) counter.textContent = total || 0;
  if (valueEl) {
    const val = parseFloat(totalValor) || 0;
    valueEl.textContent = val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}

function generateCicloOptions() {
  const opts = [];
  for (let y = 2026; y <= 2036; y++) {
    for (let m = 1; m <= 12; m++) {
      opts.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

function populateStatusSelect(selectId, selected) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  PV_STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

async function loadLocals() {
  try {
    const response = await fetch('/app/api/index.php?route=locals');
    const result = await response.json();
    const items = result.data || [];

    const datalist = document.getElementById('localList');
    if (!datalist) return;

    datalist.innerHTML = '';
    items.forEach((local) => {
      const opt = document.createElement('option');
      opt.value = local;
      datalist.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar locais:', err);
  }
}

async function loadOsList() {
  try {
    const response = await fetch(
      '/app/api/index.php?route=pv&action=search-os&q='
    );
    const result = await response.json();
    const items = result.data || [];

    const datalist = document.getElementById('osList');
    if (!datalist) return;

    datalist.innerHTML = '';
    items.forEach((r) => {
      if (r.os) {
        const opt = document.createElement('option');
        opt.value = r.os;
        datalist.appendChild(opt);
      }
    });
  } catch (err) {
    console.error('Erro ao carregar lista de OS:', err);
  }
}

async function loadEquipamentos(local) {
  const select = document.getElementById('equipamentoId');
  if (!select) return;

  try {
    let url;
    if (local && local.toLowerCase() === 'fornecimento') {
      url = '/app/api/index.php?route=equipment&limit=1&equipamento=N/A';
    } else {
      url = '/app/api/index.php?route=equipment&limit=9999&offset=0';
      if (local) {
        url += `&local=${encodeURIComponent(local)}`;
      }
    }

    const response = await fetch(url);
    const result = await response.json();
    const items = result.data || [];

    select.innerHTML = '<option value="">Selecione...</option>';

    items.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.id;
      const parts = [];
      if (e.capacidade != null) parts.push(`${e.capacidade} TR`);
      if (e.localidade) parts.push(e.localidade);
      opt.textContent =
        parts.length > 0
          ? `${e.equipamento} — ${parts.join(' - ')}`
          : e.equipamento;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar equipamentos:', err);
  }
}

async function checkChiller(local) {
  try {
    const response = await fetch(
      `/app/api/index.php?route=equipment&action=check-chiller&local=${encodeURIComponent(local)}`
    );
    const result = await response.json();
    return result.data?.has_chiller || false;
  } catch (err) {
    console.error('Erro ao verificar chiller:', err);
    return false;
  }
}

async function filterEquipamentos() {
  const local = document.getElementById('local').value.trim();
  await loadEquipamentos(local || null);
  await updateAllItemLpuOptions(local);
}

function getItemRowHtml(index, data, lpuOptions) {
  const d = data || {};
  let parsedFiltro = null;
  try {
    if (d.filtro_data) parsedFiltro = JSON.parse(d.filtro_data);
  } catch (e) {}
  const opts = lpuOptions || LPU_OPTIONS_ALL;
  const lpuOptsHtml = opts
    .map(
      ([v, t]) =>
        `<option value="${v}"${d.lpu_origem === v ? ' selected' : ''}>${t}</option>`
    )
    .join('');

  return `
    <div class="item-row bg-slate-50 rounded-2xl border border-slate-200 p-4" data-item-index="${index}">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-slate-700">Item #${index + 1}</span>
        <button type="button" data-action="remove-item" data-item-index="${index}"
          class="text-red-500 hover:text-red-700 text-sm font-medium">Remover</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Fatura</label>
          <select class="item-fatura w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-index="${index}">
            <option value="">Selecione...</option>
            <option value="lpu"${d.fatura === 'lpu' ? ' selected' : ''}>LPU</option>
            <option value="flpu"${d.fatura === 'flpu' ? ' selected' : ''}>FLPU</option>
          </select>
        </div>
        <div class="item-flpu-group-${index} ${d.fatura === 'flpu' ? '' : 'hidden'}">
          <label class="block text-xs font-semibold text-slate-900 mb-1">Valor s/ BDI</label>
          <input type="number" step="0.01" class="item-valor-flpu w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value="${escapeHtml(d.valor_flpu || '')}" data-index="${index}">
        </div>
        <div class="item-flpu-group-${index} ${d.fatura === 'flpu' ? '' : 'hidden'}">
          <label class="block text-xs font-semibold text-slate-900 mb-1">BDI (%)</label>
          <input type="number" step="0.01" class="item-bdi w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value="${escapeHtml(d.bdi || '')}" data-index="${index}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">LPU Origem</label>
          <select class="item-lpu-origem w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-index="${index}" ${d.fatura === 'flpu' ? 'disabled' : ''}>
            <option value="">Selecione...</option>
            ${lpuOptsHtml}
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">N\u00ba Item</label>
          <input type="number" class="item-numero-item w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value="${escapeHtml(d.numero_item || '')}" data-index="${index}" ${d.fatura === 'flpu' ? 'disabled' : ''}>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Valor (cat\u00e1logo)</label>
          <input type="number" step="0.01" class="item-valor w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
            value="${escapeHtml(d.valor || '')}" readonly ${d.fatura === 'flpu' ? 'disabled' : ''} data-index="${index}">
        </div>
        <div class="self-stretch flex items-center gap-2">
          <label class="flex items-center gap-1 text-xs font-semibold text-slate-900 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" class="item-filter-checkbox rounded border-slate-300" data-index="${index}" ${parsedFiltro ? 'checked' : ''}>
            Filtro de Ar
          </label>
          <button type="button" class="item-filter-btn text-xs bg-sky-200 hover:bg-sky-300 text-sky-800 rounded-xl px-3 py-2 font-medium transition ${parsedFiltro ? '' : 'hidden'}" data-index="${index}">
            Calcular
          </button>
        </div>
        <div class="md:col-span-2 lg:col-span-3">
          <label class="block text-xs font-semibold text-slate-900 mb-1">Descri\u00e7\u00e3o LPU</label>
          <div class="autocomplete-wrap relative">
            <input type="text" class="item-descricao-lpu w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-index="${index}" ${d.fatura === 'flpu' ? 'disabled' : ''} value="${escapeHtml(d.descricao_lpu || '')}" autocomplete="off">
            <div class="autocomplete-dropdown absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto hidden"></div>
          </div>
        </div>
        <div class="md:col-span-2 lg:col-span-3">
          <label class="block text-xs font-semibold text-slate-900 mb-1">Descri\u00e7\u00e3o (especifica\u00e7\u00e3o)</label>
          <textarea rows="1" class="item-descricao w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            data-index="${index}">${escapeHtml(d.descricao || '')}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Quantidade</label>
          <input type="number" step="0.01" class="item-quantidade w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value="${escapeHtml(d.quantidade || '')}" data-index="${index}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Valor Total</label>
          <input type="text" class="item-valor-total w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-900"
            value="${escapeHtml(d.valor_total_formatted || '')}" readonly data-index="${index}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">SCM</label>
          <input type="text" class="item-scm w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value="${escapeHtml(d.scm || '')}" data-index="${index}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Laudo</label>
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <input type="text" maxlength="12" class="item-laudo w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value="${escapeHtml(d.laudo || 'N/A')}" data-index="${index}">
            </div>
            <button type="button" data-action="upload-report" data-item-index="${index}"
              class="bg-sky-200 hover:bg-sky-300 text-sky-800 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition">
              Upload
            </button>
          </div>
        </div>
      </div>
      <div class="item-filter-result mt-3 ${parsedFiltro ? '' : 'hidden'}" data-index="${index}">
        ${parsedFiltro ? getFilterResultHtml(parsedFiltro, index) : ''}
      </div>
      <input type="hidden" class="item-filtro-data" data-index="${index}" value="${escapeHtml(d.filtro_data || '')}">
    </div>
  `;
}

function getFilterResultHtml(filtro, index) {
  if (!filtro) return '';
  const tamanho = escapeHtml(filtro.tamanho || '');
  const qtd = filtro.qtd_pecas || 0;
  const areaPlaca = (filtro.area_placa || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const areaPlana = (filtro.area_plana_total || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const qtdCobrar = filtro.qtd_cobrar || 0;

  return `
    <div class="bg-slate-50 rounded-xl border border-slate-300 p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-700 uppercase tracking-wide">Filtro calculado</span>
        <button type="button" data-action="remove-filter" data-item-index="${index}"
          class="text-red-500 hover:text-red-700 text-xs font-medium">Remover</button>
      </div>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-slate-200">
            <th class="px-2 py-1 text-left font-semibold text-slate-800 border border-slate-300">Tamanho</th>
            <th class="px-2 py-1 text-right font-semibold text-slate-800 border border-slate-300">Pe\u00e7as</th>
            <th class="px-2 py-1 text-right font-semibold text-slate-800 border border-slate-300">\u00c1rea placa</th>
            <th class="px-2 py-1 text-right font-semibold text-slate-800 border border-slate-300">\u00c1rea total</th>
            <th class="px-2 py-1 text-right font-semibold text-slate-800 border border-slate-300">Cobrar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="px-2 py-1 border border-slate-300 text-slate-700">${tamanho}</td>
            <td class="px-2 py-1 border border-slate-300 text-right text-slate-700">${qtd}</td>
            <td class="px-2 py-1 border border-slate-300 text-right text-slate-700">${areaPlaca}</td>
            <td class="px-2 py-1 border border-slate-300 text-right text-slate-700">${areaPlana}</td>
            <td class="px-2 py-1 border border-slate-300 text-right text-slate-700 font-bold">${qtdCobrar}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function setupLpuDescriptionAutocomplete(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const input = row.querySelector('.item-descricao-lpu');
  const dropdown = row.querySelector('.autocomplete-dropdown');
  const lpuOrigemSelect = row.querySelector('.item-lpu-origem');
  const numeroItemInput = row.querySelector('.item-numero-item');
  const valorInput = row.querySelector('.item-valor');

  let activeIndex = -1;
  let items = [];

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (items.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = `${item.numero_item} - ${item.descricao}`;
      div.dataset.index = i;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove(
            'bg-sky-100',
            'text-sky-900',
            'font-medium'
          );
          dropdown.children[activeIndex].classList.add(
            'text-slate-700',
            'hover:bg-slate-100'
          );
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
        numeroItemInput.value = item.numero_item;
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.descricao;
        numeroItemInput.value = item.numero_item;
        valorInput.value = item.valor;
        hide();
        calculateItemTotal(index);
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < items.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  async function search(q) {
    const lpu = lpuOrigemSelect.value;
    if (!lpu || q.length < 2) {
      items = [];
      render();
      return;
    }
    try {
      const res = await fetch(
        `/app/api/index.php?route=pv&action=search-lpu&lpu_origem=${encodeURIComponent(lpu)}&q=${encodeURIComponent(q)}`
      );
      const result = await res.json();
      items = result.success ? result.data || [] : [];
    } catch {
      items = [];
    }
    activeIndex = -1;
    render();
  }

  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = input.value;
    if (val.length < 2) {
      items = [];
      render();
      return;
    }
    debounceTimer = setTimeout(() => search(val), 250);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      render();
      if (items[activeIndex])
        numeroItemInput.value = items[activeIndex].numero_item;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      if (items[activeIndex])
        numeroItemInput.value = items[activeIndex].numero_item;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) {
        input.value = item.descricao;
        numeroItemInput.value = item.numero_item;
        valorInput.value = item.valor;
        hide();
        calculateItemTotal(index);
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 200));

  lpuOrigemSelect.addEventListener('change', () => {
    items = [];
    hide();
  });
}

function addItemRow(data, lpuOptions) {
  const container = document.getElementById('pvItemsContainer');
  const index = pvItemCounter++;
  const options = lpuOptions || currentLpuOptions;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = getItemRowHtml(index, data || {}, options);
  const div = wrapper.firstElementChild;
  container.prepend(div);

  const lpuSelect = div.querySelector('.item-lpu-origem');
  const numeroItemInput = div.querySelector('.item-numero-item');
  const faturaSelect = div.querySelector('.item-fatura');

  lpuSelect.addEventListener('change', () => {
    lookupItemRow(index);
    faturaSelect.value = 'lpu';
    toggleItemInvoice(index);
  });
  numeroItemInput.addEventListener('change', () => lookupItemRow(index));
  faturaSelect.addEventListener('change', () => toggleItemInvoice(index));

  setupLpuDescriptionAutocomplete(index);
}

async function removeItemRow(index) {
  const confirmed = await confirmAction('Remover este item da proposta?');
  if (!confirmed) return;
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (row) row.remove();
}

function getItemData(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return null;

  const fatura = row.querySelector('.item-fatura').value;

  return {
    lpu_origem: row.querySelector('.item-lpu-origem').value || null,
    numero_item: row.querySelector('.item-numero-item').value
      ? parseInt(row.querySelector('.item-numero-item').value)
      : null,
    descricao_lpu: row.querySelector('.item-descricao-lpu').value || null,
    descricao: row.querySelector('.item-descricao').value.trim() || null,
    valor: row.querySelector('.item-valor').value
      ? parseFloat(row.querySelector('.item-valor').value)
      : null,
    quantidade: row.querySelector('.item-quantidade').value
      ? parseFloat(row.querySelector('.item-quantidade').value)
      : null,
    fatura: fatura || null,
    valor_flpu:
      fatura === 'flpu'
        ? row.querySelector('.item-valor-flpu').value
          ? parseFloat(row.querySelector('.item-valor-flpu').value)
          : null
        : null,
    bdi:
      fatura === 'flpu'
        ? row.querySelector('.item-bdi').value
          ? parseFloat(row.querySelector('.item-bdi').value)
          : null
        : null,
    scm: row.querySelector('.item-scm').value.trim() || null,
    laudo: (() => { const v = row.querySelector('.item-laudo').value.trim(); return (!v || v === 'N/A') ? null : v; })(),
    filtro_data: row.querySelector('.item-filtro-data').value || null,
  };
}

function calculateItemTotal(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const fatura = row.querySelector('.item-fatura').value;
  const quantidade =
    parseFloat(row.querySelector('.item-quantidade').value) || 0;

  let total = 0;

  if (fatura === 'flpu') {
    const valorFlpu =
      parseFloat(row.querySelector('.item-valor-flpu').value) || 0;
    const bdi = parseFloat(row.querySelector('.item-bdi').value) || 0;
    total = valorFlpu * (1 + bdi / 100) * quantidade;
  } else {
    const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
    total = valor * quantidade;
  }

  const totalEl = row.querySelector('.item-valor-total');
  totalEl.value = total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function lookupItemRow(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const lpuOrigem = row.querySelector('.item-lpu-origem').value;
  const numeroItem = row.querySelector('.item-numero-item').value;

  if (!lpuOrigem || !numeroItem) return;

  try {
    const response = await fetch(
      `/app/api/index.php?route=pv&action=lookup&lpu_origem=${encodeURIComponent(lpuOrigem)}&numero_item=${numeroItem}`
    );
    const result = await response.json();

    if (result.success && result.data) {
      row.querySelector('.item-descricao-lpu').value =
        result.data.descricao || '';
      row.querySelector('.item-valor').value = result.data.valor || 0;
    } else {
      row.querySelector('.item-descricao-lpu').value = '';
      row.querySelector('.item-valor').value = 0;
    }

    calculateItemTotal(index);
  } catch (err) {
    console.error('Erro ao buscar item LPU:', err);
  }
}

function toggleItemInvoice(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const fatura = row.querySelector('.item-fatura').value;
  const flpuGroups = row.querySelectorAll(`.item-flpu-group-${index}`);

  const lpuOrigem = row.querySelector('.item-lpu-origem');
  const numeroItem = row.querySelector('.item-numero-item');
  const descricaoLpu = row.querySelector('.item-descricao-lpu');
  const valorCatalogo = row.querySelector('.item-valor');

  if (fatura === 'flpu') {
    flpuGroups.forEach((el) => el.classList.remove('hidden'));
    lpuOrigem.disabled = true;
    lpuOrigem.value = '';
    numeroItem.disabled = true;
    numeroItem.value = '';
    descricaoLpu.disabled = true;
    descricaoLpu.value = '';
    valorCatalogo.disabled = true;
    valorCatalogo.value = 0;
  } else {
    flpuGroups.forEach((el) => el.classList.add('hidden'));
    lpuOrigem.disabled = false;
    numeroItem.disabled = false;
    descricaoLpu.disabled = false;
    valorCatalogo.disabled = false;
  }

  calculateItemTotal(index);
}

async function updateAllItemLpuOptions(local) {
  currentLpuOptions = await resolveLpuMode(local);
  document.querySelectorAll('.item-row').forEach((row) => {
    const select = row.querySelector('.item-lpu-origem');
    updateSelectOptions(select, currentLpuOptions, select.value);
  });
}

async function updateHeaderTotal() {
  const search = pvSearch || '';
  const status = pvStatusFilter || '';
  const cycle = pvCycleFilter || '';
  try {
    const response = await fetch(
      `/app/api/index.php?route=pv&limit=1&offset=0&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&ciclo=${encodeURIComponent(cycle)}&count_only=1`
    );
    const result = await response.json();
    updatePvCounter(result.total, result.total_valor);
  } catch (err) {
    console.error('Erro ao atualizar header:', err);
  }
}

async function uploadReportFile(index) {
  uploadFile({
    accept: '.pdf',
    uploadType: 'laudo',
    onSuccess(filename) {
      const laudoInput = document.querySelector(
        `.item-row[data-item-index="${index}"] .item-laudo`
      );
      if (laudoInput) {
        laudoInput.value = filename;
      }
      showToast('Laudo anexado: ' + filename, 'success');
    },
    onError(msg) {
      showToast(msg, 'error');
    },
  });
}

/*
|--------------------------------------------------------------------------
| FILTRO (cálculo de filtro para itens PV)
|--------------------------------------------------------------------------
*/

function toggleFilterButton(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;
  const checkbox = row.querySelector('.item-filter-checkbox');
  const btn = row.querySelector('.item-filter-btn');
  if (checkbox.checked) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

let currentFilterIndex = null;

function openFilterModal(index) {
  currentFilterIndex = index;
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;
  const hiddenInput = row.querySelector('.item-filtro-data');
  let filtro = null;
  try {
    if (hiddenInput.value) filtro = JSON.parse(hiddenInput.value);
  } catch (e) {}

  document.getElementById('filterTamanho').value = filtro
    ? filtro.tamanho || ''
    : '';
  document.getElementById('filterQuantidadePecas').value = filtro
    ? filtro.qtd_pecas || ''
    : '';
  calculateFilter();
  showModal('filterModal');
}

function closeFilterModal() {
  currentFilterIndex = null;
  hideModal('filterModal');
}

function calculateFilter() {
  const tamanhoRaw = document.getElementById('filterTamanho').value.trim();
  const qtdPecas =
    parseInt(document.getElementById('filterQuantidadePecas').value) || 0;

  const elTamanho = document.getElementById('filterResultTamanho');
  const elQtd = document.getElementById('filterResultQtdPecas');
  const elArea = document.getElementById('filterResultAreaPlaca');
  const elAreaTotal = document.getElementById('filterResultAreaPlana');
  const elCobrar = document.getElementById('filterResultQtdCobrar');

  if (!tamanhoRaw || qtdPecas <= 0) {
    elTamanho.textContent = '-';
    elQtd.textContent = '-';
    elArea.textContent = '-';
    elAreaTotal.textContent = '-';
    elCobrar.textContent = '-';
    return;
  }

  const match = tamanhoRaw.replace(/\s/g, '').match(/^(\d+)[xX](\d+)/);
  if (!match) {
    elTamanho.textContent = tamanhoRaw;
    elQtd.textContent = qtdPecas;
    elArea.textContent = 'Formato inv\u00e1lido';
    elAreaTotal.textContent = '-';
    elCobrar.textContent = '-';
    return;
  }

  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  const tamanho = width + 'x' + height + 'mm';

  const areaPlaca = (width / 1000) * (height / 1000);
  const areaPlanaTotal = areaPlaca * qtdPecas;
  const qtdCobrar = Math.round(areaPlanaTotal * 2);

  elTamanho.textContent = tamanho;
  elQtd.textContent = qtdPecas;
  elArea.textContent = areaPlaca.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  elAreaTotal.textContent = areaPlanaTotal.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  elCobrar.textContent = qtdCobrar;
}

function saveFilterData() {
  if (currentFilterIndex === null) return;
  const row = document.querySelector(
    `.item-row[data-item-index="${currentFilterIndex}"]`
  );
  if (!row) return;

  const tamanhoRaw = document.getElementById('filterTamanho').value.trim();
  const qtdPecas =
    parseInt(document.getElementById('filterQuantidadePecas').value) || 0;
  const match = tamanhoRaw.replace(/\s/g, '').match(/^(\d+)[xX](\d+)/);

  if (!match || qtdPecas <= 0) {
    showToast(
      'Preencha o tamanho do filtro e a quantidade de pe\u00e7as',
      'error'
    );
    return;
  }

  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  const tamanho = width + 'x' + height + 'mm';
  const areaPlaca = (width / 1000) * (height / 1000);
  const areaPlanaTotal = areaPlaca * qtdPecas;
  const qtdCobrar = Math.round(areaPlanaTotal * 2);

  const filtroData = JSON.stringify({
    tamanho: tamanho,
    qtd_pecas: qtdPecas,
    area_placa: parseFloat(areaPlaca.toFixed(4)),
    area_plana_total: parseFloat(areaPlanaTotal.toFixed(4)),
    qtd_cobrar: qtdCobrar,
  });

  const hiddenInput = row.querySelector('.item-filtro-data');
  hiddenInput.value = filtroData;

  const resultDiv = row.querySelector('.item-filter-result');
  resultDiv.innerHTML = getFilterResultHtml(
    JSON.parse(filtroData),
    currentFilterIndex
  );
  resultDiv.classList.remove('hidden');

  const checkbox = row.querySelector('.item-filter-checkbox');
  checkbox.checked = true;

  const btn = row.querySelector('.item-filter-btn');
  btn.classList.remove('hidden');

  closeFilterModal();
  showToast('Filtro calculado e salvo no item', 'success');
}

async function removeFilterData(index) {
  const confirmed = await confirmAction(
    'Remover o c\u00e1lculo de filtro deste item?'
  );
  if (!confirmed) return;

  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const hiddenInput = row.querySelector('.item-filtro-data');
  hiddenInput.value = '';

  const resultDiv = row.querySelector('.item-filter-result');
  resultDiv.innerHTML = '';
  resultDiv.classList.add('hidden');

  const checkbox = row.querySelector('.item-filter-checkbox');
  checkbox.checked = false;

  const btn = row.querySelector('.item-filter-btn');
  btn.classList.add('hidden');

  showToast('Filtro removido do item', 'success');
}
