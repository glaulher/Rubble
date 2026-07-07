import { createInfiniteScroll } from '/public/js/components/infinite-scroll.js';

var _cycleCurrent = '';
var _cycleSelectedIds = new Set();
var _cycleTotal = 0;
var _cycleScroll = null;
var _cycleLimit = 20;
var _cycleDirtyChecks = new Map();
var _cycleFilter = 'all';
var _cycleScmStatusColors = {
    'SCM aprovado': 'bg-emerald-100 text-emerald-700',
    'SCM negado': 'bg-red-100 text-red-700',
    'SCM verificado': 'bg-blue-100 text-blue-800',
    'SCM enviado': 'bg-purple-100 text-purple-700',
};
var _cycleScmValidationCache = {};
var _cycleSummaryData = null;
var _cycleScmData = null;

function _cycleGenerateOptions() {
  var opts = [];
  for (var y = 2026; y <= 2036; y++) {
    for (var m = 1; m <= 12; m++) {
      opts.push(y + '-' + String(m).padStart(2, '0'));
    }
  }
  return opts;
}

function initPreventiveCycle() {
  document._cycleSetupDone = false;
  _cycleCurrent = '';
  _cycleSelectedIds = new Set();
  _cycleTotal = 0;
  _cycleDirtyChecks = new Map();
  _cycleFilter = 'all';
  _cycleScmValidationCache = {};
  _cycleSummaryData = null;
  _cycleScmData = null;
  if (_cycleScroll) { _cycleScroll.destroy(); _cycleScroll = null; }

  var sel = document.getElementById('selectAllCycle');
  if (sel) sel.checked = false;

  var datalist = document.getElementById('cycleOptions');
  if (datalist) {
    _cycleGenerateOptions().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      datalist.appendChild(opt);
    });
  }

  _cycleSetupEvents();
}

globalThis.initPreventiveCycle = initPreventiveCycle;

function _cycleSetupEvents() {
  if (document._cycleSetupDone) return;
  document._cycleSetupDone = true;
  var cycleInput = document.getElementById('cycleInput');
  if (cycleInput) {
    var cycleTimer;
    function _onCycleChange() {
      var val = cycleInput.value.trim();
      if (!val) return;
      if (val === _cycleCurrent) return;
      clearTimeout(cycleTimer);
      cycleTimer = setTimeout(function () {
        _cycleCurrent = val;
        _cycleSelectedIds = new Set();
        _cycleDirtyChecks = new Map();
        _cycleScmValidationCache = {};
        _cycleLoadList(val);
      }, 300);
    }
    cycleInput.addEventListener('click', function () {
      if (this.value.trim() !== '') {
        this.value = '';
      }
    });
    cycleInput.addEventListener('input', _onCycleChange);
    cycleInput.addEventListener('change', _onCycleChange);
  }

  var saveBtn = document.getElementById('saveCycleBtn');
  if (saveBtn) saveBtn.addEventListener('click', _cycleSave);

  var csvBtn = document.querySelector('[data-action="generate-csv"]');
  if (csvBtn) {
    csvBtn.removeEventListener('click', _cycleExportCsv);
    csvBtn.addEventListener('click', _cycleExportCsv);
  }

  var selectAll = document.getElementById('selectAllCycle');
  if (selectAll) {
    selectAll.addEventListener('change', function () {
      var checked = this.checked;
      selectAll.disabled = true;

      var url = '/app/api/index.php?route=preventive-cycle&action=list-ids&ciclo=' + encodeURIComponent(_cycleCurrent);
      if (_cycleFilter === 'observacao') url += '&has_observacao=1';
      if (_cycleFilter === 'sem_scm') url += '&no_scm=1';
      if (_cycleFilter === 'lancados') url += '&scm_lancados=1';

      apiFetch(url)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result.success || !result.data) return;
          var ids = result.data.ids || [];

          document.querySelectorAll('.cycle-checkbox').forEach(function (cb) {
            cb.checked = checked;
          });

          _cycleSelectedIds = new Set();
          _cycleDirtyChecks = new Map();
          ids.forEach(function (id) {
            if (checked) {
              _cycleSelectedIds.add(id);
            }
            _cycleDirtyChecks.set(id, checked);
          });
        })
        .catch(function (e) { console.warn('[preventive-cycle]', e); })
        .finally(function () {
          selectAll.disabled = false;
        });
    });
  }

  var searchInput = document.getElementById('cycleSearch');
  if (searchInput) {
    var timer;
    searchInput.addEventListener('click', function () {
      if (this.value.trim() !== '') {
        this.value = '';
        _cycleLoadList(_cycleCurrent);
      }
    });
    searchInput.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        _cycleSummaryData = null;
        _cycleScmData = null;
        _cycleLoadList(_cycleCurrent);
      }, 1000);
    });
  }

  var filterRadios = document.querySelectorAll('input[name="cycleFilter"]');
  filterRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      _cycleFilter = this.value;
      _cycleSummaryData = null;
      _cycleScmData = null;
      _cycleLoadList(_cycleCurrent);
    });
  });

  _cycleSetupScroll();

  if (window.PollingManager) {
    PollingManager.start('preventive-summary', function () {
      _cycleFetchSummary(_cycleCurrent);
      _cycleFetchScmStatusCount(_cycleCurrent);
    }, 30000);
  }

  var container = document.getElementById('cycleContent');
  if (container) {
    container.addEventListener('change', function (e) {
      var cb = e.target.closest('.cycle-checkbox');
      if (!cb) return;
      var id = parseInt(cb.dataset.equipId);
      if (cb.checked) {
        _cycleSelectedIds.add(id);
      } else {
        _cycleSelectedIds['delete'](id);
      }
      _cycleDirtyChecks.set(id, cb.checked);
    });
  }
}

