import { showToast } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';

let technicianList = [];

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchTechnicians() {
  try {
    const response = await fetch('/app/api/index.php?route=inventory&action=technicians');
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      technicianList = result.data;
    } else {
      technicianList = [];
    }
  } catch (e) {
    technicianList = [];
  }
  return technicianList;
}

export function updateCategoryPlaceholders() {
  const catEl = document.getElementById('inventoryCategoria');
  const serialInput = document.getElementById('inventorySerial');
  const serialLabel = document.getElementById('labelSerial');
  const materialInput = document.getElementById('inventoryMaterialNome');
  const materialLabel = document.getElementById('labelMaterialNome');

  if (!catEl) return;
  const cat = catEl.value;

  if (cat === 'veiculo') {
    if (materialLabel) materialLabel.textContent = 'Veículo *';
    if (materialInput) materialInput.placeholder = 'Ex: Fiat Strada, VW Gol, Renault Kangoo';
    if (serialLabel) serialLabel.textContent = 'Placa *';
    if (serialInput) serialInput.placeholder = 'Ex: BRA-2E19 ou ABC-1234';
  } else if (cat === 'ferramenta') {
    if (materialLabel) materialLabel.textContent = 'Ferramenta *';
    if (materialInput) materialInput.placeholder = 'Ex: Furadeira de Impacto, Multímetro';
    if (serialLabel) serialLabel.textContent = 'Número de Série / Patrimônio *';
    if (serialInput) serialInput.placeholder = 'Ex: SN123456';
  } else if (cat === 'celular_ti') {
    if (materialLabel) materialLabel.textContent = 'Aparelho / Equipamento TI *';
    if (materialInput) materialInput.placeholder = 'Ex: Samsung Galaxy A15, Notebook Dell';
    if (serialLabel) serialLabel.textContent = 'IMEI / Serial *';
    if (serialInput) serialInput.placeholder = 'Ex: 356789012345678 ou SN123456';
  } else if (cat === 'equipamento') {
    if (materialLabel) materialLabel.textContent = 'Equipamento *';
    if (materialInput) materialInput.placeholder = 'Ex: Bomba de Vácuo, Recolhedora';
    if (serialLabel) serialLabel.textContent = 'Serial / TAG *';
    if (serialInput) serialInput.placeholder = 'Ex: EQ-987654';
  } else {
    if (materialLabel) materialLabel.textContent = 'Material / Descrição *';
    if (materialInput) materialInput.placeholder = 'Ex: Descrição do item';
    if (serialLabel) serialLabel.textContent = 'Serial / Identificador *';
    if (serialInput) serialInput.placeholder = 'Ex: SN123456 ou N/A';
  }
}

