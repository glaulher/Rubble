var _cycleCurrent = '';
var _cycleSelectedIds = new Set();
var _cycleTotal = 0;
var _cyclePage = 0;
var _cycleLimit = 20;
var _cycleCheckedOnly = false;
var _cycleDirtyChecks = new Map();
var _cycleHasObservacao = false;

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
  _cycleCurrent = '';
  _cycleSelectedIds = new Set();
  _cycleTotal = 0;
  _cyclePage = 0;
  _cycleDirtyChecks = new Map();
  _cycleHasObservacao = false;

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

function _cycleSetupEvents() {
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
        _cyclePage = 0;
        _cycleSelectedIds = new Set();
        _cycleDirtyChecks = new Map();
        var content = document.getElementById('cycleContent');
        if (content) content.innerHTML = '';
        _cycleLoadList(val);
      }, 300);
    }
    cycleInput.addEventListener('input', _onCycleChange);
    cycleInput.addEventListener('change', _onCycleChange);
  }

  var saveBtn = document.getElementById('saveCycleBtn');
  if (saveBtn) saveBtn.addEventListener('click', _cycleSave);

  var selectAll = document.getElementById('selectAllCycle');
  if (selectAll) {
    selectAll.addEventListener('change', function () {
      var checked = this.checked;
      var action = checked ? 'check-all' : 'uncheck-all';
      var url = '/app/api/index.php?route=preventive-cycle&action=' + action + '&ciclo=' + encodeURIComponent(_cycleCurrent);
      if (_cycleHasObservacao) url += '&has_observacao=1';

      selectAll.disabled = true;
      apiFetch(url, { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (result.success) {
            _cyclePage = 0;
            _cycleSelectedIds = new Set();
            _cycleDirtyChecks = new Map();
            selectAll.checked = false;
            _cycleLoadList(_cycleCurrent);
          } else {
            if (typeof showToast === 'function') showToast(result.message || 'Erro ao marcar/desmarcar', 'error');
          }
        })
        .catch(function (e) {
          if (typeof showToast === 'function') showToast('Erro ao marcar/desmarcar', 'error');
        })
        .finally(function () {
          selectAll.disabled = false;
        });
    });
  }

  var searchInput = document.getElementById('cycleSearch');
  if (searchInput) {
    var timer;
    searchInput.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        _cyclePage = 0;
        _cycleSelectedIds = new Set();
        var content = document.getElementById('cycleContent');
        if (content) content.innerHTML = '';
        _cycleLoadList(_cycleCurrent);
      }, 1000);
    });
  }

  var checkedToggle = document.getElementById('cycleCheckedOnly');
  if (checkedToggle) {
    checkedToggle.addEventListener('change', function () {
      _cycleCheckedOnly = this.checked;
      _cyclePage = 0;
      _cycleSelectedIds = new Set();
      var content = document.getElementById('cycleContent');
      if (content) content.innerHTML = '';
      _cycleLoadList(_cycleCurrent);
    });
  }

  var obsToggle = document.getElementById('cycleHasObservacao');
  if (obsToggle) {
    obsToggle.addEventListener('change', function () {
      _cycleHasObservacao = this.checked;
      _cyclePage = 0;
      _cycleSelectedIds = new Set();
      var content = document.getElementById('cycleContent');
      if (content) content.innerHTML = '';
      _cycleLoadList(_cycleCurrent);
    });
  }

  var sentinel = document.getElementById('cycleSentinel');
  if (sentinel) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && _cycleCurrent) {
        _cyclePage++;
        _cycleLoadList(_cycleCurrent, true);
      }
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
  }

  if (window.PollingManager) {
    PollingManager.start('preventive-summary', function () {
      _cycleFetchSummary(_cycleCurrent);
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
      _cycleUpdateBadge();
    });

    container.addEventListener('input', function (e) {
      if (e.target.classList.contains('cycle-obs')) {
        _cycleUpdateBadge();
      }
    });
  }
}