function _cycleSetupScroll() {
  if (_cycleScroll) _cycleScroll.destroy();
  _cycleScroll = createInfiniteScroll({
    sentinelId: 'cycleSentinel',
    limit: _cycleLimit,
    fetchFn: function (params, opts) {
      if (!_cycleCurrent) return Promise.resolve({ data: [], total: 0 });
      var searchEl = document.getElementById('cycleSearch');
      var search = searchEl ? searchEl.value.trim() : '';
      var url = '/app/api/index.php?route=preventive-cycle&ciclo=' + encodeURIComponent(_cycleCurrent)
        + '&limit=' + params.limit + '&offset=' + params.offset;
      if (search) url += '&search=' + encodeURIComponent(search);
      if (_cycleFilter === 'selecionados') url += '&checked=1';
      if (_cycleFilter === 'observacao') url += '&has_observacao=1';
      if (_cycleFilter === 'sem_scm') url += '&no_scm=1';
      if (_cycleFilter === 'lancados') url += '&scm_lancados=1';
      return apiFetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result.success) return { data: [], total: 0 };
          return { data: result.data || [], total: result.total || 0 };
        });
    },
    renderFn: function (items) {
      _cycleRenderCards(items, true);
    },
    afterLoadFn: function (state) {
      _cycleTotal = state.total;
      _cycleFetchSummary(_cycleCurrent);
      _cycleFetchScmStatusCount(_cycleCurrent);
    },
    getFilterHash: function () {
      var searchEl = document.getElementById('cycleSearch');
      return (_cycleCurrent || '') + '|' + (_cycleFilter || 'all') + '|' + (searchEl ? searchEl.value.trim() : '');
    },
    onError: function (err) {
      console.warn('[preventive-cycle]', err);
    },
  });
}

function _cycleLoadList(ciclo) {
  if (!ciclo) return;
  _cycleSelectedIds = new Set();
  _cycleSummaryData = null;
  _cycleScmData = null;
  var sel = document.getElementById('selectAllCycle');
  if (sel) sel.checked = false;
  var content = document.getElementById('cycleContent');
  if (content) content.innerHTML = '';
  if (_cycleScroll) _cycleScroll.reset().init();
}

