// public/js/components/plan-modal.js
// Componente reutilizável do modal "Planejar Atividade".
// Renderiza a partir de <template id="planModalTemplate"> (index.html),
// encapsula estado, listeners (anexados uma única vez) e o fluxo de submit.
// Exposed global: PlanModal.open({ mode, ticket, onSubmit }), PlanModal.close().

var PlanModal = (function () {
  var _mounted = false;
  var _ctx = null;
  var _el = {};
  var _localOptions = [];
  var _equipOptions = [];

  function _show() {
    if (_el.modal) _el.modal.classList.remove('hidden');
  }

  function _hide() {
    if (_el.modal) _el.modal.classList.add('hidden');
  }

  function _toggleFields() {
    var t = _el.tipo ? _el.tipo.value : '';
    var isPreventiva = t === 'preventiva';
    var isCorretiva = t === 'corretiva';
    if (_el.prevFields) _el.prevFields.classList.toggle('hidden', !isPreventiva);
    if (_el.corrFields) _el.corrFields.classList.toggle('hidden', !isCorretiva);
  }

  function _reset() {
    if (_el.form) _el.form.reset();
    if (_el.equipamentoId) _el.equipamentoId.value = '';
    _toggleFields();
    var preview = _el.modal ? _el.modal.querySelector('#slaPreview') : null;
    if (preview) preview.classList.add('hidden');
    if (_el.submitBtn) {
      _el.submitBtn.disabled = false;
      _el.submitBtn.textContent = 'Planejar';
    }
  }

  function _prefillTicket(ticket) {
    _reset();
    if (!ticket) return;
    if (_el.tipo) _el.tipo.value = 'corretiva';
    _toggleFields();
    if (_el.site) _el.site.value = ticket.local || '';
    if (_el.os) _el.os.value = ticket.os || '';
    if (_el.equipamento) _el.equipamento.value = ticket.equipamento || '';
    if (_el.equipamentoId) {
      _el.equipamentoId.value = ticket.equipamento_id != null ? String(ticket.equipamento_id) : '';
    }
    if (_el.data) _el.data.value = ticket.data_planejada || '';
    if (_el.equipe) _el.equipe.value = ticket.equipe || '';
    if (_el.obs) _el.obs.value = ticket.obs || '';
  }

  function _generateSlaDateList(startDate, days, includeSat, includeSun) {
    var dates = [];
    var current = new Date(startDate + 'T12:00:00');
    var created = 0;
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
      created++;
    }
    return dates;
  }

  function _updateSlaPreview() {
    var preview = _el.modal ? _el.modal.querySelector('#slaPreview') : null;
    var text = _el.modal ? _el.modal.querySelector('#slaPreviewText') : null;
    if (!preview) return;
    var days = _el.slaDays ? parseInt(_el.slaDays.value, 10) : 0;
    var dt = _el.data ? _el.data.value : '';
    if (!days || days < 1 || !dt) {
      preview.classList.add('hidden');
      return;
    }
    var includeSat = _el.slaSat ? _el.slaSat.checked : false;
    var includeSun = _el.slaSun ? _el.slaSun.checked : false;
    var dates = _generateSlaDateList(dt, days, includeSat, includeSun);
    preview.classList.remove('hidden');
    if (text) text.textContent = days + ' dia' + (days > 1 ? 's' : '') + ': ' + dates.join(', ');
  }

  function _loadLocals() {
    if (typeof apiFetch !== 'function') return;
    apiFetch('/app/api/index.php?route=locals')
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result && result.data) _localOptions = result.data;
      })
      .catch(function () {});
  }

  function _loadEquipamentos(local) {
    if (typeof apiFetch !== 'function') return;
    var url = '/app/api/index.php?route=equipment&limit=9999';
    if (local) {
      url += '&local=' + encodeURIComponent(local);
    }
    apiFetch(url)
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result && result.data) _equipOptions = result.data;
      })
      .catch(function () {});
  }

  function _setupAutocompletes() {
    if (typeof createAutocomplete !== 'function' || !_el.site || !_el.equipamento) return;

    createAutocomplete({
      inputSelector: '#planSite',
      dropdownSelector: '.site-dropdown',
      dataSource: function () { return _localOptions; },
      onSelect: function (item) {
        _loadEquipamentos(item);
      },
    });

    createAutocomplete({
      inputSelector: '#planEquipamento',
      dropdownSelector: '.equipamento-dropdown',
      dataSource: function () { return _equipOptions; },
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
        if (_el.equipamentoId) _el.equipamentoId.value = item.id;
      },
      onBlur: function (o) { o.hide(); },
    });
  }

  function _mount() {
    if (_mounted) return;
    var tpl = document.getElementById('planModalTemplate');
    if (!tpl) return;
    document.body.appendChild(tpl.content.cloneNode(true));

    _el.modal = document.getElementById('modalPlanActivity');
    _el.form = document.getElementById('planForm');
    _el.site = document.getElementById('planSite');
    _el.tipo = document.getElementById('planTipo');
    _el.ticket = document.getElementById('planTicket');
    _el.prevFields = document.getElementById('preventivaFields');
    _el.corrFields = document.getElementById('corretivaFields');
    _el.equipamento = document.getElementById('planEquipamento');
    _el.equipamentoId = document.getElementById('planEquipamentoId');
    _el.os = document.getElementById('planOs');
    _el.data = document.getElementById('planData');
    _el.equipe = document.getElementById('planEquipe');
    _el.obs = document.getElementById('planObs');
    _el.slaDays = document.getElementById('planSlaDays');
    _el.slaSat = document.getElementById('planSlaSat');
    _el.slaSun = document.getElementById('planSlaSun');
    _el.cancelBtn = document.getElementById('btnCancelPlan');
    _el.submitBtn = document.querySelector('#planForm button[type="submit"]');

    if (_el.tipo) _el.tipo.addEventListener('change', _toggleFields);
    if (_el.cancelBtn) _el.cancelBtn.addEventListener('click', close);
    if (_el.form) {
      _el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        _submit();
      });
    }

    var slaInputs = [_el.slaDays, _el.slaSat, _el.slaSun, _el.data];
    for (var i = 0; i < slaInputs.length; i++) {
      var input = slaInputs[i];
      if (!input) continue;
      var evt = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(evt, _updateSlaPreview);
    }

    _setupAutocompletes();
    _loadLocals();
    _mounted = true;
  }

  function _submit() {
    if (!_ctx) return;

    if (!_el.tipo || !_el.tipo.value) {
      showToast('Selecione o tipo (Preventiva ou Corretiva).', 'error');
      if (_el.tipo) _el.tipo.focus();
      return;
    }
    if (!_el.site || !_el.site.value.trim()) {
      showToast('Selecione um site.', 'error');
      if (_el.site) _el.site.focus();
      return;
    }
    if (!_el.data || !_el.data.value) {
      showToast('Informe a data planejada.', 'error');
      if (_el.data) _el.data.focus();
      return;
    }

    var isPreventiva = _el.tipo.value === 'preventiva';
    var route;
    var payload;

    if (isPreventiva) {
      route = '/app/api/index.php?route=preventiva';
      payload = {
        site: _el.site.value.trim(),
        data_planejada: _el.data.value,
        ticket: _el.ticket ? _el.ticket.value.trim() : '',
        equipe: (_el.equipe ? _el.equipe.value.trim() : '') || 'A definir',
        obs: (_el.obs ? _el.obs.value.trim() : '') || '',
      };
      if (_el.slaDays && _el.slaDays.value) {
        payload.sla_days = parseInt(_el.slaDays.value, 10);
        payload.sla_include_saturday = _el.slaSat && _el.slaSat.checked ? 1 : 0;
        payload.sla_include_sunday = _el.slaSun && _el.slaSun.checked ? 1 : 0;
      }
    } else {
      if (!_el.os || !_el.os.value.trim()) {
        showToast('Informe o n\u00famero da OS.', 'error');
        if (_el.os) _el.os.focus();
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(_el.os.value.trim())) {
        showToast('OS deve conter apenas letras e n\u00fameros.', 'error');
        if (_el.os) _el.os.focus();
        return;
      }
      if (!_el.equipamentoId || !_el.equipamentoId.value) {
        showToast('Selecione um equipamento.', 'error');
        return;
      }

      route = '/app/api/index.php?route=planned-activities';
      payload = {
        os: _el.os.value.trim(),
        equipamento_id: parseInt(_el.equipamentoId.value, 10),
        data_planejada: _el.data.value,
        equipe: (_el.equipe ? _el.equipe.value.trim() : '') || 'A definir',
        material: 'Sim',
        obs: (_el.obs ? _el.obs.value.trim() : '') || '',
        tipo: 'corretiva',
      };
      if (_el.slaDays && _el.slaDays.value) {
        payload.sla_days = parseInt(_el.slaDays.value, 10);
        payload.sla_include_saturday = _el.slaSat && _el.slaSat.checked ? 1 : 0;
        payload.sla_include_sunday = _el.slaSun && _el.slaSun.checked ? 1 : 0;
      }
    }

    if (_el.submitBtn) {
      _el.submitBtn.disabled = true;
      _el.submitBtn.textContent = 'Salvando...';
    }

    apiFetch(route, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (_el.submitBtn) {
          _el.submitBtn.disabled = false;
          _el.submitBtn.textContent = 'Planejar';
        }
        if (result && result.success) {
          _hide();
          if (_ctx && typeof _ctx.onSubmit === 'function') {
            _ctx.onSubmit(result.data);
          }
        } else {
          showToast(result && result.message ? result.message : 'Erro ao salvar', 'error');
        }
      })
      .catch(function (err) {
        if (_el.submitBtn) {
          _el.submitBtn.disabled = false;
          _el.submitBtn.textContent = 'Planejar';
        }
        showToast('Erro ao salvar atividade.', 'error');
        console.error('Erro ao planejar atividade:', err);
      });
  }

  function open(options) {
    _ctx = options || {};
    _mount();
    if (!_mounted) return;
    if (_ctx.mode === 'pending' && _ctx.ticket) {
      _prefillTicket(_ctx.ticket);
    } else {
      _reset();
    }
    _show();
  }

  function close() {
    _hide();
    _ctx = null;
  }

  return {
    open: open,
    close: close,
  };
})();

globalThis.PlanModal = PlanModal;
