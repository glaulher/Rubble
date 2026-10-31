// public/js/sc/form.js

import { escapeHtml, formatDate } from '/public/js/core/utils.js';
import { showToast, apiFetch } from '/public/js/core/auth.js';
import { SC_STATUSES } from './constants.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js';

let scSiteOptions = [];

async function loadScSiteOptions() {
  try {
    const res = await fetch('/app/api/index.php?route=locals');
    const result = await res.json();
    scSiteOptions = result.success ? (result.data || []) : [];
  } catch {
    scSiteOptions = [];
  }
}

function setupScSiteAutocomplete() {
  createAutocomplete({
    inputSelector: '#scSite',
    dropdownSelector: '#scSiteDropdown',
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

export function buildScCreatePayload(values) {
  const titulo = (values.titulo_email ?? '').trim();
  const site = (values.site ?? '').trim();

  if (!titulo) {
    throw new Error('O título da solicitação é obrigatório.');
  }
  if (!site) {
    throw new Error('O site é obrigatório.');
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

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
    data: todayStr,
    data_status: todayStr,
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
    inputData.value = new Date().toISOString().slice(0, 10);
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

    const payload = buildScCreatePayload({
      titulo_email: inputTitulo.value,
      site: inputSite.value,
      sla_dias: inputSla.value,
    });

    showToast('loading', 'Criando solicitação...');

    try {
      const res = await apiFetch('/app/api/index.php?route=sc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast('success', 'Solicitação criada com sucesso');
        closeModal();
        if (typeof globalThis.refreshScList === 'function') {
          globalThis.refreshScList();
        }
      } else {
        showToast('error', res.message || 'Erro ao criar solicitação');
      }
    } catch (err) {
      showToast('error', err.message || 'Erro de rede');
    }
  });

  loadScSiteOptions().then(setupScSiteAutocomplete);
}