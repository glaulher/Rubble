import { createInfiniteScroll } from '/public/js/components/infinite-scroll.js';

let plannedSearch = '';
let plannedDateFrom = '';
let plannedDateTo = '';
let plannedStatusFilter = '';
let plannedEquipOptions = [];
let plannedLocalOptions = [];
let _plannedScroll = null;

const PLANNED_LIMIT = 20;

const PLANNED_STATUS_BADGES = {
  'planejado': 'bg-amber-100 text-amber-700',
  'concluído': 'bg-emerald-100 text-emerald-700',
  'concluido': 'bg-emerald-100 text-emerald-700',
  'pendente': 'bg-red-100 text-red-700',
  'em andamento': 'bg-blue-100 text-blue-800',
  'projeto clean up': 'bg-purple-100 text-purple-700',
};

const PLANNED_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function duplicateDayIconHtml(dateStr) {
  if (!canEditPlanned()) return '';
  var safeDate = dateStr.replace(/"/g, '\\"');
  return '<button class="inline-flex items-center justify-center text-slate-400 hover:text-emerald-600 ml-2 align-middle transition-colors" data-action="duplicate-day" data-date="' + safeDate + '" aria-label="Duplicar programação deste dia" title="Duplicar programação">' +
    '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
    '</svg>' +
  '</button>';
}

function formatDateTimeline(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const dt = new Date(ano, mes, dia);
  const diaSemana = DIAS_SEMANA[dt.getDay()];
  return diaSemana + ', ' + dia + ' de ' + PLANNED_MESES[mes] + ' de ' + ano;
}

function plannedStatusBadgeHtml(status) {
  if (!status) return '';
  const lower = status.toLowerCase().trim();
  const colorClass = PLANNED_STATUS_BADGES[lower] || 'bg-slate-100 text-slate-700';
  return '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium ' + colorClass + '">' + escapeHtml(status) + '</span>';
}

function canEditPlanned() {
  if (typeof getUser !== 'function') return false;
  var user = getUser();
  return user && (user.role === 'admin' || user.role === 'coordenador');
}

function buildPlannedCardHtml(item) {
  var tipo = item.tipo || 'preventiva';
  var equipName = item.equipamento || 'N/A';
  var localidade = item.localidade || '';
  var capacidade = item.capacidade || '';
  var local = item.local || '';
  var localScm = item.local_scm || '';
  var material = item.material || (tipo === 'preventiva' ? '' : 'Sim');

  var capacidadeHtml = capacidade ? '<span class="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-medium">' + escapeHtml(capacidade) + ' TR</span>' : '';
  var localHtml = local
    ? '<p class="text-xs font-semibold ' + (mercadoTextColor || 'text-slate-600') + '">' + escapeHtml(local) + (localScm ? ' - ' + escapeHtml(localScm) : '') + (localidade ? ' \u2014 ' + escapeHtml(localidade) : '') + '</p>'
    : '';

  var statusBadge = plannedStatusBadgeHtml(item.status);
  var tipoBadge = tipo === 'corretiva'
    ? '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">Corretiva</span>'
    : '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">Preventiva</span>';
  var equipe = item.equipe || 'A definir';

  var canEdit = false;
  if (typeof getUser === 'function') {
    var user = getUser();
    if (user && (user.role === 'admin' || user.role === 'coordenador')) {
      canEdit = true;
    }
  }

  var mercado = item.mercado || '';
  var mercadoBadge = '';
  if (mercado) {
    var m = mercado.toLowerCase();
    var corMercado = m === 'residencial'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-purple-100 text-purple-700';
    mercadoBadge = '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium ' + corMercado + '">' + escapeHtml(mercado) + '</span>';
  }

  var mercadoTextColor = '';
  if (mercado) {
    var m = mercado.toLowerCase();
    mercadoTextColor = m === 'residencial'
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-purple-700 dark:text-purple-400';
  }

  var obs = item.obs || '';
  var obsDisplay = obs ? escapeHtml(obs) : '<span class="text-slate-400 italic">Adicionar observação...</span>';
  var obsIcon = canEdit ? '<button class="inline-flex items-center justify-center text-blue-400 hover:text-blue-600 align-middle obs-edit-btn shrink-0" data-action="edit-obs" aria-label="Editar observação"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>' : '';
  var obsHtml = '<div class="mt-2 text-xs border-t border-slate-100 dark:border-slate-700 pt-2">' +
    '<div class="flex items-start gap-2 obs-container">' +
      '<span class="text-slate-600 whitespace-pre-line leading-relaxed obs-text">' + obsDisplay + '</span>' +
      obsIcon +
    '</div>' +
  '</div>';

  var actionsHtml = '<div class="flex items-center gap-1">' +
      mercadoBadge +
      tipoBadge +
      statusBadge +
    '</div>';

  var extraBtns = '';
  var safeDate = (item.data_planejada || '').replace(/"/g, '\\"');

  var hasSla = item.sla_days && parseInt(item.sla_days, 10) > 0;

  if (tipo === 'preventiva') {
    var machineCount = item.machine_count || 0;
    extraBtns = iconButtonHtml('edit', 'Alterar status', { 'class': 'planned-status-btn', 'data-id': item.id, 'data-status': item.status || 'Planejado', 'data-date': item.data_planejada || '' });
    if (!hasSla && canEdit) {
      extraBtns += '<button class="inline-flex items-center justify-center bg-sky-100 hover:bg-sky-200 text-sky-600 p-2 rounded-xl relative group" data-action="set-sla" data-id="' + item.id + '" data-tipo="preventiva" aria-label="Definir SLA"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span class="absolute right-0 top-[50px] scale-0 group-hover:scale-100 origin-top-right transition-transform duration-200 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap border border-slate-600 z-50">Definir SLA</span></button>';
    }
    if (canEdit) {
      extraBtns += iconButtonHtml('delete', 'Excluir atividade', { 'class': 'planned-delete-btn', 'data-id': item.id });
    }
  } else {
    extraBtns = iconButtonHtml('edit', 'Alterar status', { 'class': 'planned-corretiva-status-btn', 'data-id': item.id, 'data-status': item.status || 'Pendente' });
    if (!hasSla && canEdit) {
      extraBtns += '<button class="inline-flex items-center justify-center bg-sky-100 hover:bg-sky-200 text-sky-600 p-2 rounded-xl relative group" data-action="set-sla" data-id="' + item.id + '" data-tipo="corretiva" data-date="' + safeDate + '" aria-label="Definir SLA"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span class="absolute right-0 top-[50px] scale-0 group-hover:scale-100 origin-top-right transition-transform duration-200 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap border border-slate-600 z-50">Definir SLA</span></button>';
    }
    if (canEdit) {
      extraBtns += iconButtonHtml('delete', 'Remover deste dia', { 'class': 'planned-delete-btn', 'data-id': item.id, 'data-date': safeDate });
    }
  }

  var headerHtml = '';

  if (tipo === 'preventiva') {
    headerHtml = '<div class="flex items-center gap-2 flex-wrap">' +
      '<span class="font-semibold text-sm ' + (mercadoTextColor || 'text-slate-800') + '">' + escapeHtml(local) + '</span>' +
      (item.os ? '<span class="text-sm text-slate-600 cursor-pointer hover:text-blue-600 hover:underline transition" data-action="copy-os" data-os="' + escapeHtml(item.os) + '" title="Clique para copiar">Ticket ' + escapeHtml(item.os) + '</span>' : '') +
      (machineCount > 0 ? '<span class="text-xs text-slate-500">\u2014 ' + machineCount + ' m\u00e1quina' + (machineCount > 1 ? 's' : '') + '</span>' : '') +
    '</div>';
  } else {
    headerHtml = '<div class="flex items-center gap-2 flex-wrap">' +
      '<span class="font-semibold text-sm text-slate-800 cursor-pointer hover:text-blue-600 hover:underline transition" data-action="copy-os" data-os="' + escapeHtml(item.os || '') + '" title="Clique para copiar">OS ' + escapeHtml(item.os || '') + '</span>' +
      '<span class="text-sm text-slate-600">' + escapeHtml(equipName) + '</span>' +
      capacidadeHtml +
    '</div>';
  }

  var cardDateAttr = tipo === 'corretiva' ? ' data-date="' + safeDate + '"' : '';
  var cardContentHtml =
    '<div class="flex items-start justify-between gap-3">' +
      '<div class="flex-1 min-w-0">' +
        headerHtml +
        (tipo !== 'preventiva' ? localHtml : '') +
      '</div>' +
      '<div class="flex items-center gap-2 shrink-0">' +
        actionsHtml +
        extraBtns +
      '</div>' +
    '</div>' +
    '<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">' +
      '<span class="team-name-wrap">Equipe: <strong class="text-slate-700 team-name-text">' + escapeHtml(equipe) + '</strong>' +
      (canEdit ? '<button class="inline-flex items-center justify-center text-blue-400 hover:text-blue-600 ml-0.5 align-middle team-edit-btn" data-action="edit-team" data-id="' + item.id + '" data-tipo="' + tipo + '" data-equipe="' + escapeHtml(equipe) + '" aria-label="Editar equipe"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>' : '') +
    '</span>' +
    (material ? '<span>Material: <strong class="text-slate-700">' + escapeHtml(material) + '</strong></span>' : '') +
    '</div>' +
    buildSlaLineHtml(item) +
    obsHtml;

function buildSlaLineHtml(item) {
  var slaDays = parseInt(item.sla_days, 10);
  if (!slaDays || slaDays <= 0) return '';
  var slaDayNum = parseInt(item.sla_day_number, 10) || 0;
  var exceeded = slaDayNum > slaDays ? slaDayNum - slaDays : 0;
  var lineClass = exceeded > 0 ? 'text-amber-600' : 'text-slate-500';
  var text = '';
  if (exceeded > 0) {
    text = slaDayNum + ' de ' + slaDays + ' · ' + exceeded + ' excedente' + (exceeded > 1 ? 's' : '');
  } else {
    text = slaDayNum + ' de ' + slaDays + ' dia' + (slaDays > 1 ? 's' : '') + ' programado' + (slaDays > 1 ? 's' : '');
  }
  return '<div class="mt-2 text-xs ' + lineClass + ' flex items-center gap-1">' +
    '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
    '<span>' + text + '</span>' +
    (canEditPlanned() ? iconButtonHtml('edit', 'Estender SLA', { 'class': 'extend-sla-btn', 'data-action': 'extend-sla', 'data-id': item.id, 'data-tipo': item.tipo || 'corretiva' }) : '') +
    '</div>';
}

  var dragHandleHtml = canEditPlanned()
    ? '<div class="drag-handle shrink-0 mt-4" draggable="true" title="Arrastar para reordenar" style="cursor: grab; touch-action: none;">' +
      '<svg class="w-5 h-5 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>' +
        '<circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>' +
        '<circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>' +
      '</svg>' +
    '</div>'
    : '';
  return '<div class="planned-card-wrapper flex items-start gap-1.5">' +
    dragHandleHtml +
    '<div class="planned-card flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow" data-id="' + item.id + '" data-tipo="' + tipo + '"' + cardDateAttr + ' data-sla-day-number="' + (item.sla_day_number || '') + '">' +
      cardContentHtml +
    '</div>' +
  '</div>';
}

function copyOs(os) {
  if (!os || os === '-') return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(os)
      .then(function () { showToast('N\u00ba OS copiado: ' + os, 'success'); })
      .catch(function () { fallbackCopy(os); });
  } else {
    fallbackCopy(os);
  }
}

function fallbackCopy(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('N\u00ba OS copiado: ' + text, 'success');
  } catch (_e) {
    showToast('Erro ao copiar', 'error');
  }
  document.body.removeChild(textarea);
}

