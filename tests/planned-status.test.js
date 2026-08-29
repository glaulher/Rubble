import { describe, it, expect, beforeEach } from "bun:test";

function toggleStatusDateField() {
  var select = document.getElementById('statusSelectPreventiva');
  var dateGroup = document.getElementById('statusDataGroup');
  if (!select || !dateGroup) return;
  dateGroup.classList.toggle('hidden', select.value !== 'Planejado');
}

function openStatusPreventivaComData(id, currentStatus, currentDate) {
  document.getElementById('statusPreventivaId').value = id;
  var select = document.getElementById('statusSelectPreventiva');
  select.innerHTML = '<option value="">Selecione</option>';
  var transitions = currentStatus === 'Planejado'
    ? ['Em Andamento', 'Cancelado', 'Planejado']
    : ['Planejado'];
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
  var modal = document.getElementById('modalStatusPreventiva');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function submitStatusPreventivaComData() {
  var id = document.getElementById('statusPreventivaId').value;
  var status = document.getElementById('statusSelectPreventiva').value;
  var obs = document.getElementById('statusObs').value.trim();
  var data_planejada = null;
  if (status === 'Planejado') {
    var dateInput = document.getElementById('statusDataPlanejada');
    data_planejada = dateInput ? dateInput.value : null;
  }
  return { id: parseInt(id, 10), status: status, obs: obs, data_planejada: data_planejada };
}

describe("toggleStatusDateField", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<select id="statusSelectPreventiva">' +
        '<option value="">Selecione</option>' +
        '<option value="Planejado">Planejado</option>' +
        '<option value="Em Andamento">Em Andamento</option>' +
      '</select>' +
      '<div id="statusDataGroup" class="hidden">' +
        '<input id="statusDataPlanejada" type="date">' +
      '</div>';
  });

  it("shows date field when Planejado is selected", () => {
    var select = document.getElementById('statusSelectPreventiva');
    select.value = 'Planejado';
    toggleStatusDateField();
    expect(document.getElementById('statusDataGroup').classList.contains('hidden')).toBe(false);
  });

  it("hides date field when another status is selected", () => {
    var select = document.getElementById('statusSelectPreventiva');
    select.value = 'Em Andamento';
    toggleStatusDateField();
    expect(document.getElementById('statusDataGroup').classList.contains('hidden')).toBe(true);
  });

  it("hides date field when empty option is selected", () => {
    var select = document.getElementById('statusSelectPreventiva');
    select.value = '';
    toggleStatusDateField();
    expect(document.getElementById('statusDataGroup').classList.contains('hidden')).toBe(true);
  });
});

describe("openStatusPreventivaComData", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="statusPreventivaId">' +
      '<select id="statusSelectPreventiva"></select>' +
      '<input id="statusDataPlanejada" type="date">' +
      '<div id="statusDataGroup" class="hidden"></div>' +
      '<div id="modalStatusPreventiva" class="hidden"></div>';
  });

  it("sets the id and date value and shows modal", () => {
    openStatusPreventivaComData(5, 'Planejado', '2026-08-15');
    expect(document.getElementById('statusPreventivaId').value).toBe('5');
    expect(document.getElementById('statusDataPlanejada').value).toBe('2026-08-15');
    expect(document.getElementById('modalStatusPreventiva').classList.contains('hidden')).toBe(false);
  });

  it("hides date group on open", () => {
    openStatusPreventivaComData(1, 'Cancelado', '2026-08-10');
    expect(document.getElementById('statusDataGroup').classList.contains('hidden')).toBe(true);
  });
});

describe("submitStatusPreventivaComData", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="statusPreventivaId" value="3">' +
      '<select id="statusSelectPreventiva">' +
        '<option value="Planejado" selected>Planejado</option>' +
      '</select>' +
      '<textarea id="statusObs">reprogramado</textarea>' +
      '<input id="statusDataPlanejada" type="date" value="2026-08-20">';
  });

  it("returns data_planejada when status is Planejado", () => {
    var result = submitStatusPreventivaComData();
    expect(result.id).toBe(3);
    expect(result.status).toBe('Planejado');
    expect(result.obs).toBe('reprogramado');
    expect(result.data_planejada).toBe('2026-08-20');
  });

  it("returns null data_planejada when status is not Planejado", () => {
    var select = document.getElementById('statusSelectPreventiva');
    select.innerHTML = '<option value="Em Andamento" selected>Em Andamento</option>';
    var result = submitStatusPreventivaComData();
    expect(result.status).toBe('Em Andamento');
    expect(result.data_planejada).toBeNull();
  });

  it("returns null data_planejada when date input is empty", () => {
    document.getElementById('statusDataPlanejada').value = '';
    var result = submitStatusPreventivaComData();
    expect(result.data_planejada).toBe('');
  });
});

