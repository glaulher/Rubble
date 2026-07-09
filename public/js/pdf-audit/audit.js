let auditReference = null;
let auditResults = [];
let selectedPhotoIndices = new Set();
let aiEnabled = true;
let maxAuditFiles = 10;
let _auditSimTimer = null;

function resetAuditCounts() {
  const el = document.getElementById('auditCenterBadgeText');
  if (el) el.innerHTML = '<span class="text-emerald-300">0</span> aprovado - <span class="text-red-300">0</span> rejeitado';
}

function updateAuditCounts(approved, rejected) {
  const el = document.getElementById('auditCenterBadgeText');
  if (el) el.innerHTML = '<span class="text-emerald-300">' + approved + '</span> aprovado - <span class="text-red-300">' + rejected + '</span> rejeitado';
}

function initPdfAudit() {
  auditReference = null;
  auditResults = [];
  selectedPhotoIndices = new Set();
  aiEnabled = true;
  maxAuditFiles = 10;
  resetAuditCounts();

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

  const clearBtn = document.getElementById('clearReferenceBtnInner');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearReference);
  }

  const aiToggleBtn = document.getElementById('aiToggleBtn');
  if (aiToggleBtn) {
    aiToggleBtn.addEventListener('click', toggleAi);
  }

  const resultsContainer = document.getElementById('auditResults');
  if (resultsContainer) {
    resultsContainer.addEventListener('click', handleResultsClick);
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
    // sem referência existente
  }
}

