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

  const pc = (values.numero_pc ?? '').trim();
  if (pc) {
    payload.numero_pc = pc;
  }

  const rawValor = (values.valor_sc ?? '').toString().trim();
  if (rawValor !== '') {
    const clean = rawValor
      .replace(/[R$\s]/g, '')
      .replace(/\.(?=\d{3})/g, '')
      .replace(',', '.');
    const num = parseFloat(clean);
    if (Number.isNaN(num) || num < 0) {
      throw new Error('Valor da SC deve ser um número maior ou igual a zero.');
    }
    payload.valor_sc = num;
  } else {
    payload.valor_sc = null;
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
let _currentFormPvTotal = null;

function updateFormMargins() {
  const panel = document.getElementById('scFormMarginsPanel');
  const pvTotalEl = document.getElementById('scFormPvTotal');
  const markupEl = document.getElementById('scFormMarkup');
  const margemEl = document.getElementById('scFormMargem');
  const inputValor = document.getElementById('scValor');

  if (!panel) return;

  if (!_currentFormPvTotal || _currentFormPvTotal <= 0) {
    panel.classList.add('hidden');
    return;
  }

  const rawVal = (inputValor?.value || '').trim();
  const clean = rawVal
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const valSc = parseFloat(clean);

  panel.classList.remove('hidden');
  if (pvTotalEl) {
    pvTotalEl.textContent = `Total PV: ${Number(_currentFormPvTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }

  if (Number.isNaN(valSc) || valSc <= 0) {
    if (markupEl) {
      markupEl.textContent = 'Markup: —';
      markupEl.className = 'px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500';
    }
    if (margemEl) {
      margemEl.textContent = 'Margem: —';
      margemEl.className = 'px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500';
    }
    return;
  }

  const markup = Math.round(((_currentFormPvTotal - valSc) / valSc) * 1000) / 10;
  const margem = Math.round(((_currentFormPvTotal - valSc) / _currentFormPvTotal) * 1000) / 10;

  if (markupEl) {
    markupEl.textContent = `Markup: ${markup >= 0 ? '+' : ''}${markup.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    markupEl.className = `px-2 py-0.5 rounded-lg text-xs font-semibold ${markup < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`;
  }
  if (margemEl) {
    margemEl.textContent = `Margem: ${margem >= 0 ? '+' : ''}${margem.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    margemEl.className = `px-2 py-0.5 rounded-lg text-xs font-semibold ${margem < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`;
  }
}

async function checkFormPvTotal(pvNum) {
  const clean = (pvNum || '').trim();
  if (!clean) {
    _currentFormPvTotal = null;
    updateFormMargins();
    return;
  }
  try {
    const resp = await apiFetch(`/app/api/index.php?route=pv&numero_pv=${encodeURIComponent(clean)}`);
    const res = await resp.json();
    if (res.success && res.data && Array.isArray(res.data.itens)) {
      const sum = res.data.itens.reduce((acc, it) => acc + (parseFloat(it.valor_total) || 0), 0);
      _currentFormPvTotal = sum > 0 ? sum : null;
    } else {
      _currentFormPvTotal = null;
    }
  } catch {
    _currentFormPvTotal = null;
  }
  updateFormMargins();
}

export function openScModal(item = null) {
  const modal = document.getElementById('modalSc');
  const title = document.getElementById('modalScTitle');
  const subtitle = modal ? modal.querySelector('p.text-xs') : null;
  const inputTitulo = document.getElementById('scTitulo');
  const inputSite = document.getElementById('scSite');
  const inputEquip = document.getElementById('scEquip');
  const inputPv = document.getElementById('scPv');
  const inputSc = document.getElementById('scSc');
  const inputPc = document.getElementById('scPc');
  const inputOs = document.getElementById('scOs');
  const inputValor = document.getElementById('scValor');
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
    if (inputPc) inputPc.value = item.numero_pc || '';
    if (inputOs) inputOs.value = item.numero_os || item.os || '';
    if (inputValor) {
      inputValor.value = item.valor_sc !== null && item.valor_sc !== undefined ? String(item.valor_sc) : '';
    }
    inputData.value = item.data || localToday();
    inputSla.value = item.sla_dias !== null && item.sla_dias !== undefined ? String(item.sla_dias) : '';
    if (inputObs) inputObs.value = item.observacao || '';

    _currentFormPvTotal = item.pv_valor_total ? parseFloat(item.pv_valor_total) : null;
    if (!_currentFormPvTotal && item.numero_pv) {
      checkFormPvTotal(item.numero_pv);
    } else {
      updateFormMargins();
    }
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
    if (inputPc) inputPc.value = '';
    if (inputOs) inputOs.value = '';
    if (inputValor) inputValor.value = '';
    inputData.value = localToday();
    inputSla.value = '';
    if (inputObs) inputObs.value = '';

    _currentFormPvTotal = null;
    updateFormMargins();
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
  _currentFormPvTotal = null;
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
  const inputPc = document.getElementById('scPc');
  const inputOs = document.getElementById('scOs');
  const inputValor = document.getElementById('scValor');
  const inputData = document.getElementById('scData');
  const inputSla = document.getElementById('scSla');
  const inputObs = document.getElementById('scObservacao');

  if (!modal || !form || !btnNew || !btnCancel) return;

  btnNew.addEventListener('click', () => openScModal(null));
  btnCancel.addEventListener('click', closeScModal);
  if (btnClose) btnClose.addEventListener('click', closeScModal);

  if (inputValor) {
    inputValor.addEventListener('input', updateFormMargins);
  }
  if (inputPv) {
    inputPv.addEventListener('blur', () => {
      checkFormPvTotal(inputPv.value);
    });
  }

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
        numero_pc: inputPc ? inputPc.value : '',
        numero_os: inputOs ? inputOs.value : '',
        valor_sc: inputValor ? inputValor.value : '',
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