function startTeamInlineEdit(btn) {
  var card = btn.closest('.planned-card');
  if (!card) return;
  var strong = card.querySelector('.team-name-text');
  if (!strong) return;
  var currentValue = strong.textContent;

  var input = document.createElement('input');
  input.type = 'text';
  input.value = currentValue;
  input.className = 'team-edit-input text-slate-700 dark:text-slate-200 text-xs bg-transparent border border-blue-300 dark:border-blue-600 rounded px-1 py-0.5 w-32 focus:outline-none focus:border-blue-500';
  input.dataset.originalValue = currentValue;
  input.dataset.id = btn.dataset.id;
  input.dataset.tipo = btn.dataset.tipo;

  strong.style.display = 'none';
  strong.parentNode.insertBefore(input, strong.nextSibling);
  input.focus();
  input.select();

  var saved = false;

  function doSave() {
    if (saved) return;
    saved = true;
    saveTeamInlineEdit(input, strong);
  }

  function doCancel() {
    if (saved) return;
    saved = true;
    cancelTeamInlineEdit(input, strong);
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      doCancel();
    }
  });

  input.addEventListener('blur', function () {
    doSave();
  });
}

function saveTeamInlineEdit(input, strong) {
  var newValue = input.value.trim();
  var originalValue = input.dataset.originalValue;
  var id = input.dataset.id;
  var tipo = input.dataset.tipo;

  if (newValue && newValue !== originalValue) {
    apiFetch('/app/api/index.php?route=planned-activities', {
      method: 'PUT',
      body: JSON.stringify({ id: parseInt(id, 10), equipe: newValue, tipo: tipo }),
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result && result.success) {
        strong.textContent = newValue;
      } else {
        showToast(result && result.message ? result.message : 'Erro ao atualizar equipe.', 'error');
      }
      finishTeamEdit(input, strong);
    })
    .catch(function () {
      showToast('Erro ao atualizar equipe.', 'error');
      finishTeamEdit(input, strong);
    });
  } else {
    finishTeamEdit(input, strong);
  }
}

function cancelTeamInlineEdit(input, strong) {
  finishTeamEdit(input, strong);
}

function finishTeamEdit(input, strong) {
  if (input && input.parentNode) {
    input.parentNode.removeChild(input);
  }
  if (strong) {
    strong.style.display = '';
  }
}

/*
|--------------------------------------------------------------------------
| Inline Observation Edit
|--------------------------------------------------------------------------
*/

function startObsInlineEdit(btn) {
  var container = btn.closest('.obs-container');
  if (!container) return;
  var span = container.querySelector('.obs-text');
  if (!span) return;
  var currentText = span.textContent;
  var placeholder = span.querySelector('.text-slate-400');
  var currentValue = placeholder ? '' : currentText;

  var textarea = document.createElement('textarea');
  textarea.value = currentValue;
  textarea.className = 'obs-edit-input text-xs w-full bg-transparent border border-blue-300 dark:border-blue-600 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500';
  textarea.dataset.originalValue = currentValue;
  textarea.style.minHeight = '40px';
  textarea.maxLength = 1000;

  var card = btn.closest('.planned-card');
  if (card) {
    textarea.dataset.id = card.dataset.id;
    textarea.dataset.tipo = card.dataset.tipo;
  }

  span.style.display = 'none';
  span.parentNode.insertBefore(textarea, span.nextSibling);
  textarea.focus();

  var saved = false;

  function doSave() {
    if (saved) return;
    saved = true;
    saveObsInlineEdit(textarea, span);
  }

  function doCancel() {
    if (saved) return;
    saved = true;
    cancelObsEdit(textarea, span);
  }

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textarea.blur();
    } else if (e.key === 'Escape') {
      doCancel();
    }
  });

  textarea.addEventListener('blur', function () {
    doSave();
  });
}

function saveObsInlineEdit(textarea, span) {
  var newValue = textarea.value.trim();
  var originalValue = textarea.dataset.originalValue;
  var id = textarea.dataset.id;
  var tipo = textarea.dataset.tipo;

  if (newValue !== originalValue) {
    apiFetch('/app/api/index.php?route=planned-activities&action=update-obs', {
      method: 'PUT',
      body: JSON.stringify({ id: parseInt(id, 10), tipo: tipo, obs: newValue }),
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result && result.success) {
        var displayText = newValue ? escapeHtml(newValue) : '<span class="text-slate-400 italic">Adicionar observação...</span>';
        span.innerHTML = displayText;
      } else {
        showToast(result && result.message ? result.message : 'Erro ao atualizar observação.', 'error');
      }
      finishObsEdit(textarea, span);
    })
    .catch(function () {
      showToast('Erro ao atualizar observação.', 'error');
      finishObsEdit(textarea, span);
    });
  } else {
    finishObsEdit(textarea, span);
  }
}

function cancelObsEdit(textarea, span) {
  finishObsEdit(textarea, span);
}

function finishObsEdit(textarea, span) {
  if (textarea && textarea.parentNode) {
    textarea.parentNode.removeChild(textarea);
  }
  if (span) {
    span.style.display = '';
  }
}

/*
|--------------------------------------------------------------------------
| Corretiva Status Modal
|--------------------------------------------------------------------------
*/

const CORRETIVA_STATUSES = ['Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up'];

