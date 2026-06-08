var _cycleCurrent = '';
var _cycleSelectedIds = new Set();
var _cycleTotal = 0;
var _cycleLastHash = '';
var _cyclePage = 0;
var _cycleLimit = 20;

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
  _cycleLastHash = '';
  _cyclePage = 0;

  var now = new Date();
  var defaultCycle = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var input = document.getElementById('cycleInput');
  if (input) input.value = defaultCycle;
  _cycleCurrent = defaultCycle;

  var datalist = document.getElementById('cycleOptions');
  if (datalist) {
    _cycleGenerateOptions().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      datalist.appendChild(opt);
    });
  }

  _cycleLoadList(defaultCycle);
  _cycleSetupEvents();
}

function _cycleSetupEvents() {
  var cycleInput = document.getElementById('cycleInput');
  if (cycleInput) {
    cycleInput.addEventListener('change', function () {
      var val = cycleInput.value.trim();
      if (val && val !== _cycleCurrent) {
        _cycleCurrent = val;
        _cyclePage = 0;
        _cycleSelectedIds = new Set();
        var content = document.getElementById('cycleContent');
        if (content) content.innerHTML = '';
        _cycleLoadList(val);
      }
    });
  }

  var saveBtn = document.getElementById('saveCycleBtn');
  if (saveBtn) saveBtn.addEventListener('click', _cycleSave);

  var selectAll = document.getElementById('selectAllCycle');
  if (selectAll) {
    selectAll.addEventListener('change', function () {
      var checked = this.checked;
      document.querySelectorAll('.cycle-checkbox').forEach(function (cb) {
        cb.checked = checked;
        var id = parseInt(cb.dataset.equipId);
        if (checked) {
          _cycleSelectedIds.add(id);
        } else {
          _cycleSelectedIds['delete'](id);
        }
      });
      _cycleUpdateCounter();
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

  var sentinel = document.getElementById('cycleSentinel');
  if (sentinel) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
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
}

function _cycleLoadList(ciclo, append) {
  if (append === undefined) append = false;
  var offset = append ? _cyclePage * _cycleLimit : 0;
  var searchEl = document.getElementById('cycleSearch');
  var search = searchEl ? searchEl.value.trim() : '';

  var url = '/app/api/index.php?route=preventive-cycle&ciclo=' + encodeURIComponent(ciclo)
    + '&limit=' + _cycleLimit + '&offset=' + offset;
  if (search) url += '&search=' + encodeURIComponent(search);

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
    .catch(function (e) { console.error(e); });
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
      var checked = item.checked == 1;
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

  document.querySelectorAll('.cycle-checkbox').forEach(function (cb) {
    var id = parseInt(cb.dataset.equipId);
    if (_cycleSelectedIds.has(id)) {
      cb.checked = true;
    }
  });

  container.addEventListener('change', function (e) {
    var cb = e.target.closest('.cycle-checkbox');
    if (!cb) return;
    var id = parseInt(cb.dataset.equipId);
    if (cb.checked) {
      _cycleSelectedIds.add(id);
    } else {
      _cycleSelectedIds['delete'](id);
    }
    _cycleUpdateCounter();
    _cycleUpdateValor();
  });

  _cycleUpdateCounter();
  _cycleUpdateValor();
  if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
}

function _cycleUpdateCounter() {
  var el = document.getElementById('cycleCounter');
  if (el) {
    el.textContent = _cycleTotal + ' equip. \u00b7 ' + _cycleSelectedIds.size + ' selecionados';
  }
}

function _cycleUpdateValor() {
  var total = 0;
  document.querySelectorAll('.cycle-checkbox:checked').forEach(function (cb) {
    var card = cb.closest('[data-valor]');
    if (card) total += parseFloat(card.dataset.valor) || 0;
  });
  var badge = document.getElementById('cycleValorBadge');
  if (badge) badge.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function _cycleFetchSummary(ciclo) {
  var url = '/app/api/index.php?route=preventive-cycle&action=summary&ciclo=' + encodeURIComponent(ciclo);
  apiFetch(url)
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success || !result.data) return;
      var badge = document.getElementById('cycleValorBadge');
      if (badge) {
        var val = parseFloat(result.data.total_valor || 0);
        badge.textContent = 'R$ ' + val.toFixed(2).replace('.', ',');
      }
      _cycleUpdateValor();
    })
    .catch(function (e) { console.error(e); });
}

function _cycleSave() {
  var cards = document.querySelectorAll('[data-equip-id]');
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
        _cycleLoadList(_cycleCurrent);
      } else {
        if (typeof showToast === 'function') showToast(result.message || 'Erro ao salvar ciclo', 'error');
      }
    })
    .catch(function (e) {
      if (typeof showToast === 'function') showToast('Erro ao salvar ciclo', 'error');
      console.error(e);
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