function _cycleLoadList(ciclo, append) {
  if (append === undefined) append = false;
  if (!ciclo) return;
  var offset = append ? _cyclePage * _cycleLimit : 0;
  var searchEl = document.getElementById('cycleSearch');
  var search = searchEl ? searchEl.value.trim() : '';

  var url = '/app/api/index.php?route=preventive-cycle&ciclo=' + encodeURIComponent(ciclo)
    + '&limit=' + _cycleLimit + '&offset=' + offset;
  if (search) url += '&search=' + encodeURIComponent(search);
  if (_cycleCheckedOnly) url += '&checked=1';
  if (_cycleHasObservacao) url += '&has_observacao=1';

  apiFetch(url)
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) return;
      var items = result.data || [];
      _cycleTotal = result.total || 0;

      if (!append) {
        var content = document.getElementById('cycleContent');
        if (content) content.innerHTML = '';
      }

      _cycleRenderCards(items, append);
      _cycleFetchSummary(ciclo);
    })
    .catch(function () {});
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
    if (first.localidade) {
      html += '<span class="text-base font-medium text-slate-400 mx-1">-</span>';
      html += '<span class="text-base font-medium text-slate-500">' + _cycleEscape(first.localidade) + '</span>';
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
      if (item.capacidade) {
        html += '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-semibold">' + parseFloat(item.capacidade) + ' TR</span>';
      }
      if (valor > 0) {
        html += '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-sm font-semibold" data-role="admin coordenador">R$ ' + valor.toFixed(2).replace('.', ',') + '</span>';
      }
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

  _cycleUpdateBadge();
  if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
}

function _cycleUpdateBadge() {
  var total = 0;
  var machineCount = 0;
  var visibleSites = new Set();

  document.querySelectorAll('#cycleContent .cycle-checkbox:checked').forEach(function (cb) {
    var card = cb.closest('[data-valor]');
    var hasObs = false;
    if (card) {
      var textarea = card.querySelector('.cycle-obs');
      hasObs = textarea && textarea.value.trim() !== '';
    }
    if (hasObs && !_cycleHasObservacao) return;
    machineCount++;
    var group = cb.closest('.site-group');
    if (group) visibleSites.add(group.dataset.site);
    if (!card) return;
    total += parseFloat(card.dataset.valor) || 0;
  });

  var el = document.getElementById('cycleBadge');
  if (el) {
    el.textContent = 'R$ ' + total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' \u00b7 ' + visibleSites.size + ' sites \u00b7 ' + machineCount + ' m\u00e1q.';
  }
}

function _cycleFetchSummary(ciclo) {
  var url = '/app/api/index.php?route=preventive-cycle&action=summary&ciclo=' + encodeURIComponent(ciclo);
  if (_cycleHasObservacao) url += '&has_observacao=1';
  apiFetch(url)
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success || !result.data) return;
      var d = result.data;
      var val = parseFloat(d.total_valor || 0);
      var el = document.getElementById('cycleBadge');
      if (el) {
        el.textContent = 'R$ ' + val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' \u00b7 ' + (d.site_count || 0) + ' sites \u00b7 ' + (d.checked_count || 0) + ' m\u00e1q.';
      }
    })
    .catch(function () {});
}

function _cycleSave() {
  var cards = document.querySelectorAll('[data-equip-id][data-valor]');
  var items = [];

  cards.forEach(function (card) {
    var equipId = parseInt(card.dataset.equipId);
    var checkbox = card.querySelector('.cycle-checkbox');
    var textarea = card.querySelector('.cycle-obs');
    items.push({
      equipamento_id: equipId,
      checked: checkbox ? checkbox.checked : false,
      observacao: textarea ? textarea.value : '',
    });
  });

  var saveBtn = document.getElementById('saveCycleBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="animate-pulse">Salvando...</span>';
  }

  fetch('/app/api/index.php?route=preventive-cycle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (sessionStorage.getItem('token') || ''),
    },
    body: JSON.stringify({ ciclo: _cycleCurrent, items: items }),
  })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.success) {
        if (typeof showToast === 'function') showToast('Ciclo salvo com sucesso', 'success');
        _cyclePage = 0;
        _cycleSelectedIds = new Set();
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

function _cycleEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