export function setupTechnicianAutocomplete() {
  const input = document.getElementById('inventoryTecnicoNome');
  const dropdown = document.getElementById('inventoryTecnicoDropdown');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let currentMatches = [];

  function highlightItem(index) {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    items.forEach((it, idx) => {
      if (idx === index) {
        it.classList.add('bg-sky-100', 'text-sky-900', 'dark:bg-sky-900/40', 'dark:text-sky-200');
        it.classList.remove('text-slate-700', 'dark:text-slate-200');
        if (typeof it.scrollIntoView === 'function') {
          it.scrollIntoView({ block: 'nearest' });
        }
      } else {
        it.classList.remove('bg-sky-100', 'text-sky-900', 'dark:bg-sky-900/40', 'dark:text-sky-200');
        it.classList.add('text-slate-700', 'dark:text-slate-200');
      }
    });
  }

  function renderDropdown(query) {
    const q = (query || '').trim().toLowerCase();
    currentMatches = q
      ? technicianList.filter((name) => String(name).toLowerCase().includes(q))
      : technicianList.slice(0, 10);

    activeIndex = -1;

    if (currentMatches.length === 0) {
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = currentMatches
      .map((name, i) => {
        return (
          '<div class="autocomplete-item px-4 py-2.5 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-700/60 transition" data-index="' +
          i +
          '" data-value="' +
          escapeHtml(name) +
          '">' +
          escapeHtml(name) +
          '</div>'
        );
      })
      .join('');
    dropdown.classList.remove('hidden');
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
    currentMatches = [];
  }

  // Use mousedown so event fires before blur on input
  dropdown.addEventListener('mousedown', function (e) {
    const item = e.target.closest('[data-value]');
    if (!item) return;
    e.preventDefault();
    input.value = item.dataset.value;
    hideDropdown();
  });

  input.addEventListener('input', function () {
    renderDropdown(input.value);
  });

  input.addEventListener('focus', function () {
    renderDropdown(input.value);
  });

  input.addEventListener('blur', function () {
    setTimeout(hideDropdown, 150);
  });

  input.addEventListener('keydown', function (e) {
    if (dropdown.classList.contains('hidden') || currentMatches.length === 0) {
      if (e.key === 'ArrowDown') {
        renderDropdown(input.value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentMatches.length;
      highlightItem(activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
      highlightItem(activeIndex);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < currentMatches.length) {
        e.preventDefault();
        input.value = currentMatches[activeIndex];
        hideDropdown();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideDropdown();
    }
  });
}

export function navigateInventoryHandler() {
  window.location.hash = '#/inventory';
}

export async function loadInventoryForm() {
  const form = document.getElementById('inventoryForm');
  if (!form) return;

  const hash = window.location.hash || '';
  const queryString = hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const editId = params.get('id');

  // Reset fields
  document.getElementById('inventoryId').value = '';
  document.getElementById('inventoryCategoria').value = 'ferramenta';
  document.getElementById('inventoryTecnicoNome').value = '';
  document.getElementById('inventoryMaterialNome').value = '';
  document.getElementById('inventoryModelo').value = '';
  document.getElementById('inventorySerial').value = '';
  document.getElementById('inventoryDataRetirada').value = getTodayDateString();
  document.getElementById('inventoryDataDevolucao').value = '';
  document.getElementById('inventoryObservacoes').value = '';

  // Setup category change handler and initial placeholders
  const categorySelect = document.getElementById('inventoryCategoria');
  if (categorySelect) {
    categorySelect.removeEventListener('change', updateCategoryPlaceholders);
    categorySelect.addEventListener('change', updateCategoryPlaceholders);
    updateCategoryPlaceholders();
  }

  // Setup navigate back / cancel buttons
  const backButtons = document.querySelectorAll('[data-action="navigate-inventory"]');
  backButtons.forEach((btn) => {
    btn.removeEventListener('click', navigateInventoryHandler);
    btn.addEventListener('click', navigateInventoryHandler);
  });

  // Load technicians and initialize autocomplete
  await fetchTechnicians();
  setupTechnicianAutocomplete();

  const titleEl = document.getElementById('inventoryFormTitle');
  const subtitleEl = document.getElementById('inventoryFormSubtitle');
  const submitBtn = document.getElementById('inventoryFormSubmit');

  if (editId) {
    if (titleEl) titleEl.textContent = 'Editar Registro de Inventário';
    if (subtitleEl) subtitleEl.textContent = 'Atualizar informações do item em custódia';
    if (submitBtn) submitBtn.textContent = 'Atualizar Registro';

    try {
      const response = await fetch('/app/api/index.php?route=inventory&action=get&id=' + encodeURIComponent(editId));
      const result = await response.json();

      if (!result.success || !result.data) {
        showToast('Erro ao carregar item de inventário', 'error');
        return;
      }

      const item = result.data;
      document.getElementById('inventoryId').value = item.id;
      document.getElementById('inventoryCategoria').value = item.categoria || 'ferramenta';
      document.getElementById('inventoryTecnicoNome').value = item.tecnico_nome || '';
      document.getElementById('inventoryMaterialNome').value = item.material_nome || '';
      document.getElementById('inventoryModelo').value = item.modelo || '';
      document.getElementById('inventorySerial').value = item.serial || '';
      document.getElementById('inventoryDataRetirada').value = item.data_retirada || '';
      document.getElementById('inventoryDataDevolucao').value = item.data_devolucao || '';
      document.getElementById('inventoryObservacoes').value = item.observacoes || '';

      updateCategoryPlaceholders();
    } catch (e) {
      showToast('Erro ao carregar item de inventário', 'error');
      return;
    }
  } else {
    if (titleEl) titleEl.textContent = 'Novo Registro de Inventário';
    if (subtitleEl) subtitleEl.textContent = 'Cadastrar material, ferramenta, celular ou veículo sob custódia';
    if (submitBtn) submitBtn.textContent = 'Salvar Registro';
  }

  form.removeEventListener('submit', saveInventoryForm);
  form.addEventListener('submit', saveInventoryForm);
}

export async function saveInventoryForm(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const id = document.getElementById('inventoryId').value;
  const categoria = document.getElementById('inventoryCategoria').value;
  const tecnicoNome = document.getElementById('inventoryTecnicoNome').value.trim();
  const materialNome = document.getElementById('inventoryMaterialNome').value.trim();
  const modelo = document.getElementById('inventoryModelo').value.trim();
  const serial = document.getElementById('inventorySerial').value.trim();
  const dataRetirada = document.getElementById('inventoryDataRetirada').value;
  const dataDevolucao = document.getElementById('inventoryDataDevolucao').value;
  const observacoes = document.getElementById('inventoryObservacoes').value.trim();

  // Validations
  if (!categoria) {
    showToast('Selecione a categoria', 'error');
    return null;
  }
  if (!tecnicoNome) {
    showToast('Informe o técnico responsável', 'error');
    return null;
  }
  if (!materialNome) {
    showToast('Informe o material/veículo', 'error');
    return null;
  }
  if (!modelo) {
    showToast('Informe o modelo', 'error');
    return null;
  }
  if (!serial) {
    showToast('Informe o número de série ou placa', 'error');
    return null;
  }
  if (!dataRetirada) {
    showToast('Informe a data de retirada', 'error');
    return null;
  }
  if (dataDevolucao && dataDevolucao < dataRetirada) {
    showToast('A data de devolução não pode ser anterior à data de retirada', 'error');
    return null;
  }

  const isEdit = Boolean(id);
  const method = isEdit ? 'PUT' : 'POST';
  const url = '/app/api/index.php?route=inventory' + (isEdit ? '&id=' + encodeURIComponent(id) : '');

  const body = {
    categoria: categoria,
    tecnico_nome: tecnicoNome,
    material_nome: materialNome,
    modelo: modelo,
    serial: serial,
    data_retirada: dataRetirada,
    data_devolucao: dataDevolucao || null,
    observacoes: observacoes || null,
  };
  if (isEdit) {
    body.id = parseInt(id, 10);
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (result.success) {
      showToast(result.message || (isEdit ? 'Item atualizado com sucesso.' : 'Item cadastrado com sucesso.'), 'success');
      window.location.hash = '#/inventory';
      return result;
    } else {
      showToast(result.message || 'Erro ao salvar item', 'error');
      return result;
    }
  } catch (err) {
    showToast('Erro ao salvar item', 'error');
    return null;
  }
}

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'technicianList', {
    get: function () {
      return technicianList;
    },
    set: function (v) {
      technicianList = v;
    },
    configurable: true,
  });
}
