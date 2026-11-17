import { apiFetch, getUser } from '/public/js/core/auth.js';
import { escapeHtml } from '/public/js/core/utils.js';

let activeTab = 'banco-horas';
let debounceTimer = null;

export async function initHoras() {
  setupTabs();
  setupUploadPdfs();
  setupFilters();
  setupEventDelegation();
  setupModalExtrato();

  await loadFilterOptions();
  loadCurrentTab();
}

function setupTabs() {
  const btnBh = document.getElementById('tabBtnBancoHoras');
  const btnHe = document.getElementById('tabBtnHoraExtra');
  const contentBh = document.getElementById('tabContentBancoHoras');
  const contentHe = document.getElementById('tabContentHoraExtra');

  if (btnBh) {
    btnBh.addEventListener('click', () => {
      activeTab = 'banco-horas';
      btnBh.classList.add('active', 'border-blue-600', 'text-blue-600');
      btnBh.classList.remove('border-transparent', 'text-slate-500');
      btnHe.classList.remove('active', 'border-blue-600', 'text-blue-600');
      btnHe.classList.add('border-transparent', 'text-slate-500');

      contentBh.classList.remove('hidden');
      contentHe.classList.add('hidden');
      loadBancoHoras();
    });
  }

  if (btnHe) {
    btnHe.addEventListener('click', () => {
      activeTab = 'hora-extra';
      btnHe.classList.add('active', 'border-blue-600', 'text-blue-600');
      btnHe.classList.remove('border-transparent', 'text-slate-500');
      btnBh.classList.remove('active', 'border-blue-600', 'text-blue-600');
      btnBh.classList.add('border-transparent', 'text-slate-500');

      contentHe.classList.remove('hidden');
      contentBh.classList.add('hidden');
      loadHoraExtraSimplificada();
    });
  }
}

function setupUploadPdfs() {
  const toggleBtn = document.getElementById('btnToggleUploadPdfs');
  const closeBtn = document.getElementById('btnCloseUploadPdfs');
  const panel = document.getElementById('panelUploadPdfs');
  const dropzone = document.getElementById('pdfDropzone');
  const fileInput = document.getElementById('inputPdfFiles');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('hidden');
    });
  }

  if (closeBtn && panel) {
    closeBtn.addEventListener('click', () => {
      panel.classList.add('hidden');
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-blue-500', 'bg-blue-50/50');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePdfUpload(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handlePdfUpload(fileInput.files);
      }
    });
  }
}

async function handlePdfUpload(files) {
  const statusBox = document.getElementById('pdfUploadStatus');
  const msgEl = document.getElementById('pdfUploadMessage');
  const percentEl = document.getElementById('pdfUploadPercent');
  const barEl = document.getElementById('pdfProgressBar');

  if (!files || files.length === 0) return;

  if (statusBox) statusBox.classList.remove('hidden');
  if (msgEl) msgEl.textContent = `Enviando ${files.length} arquivo(s) PDF para processamento...`;
  if (percentEl) percentEl.textContent = '30%';
  if (barEl) barEl.style.width = '30%';

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('pdfs[]', files[i]);
  }

  try {
    if (percentEl) percentEl.textContent = '60%';
    if (barEl) barEl.style.width = '60%';

    const resp = await apiFetch('/app/api/index.php?route=horas&action=upload-pdfs', {
      method: 'POST',
      body: formData,
    });
    const result = await resp.json();

    if (resp.ok && result.success) {
      if (percentEl) percentEl.textContent = '100%';
      if (barEl) barEl.style.width = '100%';
      if (msgEl) msgEl.textContent = result.message || 'Processamento concluído com sucesso!';

      setTimeout(() => {
        const panel = document.getElementById('panelUploadPdfs');
        if (panel) panel.classList.add('hidden');
        if (statusBox) statusBox.classList.add('hidden');
        loadCurrentTab();
      }, 2000);
    } else {
      if (msgEl) msgEl.textContent = 'Erro: ' + (result.message || 'Falha no processamento.');
      if (barEl) barEl.classList.add('bg-rose-600');
    }
  } catch (err) {
    if (msgEl) msgEl.textContent = 'Falha na comunicação com o servidor: ' + err.message;
    if (barEl) barEl.classList.add('bg-rose-600');
  }
}