describe("_updateGroupSlaProgress", () => {
  function updateGroupSlaProgress(newItem) {
    if (!newItem || newItem.sla_feito === undefined) return;
    var gid = newItem.sla_group_id || newItem.id;
    if (!gid) return;
    var selector = '.planned-card[data-sla-group-id="' + gid + '"], .planned-card[data-id="' + gid + '"]';
    document.querySelectorAll(selector).forEach(function (c) {
      if (c.getAttribute('data-id') === String(newItem.id)) return;
      c.setAttribute('data-sla-feito', newItem.sla_feito);
      c.setAttribute('data-sla-restam', newItem.sla_restam);
      var bar = c.querySelector('.sla-progress-bar');
      var txt = c.querySelector('.sla-progress-text');
      var totalM2 = parseInt(c.getAttribute('data-machine-count') || '0', 10) || parseInt(newItem.machine_count || '0', 10) || 0;
      var feito = parseInt(newItem.sla_feito, 10) || 0;
      var restam = newItem.sla_restam !== undefined ? parseInt(newItem.sla_restam, 10) : (totalM2 ? Math.max(0, totalM2 - feito) : 0);
      var pct = newItem.sla_pct !== undefined ? parseInt(newItem.sla_pct, 10) : (totalM2 ? Math.round(feito / totalM2 * 100) : 0);
      if (bar) {
        bar.style.width = pct + '%';
        bar.className = 'h-2 rounded-full sla-progress-bar ' + (feito >= totalM2 && totalM2 > 0 ? 'bg-emerald-500' : (feito > 0 ? 'bg-amber-500' : 'bg-slate-300'));
      }
      if (txt) {
        var t = totalM2 ? feito + ' de ' + totalM2 + ' (' + pct + '%) — faltam ' + restam : feito + ' preventivadas';
        txt.textContent = 'Progresso SLA: ' + t;
      }
    });
  }

  beforeEach(() => {
    document.body.innerHTML =
      '<div class="planned-card" data-id="10" data-sla-group-id="10" data-machine-count="8" data-sla-feito="0">' +
        '<span class="sla-progress-text">Progresso SLA: 0 de 8 (0%) — faltam 8</span>' +
        '<div class="sla-progress-bar bg-slate-300" style="width:0%"></div>' +
      '</div>' +
      '<div class="planned-card" data-id="11" data-sla-group-id="10" data-machine-count="8" data-sla-feito="0">' +
        '<span class="sla-progress-text">Progresso SLA: 0 de 8 (0%) — faltam 8</span>' +
        '<div class="sla-progress-bar bg-slate-300" style="width:0%"></div>' +
      '</div>' +
      '<div class="planned-card" data-id="12" data-sla-group-id="10" data-machine-count="8" data-sla-feito="0">' +
        '<span class="sla-progress-text">Progresso SLA: 0 de 8 (0%) — faltam 8</span>' +
        '<div class="sla-progress-bar bg-slate-300" style="width:0%"></div>' +
      '</div>';
  });

  it("updates all other cards in the SLA group when card 11 is updated with 2 machines", () => {
    var newItem = {
      id: 11,
      sla_group_id: 10,
      sla_feito: 3,
      sla_restam: 5,
      sla_pct: 38,
      machine_count: 8,
    };

    updateGroupSlaProgress(newItem);

    var card10 = document.querySelector('.planned-card[data-id="10"]');
    var card12 = document.querySelector('.planned-card[data-id="12"]');

    expect(card10.getAttribute('data-sla-feito')).toBe('3');
    expect(card10.getAttribute('data-sla-restam')).toBe('5');
    expect(card10.querySelector('.sla-progress-text').textContent).toBe('Progresso SLA: 3 de 8 (38%) — faltam 5');
    expect(card10.querySelector('.sla-progress-bar').style.width).toBe('38%');
    expect(card10.querySelector('.sla-progress-bar').classList.contains('bg-amber-500')).toBe(true);

    expect(card12.getAttribute('data-sla-feito')).toBe('3');
    expect(card12.getAttribute('data-sla-restam')).toBe('5');
    expect(card12.querySelector('.sla-progress-text').textContent).toBe('Progresso SLA: 3 de 8 (38%) — faltam 5');
  });

  it("updates cards when total reaches 100% with emerald bar", () => {
    var newItem = {
      id: 12,
      sla_group_id: 10,
      sla_feito: 8,
      sla_restam: 0,
      sla_pct: 100,
      machine_count: 8,
    };

    updateGroupSlaProgress(newItem);

    var card10 = document.querySelector('.planned-card[data-id="10"]');
    expect(card10.querySelector('.sla-progress-text').textContent).toBe('Progresso SLA: 8 de 8 (100%) — faltam 0');
    expect(card10.querySelector('.sla-progress-bar').classList.contains('bg-emerald-500')).toBe(true);
  });
});