function openCorretivaStatusModal(id, currentStatus) {
  var modal = document.getElementById('modalStatusCorretiva');
  if (!modal) return;
  document.getElementById('corretivaStatusId').value = id;

  var select = document.getElementById('corretivaStatusSelect');
  select.innerHTML = '';
  CORRETIVA_STATUSES.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === currentStatus) opt.selected = true;
    select.appendChild(opt);
  });

  modal.classList.remove('hidden');
}

function submitCorretivaStatus() {
  var id = parseInt(document.getElementById('corretivaStatusId').value, 10);
  var status = document.getElementById('corretivaStatusSelect').value;
  if (!id || !status) return;

  apiFetch('/app/api/index.php?route=planned-activities&action=update-status', {
    method: 'PUT',
    body: JSON.stringify({ id: id, status: status }),
  })
  .then(function (res) { return res.json(); })
  .then(function (result) {
    if (result && result.success) {
      showToast('Status atualizado com sucesso.', 'success');
      closeCorretivaStatusModal();
      var newStatus = result.data && result.data.status;
      if (newStatus) {
        var card = document.querySelector('.planned-card[data-id="' + id + '"]');
        if (card) {
          var actionsArea = card.querySelector('.flex.items-center.gap-1');
          if (actionsArea) {
            var oldBadge = actionsArea.querySelector('span.inline-block');
            if (oldBadge) oldBadge.outerHTML = plannedStatusBadgeHtml(newStatus);
          }
        }
      }
    } else {
      showToast(result && result.message ? result.message : 'Erro ao atualizar status.', 'error');
    }
  })
  .catch(function (err) {
    console.error('updateCorretivaStatus error:', err);
    showToast('Erro ao atualizar status.', 'error');
  });
}

function closeCorretivaStatusModal() {
  var modal = document.getElementById('modalStatusCorretiva');
  if (modal) modal.classList.add('hidden');
}

function renderPlanned(items, append) {
  var counter = document.getElementById('plannedCounter');
  if (counter) {
    counter.textContent = items.length + ' atividades';
  }

  var content = document.getElementById('plannedContent');
  if (!content) return;

  if (!append) {
    content.innerHTML = '';
  }

  if (!items || items.length === 0) {
    if (!append) {
      content.innerHTML = '<div class="text-center py-20 text-slate-500"><p class="text-lg">Nenhuma atividade planejada encontrada.</p></div>';
    }
    return;
  }

  var grouped = {};
  items.forEach(function (item) {
    var dateKey = item.data_planejada || 'sem_data';
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  });

  var dates = Object.keys(grouped).sort(function (a, b) {
    if (a === 'sem_data') return 1;
    if (b === 'sem_data') return -1;
    return b.localeCompare(a);
  });

  var html = '';

  dates.forEach(function (dateKey) {
    var groupItems = grouped[dateKey];
    if (!groupItems || groupItems.length === 0) return;

    var dateLabel = dateKey === 'sem_data' ? 'Sem data' : formatDateTimeline(dateKey);
    var safeDate = dateKey.replace(/"/g, '\\"');

    if (append) {
      var existingGroup = content.querySelector('.timeline-group[data-date="' + safeDate + '"]');
      if (existingGroup) {
        var cardsContainer = existingGroup.querySelector('.space-y-3');
        groupItems.forEach(function (item) {
          cardsContainer.insertAdjacentHTML('beforeend', buildPlannedCardHtml(item));
        });
        applyRoleVisibility();
        return;
      }
    }

    html += '<div class="timeline-group" data-date="' + safeDate + '">' +
      '<h2 class="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">' + escapeHtml(dateLabel) + duplicateDayIconHtml(dateKey) + '</h2>' +
      '<div class="space-y-3">';

    groupItems.forEach(function (item) {
      html += buildPlannedCardHtml(item);
    });

    html += '</div></div>';
  });

  if (html) {
    if (append) {
      content.insertAdjacentHTML('beforeend', html);
    } else {
      content.innerHTML = html;
    }
  }

  applyRoleVisibility();
}

function syncPlannedCards(newItems, total) {
  var content = document.getElementById('plannedContent');
  if (!content) return;

  var counter = document.getElementById('plannedCounter');
  if (counter) counter.textContent = total + ' atividades';

  if (!newItems || newItems.length === 0) {
    if (content.children.length > 0) {
      content.innerHTML = '<div class="text-center py-20 text-slate-500"><p class="text-lg">Nenhuma atividade planejada encontrada.</p></div>';
    }
    return;
  }

  var newGrouped = {};
  newItems.forEach(function (item) {
    var key = item.data_planejada || 'sem_data';
    if (!newGrouped[key]) newGrouped[key] = [];
    newGrouped[key].push(item);
  });

  var newDates = Object.keys(newGrouped).sort(function (a, b) {
    if (a === 'sem_data') return 1;
    if (b === 'sem_data') return -1;
    return b.localeCompare(a);
  });

  Array.from(content.querySelectorAll('.timeline-group')).forEach(function (group) {
    if (!newGrouped[group.getAttribute('data-date')]) {
      group.remove();
    }
  });

  newDates.forEach(function (dateKey) {
    var groupItems = newGrouped[dateKey];
    var safeDate = dateKey.replace(/"/g, '\\"');
    var existingGroup = content.querySelector('.timeline-group[data-date="' + safeDate + '"]');

    if (existingGroup) {
      var cardsContainer = existingGroup.querySelector('.space-y-3');
      if (!cardsContainer) return;

      // Build per-group ID set so same id in different dates is handled correctly
      var groupIds = {};
      groupItems.forEach(function (item) { groupIds[item.id] = true; });

      Array.from(cardsContainer.querySelectorAll('.planned-card-wrapper')).forEach(function (wrapper) {
        var card = wrapper.querySelector('.planned-card');
        var id = parseInt(card.getAttribute('data-id'), 10);
        if (!groupIds[id]) wrapper.remove();
      });

      groupItems.forEach(function (item) {
        var existingCard = cardsContainer.querySelector('.planned-card[data-id="' + item.id + '"]');
        if (existingCard) {
          var existingWrapper = existingCard.closest('.planned-card-wrapper');
          if (existingWrapper) {
            existingWrapper.outerHTML = buildPlannedCardHtml(item);
          } else {
            existingCard.outerHTML = buildPlannedCardHtml(item);
          }
        } else {
          cardsContainer.insertAdjacentHTML('beforeend', buildPlannedCardHtml(item));
        }
      });
    } else {
      var dateLabel = dateKey === 'sem_data' ? 'Sem data' : formatDateTimeline(dateKey);
      var groupHtml = '<div class="timeline-group" data-date="' + safeDate + '">' +
        '<h2 class="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">' + escapeHtml(dateLabel) + duplicateDayIconHtml(dateKey) + '</h2>' +
        '<div class="space-y-3">';
      groupItems.forEach(function (item) {
        groupHtml += buildPlannedCardHtml(item);
      });
      groupHtml += '</div></div>';

      var insertBeforeEl = null;
      for (var i = 0; i < content.children.length; i++) {
        var child = content.children[i];
        if (child.classList && child.classList.contains('timeline-group')) {
          var childDate = child.getAttribute('data-date');
          if (childDate && dateKey > childDate) {
            insertBeforeEl = child;
            break;
          }
        }
      }

      if (insertBeforeEl) {
        insertBeforeEl.insertAdjacentHTML('beforebegin', groupHtml);
      } else {
        content.insertAdjacentHTML('beforeend', groupHtml);
      }
    }
  });

  applyRoleVisibility();
}

function resetPlannedState(newSearch) {
  plannedSearch = newSearch || '';
  window._plannedTotal = 0;
  var content = document.getElementById('plannedContent');
  if (content) content.innerHTML = '';
  if (_plannedScroll) _plannedScroll.reset().init();
}

function setupPlannedScroll() {
  _plannedScroll = createInfiniteScroll({
    sentinelId: 'plannedSentinel',
    limit: PLANNED_LIMIT,
    pollingInterval: 30000,
    timeout: 15000,
    fetchFn: function (params, opts) {
      var urlParams = new URLSearchParams();
      urlParams.set('limit', params.limit);
      urlParams.set('offset', params.offset);
      if (plannedDateFrom) urlParams.set('date_from', plannedDateFrom);
      if (plannedDateTo) urlParams.set('date_to', plannedDateTo);
      if (plannedStatusFilter) urlParams.set('status', plannedStatusFilter);
      if (plannedSearch) urlParams.set('search', plannedSearch);
      return apiFetch('/app/api/index.php?route=planned-activities&' + urlParams.toString(), opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result || !result.data) return { data: [], total: 0 };
          return { data: result.data.items || [], total: result.data.total || 0 };
        });
    },
    renderFn: function (items) {
      renderPlanned(items, true);
    },
    renderFullFn: function (items, total) {
      syncPlannedCards(items, total);
    },
    afterLoadFn: function (state) {
      window._plannedTotal = state.total;
      var counter = document.getElementById('plannedCounter');
      if (counter) counter.textContent = state.total + ' atividades';
    },
    getFilterHash: function () {
      return plannedDateFrom + '|' + plannedDateTo + '|' + plannedStatusFilter + '|' + plannedSearch;
    },
    onError: function (err) {
      console.error('Erro ao carregar atividades:', err);
    },
  });
}

