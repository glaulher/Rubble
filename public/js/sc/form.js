// public/js/sc/form.js

import { showToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js?v=1';

let scSiteOptions = [];

async function loadScSiteOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=locals');
    const result = await res.json();
    scSiteOptions = result.success ? (result.data || []) : [];
  } catch {
    scSiteOptions = [];
  }
}

function setupScSiteAutocomplete() {
  createAutocomplete({
    inputSelector: '#scSite',
    dropdownSelector: '#scSiteFormDropdown',
    dataSource: () => scSiteOptions,
    filterFn: (items, q) => {
      if (!q) return [...items];
      const lower = q.toLowerCase();
      return items.filter(item => item.toLowerCase().includes(lower));
    },
    formatItem: item => item,
    onSelect: (item, input) => {
      input.value = item;
    },
    onBlur: ({ hide }) => { hide(); }
  });
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

export function buildScCreatePayload(values) {
  const titulo = (values.titulo_email ?? '').trim();
  const site = (values.site ?? '').trim();

  if (!titulo) {
    throw new Error('O título da solicitação é obrigatório.');
  }
  if (!site) {
    throw new Error('O site é obrigatório.');
  }

  const chosen = (values.data ?? '').trim();
  const dateStr = chosen !== '' ? chosen : localToday();

  let sla = values.sla_dias;
  if (sla === '' || sla === undefined || sla === null) {
    sla = null;
  } else {
    sla = Number(sla);
  }

  return {
    titulo_email: titulo,
    site: site,
    status: 'em_cotacao',
    data: dateStr,
    data_status: dateStr,
    sla_dias: sla,
  };
}

export function initScForm() {
  const modal = document.getElementById('modalSc');
  const backdrop = document.getElementById('modalScBackdrop');
  const form = document.getElementById('formSc');
  const btnNew = document.getElementById('scNewBtn');
  const btnCancel = document.getElementById('modalScCancel');
  const inputTitulo = document.getElementById('scTitulo');
  const inputSite = document.getElementById('scSite');
  const inputData = document.getElementById('scData');
  const inputSla = document.getElementById('scSla');

  if (!modal || !form || !btnNew || !btnCancel) return;

  function openModal() {
    inputTitulo.value = '';
    inputSite.value = '';
    inputData.value = localToday();
    inputSla.value = '';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => inputTitulo.focus());
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  btnNew.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const payload = buildScCreatePayload({
        titulo_email: inputTitulo.value,
        site: inputSite.value,
        data: inputData ? inputData.value : '',
        sla_dias: inputSla.value,
      });

      showToast('Criando solicitação...', 'loading');

      const response = await apiFetch('/app/api/index.php?route=sc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await response.json();

      if (res.success) {
        showToast('Solicitação criada com sucesso', 'success');
        closeModal();
        if (typeof globalThis.refreshScList === 'function') {
          await globalThis.refreshScList();
        }
      } else {
        showToast(res.message || 'Erro ao criar solicitação', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao criar solicitação', 'error');
    }
  });

  loadScSiteOptions().then(setupScSiteAutocomplete);
}