function toggleAi() {
  aiEnabled = !aiEnabled;
  maxAuditFiles = aiEnabled ? 10 : 30;
  const btn = document.getElementById('aiToggleBtn');
  const label = document.getElementById('aiToggleLabel');
  const tooltip = document.getElementById('aiToggleTooltip');
  const desc = document.getElementById('auditStepDesc');
  if (aiEnabled) {
    btn.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors bg-emerald-500/20 text-emerald-300';
    label.textContent = 'IA';
    if (tooltip) tooltip.textContent = 'Análise por IA: ligada';
  } else {
    btn.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors bg-slate-500/20 text-slate-400';
    label.textContent = 'OCR';
    if (tooltip) tooltip.textContent = 'Análise sem IA: apenas OCR e qualidade básica';
  }
  if (desc) desc.textContent = `Selecione até ${maxAuditFiles} PDFs de relatórios para auditar contra a referência.`;

  // Update photo checkbox visibility if reference is loaded
  if (auditReference) {
    const photosContainer = document.getElementById('referencePhotos');
    const photoList = document.getElementById('referencePhotoList');
    const photosHeading = document.querySelector('#referencePhotos h4');
    if (photosContainer && photoList && photosHeading) {
      const photoScores = auditReference.reference?.photo_scores || [];
      if (photoScores.length > 0) {
        if (aiEnabled) {
          photosContainer.classList.remove('hidden');
          photosHeading.classList.remove('hidden');
          photoList.classList.remove('hidden');
        } else {
          photosHeading.classList.add('hidden');
          photoList.classList.add('hidden');
        }
      }
    }
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

  const progress = document.getElementById('referenceProgress');
  const progressBar = document.getElementById('referenceProgressBar');
  const progressText = document.getElementById('referenceProgressText');
  if (progress) progress.classList.remove('hidden');

  // Simulation fills gap between upload (0-50%) and response
  _auditSimTimer = setInterval(() => {
    if (!progressBar) return;
    const cur = parseFloat(progressBar.style.width) || 0;
    if (cur < 90) {
      const inc = (90 - cur) * 0.04 + 0.2;
      const next = Math.min(90, cur + inc);
      progressBar.style.width = next + '%';
      if (progressText) progressText.textContent = 'Processando... ' + Math.round(next) + '%';
    }
  }, 500);

  try {
    const result = await uploadWithProgress(
      '/app/api/index.php?route=pdf-audit&action=set-reference',
      formData,
      {
        onProgress: (pct) => {
          // Map real upload (0-100%) to first half of bar (0-50%)
          const mapped = Math.round(pct * 0.5);
          if (progressBar) progressBar.style.width = mapped + '%';
          if (progressText) progressText.textContent = 'Enviando... ' + mapped + '%';
        }
      }
    );

    if (_auditSimTimer) {
      clearInterval(_auditSimTimer);
      _auditSimTimer = null;
    }
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = 'Processando resposta...';

    if (!result.success) {
      showToast(result.message || 'Erro ao processar referência', 'error');
      if (progress) setTimeout(() => progress.classList.add('hidden'), 800);
      return;
    }

    auditReference = result.data;
    showToast('Referência definida com sucesso', 'success');
    showReferencePreview(result.data);
    if (progress) setTimeout(() => progress.classList.add('hidden'), 800);
  } catch (err) {
    if (_auditSimTimer) {
      clearInterval(_auditSimTimer);
      _auditSimTimer = null;
    }
    if (progress) progress.classList.add('hidden');
    showToast('Erro ao enviar referência', 'error');
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

  const photoList = document.getElementById('referencePhotoList');
  const photosContainer = document.getElementById('referencePhotos');
  const photoScores = data.reference?.photo_scores || [];
  const photosHeading = document.querySelector('#referencePhotos h4');

  if (photoList && photosContainer && photoScores.length > 0) {
    photosContainer.classList.remove('hidden');
    selectedPhotoIndices = new Set(photoScores.map(p => p.index));

    if (aiEnabled) {
      if (photosHeading) photosHeading.classList.remove('hidden');
      photoList.classList.remove('hidden');

      photoList.innerHTML = photoScores.map(p => {
        const scoreClass = p.score < 0.02 ? 'text-red-600' : p.score < 0.1 ? 'text-amber-600' : 'text-slate-600';
        return `
          <label class="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5">
            <input type="checkbox" class="photo-checkbox rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                   data-index="${p.index}" checked>
            <span class="text-slate-700">${escapeHtml(p.label)}</span>
            <span class="${scoreClass} font-mono">${p.score.toFixed(4)}</span>
          </label>
        `;
      }).join('');

      photoList.querySelectorAll('.photo-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
          const idx = parseInt(this.dataset.index);
          if (this.checked) {
            selectedPhotoIndices.add(idx);
          } else {
            selectedPhotoIndices.delete(idx);
          }
        });
      });
    } else {
      if (photosHeading) photosHeading.classList.add('hidden');
      photoList.classList.add('hidden');
      photoList.innerHTML = '';
    }
  } else if (photosContainer) {
    photosContainer.classList.add('hidden');
  }
}

function handleAuditFileSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (files.length > maxAuditFiles) {
    showToast(`Máximo de ${maxAuditFiles} arquivos por vez`, 'error');
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

  if (files.length > maxAuditFiles) {
    showToast(`Máximo de ${maxAuditFiles} arquivos por vez`, 'error');
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

  let photoIndicesStr = '';
  if (auditReference?.reference?.photo_scores) {
    const allCount = auditReference.reference.photo_scores.length;
    const allIndices = Array.from({length: allCount}, (_, i) => i);
    const selected = Array.from(selectedPhotoIndices).sort((a,b) => a-b);
    const allSelected = selected.length === allCount && selected.every((v,i) => v === allIndices[i]);
    if (!allSelected) {
      photoIndicesStr = selected.join(',');
    }
  }

  if (photoIndicesStr && aiEnabled) {
    formData.append('photo_indices', photoIndicesStr);
  }
  formData.append('ai_enabled', aiEnabled ? 'true' : 'false');

  // Simulation fills gap between upload (0-50% of bar) and response
  _auditSimTimer = setInterval(() => {
    if (!progressBar) return;
    const cur = parseFloat(progressBar.style.width) || 0;
    if (cur < 90) {
      const inc = (90 - cur) * 0.04 + 0.2;
      const next = Math.min(90, cur + inc);
      progressBar.style.width = next + '%';
      if (progressText) progressText.textContent = 'Processando... ' + Math.round(next) + '%';
    }
  }, 500);

  try {
    const result = await uploadWithProgress(
      '/app/api/index.php?route=pdf-audit&action=audit',
      formData,
      {
        onProgress: (pct) => {
          // Map real upload (0-100%) to first half of bar (0-50%)
          const mapped = Math.round(pct * 0.5);
          if (progressBar) progressBar.style.width = mapped + '%';
          if (progressText) progressText.textContent = 'Enviando... ' + mapped + '%';
        }
      }
    );

    if (_auditSimTimer) {
      clearInterval(_auditSimTimer);
      _auditSimTimer = null;
    }
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = 'Processando resultados...';

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
    if (_auditSimTimer) {
      clearInterval(_auditSimTimer);
      _auditSimTimer = null;
    }
    dismissToast();
    showToast('Erro ao auditar PDFs', 'error');
  } finally {
    if (_auditSimTimer) {
      clearInterval(_auditSimTimer);
      _auditSimTimer = null;
    }
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = 'Auditar';
    }
    if (progress) setTimeout(() => progress.classList.add('hidden'), 800);
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

  updateAuditCounts(approved, rejected);

  if (container) {
    container.innerHTML = results.map(r => buildAuditCardHtml(r)).join('');
  }

  if (typeof applyRoleVisibility === 'function') {
    applyRoleVisibility();
  }
}

function buildPhotoComparisonHtml(result) {
  const images = result.images || [];
  if (images.length === 0) return '';

  const refScores = auditReference?.reference?.photo_scores || [];

  function matchRef(label) {
    const clean = label.trim().toLowerCase().replace(/\s*\(extra\)\s*$/, '');
    return refScores.find(function(r) {
      return r.label.trim().toLowerCase() === clean;
    });
  }

  var rows = images.map(function(img) {
    var ref = matchRef(img.label);
    var refScore = ref ? ref.score.toFixed(4) : '-';
    var audScore = (img.clip_score !== null && img.clip_score !== undefined)
      ? img.clip_score.toFixed(4)
      : '-';
    var isExtra = img.label.indexOf('(extra)') !== -1;
    var label = img.label.replace(/\s*\(extra\)\s*$/, '');
    var statusHtml, issueHtml;

    if (img.approved) {
      statusHtml = '<span class="text-emerald-600 font-semibold">APROVADO</span>';
    } else {
      statusHtml = '<span class="text-red-600 font-semibold">REPROVADO</span>';
    }

    if (img.issues && img.issues.length > 0) {
      issueHtml = '<span class="text-red-500 text-xs ml-1">(' + img.issues.join(', ') + ')</span>';
    } else {
      issueHtml = '';
    }

    var rowClass = img.approved ? '' : 'bg-red-50';

    return '<tr class="' + rowClass + '">'
      + '<td class="px-2 py-1 text-xs text-slate-700">' + escapeHtml(label) + '</td>'
      + '<td class="px-2 py-1 text-xs font-mono text-slate-500">' + (isExtra ? '\u2014' : refScore) + '</td>'
      + '<td class="px-2 py-1 text-xs font-mono ' + (img.approved ? 'text-slate-500' : 'text-red-600') + '">' + audScore + '</td>'
      + '<td class="px-2 py-1 text-xs">' + statusHtml + issueHtml + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="mt-3">'
    + '<p class="text-sm font-semibold text-slate-700 mb-1">Compara\u00e7\u00e3o de Fotos</p>'
    + '<div class="overflow-x-auto">'
    + '<table class="w-full text-left border-collapse">'
    + '<thead>'
    + '<tr class="bg-slate-100">'
    + '<th class="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</th>'
    + '<th class="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score Ref.</th>'
    + '<th class="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score Aud.</th>'
    + '<th class="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>'
    + '</tr>'
    + '</thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table>'
    + '</div>'
    + '</div>';
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

  let errorsHtml = '';
  if (errors.length > 0) {
    errorsHtml = `
      <div class="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
        <p class="text-sm font-semibold text-red-700 mb-1">Motivos da reprovação (${errors.length}):</p>
        <ul class="text-xs text-red-600 space-y-0.5">
          ${errors.map(e => `<li>• ${escapeHtml(e)}</li>`).join('')}
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

  const photoComparisonHtml = buildPhotoComparisonHtml(result);

  const safeId = (result.filename || 'file').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `
    <div class="card-item bg-white rounded-2xl shadow-sm hover:shadow-xl transition border border-slate-200" data-audit-id="${escapeHtml(safeId)}">
      <div class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium text-slate-800">${result.fields?.nome_site ? escapeHtml(result.fields.nome_site) + ' - ' : ''}${escapeHtml(result.filename || 'Desconhecido')}</h3>
            ${result.fields?.equipamento ? `<p class="text-sm text-slate-500">${escapeHtml(result.fields.equipamento)}</p>` : ''}
          </div>
          ${statusBadge}
        </div>
        ${result.fields?.situacao_final
          ? `<p class="mt-2 text-sm text-slate-500">Situação Final: <strong class="text-slate-700">${escapeHtml(result.fields.situacao_final)}</strong></p>`
          : ''}
        ${buttonHtml('neutral', 'Ver', { class: 'toggle-details-btn text-sm mt-3', 'data-toggle-id': escapeHtml(safeId) })}
      </div>
      <div id="det-${escapeHtml(safeId)}" class="hidden border-t border-slate-200 p-5 pt-4">${errorsHtml}${nokHtml}${photoHtml}${fieldsHtml}${photoComparisonHtml}</div>
    </div>
  `;
}

function handleResultsClick(e) {
  const btn = e.target.closest('[data-toggle-id]');
  if (!btn) return;
  const id = btn.dataset.toggleId;
  const det = document.getElementById('det-' + id);
  if (det) {
    det.classList.toggle('hidden');
    btn.textContent = det.classList.contains('hidden') ? 'Ver' : 'Ocultar';
  }
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
  dismissToast();
  if (_auditSimTimer) {
    clearInterval(_auditSimTimer);
    _auditSimTimer = null;
  }
  try {
    await fetch('/app/api/index.php?route=pdf-audit&action=clear-reference', { method: 'POST' });
  } catch (e) {
    // ignore
  }
  auditReference = null;
  auditResults = [];
  selectedPhotoIndices = new Set();

  const preview = document.getElementById('referencePreview');
  const stepAudit = document.getElementById('stepAudit');
  const stepResults = document.getElementById('stepResults');
  const clearBtn = document.getElementById('clearReferenceBtn');
  const csvBtn = document.getElementById('downloadCsvBtn');
  const resultsContainer = document.getElementById('auditResults');
  const auditInput = document.getElementById('auditInput');
  const runBtn = document.getElementById('runAuditBtn');
  const photosContainer = document.getElementById('referencePhotos');
  const refProgress = document.getElementById('referenceProgress');
  const auditProgress = document.getElementById('auditProgress');

  if (preview) preview.classList.add('hidden');
  if (stepAudit) stepAudit.classList.add('hidden');
  if (stepResults) stepResults.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (csvBtn) csvBtn.classList.add('hidden');
  if (resultsContainer) resultsContainer.innerHTML = '';
  if (auditInput) auditInput.value = '';
  const referenceInput = document.getElementById('referenceInput');
  if (referenceInput) referenceInput.value = '';
  if (runBtn) runBtn.classList.add('hidden');
  if (photosContainer) photosContainer.classList.add('hidden');
  if (refProgress) refProgress.classList.add('hidden');
  if (auditProgress) auditProgress.classList.add('hidden');

  resetAuditCounts();

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