function openPlanModal() {
  var modal = document.getElementById('modalPlanActivity');
  if (!modal) return;
  modal.classList.remove('hidden');

  var form = document.getElementById('planForm');
  if (form) form.reset();

  var hiddenId = document.getElementById('planEquipamentoId');
  if (hiddenId) hiddenId.value = '';

  var prevFields = document.getElementById('preventivaFields');
  var corrFields = document.getElementById('corretivaFields');
  if (prevFields) prevFields.classList.add('hidden');
  if (corrFields) corrFields.classList.add('hidden');
}

function closePlanModal() {
  var modal = document.getElementById('modalPlanActivity');
  if (modal) modal.classList.add('hidden');
}

function loadLocalsForPlan() {
  return apiFetch('/app/api/index.php?route=locals')
    .then(function (res) { return res.json(); })
    .then(function (result) {
      plannedLocalOptions = result.data || [];
    })
    .catch(function (err) {
      console.error('Erro ao carregar locais:', err);
      plannedLocalOptions = [];
    });
}

function loadEquipamentosForPlan(local) {
  var url = '/app/api/index.php?route=equipment&limit=9999';
  if (local) {
    url += '&local=' + encodeURIComponent(local);
  }
  return apiFetch(url)
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result && result.data) {
        plannedEquipOptions = result.data;
      }
    })
    .catch(function (err) {
      console.error('Erro ao carregar equipamentos:', err);
    });
}

function setupPlanAutocompletes() {
  if (typeof createAutocomplete !== 'function') return;

  createAutocomplete({
    inputSelector: '#planSite',
    dropdownSelector: '.site-dropdown',
    dataSource: function () { return plannedLocalOptions; },
    onSelect: function (item) {
      loadEquipamentosForPlan(item);
    },
  });

  createAutocomplete({
    inputSelector: '#planEquipamento',
    dropdownSelector: '.equipamento-dropdown',
    dataSource: function () { return plannedEquipOptions; },
    filterFn: function (items, q) {
      if (!q) return items.slice(0, 20);
      var lower = q.toLowerCase();
      return items.filter(function (i) {
        return i.equipamento && i.equipamento.toLowerCase().includes(lower);
      }).slice(0, 20);
    },
    formatItem: function (item) {
      var label = item.equipamento || '';
      if (item.capacidade) label += ' \u2014 ' + item.capacidade + ' TR';
      if (item.localidade) label += ' - ' + item.localidade;
      return label;
    },
    onSelect: function (item) {
      var hidden = document.getElementById('planEquipamentoId');
      if (hidden) hidden.value = item.id;
    },
    onBlur: function ({ hide }) { hide(); },
  });
}

function setupPlannedFilters() {
  var dateFromInput = document.getElementById('plannedDateFrom');
  var dateToInput = document.getElementById('plannedDateTo');
  var statusSelect = document.getElementById('plannedStatusFilter');
  var searchInput = document.getElementById('plannedSearchFilter');

  function applyFilters() {
    plannedDateFrom = dateFromInput ? dateFromInput.value : '';
    plannedDateTo = dateToInput ? dateToInput.value : '';
    plannedStatusFilter = statusSelect ? statusSelect.value : '';
    var newSearch = searchInput ? searchInput.value.trim() : '';
    if (plannedSearch !== newSearch) {
      plannedSearch = newSearch;
    }
    resetPlannedState(plannedSearch);
  }

  var debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        applyFilters();
      }
    });
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var val = this.value;
      debounceTimer = setTimeout(function () {
        var match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        plannedSearch = match ? match[3] + '-' + match[2] + '-' + match[1] : val;
        resetPlannedState(plannedSearch);
      }, 1000);
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener('change', applyFilters);
    dateFromInput.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        applyFilters();
      }
    });
  }
  if (dateToInput) {
    dateToInput.addEventListener('change', applyFilters);
    dateToInput.addEventListener('click', function () {
      if (this.value !== '') {
        this.value = '';
        applyFilters();
      }
    });
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', applyFilters);
  }
}

function exportPlannedCsv() {
  var params = new URLSearchParams();
  params.set('limit', '99999');
  if (plannedDateFrom) params.set('date_from', plannedDateFrom);
  if (plannedDateTo) params.set('date_to', plannedDateTo);
  if (plannedStatusFilter) params.set('status', plannedStatusFilter);
  if (plannedSearch) params.set('search', plannedSearch);

  apiFetch('/app/api/index.php?route=planned-activities&' + params.toString())
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (!result || !result.data || !result.data.items) {
        showToast('Nenhum dado encontrado.', 'error');
        return;
      }
      var items = result.data.items;
      if (typeof downloadCSV !== 'function') {
        showToast('Função CSV não disponível.', 'error');
        return;
      }
      var header = ['LOCAL', 'LOCAL SCM', 'LOCALIDADE', 'EQUIPAMENTO', 'CAPACIDADE', 'OS', 'DATA PLANEJADA', 'STATUS', 'TIPO', 'EQUIPE', 'MATERIAL', 'OBS'].join(';');
      downloadCSV('atividades_planejadas.csv', header, function (addRow) {
        items.forEach(function (item) {
          addRow([
            sanitizeCSV(item.local || ''),
            sanitizeCSV(item.local_scm || ''),
            sanitizeCSV(item.localidade || ''),
            sanitizeCSV(item.equipamento || ''),
            sanitizeCSV(item.capacidade || ''),
            sanitizeCSV(item.os || ''),
            sanitizeCSV(item.data_planejada || ''),
            sanitizeCSV(item.status || ''),
            sanitizeCSV(item.tipo || 'preventiva'),
            sanitizeCSV(item.equipe || ''),
            sanitizeCSV(item.material || ''),
            sanitizeCSV(item.obs || ''),
          ]);
        });
      });
      showToast('CSV exportado com sucesso!', 'success');
    })
    .catch(function (err) {
      showToast('Erro ao exportar CSV.', 'error');
      console.error('Erro no CSV export:', err);
    });
}

