import { showToast, confirmAction, showModal, hideModal } from '/public/js/core/dom.js';
import { getFilterResultHtml } from './form-item-row.js';

export function toggleFilterButton(index) {
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

export function openFilterModal(index) {
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

export function closeFilterModal() {
  currentFilterIndex = null;
  hideModal('filterModal');
}

export function calculateFilter() {
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
  const qtdCobrar = Math.max(1, Math.round(areaPlanaTotal * 2));

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

export function saveFilterData() {
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
  const qtdCobrar = Math.max(1, Math.round(areaPlanaTotal * 2));

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

export async function removeFilterData(index) {
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

if (typeof globalThis !== 'undefined') {
  globalThis.toggleFilterButton = toggleFilterButton;
  globalThis.openFilterModal = openFilterModal;
  globalThis.closeFilterModal = closeFilterModal;
  globalThis.calculateFilter = calculateFilter;
  globalThis.saveFilterData = saveFilterData;
  globalThis.removeFilterData = removeFilterData;
  Object.defineProperty(globalThis, 'currentFilterIndex', {
    get: function () { return currentFilterIndex; },
    set: function (v) { currentFilterIndex = v; },
    configurable: true,
  });
}