function setupFilters() {
  // Banco de Horas filters
  const bhBusca = document.getElementById('filterBhBusca');
  const bhCc = document.getElementById('filterBhCc');
  const bhTurno = document.getElementById('filterBhTurno');
  const bhOrder = document.getElementById('filterBhOrder');

  const triggerBhFilter = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadBancoHoras(), 250);
  };

  if (bhBusca) bhBusca.addEventListener('input', triggerBhFilter);
  if (bhCc) bhCc.addEventListener('change', triggerBhFilter);
  if (bhTurno) bhTurno.addEventListener('change', triggerBhFilter);
  if (bhOrder) bhOrder.addEventListener('change', triggerBhFilter);

  // Hora Extra filters
  const heInicio = document.getElementById('filterHeDataInicio');
  const heFim = document.getElementById('filterHeDataFim');
  const heCc = document.getElementById('filterHeCc');
  const heColab = document.getElementById('filterHeColaborador');
  const heStatus = document.getElementById('filterHeStatusJustificativa');

  const triggerHeFilter = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadHoraExtraSimplificada(), 250);
  };

  if (heInicio) heInicio.addEventListener('change', triggerHeFilter);
  if (heFim) heFim.addEventListener('change', triggerHeFilter);
  if (heCc) heCc.addEventListener('change', triggerHeFilter);
  if (heColab) heColab.addEventListener('change', triggerHeFilter);
  if (heStatus) heStatus.addEventListener('change', triggerHeFilter);
}