function copyPlannedWhatsApp() {
  var params = new URLSearchParams();
  params.set('limit', '99999');
  if (plannedDateFrom) params.set('date_from', plannedDateFrom);
  if (plannedDateTo) params.set('date_to', plannedDateTo);
  if (plannedStatusFilter) params.set('status', plannedStatusFilter);
  if (plannedSearch) params.set('search', plannedSearch);

  apiFetch('/app/api/index.php?route=planned-activities&' + params.toString())
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (!result || !result.data || !result.data.items) {
        showToast('Nenhum dado encontrado.', 'error');
        return;
      }
      var items = result.data.items;

      var grouped = {};
      items.forEach(function (item) {
        var dateKey = item.data_planejada || 'sem_data';
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      });

      var dates = Object.keys(grouped).sort(function (a, b) {
        if (a === 'sem_data') return 1;
        if (b === 'sem_data') return -1;
        return a.localeCompare(b);
      });

      function toDDMMYYYY(dateStr) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
      }

      function formatDateWhatsApp(dateStr) {
        if (!dateStr || dateStr === 'sem_data') return '';
        var parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        var dia = parseInt(parts[2], 10);
        var mes = parseInt(parts[1], 10) - 1;
        var ano = parseInt(parts[0], 10);
        return dia + ' DE ' + PLANNED_MESES[mes].toUpperCase() + ' DE ' + ano;
      }

      function statusIcon(status) {
        var lower = (status || '').toLowerCase();
        if (lower === 'planejado' || lower === 'concluído' || lower === 'concluido') return '\u2705';
        if (lower === 'pendente') return '\u23F3';
        if (lower === 'em andamento') return '\uD83D\uDD04';
        if (lower === 'projeto clean up') return '\uD83E\uDDF9';
        return '';
      }

      var lines = [];

      lines.push('\uD83D\uDCCB *ATIVIDADES PLANEJADAS*');

      var filterParts = [];
      if (plannedDateFrom) {
        filterParts.push('Data\u00a0in\u00edcio: ' + toDDMMYYYY(plannedDateFrom));
      }
      if (plannedDateTo) {
        filterParts.push('Data\u00a0fim: ' + toDDMMYYYY(plannedDateTo));
      }
      if (plannedStatusFilter) {
        filterParts.push('Status: ' + plannedStatusFilter);
      }
      if (plannedSearch) {
        filterParts.push('Busca: ' + plannedSearch);
      }
      if (filterParts.length > 0) {
        lines.push('Filtro: ' + filterParts.join(' | '));
      }

      lines.push('');
      lines.push('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');

      dates.forEach(function (dateKey) {
        var groupItems = grouped[dateKey];
        var dateHeader = dateKey === 'sem_data' ? 'SEM DATA' : formatDateWhatsApp(dateKey);

        lines.push('');
        lines.push('*' + dateHeader + '*');
        lines.push('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');

        groupItems.forEach(function (item) {
          var local = item.local || '';
          var localScm = item.local_scm || '';
          if (local && localScm) {
            lines.push('*' + local + ' - ' + localScm + '* \u2014 ' + (item.localidade || ''));
          } else if (local) {
            lines.push('*' + local + '* \u2014 ' + (item.localidade || ''));
          }

          var equipName;
          if (item.tipo === 'preventiva') {
            var mc = item.machine_count || 0;
            equipName = mc > 0 ? mc + ' m\u00e1quina' + (mc > 1 ? 's' : '') : 'N/A';
          } else {
            equipName = item.equipamento || 'N/A';
          }
          var cap = item.capacidade || '';
          var itemTipo = item.tipo || 'preventiva';
          var tipoLabel = itemTipo === 'corretiva' ? 'Corretiva' : 'Preventiva';
          var osLabel = itemTipo === 'corretiva' ? '*OS*' : '*Ticket*';
          var equipLine = osLabel + ' ' + (item.os || '') + ' | ' + equipName;
          if (cap) equipLine += ' (' + cap + ' TR)';
          equipLine += ' | *' + tipoLabel + '*';
          lines.push(equipLine);

          lines.push('*Equipe:* ' + (item.equipe || 'A definir'));
          lines.push('*Status:* ' + statusIcon(item.status) + ' ' + (item.status || ''));

          if (item.obs) {
            lines.push('*Obs:* ' + item.obs);
          }

          lines.push('');
        });
      });

      lines.push('Total: ' + items.length + ' atividades');

      var text = lines.join('\n');
      navigator.clipboard.writeText(text).then(function () {
        showToast('Texto copiado! Cole no WhatsApp.', 'success');
      }).catch(function () {
        showToast('Erro ao copiar.', 'error');
      });
    })
    .catch(function (err) {
      showToast('Erro ao gerar texto.', 'error');
      console.error('Erro no WhatsApp copy:', err);
    });
}

function setupPlannedSearch() {
  var searchInput = document.getElementById('plannedSearch');
  if (!searchInput) return;

  var debounceTimer;

  searchInput.addEventListener('click', function () {
    if (this.value !== '') {
      this.value = '';
      resetPlannedState('');
    }
  });

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var val = this.value;
    debounceTimer = setTimeout(function () {
      var match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      var searchVal = match ? match[3] + '-' + match[2] + '-' + match[1] : val;
      resetPlannedState(searchVal);
    }, 1000);
  });
}

