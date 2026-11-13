// public/js/sc/form.js

import { showToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';
import { createAutocomplete } from '/public/js/core/autocomplete.js?v=1';

let scSiteOptions = [];
let scEquipmentOptions = [];

async function loadScSiteOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=locals');
    const result = await res.json();
    scSiteOptions = result.success ? result.data || [] : [];
  } catch {
    scSiteOptions = [];
  }
}

async function loadScEquipmentOptions() {
  try {
    const res = await apiFetch('/app/api/index.php?route=equipment&limit=500');
    const result = await res.json();
    const items = result.success ? result.data?.items || result.data || [] : [];
    scEquipmentOptions = items.map((e) => ({
      id: e.id,
      label: e.equipamento ? `${e.equipamento}${e.local ? ' — ' + e.local : ''}` : e.nome || String(e.id),
      nome: e.equipamento || e.nome || '',
      site: e.local || '',
    }));
  } catch {
    scEquipmentOptions = [];
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
      return items.filter((item) => item.toLowerCase().includes(lower));
    },
    formatItem: (item) => item,
    onSelect: (item, input) => {
      input.value = item;
    },
    onBlur: ({ hide }) => {
      hide();
    },
  });
}

function setupScEquipmentAutocomplete() {
  createAutocomplete({
    inputSelector: '#scEquip',
    dropdownSelector: '#scEquipFormDropdown',
    dataSource: () => {
      const siteVal = (document.getElementById('scSite')?.value || '').trim().toLowerCase();
      if (siteVal) {
        const filtered = scEquipmentOptions.filter(
          (e) => !e.site || e.site.toLowerCase().includes(siteVal)
        );
        if (filtered.length > 0) return filtered;
      }
      return scEquipmentOptions;
    },
    filterFn: (items, q) => {
      if (!q) return items.slice(0, 30);
      const lower = q.toLowerCase();
      return items.filter((e) => e.label.toLowerCase().includes(lower)).slice(0, 30);
    },
    formatItem: (item) => item.label,
    onSelect: (item, input) => {
      input.value = item.nome || item.label;
      input.dataset.equipId = String(item.id || '');
    },
    onBlur: ({ hide }) => {
      hide();
    },
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

  const payload = {
    titulo_email: titulo,
    site: site,
    status: 'enviar_email',
    data: dateStr,
    data_status: dateStr,
    sla_dias: sla,
  };

  const equipId = values.equipamento_id ? Number(values.equipamento_id) : null;
  const equipTexto = (values.equipamento_texto ?? '').trim();

  if (equipId && equipId > 0) {
    payload.equipamento_id = equipId;
  } else if (equipTexto) {
    payload.equipamento_texto = equipTexto;
  }

  const pv = (values.numero_pv ?? '').trim();
  if (pv) {
    payload.numero_pv = pv;
  }

  const sc = (values.numero_sc ?? '').trim();
  if (sc) {
    payload.numero_sc = sc;
  }

  const os = (values.numero_os ?? values.os ?? '').trim();
  if (os) {
    payload.numero_os = os;
  }

  const obs = (values.observacao ?? '').trim();
  if (obs) {
    payload.observacao = obs;
  }

  return payload;
}

let _editingScId = null;

export function openScModal(item = null) {
  const modal = document.getElementById('modalSc');
  const title = document.getElementById('modalScTitle');
  const subtitle = modal ? modal.querySelector('p.text-xs') : null;
  const inputTitulo = document.getElementById('scTitulo');
  const inputSite = document.getElementById('scSite');
  const inputEquip = document.getElementById('scEquip');
  const inputPv = document.getElementById('scPv');
  const inputSc = document.getElementById('scSc');
  const inputOs = document.getElementById('scOs');
  const inputData = document.getElementById('scData');
  const inputSla = document.getElementById('scSla');
  const inputObs = document.getElementById('scObservacao');

  if (!modal || !inputTitulo) return;

  if (item) {
    _editingScId = Number(item.id);
    if (title) title.textContent = 'Editar Solicitação de Material';
    if (subtitle) subtitle.textContent = `SM: ${item.numero_sm || item.id}`;
    inputTitulo.value = item.titulo_email || '';
    inputSite.value = item.site || '';
    if (inputEquip) {
      inputEquip.value = item.equipamento || item.equipamento_texto || '';
      if (item.equipamento_id) {
        inputEquip.dataset.equipId = String(item.equipamento_id);
      } else {
        delete inputEquip.dataset.equipId;
      }
    }
    if (inputPv) inputPv.value = item.numero_pv || '';
    if (inputSc) inputSc.value = item.numero_sc || '';
    if (inputOs) inputOs.value = item.numero_os || item.os || '';
    inputData.value = item.data || localToday();
    inputSla.value = item.sla_dias !== null && item.sla_dias !== undefined ? String(item.sla_dias) : '';
    if (inputObs) inputObs.value = item.observacao || '';
  } else {
    _editingScId = null;
    if (title) title.textContent = 'Nova Solicitação de Material';
    if (subtitle) subtitle.textContent = 'O número SM será gerado automaticamente';
    inputTitulo.value = '';
    inputSite.value = '';
    if (inputEquip) {
      inputEquip.value = '';
      delete inputEquip.dataset.equipId;
    }
    if (inputPv) inputPv.value = '';
    if (inputSc) inputSc.value = '';
    if (inputOs) inputOs.value = '';
    inputData.value = localToday();
    inputSla.value = '';
    if (inputObs) inputObs.value = '';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => inputTitulo.focus());
}

export function closeScModal() {
  const modal = document.getElementById('modalSc');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  _editingScId = null;
}

export function initScForm() {
  const modal = document.getElementById('modalSc');
  const form = document.getElementById('formSc');
  const btnNew = document.getElementById('scNewBtn');
  const btnCancel = document.getElementById('modalScCancel');
  const btnClose = document.getElementById('modalScCloseBtn');
  const inputTitulo = document.getElementById('scTitulo');
  const inputSite = document.getElementById('scSite');
  const inputEquip = document.getElementById('scEquip');
  const inputPv = document.getElementById('scPv');
  const inputSc = document.getElementById('scSc');
  const inputOs = document.getElementById('scOs');
  const inputData = document.getElementById('scData');
  const inputSla = document.getElementById('scSla');
  const inputObs = document.getElementById('scObservacao');

  if (!modal || !form || !btnNew || !btnCancel) return;

  btnNew.addEventListener('click', () => openScModal(null));
  btnCancel.addEventListener('click', closeScModal);
  if (btnClose) btnClose.addEventListener('click', closeScModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const payload = buildScCreatePayload({
        titulo_email: inputTitulo.value,
        site: inputSite.value,
        equipamento_id: inputEquip?.dataset?.equipId,
        equipamento_texto: inputEquip?.value,
        numero_pv: inputPv ? inputPv.value : '',
        numero_sc: inputSc ? inputSc.value : '',
        numero_os: inputOs ? inputOs.value : '',
        data: inputData ? inputData.value : '',
        sla_dias: inputSla.value,
        observacao: inputObs ? inputObs.value : '',
      });

      if (_editingScId) {
        showToast('Atualizando solicitação de material...', 'loading');
        payload.id = _editingScId;
        delete payload.status;
        delete payload.data_status;

        const response = await apiFetch('/app/api/index.php?route=sc', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await response.json();

        if (res.success) {
          showToast('Solicitação atualizada com sucesso', 'success');
          closeScModal();
          if (typeof globalThis.refreshScList === 'function') {
            await globalThis.refreshScList();
          }
        } else {
          showToast(res.message || 'Erro ao atualizar solicitação', 'error');
        }
      } else {
        showToast('Registrando solicitação de material...', 'loading');

        const response = await apiFetch('/app/api/index.php?route=sc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await response.json();

        if (res.success) {
          showToast('Solicitação registrada com sucesso', 'success');
          closeScModal();
          if (typeof globalThis.refreshScList === 'function') {
            await globalThis.refreshScList();
          }
        } else {
          showToast(res.message || 'Erro ao registrar solicitação', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Erro ao processar solicitação', 'error');
    }
  });

  loadScSiteOptions().then(setupScSiteAutocomplete);
  loadScEquipmentOptions().then(setupScEquipmentAutocomplete);
}
