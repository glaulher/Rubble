let auditReference = null;
let auditResults = [];

function initPdfAudit() {
  auditReference = null;
  auditResults = [];

  const referenceInput = document.getElementById('referenceInput');
  if (referenceInput) {
    referenceInput.addEventListener('change', handleReferenceUpload);
  }

  const auditInput = document.getElementById('auditInput');
  if (auditInput) {
    auditInput.addEventListener('change', handleAuditFileSelect);
  }

  const runAuditBtn = document.getElementById('runAuditBtn');
  if (runAuditBtn) {
    runAuditBtn.addEventListener('click', runAudit);
  }

  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', downloadCsv);
  }

  const clearReferenceBtn = document.getElementById('clearReferenceBtn');
  if (clearReferenceBtn) {
    clearReferenceBtn.addEventListener('click', clearReference);
  }

  checkExistingReference();
}

async function checkExistingReference() {
  try {
    const resp = await apiFetch('/app/api/index.php?route=pdf-audit&action=get-reference');
    const result = await resp.json();
    if (result.success && result.data && result.data.reference) {
      auditReference = result.data;
      showReferencePreview(result.data);
    }
  } catch (e) {
    console.log('Nenhuma referência existente');
  }
}

async function handleReferenceUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const filenameEl = document.getElementById('referenceFilename');
  if (filenameEl) {
    filenameEl.textContent = file.name;
    filenameEl.classList.remove('hidden');
  }

  const formData = new FormData();
  formData.append('file', file);

  showToast('Enviando referência...', 'loading');

  try {
    const result = await uploadWithProgress(
      '/app/api/index.php?route=pdf-audit&action=set-reference',
      formData,
      {}
    );

    dismissToast();

    if (!result.success) {
      showToast(result.message || 'Erro ao processar referência', 'error');
      return;
    }

    auditReference = result.data;
    showToast('Referência definida com sucesso', 'success');
    showReferencePreview(result.data);
  } catch (err) {
    dismissToast();
    showToast('Erro ao enviar referência', 'error');
    console.error(err);
  }
}

function showReferencePreview(data) {
  const preview = document.getElementById('referencePreview');
  const fieldsEl = document.getElementById('referenceFields');
  const checklistCount = document.getElementById('refChecklistCount');
  const imageCount = document.getElementById('refImageCount');
  const stepAudit = document.getElementById('stepAudit');
  const clearBtn = document.getElementById('clearReferenceBtn');

  if (preview) preview.classList.remove('hidden');
  if (stepAudit) stepAudit.classList.remove('hidden');
  if (clearBtn) clearBtn.classList.remove('hidden');

  if (fieldsEl) {
    const ref = data.reference || {};
    const fields = ref.fields || {};
    const info = [
      { label: 'Site', value: fields.nome_site },
      { label: 'Equipamento', value: fields.equipamento },
      { label: 'Fabricante', value: fields.fabricante },
      { label: 'Localização', value: fields.localizacao },
      { label: 'Potência', value: fields.potencia },
      { label: 'Situação', value: fields.situacao_final }
    ];

    fieldsEl.innerHTML = info.map(i =>
      `<div><span class="text-slate-400">${i.label}:</span> <span class="text-slate-700 font-medium">${i.value || '-'}</span></div>`
    ).join('');
  }

  if (checklistCount) {
    checklistCount.textContent = data.reference?.checklist_count || 0;
  }
  if (imageCount) {
    imageCount.textContent = data.reference?.image_count || 0;
  }

  const statusEl = document.getElementById('auditStatus');
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-emerald-300">Referência: ${data.reference?.fields?.nome_site || 'definida'}</span>`;
  }
}

function handleAuditFileSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (files.length > 10) {
    showToast('Máximo de 10 arquivos por vez', 'error');
    return;
  }

  const filenames = document.getElementById('auditFilenames');
  if (filenames) {
    filenames.textContent = Array.from(files).map(f => f.name).join(', ');
  }

  const runBtn = document.getElementById('runAuditBtn');
  if (runBtn) {
    runBtn.classList.remove('hidden');
  }

  showToast(`${files.length} arquivo(s) selecionado(s)`, 'success');
}

async function runAudit() {
  const input = document.getElementById('auditInput');
  const files = input?.files;
  if (!files || files.length === 0) {
    showToast('Selecione os PDFs para auditar', 'error');
    return;
  }

  const runBtn = document.getElementById('runAuditBtn');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = 'Auditando...';
  }

  const progress = document.getElementById('auditProgress');
  const progressBar = document.getElementById('auditProgressBar');
  const progressText = document.getElementById('auditProgressText');
  if (progress) progress.classList.remove('hidden');

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files[' + i + ']', files[i]);
  }

  showToast('Auditando relatórios...', 'loading');

  try {
    const result = await uploadWithProgress(
      '/app/api/index.php?route=pdf-audit&action=audit',
      formData,
      {}
    );

    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = 'Concluído';

    dismissToast();

    if (!result.success) {
      showToast(result.message || 'Erro na auditoria', 'error');
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = 'Auditar';
      }
      return;
    }

    auditResults = result.results || [];

    renderResults(auditResults);
    showToast(`${result.approved} aprovado(s), ${result.rejected} rejeitado(s)`, 'success');
  } catch (err) {
    dismissToast();
    showToast('Erro ao auditar PDFs', 'error');
    console.error(err);
  } finally {
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = 'Auditar';
    }
  }
}