function initPlannedActivity() {
  plannedSearch = '';
  plannedDateFrom = '';
  plannedDateTo = '';
  plannedStatusFilter = '';
  window._plannedTotal = 0;
  var contentEl = document.getElementById('plannedContent');
  if (contentEl) contentEl.innerHTML = '';

  setupPlannedFilters();
  if (_plannedScroll) _plannedScroll.destroy();
  setupPlannedScroll();

  var dateFromEl = document.getElementById('plannedDateFrom');
  if (dateFromEl) dateFromEl.value = plannedDateFrom;
  var dateToEl = document.getElementById('plannedDateTo');
  if (dateToEl) dateToEl.value = plannedDateTo;
  var statusEl = document.getElementById('plannedStatusFilter');
  if (statusEl) statusEl.value = plannedStatusFilter;

  var btnNew = document.getElementById('btnNewPlanned');
  if (btnNew) {
    btnNew.addEventListener('click', openPlanModal);
  }

  var btnCsv = document.getElementById('btnPlannedCsv');
  if (btnCsv) {
    btnCsv.addEventListener('click', exportPlannedCsv);
  }

  var btnWhatsApp = document.getElementById('btnPlannedWhatsApp');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', copyPlannedWhatsApp);
  }

  var btnCancel = document.getElementById('btnCancelPlan');
  if (btnCancel) {
    btnCancel.addEventListener('click', closePlanModal);
  }

  var planForm = document.getElementById('planForm');
  if (planForm) {
    planForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitPlan();
    });
  }

  var planTipo = document.getElementById('planTipo');
  var prevFields = document.getElementById('preventivaFields');
  var corrFields = document.getElementById('corretivaFields');
  if (planTipo && prevFields && corrFields) {
    planTipo.addEventListener('change', function () {
      if (this.value === 'preventiva') {
        prevFields.classList.remove('hidden');
        corrFields.classList.add('hidden');
      } else if (this.value === 'corretiva') {
        corrFields.classList.remove('hidden');
        prevFields.classList.add('hidden');
      } else {
        prevFields.classList.add('hidden');
        corrFields.classList.add('hidden');
      }
    });
  }

  var btnConfirmDup = document.getElementById('btnConfirmDuplicate');
  if (btnConfirmDup) {
    btnConfirmDup.addEventListener('click', confirmDuplicate);
  }

  var btnCancelDup = document.getElementById('btnCancelDuplicate');
  if (btnCancelDup) {
    btnCancelDup.addEventListener('click', closeDuplicateModal);
  }

  var btnCancelStatus = document.getElementById('btnCancelStatus');
  if (btnCancelStatus) {
    btnCancelStatus.addEventListener('click', closeStatusPreventiva);
  }

  var statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitStatusPreventiva();
    });
  }

  var statusBackdrop = document.getElementById('modalStatusBackdrop');
  if (statusBackdrop) {
    statusBackdrop.addEventListener('click', closeStatusPreventiva);
  }

  var statusSelect = document.getElementById('statusSelect');
  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      var dateGroup = document.getElementById('statusDataGroup');
      if (!dateGroup) return;
      dateGroup.classList.toggle('hidden', this.value !== 'Planejado');
    });
  }

  var corretivaStatusForm = document.getElementById('corretivaStatusForm');
  if (corretivaStatusForm) {
    corretivaStatusForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitCorretivaStatus();
    });
  }

  var btnCancelCorrStatus = document.querySelector('.btn-cancel-corretiva-status');
  if (btnCancelCorrStatus) {
    btnCancelCorrStatus.addEventListener('click', closeCorretivaStatusModal);
  }

  var corrStatusBackdrop = document.getElementById('modalCorretivaStatusBackdrop');
  if (corrStatusBackdrop) {
    corrStatusBackdrop.addEventListener('click', closeCorretivaStatusModal);
  }

  // --- SLA Preview ---
  var slaDays = document.getElementById('planSlaDays');
  var slaSat = document.getElementById('planSlaSat');
  var slaSun = document.getElementById('planSlaSun');
  var slaData = document.getElementById('planData');
  function updateSlaPreview() {
    var days = slaDays && parseInt(slaDays.value, 10);
    var dt = slaData && slaData.value;
    var preview = document.getElementById('slaPreview');
    var text = document.getElementById('slaPreviewText');
    if (!days || days < 1 || !dt) {
      if (preview) preview.classList.add('hidden');
      return;
    }
    var includeSat = slaSat ? slaSat.checked : false;
    var includeSun = slaSun ? slaSun.checked : false;
    var dates = generateSlaDateList(dt, days, includeSat, includeSun);
    if (preview) preview.classList.remove('hidden');
    if (text) text.textContent = days + ' dia' + (days > 1 ? 's' : '') + ': ' + dates.join(', ');
  }
  if (slaDays) slaDays.addEventListener('input', updateSlaPreview);
  if (slaSat) slaSat.addEventListener('change', updateSlaPreview);
  if (slaSun) slaSun.addEventListener('change', updateSlaPreview);
  if (slaData) slaData.addEventListener('change', updateSlaPreview);

  // --- Extend SLA Modal ---
  var btnCancelExtend = document.getElementById('btnCancelExtendSla');
  if (btnCancelExtend) {
    btnCancelExtend.addEventListener('click', closeExtendSlaModal);
  }
  var extendForm = document.getElementById('extendSlaForm');
  if (extendForm) {
    extendForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitExtendSla();
    });
  }

  // --- Set SLA Modal ---
  var btnCancelSetSla = document.getElementById('btnCancelSetSla');
  if (btnCancelSetSla) {
    btnCancelSetSla.addEventListener('click', closeSetSlaModal);
  }
  var setSlaForm = document.getElementById('setSlaForm');
  if (setSlaForm) {
    setSlaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitSetSla();
    });
  }
  // SLA preview
  var setSlaDays = document.getElementById('setSlaDays');
  var setSlaSat = document.getElementById('setSlaSat');
  var setSlaSun = document.getElementById('setSlaSun');
  var setSlaData = document.getElementById('planData');
  function updateSetSlaPreview() {
    var days = setSlaDays && parseInt(setSlaDays.value, 10);
    var dt = setSlaData && setSlaData.value;
    var preview = document.getElementById('setSlaPreview');
    var text = document.getElementById('setSlaPreviewText');
    if (!days || days < 1 || !dt) {
      if (preview) preview.classList.add('hidden');
      return;
    }
    var includeSat = setSlaSat ? setSlaSat.checked : false;
    var includeSun = setSlaSun ? setSlaSun.checked : false;
    var dates = generateSlaDateList(dt, days, includeSat, includeSun);
    if (preview) preview.classList.remove('hidden');
    if (text) text.textContent = days + ' dia' + (days > 1 ? 's' : '') + ': ' + dates.join(', ');
  }
  if (setSlaDays) setSlaDays.addEventListener('input', updateSetSlaPreview);
  if (setSlaSat) setSlaSat.addEventListener('change', updateSetSlaPreview);
  if (setSlaSun) setSlaSun.addEventListener('change', updateSetSlaPreview);

  var content = document.getElementById('plannedContent');
  if (content) {
    content.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest('.planned-delete-btn');
      if (deleteBtn) {
        var deleteId = parseInt(deleteBtn.getAttribute('data-id'), 10);
        var deleteCard = deleteBtn.closest('.planned-card');
        var deleteTipo = deleteCard ? deleteCard.getAttribute('data-tipo') : 'corretiva';
        var deleteDate = deleteBtn.getAttribute('data-date') || '';
        var deleteSlaDay = deleteCard ? parseInt(deleteCard.getAttribute('data-sla-day-number'), 10) || null : null;
        if (deleteId) deletePlanned(deleteId, deleteTipo, deleteDate, deleteSlaDay);
        return;
      }

      var teamBtn = e.target.closest('.team-edit-btn');
      if (teamBtn) {
        startTeamInlineEdit(teamBtn);
        return;
      }

      var statusBtn = e.target.closest('.planned-status-btn');
      if (statusBtn) {
        var statusId = parseInt(statusBtn.getAttribute('data-id'), 10);
        var currentStatus = statusBtn.getAttribute('data-status');
        var currentDate = statusBtn.getAttribute('data-date');
        if (statusId) openStatusPreventiva(statusId, currentStatus, currentDate);
        return;
      }

      var corretivaStatusBtn = e.target.closest('.planned-corretiva-status-btn');
      if (corretivaStatusBtn) {
        var corrId = parseInt(corretivaStatusBtn.getAttribute('data-id'), 10);
        var corrStatus = corretivaStatusBtn.getAttribute('data-status');
        if (corrId) openCorretivaStatusModal(corrId, corrStatus);
        return;
      }

      var obsBtn = e.target.closest('[data-action="edit-obs"]');
      if (obsBtn) {
        startObsInlineEdit(obsBtn);
        return;
      }

      var dupBtn = e.target.closest('[data-action="duplicate-day"]');
      if (dupBtn) {
        var dupDate = dupBtn.getAttribute('data-date');
        if (dupDate) showDuplicateModal(dupDate, formatDateTimeline(dupDate));
        return;
      }

      var copyBtn = e.target.closest('[data-action="copy-os"]');
      if (copyBtn) {
        copyOs(copyBtn.getAttribute('data-os'));
        return;
      }

      var extendBtn = e.target.closest('[data-action="extend-sla"]');
      if (extendBtn) {
        var extId = parseInt(extendBtn.getAttribute('data-id'), 10);
        var extTipo = extendBtn.getAttribute('data-tipo');
        if (extId) openExtendSlaModal(extId, extTipo);
        return;
      }

      var setSlaBtn = e.target.closest('[data-action="set-sla"]');
      if (setSlaBtn) {
        var setSlaId = parseInt(setSlaBtn.getAttribute('data-id'), 10);
        var setSlaTipo = setSlaBtn.getAttribute('data-tipo');
        if (setSlaId) openSetSlaModal(setSlaId, setSlaTipo);
        return;
      }
    });

    // --- Drag and Drop (reorder + move date) ---
    _dragState = {};

    content.addEventListener('dragstart', function (e) {
      var handle = e.target.closest('.drag-handle');
      if (!handle) return;
      var wrapper = handle.closest('.planned-card-wrapper');
      if (!wrapper) return;
      var card = wrapper.querySelector('.planned-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var tipo = card.getAttribute('data-tipo');
      var date = card.getAttribute('data-date');
      if (!date) {
        var group = wrapper.closest('.timeline-group');
        if (group) date = group.getAttribute('data-date') || '';
      } else {
        date = date || '';
      }
      if (!id) return;
      _dragState = { id: id, tipo: tipo, sourceDate: date, card: wrapper };
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    });

    content.addEventListener('dragend', function (e) {
      var wrapper = e.target.closest('.planned-card-wrapper');
      if (wrapper) wrapper.classList.remove('dragging');
      document.querySelectorAll('.planned-card-wrapper.drag-over').forEach(function (w) { w.classList.remove('drag-over'); });
      document.querySelectorAll('.timeline-group.drag-over').forEach(function (g) { g.classList.remove('drag-over'); });
      _dragState = {};
    });

    content.addEventListener('dragover', function (e) {
      if (!_dragState.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Continuous highlight: clear all, apply to current target only
      document.querySelectorAll('.planned-card-wrapper.drag-over').forEach(function (w) { w.classList.remove('drag-over'); });
      document.querySelectorAll('.timeline-group.drag-over').forEach(function (g) { g.classList.remove('drag-over'); });

      var wrapper = e.target.closest('.planned-card-wrapper');
      var group = e.target.closest('.timeline-group');
      if (wrapper && wrapper !== _dragState.card) {
        wrapper.classList.add('drag-over');
      } else if (group && !wrapper) {
        group.classList.add('drag-over');
      }
    });

    content.addEventListener('drop', function (e) {
      if (!_dragState.id) return;
      e.preventDefault();
      var srcId = _dragState.id;
      var srcTipo = _dragState.tipo;
      var srcDate = _dragState.sourceDate;

      document.querySelectorAll('.planned-card-wrapper.drag-over').forEach(function (w) { w.classList.remove('drag-over'); });
      document.querySelectorAll('.timeline-group.drag-over').forEach(function (g) { g.classList.remove('drag-over'); });

      var targetCard = e.target.closest('.planned-card');
      var targetWrapper = targetCard ? targetCard.closest('.planned-card-wrapper') : null;
      var targetGroup = e.target.closest('.timeline-group');

      if (!targetGroup) return;

      var targetDate = targetGroup.getAttribute('data-date');

      if (targetWrapper && targetWrapper !== _dragState.card && targetDate === srcDate) {
        // Same group reorder — optimistic DOM update
        var cardsContainer = targetGroup.querySelector('.space-y-3');
        if (!cardsContainer) return;
        cardsContainer.insertBefore(_dragState.card, targetWrapper);

        var wrapperEls = Array.from(cardsContainer.querySelectorAll('.planned-card-wrapper'));
        var order = wrapperEls.map(function (w) { return parseInt(w.querySelector('.planned-card').getAttribute('data-id'), 10); });

        apiFetch('/app/api/index.php?route=planned-activities&action=reorder', {
          method: 'POST',
          body: JSON.stringify({ tipo: srcTipo, data_planejada: srcDate, order: order }),
        })
          .then(function (r) { return r.json(); })
          .then(function (result) {
            if (!result || !result.success) {
              resetPlannedState('');
            }
          })
          .catch(function () { resetPlannedState(''); });
      } else if (targetDate && targetDate !== srcDate) {
        // Cross-group move
        var payload = { id: parseInt(srcId, 10), tipo: srcTipo, source_date: srcDate, target_date: targetDate };
        apiFetch('/app/api/index.php?route=planned-activities&action=move-date', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
          .then(function (r) { return r.json(); })
          .then(function (result) {
            if (result && result.success) {
              resetPlannedState('');
            } else {
              showToast(result && result.message ? result.message : 'Erro ao mover atividade.', 'error');
            }
          })
          .catch(function () { showToast('Erro ao mover atividade.', 'error'); });
        // Move card optimistically (removes from source group)
        var srcGroup = _dragState.card.closest('.timeline-group');
        if (srcGroup) {
          _dragState.card.remove();
          if (srcGroup.querySelectorAll('.planned-card').length === 0) {
            srcGroup.remove();
          }
        }
      }
    });
  }

  loadLocalsForPlan().then(function () {
    return loadEquipamentosForPlan();
  }).then(function () {
    setupPlanAutocompletes();
  });

  _plannedScroll.init();
}

globalThis.initPlannedActivity = initPlannedActivity;

function submitPlan() {
  var dataPlanejada = document.getElementById('planData');
  var equipe = document.getElementById('planEquipe');
  var obs = document.getElementById('planObs');
  var planTipo = document.getElementById('planTipo');
  var planSite = document.getElementById('planSite');

  if (!planTipo || !planTipo.value) {
    showToast('Selecione o tipo (Preventiva ou Corretiva).', 'error');
    if (planTipo) planTipo.focus();
    return;
  }

  if (!planSite || !planSite.value.trim()) {
    showToast('Selecione um site.', 'error');
    if (planSite) planSite.focus();
    return;
  }

  if (!dataPlanejada.value) {
    showToast('Informe a data planejada.', 'error');
    dataPlanejada.focus();
    return;
  }

  var isPreventiva = planTipo.value === 'preventiva';
  var route;
  var payload;

  if (isPreventiva) {
    var ticket = document.getElementById('planTicket');
    route = '/app/api/index.php?route=preventiva';
    payload = {
      site: planSite.value.trim(),
      data_planejada: dataPlanejada.value,
      ticket: ticket ? ticket.value.trim() : '',
      equipe: equipe.value.trim() || 'A definir',
      obs: obs.value.trim() || '',
    };
    var slaDays = document.getElementById('planSlaDays');
    if (slaDays && slaDays.value) {
      payload.sla_days = parseInt(slaDays.value, 10);
      payload.sla_include_saturday = document.getElementById('planSlaSat').checked ? 1 : 0;
      payload.sla_include_sunday = document.getElementById('planSlaSun').checked ? 1 : 0;
    }
  } else {
    var os = document.getElementById('planOs');
    var equipamentoId = document.getElementById('planEquipamentoId');

    if (!os.value.trim()) {
      showToast('Informe o n\u00famero da OS.', 'error');
      os.focus();
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(os.value.trim())) {
      showToast('OS deve conter apenas letras e n\u00fameros.', 'error');
      os.focus();
      return;
    }

    if (!equipamentoId || !equipamentoId.value) {
      showToast('Selecione um equipamento.', 'error');
      return;
    }

    route = '/app/api/index.php?route=planned-activities';
    payload = {
      os: os.value.trim(),
      equipamento_id: parseInt(equipamentoId.value, 10),
      data_planejada: dataPlanejada.value,
      equipe: equipe.value.trim() || 'A definir',
      material: 'Sim',
      obs: obs.value.trim() || '',
      tipo: 'corretiva',
    };
    var slaDays = document.getElementById('planSlaDays');
    if (slaDays && slaDays.value) {
      payload.sla_days = parseInt(slaDays.value, 10);
      payload.sla_include_saturday = document.getElementById('planSlaSat').checked ? 1 : 0;
      payload.sla_include_sunday = document.getElementById('planSlaSun').checked ? 1 : 0;
    }
  }

  var btn = document.querySelector('#planForm button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  apiFetch(route, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Planejar';
      }

      if (result && result.success) {
        if (result.data && result.data.action === 'updated') {
          showToast('Atividade adicionada ao novo dia!', 'success');
        } else {
          showToast('Atividade registrada com sucesso!', 'success');
        }
        closePlanModal();
        resetPlannedState('');
      } else {
        showToast(result && result.message ? result.message : 'Erro ao salvar', 'error');
      }
    })
    .catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Planejar';
      }
      showToast('Erro ao salvar atividade.', 'error');
      console.error('Erro ao planejar atividade:', err);
    });
}

