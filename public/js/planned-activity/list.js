let plannedData = [];
let plannedPage = 0;
let plannedAllLoaded = false;
let plannedLoading = false;
let plannedSearch = '';
let plannedHash = '';
let plannedDateFrom = '';
let plannedDateTo = '';
let plannedStatusFilter = '';
let plannedEquipOptions = [];
let plannedLocalOptions = [];

const PLANNED_LIMIT = 20;
const PLANNED_CSS = '.planned-card { transition: all 0.2s ease; }';

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

function formatDateTimeline(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  return dia + ' de ' + PLANNED_MESES[mes] + ' de ' + ano;
}

function plannedStatusBadgeHtml(status) {
  if (!status) return '';
  const lower = status.toLowerCase().trim();
  const colorClass = PLANNED_STATUS_BADGES[lower] || 'bg-slate-100 text-slate-700';
  return '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium ' + colorClass + '">' + escapeHtml(status) + '</span>';
}

function buildPlannedCardHtml(item) {
  var equipName = item.equipamento || 'N/A';
  var localidade = item.localidade || '';
  var capacidade = item.capacidade || '';
  var local = item.local || '';
  var localScm = item.local_scm || '';

  var capacidadeHtml = capacidade ? '<span class="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-medium">' + escapeHtml(capacidade) + ' TR</span>' : '';
  var localHtml = local
    ? '<p class="text-xs text-slate-500 dark:text-slate-400">' + escapeHtml(local) + (localScm ? ' - ' + escapeHtml(localScm) : '') + (localidade ? ' \u2014 ' + escapeHtml(localidade) : '') + '</p>'
    : '';

  var statusBadge = plannedStatusBadgeHtml(item.status);
  var tipo = item.tipo || 'preventiva';
  var tipoBadge = tipo === 'corretiva'
    ? '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">Corretiva</span>'
    : '<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">Preventiva</span>';
  var equipe = item.equipe || 'A definir';
  var material = item.material || 'Sim';
  var obs = item.obs || '';

  var obsHtml = '';
  if (obs) {
    obsHtml = '<div class="mt-2 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-2">' + escapeHtml(obs) + '</div>';
  }

  var deleteBtn = '';
  if (typeof getUser === 'function') {
    var user = getUser();
    if (user && (user.role === 'admin' || user.role === 'coordenador')) {
      deleteBtn = '<button class="planned-delete-btn bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-xl" data-id="' + item.id + '" aria-label="Excluir atividade">' +
        '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
        '</svg></button>';
    }
  }

  return '<div class="planned-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow" data-id="' + item.id + '">' +
    '<div class="flex items-start justify-between gap-3">' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="font-semibold text-sm text-slate-800 dark:text-white">OS ' + escapeHtml(item.os || '') + '</span>' +
          '<span class="text-sm text-slate-600 dark:text-slate-300">' + escapeHtml(equipName) + '</span>' +
          capacidadeHtml +
        '</div>' +
        localHtml +
      '</div>' +
      '<div class="flex items-center gap-2 shrink-0">' +
        tipoBadge +
        statusBadge +
        deleteBtn +
      '</div>' +
    '</div>' +
    '<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">' +
      '<span>Equipe: <strong class="text-slate-700 dark:text-slate-200">' + escapeHtml(equipe) + '</strong></span>' +
      '<span>Material: <strong class="text-slate-700 dark:text-slate-200">' + escapeHtml(material) + '</strong></span>' +
    '</div>' +
    obsHtml +
  '</div>';
}

function renderPlanned(items, append) {
  var counter = document.getElementById('plannedCounter');
  if (counter) {
    var total = typeof window._plannedTotal !== 'undefined' ? window._plannedTotal : items.length;
    counter.textContent = total;
  }

  var content = document.getElementById('plannedContent');
  if (!content) return;

  if (!append) {
    content.innerHTML = '';
  }

  if (!items || items.length === 0) {
    if (!append) {
      content.innerHTML = '<div class="text-center py-20 text-slate-400 dark:text-slate-500"><p class="text-lg">Nenhuma atividade planejada encontrada.</p></div>';
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
      '<h2 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">' + escapeHtml(dateLabel) + '</h2>' +
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

function loadPlanned(silent) {
  if (plannedAllLoaded && !silent) return;
  if (plannedLoading) return;

  plannedLoading = true;

  if (silent) {
    plannedPage = 0;
  }

  var params = new URLSearchParams();
  params.set('limit', PLANNED_LIMIT);
  params.set('offset', plannedPage * PLANNED_LIMIT);
  if (plannedDateFrom) params.set('date_from', plannedDateFrom);
  if (plannedDateTo) params.set('date_to', plannedDateTo);
  if (plannedStatusFilter) params.set('status', plannedStatusFilter);
  if (plannedSearch) {
    params.set('search', plannedSearch);
  }

  apiFetch('/app/api/index.php?route=planned-activities&' + params.toString())
    .then(function (res) { return res.json(); })
    .then(function (result) {
      plannedLoading = false;

      if (!result || !result.data) return;

      var newItems = result.data.items || [];
      var total = result.data.total || 0;
      window._plannedTotal = total;

      if (silent) {
        var newHash = JSON.stringify(newItems);
        if (newHash === plannedHash) return;
        plannedHash = newHash;
        var content = document.getElementById('plannedContent');
        if (content) content.innerHTML = '';
        renderPlanned(newItems, false);
        return;
      }

      if (newItems.length < PLANNED_LIMIT) {
        plannedAllLoaded = true;
      }

      plannedData = plannedData.concat(newItems);
      plannedPage++;

      renderPlanned(newItems, plannedPage > 1);
      plannedHash = JSON.stringify(newItems);
    })
    .catch(function (err) {
      plannedLoading = false;
      console.error('Erro ao carregar atividades:', err);
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

function resetPlannedState(newSearch) {
  plannedData = [];
  plannedPage = 0;
  plannedAllLoaded = false;
  plannedLoading = false;
  plannedSearch = newSearch || '';
  plannedHash = '';
  window._plannedTotal = 0;

  var content = document.getElementById('plannedContent');
  if (content) content.innerHTML = '';
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
    loadPlanned(false);
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
        loadPlanned(false);
      }, 1000);
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener('change', applyFilters);
  }
  if (dateToInput) {
    dateToInput.addEventListener('change', applyFilters);
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
        return b.localeCompare(a);
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

          var equipName = item.equipamento || 'N/A';
          var cap = item.capacidade || '';
          var itemTipo = item.tipo || 'preventiva';
          var tipoLabel = itemTipo === 'corretiva' ? 'Corretiva' : 'Preventiva';
          var equipLine = '*OS* ' + (item.os || '') + ' | ' + equipName;
          if (cap) equipLine += ' (' + cap + ' TR)';
          equipLine += ' | ' + tipoLabel;
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
      loadPlanned(false);
    }
  });

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var val = this.value;
    debounceTimer = setTimeout(function () {
      var match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      var searchVal = match ? match[3] + '-' + match[2] + '-' + match[1] : val;
      resetPlannedState(searchVal);
      loadPlanned(false);
    }, 1000);
  });
}