function _cycleRenderCards(items, append) {
  var container = document.getElementById('cycleContent');
  if (!container) return;

  var groups = {};
  items.forEach(function (item) {
    var key = item.local || 'Outros';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  var html = '';
  var localKeys = Object.keys(groups);
  localKeys.forEach(function (local) {
    var first = groups[local][0];
    html += '<div class="site-group mb-6" data-site="' + local.replace(/"/g, '\\"') + '">';
    html += '<div class="mb-3 flex items-center gap-2">';
    html += '<h2 class="text-xl font-medium tracking-[0.05em] text-slate-800">' + _cycleEscape(local) + '</h2>';
    if (first.local_scm) {
      html += '<span class="text-base font-medium text-slate-400 mx-1">-</span>';
      html += '<span class="text-base font-medium text-slate-500">' + _cycleEscape(hubRecase(first.local_scm)) + '</span>';
    }
    html += '</div>';
    html += '<div class="space-y-3">';

    groups[local].forEach(function (item) {
      var checked;
      if (_cycleDirtyChecks.has(item.equipamento_id)) {
        checked = _cycleDirtyChecks.get(item.equipamento_id);
      } else {
        checked = item.checked == 1;
      }
      var obs = item.observacao || '';
      var valor = parseFloat(item.valor || 0);

      html += '<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-equip-id="' + item.equipamento_id + '" data-valor="' + valor + '">';
      html += '<div class="flex flex-col gap-3">';
      html += '<div class="flex items-center gap-3">';
      html += '<input type="checkbox" class="cycle-checkbox rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" data-equip-id="' + item.equipamento_id + '"' + (checked ? ' checked' : '') + '>';
      html += '<div class="flex-1 flex items-center gap-2 flex-wrap">';
      html += '<span class="text-lg font-light tracking-[0.05em] px-3 py-1 rounded-lg bg-slate-100 text-slate-800">' + _cycleEscape(item.equipamento || '') + '</span>';
      if (item.localidade) {
        html += '<span class="text-sm text-slate-500 ml-2">' + _cycleEscape(item.localidade) + '</span>';
      }
      if (item.capacidade) {
        html += '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-semibold">' + parseFloat(item.capacidade) + ' TR</span>';
      }
      if (valor > 0) {
        html += '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-sm font-semibold" data-role="admin coordenador">R$ ' + valor.toFixed(2).replace('.', ',') + '</span>';
      }
      html += '<input type="text" class="cycle-scm-input flex-1 min-w-[120px] px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50" data-equip-id="' + item.equipamento_id + '" placeholder="N&ordm; do SCM..." value="' + _cycleEscape(item.scm_number || '') + '">';
      html += '<span class="cycle-scm-badge flex-shrink-0" data-equip-id="' + item.equipamento_id + '"></span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="ml-8">';
      html += '<textarea class="cycle-obs w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50" rows="2" data-equip-id="' + item.equipamento_id + '" placeholder="Observa&ccedil;&atilde;o...">' + _cycleEscape(obs) + '</textarea>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div></div>';
  });

  if (append) {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    container.innerHTML = html;
  }

  _cycleSelectedIds = new Set();
  document.querySelectorAll('.cycle-checkbox').forEach(function (cb) {
    if (cb.checked) {
      _cycleSelectedIds.add(parseInt(cb.dataset.equipId));
    }
  });

  if (typeof applyRoleVisibility === 'function') applyRoleVisibility();

  document.querySelectorAll('.cycle-scm-input').forEach(function (inp) {
    var val = inp.value.trim();
    if (!val) return;
    var equipId = inp.dataset.equipId;
    var badgeEl = document.querySelector('.cycle-scm-badge[data-equip-id="' + equipId + '"]');
    if (!badgeEl) return;
    if (_cycleScmValidationCache[val]) {
      _cycleRenderScmBadge(_cycleScmValidationCache[val], badgeEl);
    } else {
      _cycleValidateScm(val, equipId, badgeEl);
    }
  });

  var cycleContent = document.getElementById('cycleContent');
  if (cycleContent && !cycleContent._scmListenerAdded) {
    cycleContent._scmListenerAdded = true;
    cycleContent.addEventListener('focusout', function (e) {
      var inp = e.target.closest('.cycle-scm-input');
      if (!inp) return;
      var val = inp.value.trim();
      var equipId = inp.dataset.equipId;
      var badgeEl = cycleContent.querySelector('.cycle-scm-badge[data-equip-id="' + equipId + '"]');
      if (!badgeEl) return;
      if (!val) {
        badgeEl.innerHTML = '';
        return;
      }
      _cycleValidateScm(val, equipId, badgeEl);
    });
  }
}

function _cycleValidateScm(scmNumber, equipId, badgeEl) {
    if (_cycleScmValidationCache[scmNumber]) {
        _cycleRenderScmBadge(_cycleScmValidationCache[scmNumber], badgeEl);
        return;
    }
    var url = '/app/api/index.php?route=preventive-cycle&action=validate-scm&scm_number=' + encodeURIComponent(scmNumber);
    apiFetch(url)
        .then(function (r) { return r.json(); })
        .then(function (result) {
            if (!result.success || !result.data) return;
            _cycleScmValidationCache[scmNumber] = result.data;
            _cycleRenderScmBadge(result.data, badgeEl);
        })
        .catch(function (e) { console.warn('[preventive-cycle]', e); });
}

function _cycleRenderScmBadge(data, badgeEl) {
    if (!data.found) {
        badgeEl.innerHTML = '<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">SCM sem n&uacute;mero correspondente</span>';
        return;
    }
    var segmento = (data.segmento || '').toLowerCase();
    var isPreventiva = segmento.includes('preventiva on going') || segmento.includes('preventiva sob demanda');
    if (!isPreventiva) {
        badgeEl.innerHTML = '<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Erro no segmento</span>';
        return;
    }
    var origem = (data.origem || '').toLowerCase();
    var mercadoEquip = (data.mercado_equipamento || '').toLowerCase();
    if (origem && mercadoEquip && origem !== mercadoEquip) {
        badgeEl.innerHTML = '<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Erro no mercado</span>';
        return;
    }
    var status = data.status || '';
    var statusClass = _cycleScmStatusColors[status] || 'bg-slate-100 text-slate-700';
    badgeEl.innerHTML = '<span class="inline-flex items-center ' + statusClass + ' text-xs px-2 py-0.5 rounded-full">' + _cycleEscape(status) + '</span>';
}

function _cycleUpdateBadge() {
    var el = document.getElementById('cycleBadge');
    if (!el) return;
    if (!_cycleSummaryData && !_cycleScmData) return;
    var parts = [];
    if (_cycleSummaryData) {
        var d = _cycleSummaryData;
        var val = parseFloat(d.total_valor || 0);
        parts.push('R$ ' + val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' \u00b7 ' + (d.site_count || 0) + ' sites \u00b7 ' + (d.checked_count || 0) + ' m\u00e1q.');
    }
    if (_cycleScmData) {
        var statuses = ['SCM enviado', 'SCM negado', 'SCM verificado', 'SCM aprovado'];
        var scmParts = [];
        statuses.forEach(function (status) {
            var count = _cycleScmData[status] || 0;
            if (count > 0) {
                scmParts.push(_cycleEscape(status) + ' ' + count);
            }
        });
        if (scmParts.length > 0) {
            parts.push(scmParts.join(' \u00b7 '));
        }
    }
    el.textContent = parts.join(' | ');
}

function _cycleFetchSummary(ciclo) {
  if (!ciclo) return;
  var url = '/app/api/index.php?route=preventive-cycle&action=summary&ciclo=' + encodeURIComponent(ciclo);
  if (_cycleFilter === 'observacao') url += '&has_observacao=1';
  if (_cycleFilter === 'sem_scm') url += '&no_scm=1';
  if (_cycleFilter === 'lancados') url += '&scm_lancados=1';
  apiFetch(url)
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success || !result.data) return;
      _cycleSummaryData = result.data;
      _cycleUpdateBadge();
    })
    .catch(function (e) { console.warn('[preventive-cycle]', e); });
}

function _cycleFetchScmStatusCount(ciclo) {
    if (!ciclo) return;
    var url = '/app/api/index.php?route=preventive-cycle&action=scm-status-count&ciclo=' + encodeURIComponent(ciclo);
    apiFetch(url)
        .then(function (r) { return r.json(); })
        .then(function (result) {
            if (!result.success || !result.data) return;
            _cycleScmData = result.data;
            _cycleUpdateBadge();
        })
        .catch(function (e) { console.warn('[preventive-cycle]', e); });
}

function _cycleSave() {
  var cards = document.querySelectorAll('[data-equip-id][data-valor]');
  var items = [];

  cards.forEach(function (card) {
    var equipId = parseInt(card.dataset.equipId);
    var checkbox = card.querySelector('.cycle-checkbox');
    var textarea = card.querySelector('.cycle-obs');
    var scmInput = card.querySelector('.cycle-scm-input');
    items.push({
      equipamento_id: equipId,
      checked: checkbox ? checkbox.checked : false,
      observacao: textarea ? textarea.value : '',
      scm_number: scmInput ? scmInput.value : '',
    });
  });

  var saveBtn = document.getElementById('saveCycleBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="animate-pulse">Salvando...</span>';
  }

  apiFetch('/app/api/index.php?route=preventive-cycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciclo: _cycleCurrent, items: items }),
  })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.success) {
        if (typeof showToast === 'function') showToast('Ciclo salvo com sucesso', 'success');
        _cycleDirtyChecks = new Map();
        _cycleLoadList(_cycleCurrent);
      } else {
        if (typeof showToast === 'function') showToast(result.message || 'Erro ao salvar ciclo', 'error');
      }
    })
    .catch(function (e) {
      if (typeof showToast === 'function') showToast('Erro ao salvar ciclo', 'error');
    })
    .finally(function () {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML =
          '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvar Ciclo';
      }
    });
}