function deletePlanned(id, tipo, dataPlanejada, slaDayNumber) {
  if (typeof confirmDelete !== 'function') return;

  var route = tipo === 'preventiva'
    ? '/app/api/index.php?route=preventiva'
    : '/app/api/index.php?route=planned-activities';

  var msg = tipo === 'corretiva' && dataPlanejada
    ? 'Remover agendamento do dia <strong>' + escapeHtml(dataPlanejada) + '</strong>?'
    : 'Tem certeza que deseja excluir esta atividade planejada?';

  confirmDelete('Excluir Atividade', msg, 'atividade #' + id)
    .then(function (confirmed) {
      if (!confirmed) return;

      var payload = { id: id };
      if (tipo === 'corretiva' && dataPlanejada) {
        payload.data_planejada = dataPlanejada;
      }
      if (slaDayNumber) {
        payload.sla_day_number = slaDayNumber;
      }

      apiFetch(route, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          showToast(result && result.message ? result.message : 'Atividade removida com sucesso!', 'success');
          resetPlannedState('');
        })
        .catch(function (err) {
          showToast('Erro ao excluir atividade.', 'error');
          console.error('Erro ao excluir atividade:', err);
        });
    });
}

var STATUS_TRANSITIONS = {
  'Planejado': ['Em Andamento', 'Cancelado', 'Planejado'],
  'Em Andamento': ['Em Andamento', 'Conclu\u00eddo', 'Cancelado', 'Planejado'],
  'Cancelado': ['Planejado'],
  'Conclu\u00eddo': ['Em Andamento'],
};

function openStatusPreventiva(id, currentStatus, currentDate) {
  var modal = document.getElementById('modalStatusPreventiva');
  if (!modal) return;
  modal.classList.remove('hidden');

  document.getElementById('statusPreventivaId').value = id;

  var select = document.getElementById('statusSelect');
  select.innerHTML = '';

  var transitions = STATUS_TRANSITIONS[currentStatus] || [];
  if (transitions.length === 0) {
    showToast('Este status n\u00e3o permite altera\u00e7\u00e3o.', 'error');
    closeStatusPreventiva();
    return;
  }

  select.innerHTML = '<option value="">Selecione</option>';
  transitions.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });

  var dateInput = document.getElementById('statusDataPlanejada');
  if (dateInput && currentDate) {
    dateInput.value = currentDate;
  }
  var dateGroup = document.getElementById('statusDataGroup');
  if (dateGroup) dateGroup.classList.add('hidden');
}

function closeStatusPreventiva() {
  var modal = document.getElementById('modalStatusPreventiva');
  if (modal) modal.classList.add('hidden');
  var dateGroup = document.getElementById('statusDataGroup');
  if (dateGroup) dateGroup.classList.add('hidden');
  var dateInput = document.getElementById('statusDataPlanejada');
  if (dateInput) dateInput.value = '';
}