function renderResults(results) {
  const container = document.getElementById('auditResults');
  const stepResults = document.getElementById('stepResults');
  const summary = document.getElementById('resultsSummary');
  const csvBtn = document.getElementById('downloadCsvBtn');

  if (stepResults) stepResults.classList.remove('hidden');
  if (csvBtn) csvBtn.classList.remove('hidden');

  const approved = results.filter(r => r.approved).length;
  const rejected = results.filter(r => !r.approved).length;

  if (summary) {
    summary.textContent = `${results.length} relatórios — ${approved} aprovados, ${rejected} rejeitados`;
  }

  if (container) {
    container.innerHTML = results.map(r => buildAuditCardHtml(r)).join('');
  }

  if (typeof applyRoleVisibility === 'function') {
    applyRoleVisibility();
  }
}

function buildAuditCardHtml(result) {
  const approved = result.approved;
  const nokItems = result.nok_items || [];
  const photoIssues = result.photo_issues || [];
  const errors = result.errors || [];

  const statusBadge = approved
    ? '<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">APROVADO</span>'
    : '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">REPROVADO</span>';

  let nokHtml = '';
  if (nokItems.length > 0) {
    nokHtml = `
      <div class="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
        <p class="text-sm font-semibold text-red-700 mb-1">Itens NOK (${nokItems.length}):</p>
        <ul class="text-xs text-red-600 space-y-0.5">
          ${nokItems.map(i => `<li>• [${i.secao}] ${i.numero} - ${escapeHtml(i.descricao)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  let photoHtml = '';
  if (photoIssues.length > 0) {
    photoHtml = `
      <div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p class="text-sm font-semibold text-amber-700 mb-1">Fotos com problema (${photoIssues.length}):</p>
        <ul class="text-xs text-amber-600 space-y-0.5">
          ${photoIssues.map(p => `<li>• Foto "${escapeHtml(p.label)}": ${p.issues.join(', ') || 'reprovada'}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  let fieldsHtml = '';
  const emptyFields = result.empty_fields || [];
  if (emptyFields.length > 0) {
    fieldsHtml = `
      <div class="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
        <p class="text-sm font-semibold text-red-700 mb-1">Campos ausentes:</p>
        <ul class="text-xs text-red-600 space-y-0.5">
          ${emptyFields.map(f => `<li>• ${escapeHtml(f)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `
    <div class="card-item bg-white rounded-2xl shadow-sm hover:shadow-xl transition border border-slate-200 p-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-slate-800">${escapeHtml(result.filename || 'Desconhecido')}</h3>
          ${result.fields?.equipamento ? `<p class="text-sm text-slate-500">${escapeHtml(result.fields.equipamento)}</p>` : ''}
        </div>
        ${statusBadge}
      </div>
      ${result.fields?.situacao_final ? `<p class="mt-2 text-sm text-slate-500">Situação Final: <strong>${escapeHtml(result.fields.situacao_final)}</strong></p>` : ''}
      ${nokHtml}
      ${photoHtml}
      ${fieldsHtml}
    </div>
  `;
}

function downloadCsv() {
  if (!auditResults || auditResults.length === 0) {
    showToast('Nenhum resultado para exportar', 'error');
    return;
  }

  const header = 'Arquivo;Status;Itens NOK;Fotos Problema;Campos Ausentes';
  const rows = auditResults.map(r => {
    const nok = (r.nok_items || []).map(i => i.descricao).join('; ');
    const photos = (r.photo_issues || []).map(p => `${p.label} (${p.issues.join(', ') || 'reprovada'})`).join('; ');
    const empty = (r.empty_fields || []).join('; ');
    return [
      sanitizeCSV(r.filename || 'desconhecido'),
      r.approved ? 'APROVADO' : 'REPROVADO',
      sanitizeCSV(nok),
      sanitizeCSV(photos),
      sanitizeCSV(empty)
    ].join(';');
  });

  const csvContent = '\uFEFF' + header + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'auditoria_relatorios.csv';
  a.click();
  URL.revokeObjectURL(url);

  showToast('CSV baixado com sucesso', 'success');
}

async function clearReference() {
  try {
    await fetch('/app/api/index.php?route=pdf-audit&action=clear-reference');
  } catch (e) {
    console.error(e);
  }
  auditReference = null;
  auditResults = [];

  const preview = document.getElementById('referencePreview');
  const stepAudit = document.getElementById('stepAudit');
  const stepResults = document.getElementById('stepResults');
  const clearBtn = document.getElementById('clearReferenceBtn');
  const csvBtn = document.getElementById('downloadCsvBtn');
  const resultsContainer = document.getElementById('auditResults');
  const auditInput = document.getElementById('auditInput');
  const runBtn = document.getElementById('runAuditBtn');

  if (preview) preview.classList.add('hidden');
  if (stepAudit) stepAudit.classList.add('hidden');
  if (stepResults) stepResults.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (csvBtn) csvBtn.classList.add('hidden');
  if (resultsContainer) resultsContainer.innerHTML = '';
  if (auditInput) auditInput.value = '';
  if (runBtn) runBtn.classList.add('hidden');

  const statusEl = document.getElementById('auditStatus');
  if (statusEl) {
    statusEl.textContent = 'Aguardando referência';
  }

  const filenames = document.getElementById('auditFilenames');
  if (filenames) filenames.textContent = '';

  const filenameEl = document.getElementById('referenceFilename');
  if (filenameEl) {
    filenameEl.classList.add('hidden');
    filenameEl.textContent = '';
  }

  showToast('Referência removida', 'success');
}

window.initPdfAudit = initPdfAudit;