function _cycleExportCsv() {
  var ciclo = _cycleCurrent;
  if (!ciclo) {
    if (typeof showToast === 'function') showToast('Selecione um ciclo primeiro', 'error');
    return;
  }

  var allItems = [];
  var limit = 500;
  var offset = 0;

  var searchEl = document.getElementById('cycleSearch');
  var search = searchEl ? searchEl.value.trim() : '';

  if (typeof showToast === 'function') showToast('Exportando CSV...', 'loading');

  function _fetchPage() {
    var url = '/app/api/index.php?route=preventive-cycle&ciclo=' + encodeURIComponent(ciclo)
      + '&limit=' + limit + '&offset=' + offset;
    if (search) url += '&search=' + encodeURIComponent(search);
    if (_cycleFilter === 'selecionados') url += '&checked=1';
    if (_cycleFilter === 'observacao') url += '&has_observacao=1';
    if (_cycleFilter === 'sem_scm') url += '&no_scm=1';
    if (_cycleFilter === 'lancados') url += '&scm_lancados=1';

    return apiFetch(url)
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) {
          throw new Error(result.message || 'Erro ao carregar dados');
        }
        return result.data || [];
      });
  }

  function _fetchAll() {
    return _fetchPage().then(function _loop(chunk) {
      if (!chunk || chunk.length === 0) return allItems;
      allItems.push.apply(allItems, chunk);
      if (chunk.length < limit) return allItems;
      offset += limit;
      return _fetchPage().then(_loop);
    });
  }

  _fetchAll()
    .then(function (items) {
      if (items.length === 0) {
        if (typeof dismissToast === 'function') dismissToast();
        if (typeof showToast === 'function') showToast('Nenhum dado para exportar', 'error');
        return;
      }

      if (typeof downloadCSV !== 'function') {
        if (typeof dismissToast === 'function') dismissToast();
        if (typeof showToast === 'function') showToast('Função de exportação indisponível', 'error');
        return;
      }

      var header = 'LOCAL;LOCAL SCM;LOCALIDADE;EQUIPAMENTO;CAPACIDADE (TR);VALOR (R$);MARCADO;OBSERVACAO;SCM';

      downloadCSV(
        'preventiva_' + ciclo + '.csv',
        header,
        function (addRow) {
          items.forEach(function (item) {
            var valor = parseFloat(item.valor || 0);
            addRow([
              sanitizeCSV(item.local || ''),
              sanitizeCSV(item.local_scm || ''),
              sanitizeCSV(item.localidade || ''),
              sanitizeCSV(item.equipamento || ''),
              item.capacidade ? parseFloat(item.capacidade) + ' TR' : '',
              valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
              item.checked ? 'Sim' : 'N\u00e3o',
              sanitizeCSV(item.observacao || ''),
              sanitizeCSV(item.scm_number || ''),
            ]);
          });
        }
      );

      if (typeof dismissToast === 'function') dismissToast();
    })
    .catch(function (e) {
      console.warn('[preventive-cycle] CSV export error:', e);
      if (typeof dismissToast === 'function') dismissToast();
      if (typeof showToast === 'function') showToast('Erro ao exportar CSV', 'error');
    });
}

var _cycleEscape = typeof escapeHtml === 'function' ? escapeHtml : function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