function generateSlaDateList(startDate, days, includeSat, includeSun) {
  var dates = [];
  var current = new Date(startDate + 'T12:00:00');
  var created = 0;
  var dayNum = 1;
  while (created < days) {
    var dow = current.getDay();
    var isSat = dow === 6;
    var isSun = dow === 0;
    if ((isSat && !includeSat) || (isSun && !includeSun)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    var dd = String(current.getDate()).padStart(2, '0');
    var mm = String(current.getMonth() + 1).padStart(2, '0');
    var yyyy = current.getFullYear();
    dates.push(dd + '/' + mm);
    current.setDate(current.getDate() + 1);
    dayNum++;
    created++;
  }
  return dates;
}

function openExtendSlaModal(id, tipo) {
  var modal = document.getElementById('modalExtendSla');
  var info = document.getElementById('extendSlaInfo');
  var idInput = document.getElementById('extendSlaId');
  var tipoInput = document.getElementById('extendSlaTipo');
  var daysInput = document.getElementById('extendSlaDays');
  var radios = document.querySelectorAll('input[name="sla_justification"]');
  if (!modal) return;
  if (idInput) idInput.value = id;
  if (tipoInput) tipoInput.value = tipo;
  if (info) info.textContent = 'Estendendo SLA da atividade #' + id + ' (' + tipo + ')';
  if (daysInput) daysInput.value = '';
  radios.forEach(function (r) { r.checked = false; });
  modal.classList.remove('hidden');
}

function closeExtendSlaModal() {
  var modal = document.getElementById('modalExtendSla');
  if (modal) modal.classList.add('hidden');
}

function submitExtendSla() {
  var id = document.getElementById('extendSlaId');
  var tipo = document.getElementById('extendSlaTipo');
  var days = document.getElementById('extendSlaDays');
  var selected = document.querySelector('input[name="sla_justification"]:checked');
  if (!id || !id.value) { showToast('ID inválido.', 'error'); return; }
  if (!days || !days.value || parseInt(days.value, 10) < 1) { showToast('Informe a quantidade de dias extras.', 'error'); if (days) days.focus(); return; }
  if (!selected) { showToast('Selecione uma justificativa.', 'error'); return; }

  var btn = document.querySelector('#extendSlaForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Estendendo...'; }

  apiFetch('/app/api/index.php?route=planned-activities&action=extend-sla', {
    method: 'POST',
    body: JSON.stringify({
      id: parseInt(id.value, 10),
      tipo: tipo ? tipo.value : 'corretiva',
      extra_days: parseInt(days.value, 10),
      justification: selected.value,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (btn) { btn.disabled = false; btn.textContent = 'Estender'; }
      if (result && result.success) {
        showToast('SLA estendido em ' + (result.data && result.data.extra_days ? result.data.extra_days : days.value) + ' dia(s)!', 'success');
        closeExtendSlaModal();
        resetPlannedState('');
      } else {
        showToast(result && result.message ? result.message : 'Erro ao estender SLA.', 'error');
      }
    })
    .catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Estender'; }
      showToast('Erro ao estender SLA.', 'error');
      console.error('Erro ao estender SLA:', err);
    });
}

function openSetSlaModal(id, tipo) {
  var modal = document.getElementById('modalSetSla');
  var info = document.getElementById('setSlaInfo');
  var idInput = document.getElementById('setSlaId');
  var tipoInput = document.getElementById('setSlaTipo');
  var daysInput = document.getElementById('setSlaDays');
  var sat = document.getElementById('setSlaSat');
  var sun = document.getElementById('setSlaSun');
  var preview = document.getElementById('setSlaPreview');
  if (!modal) return;
  if (idInput) idInput.value = id;
  if (tipoInput) tipoInput.value = tipo;
  if (info) info.textContent = 'Definindo SLA da atividade #' + id + ' (' + tipo + ')';
  if (daysInput) daysInput.value = '';
  if (sat) sat.checked = false;
  if (sun) sun.checked = false;
  if (preview) preview.classList.add('hidden');
  modal.classList.remove('hidden');
  if (daysInput) daysInput.focus();
}

function closeSetSlaModal() {
  var modal = document.getElementById('modalSetSla');
  if (modal) modal.classList.add('hidden');
}

function submitSetSla() {
  var id = document.getElementById('setSlaId');
  var tipo = document.getElementById('setSlaTipo');
  var days = document.getElementById('setSlaDays');
  if (!id || !id.value) { showToast('ID inválido.', 'error'); return; }
  var slaDays = days ? parseInt(days.value, 10) : 0;
  if (!slaDays || slaDays < 1) { showToast('Informe a quantidade de dias (mínimo 1).', 'error'); if (days) days.focus(); return; }
  if (slaDays > 90) { showToast('Máximo 90 dias.', 'error'); if (days) days.focus(); return; }

  var btn = document.querySelector('#setSlaForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  apiFetch('/app/api/index.php?route=planned-activities&action=set-sla', {
    method: 'POST',
    body: JSON.stringify({
      id: parseInt(id.value, 10),
      tipo: tipo ? tipo.value : 'corretiva',
      sla_days: slaDays,
      sla_include_saturday: document.getElementById('setSlaSat').checked ? 1 : 0,
      sla_include_sunday: document.getElementById('setSlaSun').checked ? 1 : 0,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (btn) { btn.disabled = false; btn.textContent = 'Definir'; }
      if (result && result.success) {
        showToast('SLA de ' + slaDays + ' dia(s) definido!', 'success');
        closeSetSlaModal();
        resetPlannedState('');
      } else {
        showToast(result && result.message ? result.message : 'Erro ao definir SLA.', 'error');
      }
    })
    .catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Definir'; }
      showToast('Erro ao definir SLA.', 'error');
      console.error('Erro ao definir SLA:', err);
    });
}

var _duplicateSourceDate = null;
var _dragState = {};

function showDuplicateModal(sourceDate, dateLabel) {
  var modal = document.getElementById('modalDuplicateDay');
  var label = document.getElementById('duplicateDayLabel');
  var input = document.getElementById('duplicateTargetDate');
  if (!modal || !label || !input) return;
  _duplicateSourceDate = sourceDate;
  label.innerHTML = 'Duplicar atividades de <strong>' + escapeHtml(dateLabel) + '</strong> para:';
  input.value = '';
  modal.classList.remove('hidden');
}

function closeDuplicateModal() {
  var modal = document.getElementById('modalDuplicateDay');
  if (modal) modal.classList.add('hidden');
  _duplicateSourceDate = null;
}

function confirmDuplicate() {
  var sourceDate = _duplicateSourceDate;
  var targetDate = document.getElementById('duplicateTargetDate');
  if (!sourceDate) { showToast('Data de origem não definida.', 'error'); return; }
  if (!targetDate || !targetDate.value) { showToast('Selecione a data de destino.', 'error'); targetDate.focus(); return; }

  if (targetDate.value === sourceDate) {
    showToast('A data de destino deve ser diferente da data de origem.', 'error');
    return;
  }

  var btn = document.getElementById('btnConfirmDuplicate');
  if (btn) { btn.disabled = true; btn.textContent = 'Duplicando...'; }

  apiFetch('/app/api/index.php?route=planned-activities&action=duplicate', {
    method: 'POST',
    body: JSON.stringify({ source_date: sourceDate, target_date: targetDate.value }),
  })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (btn) { btn.disabled = false; btn.textContent = 'Duplicar'; }
      if (result && result.success) {
        showToast('Programação duplicada com sucesso! ' + (result.data && result.data.count ? result.data.count + ' atividades' : ''), 'success');
        closeDuplicateModal();
        resetPlannedState('');
      } else {
        showToast(result && result.message ? result.message : 'Erro ao duplicar.', 'error');
      }
    })
    .catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Duplicar'; }
      showToast('Erro ao duplicar programação.', 'error');
      console.error('Erro ao duplicar:', err);
    });
}

function submitStatusPreventiva() {
  var id = document.getElementById('statusPreventivaId').value;
  var status = document.getElementById('statusSelect').value;
  var obs = document.getElementById('statusObs').value.trim() || '';

  if (!id || !status) {
    showToast('Selecione um status.', 'error');
    return;
  }

  var btn = document.querySelector('#statusForm button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  var data_planejada = null;
  if (status === 'Planejado') {
    var dateInput = document.getElementById('statusDataPlanejada');
    data_planejada = dateInput ? dateInput.value : null;
  }

  apiFetch('/app/api/index.php?route=preventiva&action=update-status', {
    method: 'POST',
    body: JSON.stringify({ id: parseInt(id, 10), status: status, obs: obs, data_planejada: data_planejada }),
  })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
      if (result && result.success) {
        showToast('Status atualizado com sucesso!', 'success');
        closeStatusPreventiva();
        var data = result.data;
        if (data && data.status) {
          var card = document.querySelector('.planned-card[data-id="' + data.id + '"]');
          if (card) {
            var actionsArea = card.querySelector('.flex.items-center.gap-1');
            if (actionsArea) {
              var oldBadge = actionsArea.querySelector('span.inline-block');
              if (oldBadge) oldBadge.outerHTML = plannedStatusBadgeHtml(data.status);
            }
            if (data.obs !== undefined) {
              var obsSpan = card.querySelector('.obs-text');
              if (obsSpan) obsSpan.textContent = data.obs || '';
            }
          }
        }
      } else {
        showToast(result && result.message ? result.message : 'Erro ao atualizar status.', 'error');
      }
    })
    .catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
      showToast('Erro ao atualizar status.', 'error');
      console.error('Erro ao atualizar status:', err);
    });
}
