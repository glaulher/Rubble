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