async function loadFilterOptions() {
  try {
    const resp = await apiFetch('/app/api/index.php?route=horas&action=filtros');
    if (!resp.ok) return;
    const json = await resp.json();
    const data = json.data || json;

    const ccs = data.centros_de_custo || [];
    const colabs = data.colaboradores || [];

    const bhCc = document.getElementById('filterBhCc');
    const heCc = document.getElementById('filterHeCc');
    if (bhCc) {
      ccs.forEach((cc) => {
        const opt = document.createElement('option');
        opt.value = cc;
        opt.textContent = `CC ${cc}`;
        bhCc.appendChild(opt);
      });
    }
    if (heCc) {
      ccs.forEach((cc) => {
        const opt = document.createElement('option');
        opt.value = cc;
        opt.textContent = `CC ${cc}`;
        heCc.appendChild(opt);
      });
    }

    const heColab = document.getElementById('filterHeColaborador');
    if (heColab) {
      colabs.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (CC ${c.cc || '-'})`;
        heColab.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Falha ao carregar opções de filtros:', e);
  }
}

function loadCurrentTab() {
  if (activeTab === 'banco-horas') {
    loadBancoHoras();
  } else {
    loadHoraExtraSimplificada();
  }
}

async function loadBancoHoras() {
  const tbody = document.getElementById('tbodyBancoHoras');
  if (!tbody) return;

  const busca = document.getElementById('filterBhBusca')?.value || '';
  const cc = document.getElementById('filterBhCc')?.value || '';
  const turno = document.getElementById('filterBhTurno')?.value || '';
  const order = document.getElementById('filterBhOrder')?.value || '';

  const params = new URLSearchParams();
  params.set('action', 'banco');
  if (busca) params.set('busca', busca);
  if (cc) params.set('cc', cc);
  if (turno) params.set('turno', turno);
  if (order) params.set('order_saldo', order);

  try {
    const resp = await apiFetch(`/app/api/index.php?route=horas&${params.toString()}`);
    if (!resp.ok) {
      tbody.innerHTML = '<tr><td colspan="13" class="py-6 text-center text-rose-500">Erro ao carregar dados do banco de horas.</td></tr>';
      return;
    }
    const json = await resp.json();
    const data = json.data || json;

    renderKpisBancoHoras(data.kpis || {});
    renderTableBancoHoras(data.dados || []);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" class="py-6 text-center text-rose-500">Falha na requisição: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderKpisBancoHoras(kpis) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '-';
  };

  setEl('badgeColabsCount', kpis.colaboradores || 0);
  setEl('badgeHeTotal', kpis.he_total || '00:00');
  setEl('badgeSaldoLiquido', kpis.saldo_liquido_total || '+00:00');

  setEl('kpiBancoPositivo', kpis.banco_positivo_total || '+00:00');
  setEl('kpiColabPositivo', `${kpis.colab_banco_positivo || 0} pessoas`);
  setEl('kpiBancoNegativo', kpis.banco_negativo_total || '-00:00');
  setEl('kpiColabNegativo', `${kpis.colab_banco_negativo || 0} pessoas`);
  setEl('kpiHeAcumulada', kpis.he_total || '00:00');
  setEl('kpiAusenciasTotal', kpis.absent_total || '00:00');
}

function renderTableBancoHoras(rows) {
  const tbody = document.getElementById('tbodyBancoHoras');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="py-8 text-center text-slate-500 horas-text-sub">Nenhum colaborador encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const saldoMin = parseInt(r.saldo_atual_min, 10) || 0;
      const saldoClass =
        saldoMin > 0
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : saldoMin < 0
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-slate-100 text-slate-700 border-slate-300';

      return `
      <tr class="hover:bg-slate-50 transition horas-tr-row">
        <td class="py-3 px-4 font-medium text-slate-600 horas-text">${escapeHtml(r.cc || '-')}</td>
        <td class="py-3 px-4 font-semibold text-slate-800 horas-text">
          <div>${escapeHtml(r.nome)}</div>
          <div class="text-[10px] text-slate-400 horas-text-sub">Mat: ${escapeHtml(r.matricula || '-')}</div>
        </td>
        <td class="py-3 px-4 text-slate-600 horas-text-sub">${escapeHtml(r.funcao || '-')}</td>
        <td class="py-3 px-4 text-slate-600 horas-text-sub">${escapeHtml(r.turno || '-')}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            ${escapeHtml(r.he_total || '00:00')}
          </span>
        </td>
        <td class="py-3 px-4 text-center text-slate-700 font-medium horas-text">${r.dias_com_he || 0}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${parseInt(r.absent_total_min, 10) > 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
            ${escapeHtml(r.absent_total || '00:00')}
          </span>
        </td>
        <td class="py-3 px-4 text-center text-slate-700 font-medium horas-text">${r.dias_com_ausencia || 0}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-1 rounded-xl text-xs font-bold border ${saldoClass}">
            ${escapeHtml(r.saldo_formatado || r.saldo_atual || '00:00')}
          </span>
        </td>
        <td class="py-2 px-3">
          <input
            type="text"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            placeholder="Nome do Gestor"
            value="${escapeHtml(r.nome_gestor || '')}"
            data-action="save-bh"
            data-field="nome_gestor"
            data-colab-id="${r.colaborador_id}"
          />
        </td>
        <td class="py-2 px-3">
          <input
            type="text"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            placeholder="Adm Responsável"
            value="${escapeHtml(r.adm_responsavel || '')}"
            data-action="save-bh"
            data-field="adm_responsavel"
            data-colab-id="${r.colaborador_id}"
          />
        </td>
        <td class="py-2 px-3">
          <input
            type="text"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            placeholder="Observação"
            value="${escapeHtml(r.observacao || '')}"
            data-action="save-bh"
            data-field="observacao"
            data-colab-id="${r.colaborador_id}"
          />
        </td>
        <td class="py-3 px-4 text-center">
          <button
            type="button"
            class="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition"
            title="Ver Extrato"
            data-action="open-extrato"
            data-colab-id="${r.colaborador_id}"
          >
            <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </td>
      </tr>
    `;
    })
    .join('');
}

async function loadHoraExtraSimplificada() {
  const tbody = document.getElementById('tbodyHoraExtra');
  if (!tbody) return;

  const dataInicio = document.getElementById('filterHeDataInicio')?.value || '';
  const dataFim = document.getElementById('filterHeDataFim')?.value || '';
  const cc = document.getElementById('filterHeCc')?.value || '';
  const colabId = document.getElementById('filterHeColaborador')?.value || '';
  const statusJust = document.getElementById('filterHeStatusJustificativa')?.value || '';

  const params = new URLSearchParams();
  params.set('action', 'he-simplificada');
  if (dataInicio) params.set('data_inicio', dataInicio);
  if (dataFim) params.set('data_fim', dataFim);
  if (cc) params.set('cc', cc);
  if (colabId) params.set('colaborador_id', colabId);
  if (statusJust) params.set('status_justificativa', statusJust);

  try {
    const resp = await apiFetch(`/app/api/index.php?route=horas&${params.toString()}`);
    if (!resp.ok) {
      tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-rose-500">Erro ao carregar horas extras.</td></tr>';
      return;
    }
    const json = await resp.json();
    const data = json.data || json;

    renderKpisHorasExtras(data.kpis || {});
    renderTableHoraExtra(data.dados || []);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-6 text-center text-rose-500">Falha na requisição: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderKpisHorasExtras(kpis) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '-';
  };

  setEl('kpiHeCount', kpis.total_registros || 0);
  setEl('kpiHeColabsCount', `${kpis.colaboradores_distintos || 0} colaboradores`);
  setEl('kpiHeTotalSimplificada', kpis.he_total || '00:00');
  setEl('kpiHeJustificadas', kpis.justificativas_preenchidas || 0);
  setEl('kpiHeTaxaPreenchimento', `${kpis.taxa_preenchimento || 0}% justificadas`);
  setEl('kpiHePendentes', kpis.justificativas_pendentes || 0);
}

function renderTableHoraExtra(rows) {
  const tbody = document.getElementById('tbodyHoraExtra');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="py-8 text-center text-slate-500 horas-text-sub">Nenhuma hora extra encontrada para os filtros selecionados.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const sobreaviso = r.sobreaviso || '';
      return `
      <tr class="hover:bg-slate-50 transition horas-tr-row">
        <td class="py-3 px-4 font-semibold text-slate-800 horas-text whitespace-nowrap">${escapeHtml(r.data_formatada || r.data)}</td>
        <td class="py-3 px-4 text-slate-600 font-medium horas-text-sub">${escapeHtml(r.dia_abreviado || r.dia_semana || '-')}</td>
        <td class="py-3 px-4 font-semibold text-slate-800 horas-text">
          <div>${escapeHtml(r.nome)}</div>
          <div class="text-[10px] text-slate-400 horas-text-sub">CC: ${escapeHtml(r.cc || '-')}</div>
        </td>
        <td class="py-3 px-4 text-center text-slate-700 font-medium horas-text">${escapeHtml(r.primeira_entrada || '-')}</td>
        <td class="py-3 px-4 text-center text-slate-700 font-medium horas-text">${escapeHtml(r.ultima_saida || '-')}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ${escapeHtml(r.he_formatado || r.he)}
          </span>
        </td>
        <td class="py-2 px-3">
          <input
            type="text"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            placeholder="Gestor Mediato"
            value="${escapeHtml(r.nome_gestor || '')}"
            data-action="save-he"
            data-field="nome_gestor"
            data-colab-id="${r.colaborador_id}"
            data-date="${r.data}"
          />
        </td>
        <td class="py-2 px-3">
          <input
            type="text"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            placeholder="Adm"
            value="${escapeHtml(r.adm_responsavel || '')}"
            data-action="save-he"
            data-field="adm_responsavel"
            data-colab-id="${r.colaborador_id}"
            data-date="${r.data}"
          />
        </td>
        <td class="py-2 px-3 text-center">
          <select
            class="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input"
            data-action="save-he"
            data-field="sobreaviso"
            data-colab-id="${r.colaborador_id}"
            data-date="${r.data}"
          >
            <option value="" ${!sobreaviso ? 'selected' : ''}>-</option>
            <option value="Sim" ${sobreaviso === 'Sim' ? 'selected' : ''}>Sim</option>
            <option value="Não" ${sobreaviso === 'Não' || sobreaviso === 'Nao' ? 'selected' : ''}>Não</option>
          </select>
        </td>
        <td class="py-2 px-3">
          <textarea
            rows="1"
            class="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 horas-input resize-y min-h-[32px]"
            placeholder="Justificativa da hora extra..."
            data-action="save-he"
            data-field="justificativa"
            data-colab-id="${r.colaborador_id}"
            data-date="${r.data}"
          >${escapeHtml(r.justificativa || '')}</textarea>
        </td>
      </tr>
    `;
    })
    .join('');
}

function setupEventDelegation() {
  document.addEventListener('change', async (e) => {
    const target = e.target;
    if (!target) return;

    const action = target.getAttribute('data-action');
    if (action === 'save-bh') {
      await handleSaveAnotacaoBh(target);
    } else if (action === 'save-he') {
      await handleSaveAnotacaoHe(target);
    }
  });

  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    if (action === 'open-extrato') {
      const colabId = target.getAttribute('data-colab-id');
      if (colabId) {
        await openModalExtrato(parseInt(colabId, 10));
      }
    }
  });
}

async function handleSaveAnotacaoBh(inputEl) {
  const colabId = parseInt(inputEl.getAttribute('data-colab-id'), 10);
  const field = inputEl.getAttribute('data-field');
  const val = inputEl.value;

  if (!colabId || !field) return;

  const row = inputEl.closest('tr');
  const gestorInput = row?.querySelector('[data-field="nome_gestor"]');
  const admInput = row?.querySelector('[data-field="adm_responsavel"]');
  const obsInput = row?.querySelector('[data-field="observacao"]');

  const payload = {
    colaborador_id: colabId,
    nome_gestor: gestorInput ? gestorInput.value : null,
    adm_responsavel: admInput ? admInput.value : null,
    observacao: obsInput ? obsInput.value : null,
  };

  try {
    inputEl.classList.add('border-blue-400');
    const resp = await apiFetch('/app/api/index.php?route=horas&action=anotacao-bh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      inputEl.classList.remove('border-blue-400');
      inputEl.classList.add('border-emerald-500');
      setTimeout(() => inputEl.classList.remove('border-emerald-500'), 1500);
    }
  } catch (err) {
    console.error('Falha ao salvar anotação do banco de horas:', err);
    inputEl.classList.add('border-rose-500');
  }
}

async function handleSaveAnotacaoHe(inputEl) {
  const colabId = parseInt(inputEl.getAttribute('data-colab-id'), 10);
  const date = inputEl.getAttribute('data-date');
  const field = inputEl.getAttribute('data-field');

  if (!colabId || !date || !field) return;

  const row = inputEl.closest('tr');
  const gestorInput = row?.querySelector('[data-field="nome_gestor"]');
  const admInput = row?.querySelector('[data-field="adm_responsavel"]');
  const sobreavisoSelect = row?.querySelector('[data-field="sobreaviso"]');
  const justInput = row?.querySelector('[data-field="justificativa"]');

  const user = getUser();
  const payload = {
    colaborador_id: colabId,
    data: date,
    nome_gestor: gestorInput ? gestorInput.value : null,
    adm_responsavel: admInput ? admInput.value : null,
    sobreaviso: sobreavisoSelect ? sobreavisoSelect.value : '',
    justificativa: justInput ? justInput.value : null,
    user: user ? user.name || user.usuario : null,
  };

  try {
    inputEl.classList.add('border-blue-400');
    const resp = await apiFetch('/app/api/index.php?route=horas&action=anotacao-he', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      inputEl.classList.remove('border-blue-400');
      inputEl.classList.add('border-emerald-500');
      setTimeout(() => inputEl.classList.remove('border-emerald-500'), 1500);
    }
  } catch (err) {
    console.error('Falha ao salvar anotação de hora extra:', err);
    inputEl.classList.add('border-rose-500');
  }
}

function setupModalExtrato() {
  const modal = document.getElementById('modalExtratoBancoHoras');
  const btnClose = document.getElementById('btnCloseModalExtrato');
  const btnCloseFooter = document.getElementById('btnFecharModalExtratoRodape');

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

async function openModalExtrato(colaboradorId) {
  const modal = document.getElementById('modalExtratoBancoHoras');
  const tbody = document.getElementById('tbodyExtratoDetalhe');
  const nomeEl = document.getElementById('extratoColabNome');
  const infoEl = document.getElementById('extratoColabInfo');
  const totalDiasEl = document.getElementById('extratoTotalDias');
  const heTotalEl = document.getElementById('extratoHeTotal');
  const absentTotalEl = document.getElementById('extratoAbsentTotal');

  if (!modal || !tbody) return;

  modal.classList.remove('hidden');
  tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-500">Carregando espelho do colaborador...</td></tr>';

  try {
    const resp = await apiFetch(`/app/api/index.php?route=horas&action=extrato&colaborador_id=${colaboradorId}`);
    if (!resp.ok) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-rose-500">Erro ao carregar extrato.</td></tr>';
      return;
    }
    const json = await resp.json();
    const data = json.data || json;

    const colab = data.colaborador || {};
    const resumo = data.resumo || {};
    const registros = data.dados || [];

    if (nomeEl) nomeEl.textContent = `Extrato — ${colab.nome || 'Colaborador'}`;
    if (infoEl) infoEl.textContent = `CC: ${colab.cc || '-'} • Função: ${colab.funcao || '-'} • Turno: ${colab.turno || '-'} • Matrícula: ${colab.matricula || '-'}`;
    if (totalDiasEl) totalDiasEl.textContent = resumo.total_dias || registros.length;
    if (heTotalEl) heTotalEl.textContent = resumo.he_total || '00:00';
    if (absentTotalEl) absentTotalEl.textContent = resumo.absent_total || '00:00';

    if (registros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-500">Nenhuma batida de ponto encontrada para este colaborador.</td></tr>';
      return;
    }

    tbody.innerHTML = registros
      .map((r) => {
        const dataBr = r.data ? r.data.split('-').reverse().join('/') : '-';
        return `
        <tr class="hover:bg-slate-50 transition horas-tr-row">
          <td class="py-2 px-3 font-semibold text-slate-800 horas-text">${escapeHtml(dataBr)}</td>
          <td class="py-2 px-3 text-slate-600 horas-text-sub">${escapeHtml(r.dia_abreviado || r.dia_semana || '-')}</td>
          <td class="py-2 px-3 text-center text-slate-700 horas-text">${escapeHtml(r.primeira_entrada || '-')}</td>
          <td class="py-2 px-3 text-center text-slate-700 horas-text">${escapeHtml(r.ultima_saida || '-')}</td>
          <td class="py-2 px-3 text-center font-medium ${r.he_min > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}">${escapeHtml(r.he_formatado || r.he || '-')}</td>
          <td class="py-2 px-3 text-center font-medium ${r.absent_min > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">${escapeHtml(r.absent_formatado || r.absent || '-')}</td>
          <td class="py-2 px-3 text-slate-500 horas-text-sub">${escapeHtml(r.observacao || '-')}</td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-rose-500">Falha ao abrir extrato: ${escapeHtml(err.message)}</td></tr>`;
  }
}
