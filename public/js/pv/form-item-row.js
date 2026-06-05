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

  const unit = d.unidade || '';
  const qtyAttrs = getQuantityAttrs(unit);

  const itemStatus = d.status || 'Aguardando envio';

  return `
    <div class="item-row bg-slate-50 rounded-2xl border border-slate-200 p-4" data-item-index="${index}" data-unit="${escapeHtml(unit)}">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-slate-700">Item #${index + 1}</span>
        <button type="button" data-action="remove-item" data-item-index="${index}"
          class="text-red-500 hover:text-red-700 text-sm font-medium">Remover</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-900 mb-1">Status</label>
          <div class="autocomplete-wrap relative">
            <input type="text" class="item-status w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-index="${index}" value="${escapeHtml(itemStatus)}" autocomplete="off">
            <div class="status-dropdown autocomplete-dropdown absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto hidden"></div>
          </div>
        </div>
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
          <input type="number" ${qtyAttrs} class="item-quantidade w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
        <div class="item-orcamento-group-${index} ${d.fatura === 'flpu' ? '' : 'hidden'}">
          <label class="block text-xs font-semibold text-slate-900 mb-1">Or\u00e7amento</label>
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <input type="text" maxlength="250" class="item-orcamento w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value="${escapeHtml(d.orcamento || '')}" data-index="${index}"
                placeholder="Arquivos separados por v\u00edrgula">
            </div>
            <button type="button" data-action="upload-orcamento" data-item-index="${index}"
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
  setupStatusAutocomplete(index);
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
    status: (() => { const v = row.querySelector('.item-status')?.value?.trim(); return PV_STATUSES.includes(v) ? v : 'Aguardando envio'; })(),
    orcamento: (() => { const v = row.querySelector('.item-orcamento')?.value?.trim(); return v || null; })(),
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
      updateItemUnit(row, result.data.unidade);
    } else {
      row.querySelector('.item-descricao-lpu').value = '';
      row.querySelector('.item-valor').value = 0;
      updateItemUnit(row, '');
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
  const orcamentoGroup = row.querySelector(`.item-orcamento-group-${index}`);

  const lpuOrigem = row.querySelector('.item-lpu-origem');
  const numeroItem = row.querySelector('.item-numero-item');
  const descricaoLpu = row.querySelector('.item-descricao-lpu');
  const valorCatalogo = row.querySelector('.item-valor');

  if (fatura === 'flpu') {
    flpuGroups.forEach((el) => el.classList.remove('hidden'));
    if (orcamentoGroup) orcamentoGroup.classList.remove('hidden');
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
    if (orcamentoGroup) orcamentoGroup.classList.add('hidden');
    lpuOrigem.disabled = false;
    numeroItem.disabled = false;
    descricaoLpu.disabled = false;
    valorCatalogo.disabled = false;
  }

  calculateItemTotal(index);
}