function setupPlannedInfiniteScroll() {
  var sentinel = document.getElementById('plannedSentinel');
  if (!sentinel) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !plannedAllLoaded && !plannedLoading) {
        loadPlanned(false);
      }
    });
  }, { rootMargin: '300px' });

  observer.observe(sentinel);
  window._plannedObserver = observer;
}

function initPlannedActivity() {
  resetPlannedState('');

  setupPlannedFilters();
  setupPlannedInfiniteScroll();

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
  var planOsLabel = document.getElementById('planOsLabel');
  if (planTipo && planOsLabel) {
    planTipo.addEventListener('change', function () {
      planOsLabel.textContent = this.value === 'corretiva' ? 'OS/Chamado' : 'N\u00ba OS';
    });
  }

  var content = document.getElementById('plannedContent');
  if (content) {
    content.addEventListener('click', function (e) {
      var btn = e.target.closest('.planned-delete-btn');
      if (btn) {
        var id = parseInt(btn.dataset.id, 10);
        if (id) deletePlanned(id);
      }
    });
  }

  loadLocalsForPlan().then(function () {
    return loadEquipamentosForPlan();
  }).then(function () {
    setupPlanAutocompletes();
  });

  PollingManager.start('planned-activity', function () {
    if (!document.hidden) loadPlanned(true);
  }, 30000);

  loadPlanned(false);
}

function submitPlan() {
  var os = document.getElementById('planOs');
  var equipamentoId = document.getElementById('planEquipamentoId');
  var dataPlanejada = document.getElementById('planData');
  var equipe = document.getElementById('planEquipe');
  var obs = document.getElementById('planObs');
  var planTipo = document.getElementById('planTipo');

  if (!os.value.trim()) {
    showToast('Informe o número da OS.', 'error');
    os.focus();
    return;
  }

  if (!/^[a-zA-Z0-9]+$/.test(os.value.trim())) {
    showToast('OS deve conter apenas letras e números.', 'error');
    os.focus();
    return;
  }

  if (!equipamentoId || !equipamentoId.value) {
    showToast('Selecione um equipamento.', 'error');
    return;
  }

  if (!dataPlanejada.value) {
    showToast('Informe a data planejada.', 'error');
    dataPlanejada.focus();
    return;
  }

  var payload = {
    os: os.value.trim(),
    equipamento_id: parseInt(equipamentoId.value, 10),
    data_planejada: dataPlanejada.value,
    equipe: equipe.value.trim() || 'A definir',
    material: 'Sim',
    obs: obs.value.trim() || '',
    tipo: planTipo ? planTipo.value : 'preventiva',
  };

  var btn = document.querySelector('#planForm button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  apiFetch('/app/api/index.php?route=planned-activities', {
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
          showToast('OS atualizada para Planejado com sucesso!', 'success');
        } else {
          showToast('Atividade planejada com sucesso!', 'success');
        }
        closePlanModal();
        resetPlannedState('');
        loadPlanned(false);
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

function deletePlanned(id) {
  if (typeof confirmDelete !== 'function') return;

  confirmDelete('Excluir Atividade', 'Tem certeza que deseja excluir esta atividade planejada?', 'atividade #' + id)
    .then(function (confirmed) {
      if (!confirmed) return;

      apiFetch('/app/api/index.php?route=planned-activities', {
        method: 'DELETE',
        body: JSON.stringify({ id: id }),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          showToast(result && result.message ? result.message : 'Atividade removida com sucesso!', 'success');
          resetPlannedState('');
          loadPlanned(false);
        })
        .catch(function (err) {
          showToast('Erro ao excluir atividade.', 'error');
          console.error('Erro ao excluir atividade:', err);
        });
    });
}
