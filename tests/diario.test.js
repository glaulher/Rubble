import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { evalModule } from "./helpers/eval-module.js";

var mockInfiniteScroll = `
  var _scrollCalls = { reset: 0, init: 0, destroy: 0 };
  function createInfiniteScroll(opts) {
    return {
      init: function () { _scrollCalls.init++; if (opts.fetchFn) opts.fetchFn({ limit: 20, offset: 0, data: [] }, {}); return this; },
      destroy: function () { _scrollCalls.destroy++; },
      reset: function () { _scrollCalls.reset++; return this; },
      load: function () {},
      getState: function () { return { data: [], page: 0, allLoaded: false, loading: false, total: 0 }; },
    };
  }
  function debounce(fn, delay) { return fn; }
`;

var DIARIO_HELPERS =
  '\nfunction escapeHtml(v) { return String(v); }\n' +
  'function formatDate(v) { if (!v) return ""; var parts = String(v).split("-"); return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : String(v); }\n' +
  'function sanitizeCSV(v) { if (v === null || v === undefined) return ""; var s = String(v); return /[;"\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s; }\n';

function createMouseEvent(type) {
  return typeof MouseEvent !== 'undefined'
    ? new MouseEvent(type, { bubbles: true, cancelable: true })
    : new Event(type, { bubbles: true, cancelable: true });
}

function setupDiarioDOM() {
  document.body.innerHTML = `
    <span id="diarioBadge">0</span>
    <button id="diarioNewBtn"></button>
    <button id="diarioCsvBtn"></button>
    <input id="diarioSearchInput" />
    <input id="diarioDateFrom" />
    <input id="diarioDateTo" />
    <div id="diarioCategoryContainer">
      <button id="diarioCategoryBtn"><span id="diarioCategoryLabel">Todas</span></button>
      <div id="diarioCategoryDropdown" class="hidden"></div>
    </div>
    <div id="diarioStatusContainer">
      <button id="diarioStatusBtn"><span id="diarioStatusLabel">Todos</span></button>
      <div id="diarioStatusDropdown" class="hidden"></div>
    </div>
    <div id="diarioScrollContainer">
      <table id="diarioTable">
        <thead>
          <tr>
            <th data-sort="tecnico">Técnico <span class="sort-icon"></span></th>
            <th data-sort="equipe">Equipe <span class="sort-icon"></span></th>
            <th data-sort="placa">Placa <span class="sort-icon"></span></th>
            <th data-sort="data">Data <span class="sort-icon"></span></th>
            <th data-sort="site">Site <span class="sort-icon"></span></th>
            <th data-sort="categoria">Tipo Atividade <span class="sort-icon"></span></th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="diarioTableBody"></tbody>
      </table>
      <div id="diarioSentinel"></div>
    </div>
    <div id="diarioEmpty" class="hidden"></div>

    <!-- Modal Diário -->
    <div id="diarioModal" class="hidden">
      <h2 id="diarioModalTitle">Diário de Atividades</h2>
      <p id="diarioModalSubtitle">Preencha os dados</p>
      <button id="btnDiarioModalClose"></button>
      <form id="diarioModalForm">
        <input type="hidden" id="diarioModalId" value="" />
        <span id="diarioModalTecnicoReq"></span>
        <input type="text" id="diarioModalTecnico" />
        <div id="diarioModalTecnicoDropdown" class="hidden"></div>
        <input type="text" id="diarioModalEquipe" />
        <div id="diarioModalEquipeDropdown" class="hidden"></div>
        <input type="text" id="diarioModalPlaca" />
        <div id="diarioModalPlacaDropdown" class="hidden"></div>
        <input type="date" id="diarioModalData" />
        <select id="diarioModalCategoria">
          <option value="corretiva">Corretiva</option>
          <option value="preventiva">Preventiva</option>
          <option value="emergencial">Emergencial</option>
          <option value="administrativa">Administrativa</option>
        </select>
        <select id="diarioModalStatus">
          <option value="Concluído">Concluído</option>
          <option value="Pendente">Pendente</option>
          <option value="Em andamento">Em andamento</option>
        </select>
        <input type="text" id="diarioModalSite" />
        <div id="diarioModalSiteDropdown" class="hidden"></div>
        <input type="text" id="diarioModalEquipamento" />
        <input type="hidden" id="diarioModalEquipamentoId" value="" />
        <div id="diarioModalEquipamentoDropdown" class="hidden"></div>
        <input type="text" id="diarioModalLocalidade" />
        <div id="diarioModalLocalidadeDropdown" class="hidden"></div>
        <input type="text" id="diarioModalOs" />
        <input type="time" id="diarioModalHoraInicio" />
        <input type="time" id="diarioModalHoraSaida" />
        <textarea id="diarioModalObs"></textarea>
        <button type="button" id="btnDiarioModalCancel">Cancelar</button>
        <button type="submit" id="btnDiarioModalSave"><span id="diarioModalSaveLabel">Salvar</span></button>
      </form>
    </div>

    <!-- Modal de Detalhes Diário (Read-only igual a solicitação de material) -->
    <div id="diarioDetailModal" class="hidden">
      <span id="diarioDetailId"></span>
      <p id="diarioDetailSubtitle"></p>
      <div id="diarioDetailBadges"></div>
      <table>
        <tbody id="diarioDetailInfoBody"></tbody>
      </table>
      <button id="btnCloseDiarioDetailTop"></button>
      <button id="btnDiarioDetailClose">Fechar</button>
      <button id="btnDiarioDetailEdit">Editar Atividade</button>
    </div>
  `;
}

describe("diario/list.js unit & integration", function () {
  beforeEach(() => {
    setupDiarioDOM();
    globalThis.apiFetch = function () {
      return Promise.resolve({
        json: function () { return { success: true, data: { items: [], total: 0 } }; },
      });
    };
    globalThis.getUser = function () {
      return { id: 1, role: 'admin', nome: 'Admin' };
    };
    globalThis.showToast = function () {};
    globalThis.confirmDelete = function () { return Promise.resolve(true); };
  });

  it("exports initDiarioList and loads module successfully", function () {
    delete globalThis.initDiarioList;
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);
    expect(typeof globalThis.initDiarioList).toBe("function");
  });

  it("renders status badge classes correctly", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.getDiarioStatusBadgeClass('Concluído')).toContain('emerald');
    expect(globalThis.getDiarioStatusBadgeClass('Pendente')).toContain('amber');
    expect(globalThis.getDiarioStatusBadgeClass('Em andamento')).toContain('blue');
    expect(globalThis.getDiarioStatusBadgeClass('Planejado')).toContain('sky');
    expect(globalThis.getDiarioStatusBadgeClass('Projeto Clean up')).toContain('purple');
    expect(globalThis.getDiarioStatusBadgeClass('Cancelado')).toContain('red');
  });

  it("renders category badge classes correctly", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.getDiarioCategoryBadgeClass('corretiva')).toContain('orange');
    expect(globalThis.getDiarioCategoryBadgeClass('preventiva')).toContain('sky');
    expect(globalThis.getDiarioCategoryBadgeClass('emergencial')).toContain('red');
    expect(globalThis.getDiarioCategoryBadgeClass('administrativa')).toContain('purple');
  });

  it("includes all 4 categories in DIARIO_CATEGORY_OPTIONS", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.DIARIO_CATEGORY_OPTIONS).toEqual(['corretiva', 'preventiva', 'emergencial', 'administrativa']);
  });

  it("includes HORA_INICIO, HORA_SAIDA and PLACA in DIARIO_COLUMNS", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.DIARIO_COLUMNS).toContain('HORA_INICIO');
    expect(globalThis.DIARIO_COLUMNS).toContain('HORA_SAIDA');
    expect(globalThis.DIARIO_COLUMNS).toContain('PLACA');
  });

  it("renders rows and handles empty state", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const mockItems = [
      {
        id: 101,
        site: 'BMA',
        equipamento_id: 1,
        equipamento_nome: 'WM 01',
        localidade: 'Container 1',
        os: 'OS123',
        data: '2026-10-22',
        hora_inicio: '08:00',
        hora_saida: '12:00',
        categoria: 'emergencial',
        status: 'Pendente',
        equipe: 'ALEXANDRE DONATO DA SILVA',
        placa: 'TBO-9J41',
        obs: 'Obs teste',
        created_by: 1,
      }
    ];

    globalThis.renderDiarioTable(mockItems, false);
    const rows = document.querySelectorAll('#diarioTableBody tr.diario-row');
    expect(rows.length).toBe(1);
    expect(document.getElementById('diarioEmpty').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('td[data-field="equipe"]').textContent).toContain('ALEXANDRE DONATO DA SILVA');
    expect(document.querySelector('td[data-field="placa"]').textContent).toContain('TBO-9J41');
    expect(document.querySelector('td[data-field="data"]').textContent).toContain('22/10/2026');
    expect(document.querySelector('td[data-field="site"]').textContent).toContain('BMA');
    expect(document.querySelector('td[data-field="categoria"]').textContent).toContain('emergencial');
    expect(document.querySelector('.diario-edit-btn')).not.toBeNull();
    expect(document.querySelector('.diario-duplicate-btn')).not.toBeNull();

    // Empty list
    globalThis.renderDiarioTable([], false);
    expect(document.querySelectorAll('#diarioTableBody tr.diario-row').length).toBe(0);
    expect(document.getElementById('diarioEmpty').classList.contains('hidden')).toBe(false);
  });

  it("allows delete for admin and hides for non-owner non-admin", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    // Admin user
    globalThis.getUser = () => ({ id: 1, role: 'admin' });
    globalThis.renderDiarioTable([{ id: 1, created_by: 99 }], false);
    expect(document.querySelector('.diario-delete-btn')).not.toBeNull();

    // Owner user
    globalThis.getUser = () => ({ id: 99, role: 'supervisor' });
    globalThis.renderDiarioTable([{ id: 1, created_by: 99 }], false);
    expect(document.querySelector('.diario-delete-btn')).not.toBeNull();

    // Non-owner supervisor
    globalThis.getUser = () => ({ id: 50, role: 'supervisor' });
    globalThis.renderDiarioTable([{ id: 1, created_by: 99 }], false);
    expect(document.querySelector('.diario-delete-btn')).toBeNull();
  });

  it("opens modal in create mode when openDiarioModal(null) or newBtn clicked", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    const newBtn = document.getElementById('diarioNewBtn');
    newBtn.click();

    const modal = document.getElementById('diarioModal');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('diarioModalTitle').textContent).toBe('Nova Atividade');
    expect(document.getElementById('diarioModalSaveLabel').textContent).toBe('Salvar Atividade');
    expect(document.getElementById('diarioModalId').value).toBe('');
    expect(document.getElementById('diarioModalData').value).toBe(new Date().toISOString().slice(0, 10));
  });

  it("opens modal in edit mode with prefilled fields on edit button click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();

    const mockItem = {
      id: 77,
      tecnico: 'Renato Silva',
      equipe: 'Equipe Delta',
      placa: 'TBO-9J99',
      site: 'VIX',
      data: '2026-11-15',
      categoria: 'preventiva',
      status: 'Concluído',
      hora_inicio: '08:30',
      hora_saida: '17:00',
      obs: 'Manutenção preventiva realizada',
    };

    globalThis.renderDiarioTable([mockItem], false);

    // Click edit button in row
    const editBtn = document.querySelector('.diario-edit-btn');
    editBtn.click();

    const modal = document.getElementById('diarioModal');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('diarioModalTitle').textContent).toBe('Editar Atividade');
    expect(document.getElementById('diarioModalId').value).toBe('77');
    expect(document.getElementById('diarioModalTecnico').value).toBe('Renato Silva');
    expect(document.getElementById('diarioModalEquipe').value).toBe('Equipe Delta');
    expect(document.getElementById('diarioModalPlaca').value).toBe('TBO-9J99');
    expect(document.getElementById('diarioModalSite').value).toBe('VIX');
    expect(document.getElementById('diarioModalCategoria').value).toBe('preventiva');
    expect(document.getElementById('diarioModalStatus').value).toBe('Concluído');
    expect(document.getElementById('diarioModalHoraInicio').value).toBe('08:30');
    expect(document.getElementById('diarioModalHoraSaida').value).toBe('17:00');
    expect(document.getElementById('diarioModalObs').value).toBe('Manutenção preventiva realizada');
  });

  it("opens read-only detail modal on row click (like solicitacao de material) and switches to edit modal on Editar click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();

    const mockItem = {
      id: 77,
      tecnico: 'Renato Silva',
      equipe: 'Equipe Delta',
      placa: 'TBO-9J99',
      site: 'VIX',
      data: '2026-11-15',
      categoria: 'preventiva',
      status: 'Concluído',
      hora_inicio: '08:30',
      hora_saida: '17:00',
      obs: 'Manutenção preventiva realizada com sucesso',
    };

    globalThis.renderDiarioTable([mockItem], false);

    // Click the row directly (NOT the edit button)
    const row = document.querySelector('#diarioTableBody tr.diario-row');
    const firstCell = row.querySelector('td');
    firstCell.click();

    // The editable modal must remain hidden!
    const editModal = document.getElementById('diarioModal');
    expect(editModal.classList.contains('hidden')).toBe(true);

    // The read-only detail modal must be visible!
    const detailModal = document.getElementById('diarioDetailModal');
    expect(detailModal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('diarioDetailId').textContent).toContain('77');
    expect(document.getElementById('diarioDetailSubtitle').textContent).toContain('VIX');

    // Details in table
    const infoBody = document.getElementById('diarioDetailInfoBody');
    expect(infoBody.innerHTML).toContain('Renato Silva');
    expect(infoBody.innerHTML).toContain('Equipe Delta');
    expect(infoBody.innerHTML).toContain('TBO-9J99');
    expect(infoBody.innerHTML).toContain('VIX');
    expect(infoBody.innerHTML).toContain('Manutenção preventiva realizada com sucesso');

    // Now click "Editar Atividade" inside the detail modal
    const btnEditFromDetail = document.getElementById('btnDiarioDetailEdit');
    btnEditFromDetail.click();

    // Detail modal closes, and edit modal opens
    expect(detailModal.classList.contains('hidden')).toBe(true);
    expect(editModal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('diarioModalId').value).toBe('77');
    expect(document.getElementById('diarioModalTecnico').value).toBe('Renato Silva');
  });

  it("closes detail modal on close buttons and backdrop click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    const detailModal = document.getElementById('diarioDetailModal');

    globalThis.openDiarioDetailModal({ id: 10, tecnico: 'Test', site: 'SPO' });
    expect(detailModal.classList.contains('hidden')).toBe(false);

    document.getElementById('btnCloseDiarioDetailTop').click();
    expect(detailModal.classList.contains('hidden')).toBe(true);

    globalThis.openDiarioDetailModal({ id: 10, tecnico: 'Test', site: 'SPO' });
    expect(detailModal.classList.contains('hidden')).toBe(false);

    document.getElementById('btnDiarioDetailClose').click();
    expect(detailModal.classList.contains('hidden')).toBe(true);

    globalThis.openDiarioDetailModal({ id: 10, tecnico: 'Test', site: 'SPO' });
    expect(detailModal.classList.contains('hidden')).toBe(false);

    detailModal.dispatchEvent(new Event('click'));
    expect(detailModal.classList.contains('hidden')).toBe(true);
  });

  it("closes modal on close button and cancel button click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);
    const modal = document.getElementById('diarioModal');
    expect(modal.classList.contains('hidden')).toBe(false);

    // Close button
    document.getElementById('btnDiarioModalClose').click();
    expect(modal.classList.contains('hidden')).toBe(true);

    // Cancel button
    globalThis.openDiarioModal(null);
    expect(modal.classList.contains('hidden')).toBe(false);
    document.getElementById('btnDiarioModalCancel').click();
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it("relaxes tecnico requirement when category is administrativa", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const catSelect = document.getElementById('diarioModalCategoria');
    const req = document.getElementById('diarioModalTecnicoReq');

    // Default preventiva requires tecnico
    expect(req.classList.contains('hidden')).toBe(false);

    // Switch to administrativa
    catSelect.value = 'administrativa';
    catSelect.dispatchEvent(new Event('change'));
    expect(req.classList.contains('hidden')).toBe(true);

    // Switch back to corretiva
    catSelect.value = 'corretiva';
    catSelect.dispatchEvent(new Event('change'));
    expect(req.classList.contains('hidden')).toBe(false);
  });

  it("auto-fills Equipe and Placa when selecting Técnico from cached teams", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 1, nome: 'Equipe Alpha', tecnico: 'Carlos Pereira', placa: 'ABC-1234', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const tecDropdown = document.getElementById('diarioModalTecnicoDropdown');

    tecInput.focus();
    tecInput.value = 'Carlos';
    tecInput.dispatchEvent(new Event('input'));

    expect(tecDropdown.classList.contains('hidden')).toBe(false);
    const itemDiv = tecDropdown.querySelector('div');
    expect(itemDiv.textContent).toBe('Carlos Pereira');

    // Trigger select
    itemDiv.dispatchEvent(createMouseEvent('mousedown'));

    expect(tecInput.value).toBe('Carlos Pereira');
    expect(document.getElementById('diarioModalEquipe').value).toBe('Equipe Alpha');
    expect(document.getElementById('diarioModalPlaca').value).toBe('ABC-1234');
  });

  it("auto-fills Placa and Técnico when selecting Equipe from cached teams", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 2, nome: 'Equipe Beta', tecnico: 'Marcos Silva', placa: 'XYZ-9876', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const eqInput = document.getElementById('diarioModalEquipe');
    const eqDropdown = document.getElementById('diarioModalEquipeDropdown');

    eqInput.focus();
    eqInput.value = 'Beta';
    eqInput.dispatchEvent(new Event('input'));

    expect(eqDropdown.classList.contains('hidden')).toBe(false);
    const itemDiv = eqDropdown.querySelector('div');
    expect(itemDiv.textContent).toBe('Equipe Beta');

    itemDiv.dispatchEvent(createMouseEvent('mousedown'));

    expect(eqInput.value).toBe('Equipe Beta');
    expect(document.getElementById('diarioModalPlaca').value).toBe('XYZ-9876');
    expect(document.getElementById('diarioModalTecnico').value).toBe('Marcos Silva');
  });

  it("auto-fills Placa on input and blur when typing Técnico without using dropdown click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 3, nome: 'Alexandre - Flavio', tecnico: 'ALEXANDRE DONATO DA SILVA', placa: 'TBO-9J41', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const eqInput = document.getElementById('diarioModalEquipe');
    const placaInput = document.getElementById('diarioModalPlaca');

    // User types the full technician name or partial prefix and leaves the field (blur)
    tecInput.value = 'ALEXANDRE DONATO DA SILVA';
    tecInput.dispatchEvent(new Event('input'));
    tecInput.dispatchEvent(new Event('blur'));

    expect(eqInput.value).toBe('Alexandre - Flavio');
    expect(placaInput.value).toBe('TBO-9J41');
  });

  it("auto-fills Placa on input and blur when typing Equipe without using dropdown click", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 4, nome: 'Claudio Roberto - Carlos', tecnico: 'CLAUDIO ROBERTO FERREIRA ROCHA', placa: 'TBO-9J53', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const eqInput = document.getElementById('diarioModalEquipe');
    const placaInput = document.getElementById('diarioModalPlaca');

    eqInput.value = 'Claudio Roberto - Carlos';
    eqInput.dispatchEvent(new Event('input'));
    eqInput.dispatchEvent(new Event('blur'));

    expect(placaInput.value).toBe('TBO-9J53');
    expect(tecInput.value).toBe('CLAUDIO ROBERTO FERREIRA ROCHA');
  });

  it("overwrites and auto-fills both Técnico and Placa when selecting or typing Equipe even if Técnico already has text", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 4, nome: 'Claudio Roberto - Carlos', tecnico: 'CLAUDIO ROBERTO FERREIRA ROCHA', placa: 'TBO-9J53', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const eqInput = document.getElementById('diarioModalEquipe');
    const placaInput = document.getElementById('diarioModalPlaca');

    tecInput.value = 'Técnico Anterior Qualquer';
    placaInput.value = 'OLD-0000';

    eqInput.value = 'Claudio Roberto - Carlos';
    eqInput.dispatchEvent(new Event('input'));
    eqInput.dispatchEvent(new Event('blur'));

    expect(tecInput.value).toBe('CLAUDIO ROBERTO FERREIRA ROCHA');
    expect(placaInput.value).toBe('TBO-9J53');
  });

  it("auto-fills Técnico and Placa when Equipe is entered as partial name", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 1, nome: 'Leander - Sidiney', tecnico: 'LEANDER SOARES VIEIRA', placa: 'TBO-9J46', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const eqInput = document.getElementById('diarioModalEquipe');
    const placaInput = document.getElementById('diarioModalPlaca');

    eqInput.value = 'Leander';
    eqInput.dispatchEvent(new Event('input'));
    eqInput.dispatchEvent(new Event('blur'));

    expect(tecInput.value).toBe('LEANDER SOARES VIEIRA');
    expect(placaInput.value).toBe('TBO-9J46');
  });

  it("auto-fills Equipe and Técnico when typing or selecting Placa", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.setCachedTeams([
      { id: 7, nome: 'Lucas Tadeu - Jackson', tecnico: 'LUCAS TADEU DOS SANTOS SOARES', placa: 'KOY-5F34', ativo: 1 }
    ]);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    const eqInput = document.getElementById('diarioModalEquipe');
    const placaInput = document.getElementById('diarioModalPlaca');

    placaInput.value = 'KOY-5F34';
    placaInput.dispatchEvent(new Event('input'));
    placaInput.dispatchEvent(new Event('blur'));

    expect(eqInput.value).toBe('Lucas Tadeu - Jackson');
    expect(tecInput.value).toBe('LUCAS TADEU DOS SANTOS SOARES');
  });

  it("saves new activity calling POST and prepends row into table", async function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    let postedBody = null;
    globalThis.apiFetch = function (url, opts) {
      if (opts && opts.method === 'POST') {
        postedBody = JSON.parse(opts.body);
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              item: {
                id: 303,
                ...postedBody,
                created_by: 1,
              }
            }
          })
        });
      }
      return Promise.resolve({ json: () => ({ success: true, data: { items: [], total: 0 } }) });
    };

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    document.getElementById('diarioModalTecnico').value = 'Lucas Prado';
    document.getElementById('diarioModalEquipe').value = 'Equipe Alfa';
    document.getElementById('diarioModalPlaca').value = 'BRA-1A23';
    document.getElementById('diarioModalData').value = '2026-11-15';
    document.getElementById('diarioModalCategoria').value = 'corretiva';
    document.getElementById('diarioModalStatus').value = 'Em andamento';
    document.getElementById('diarioModalSite').value = 'BMA';
    document.getElementById('diarioModalObs').value = 'Atividade nova do modal';

    await globalThis.saveDiarioModal(new Event('submit'));

    expect(postedBody).not.toBeNull();
    expect(postedBody.tecnico).toBe('Lucas Prado');
    expect(postedBody.equipe).toBe('Equipe Alfa');
    expect(postedBody.placa).toBe('BRA-1A23');
    expect(postedBody.categoria).toBe('corretiva');
    expect(postedBody.site).toBe('BMA');

    const rows = document.querySelectorAll('#diarioTableBody tr.diario-row');
    expect(rows.length).toBe(1);
    expect(document.getElementById('diarioModal').classList.contains('hidden')).toBe(true);
  });

  it("saves edited activity calling PUT and updates existing row", async function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    let putBody = null;
    globalThis.apiFetch = function (url, opts) {
      if (opts && opts.method === 'PUT') {
        putBody = JSON.parse(opts.body);
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              item: {
                ...putBody,
                created_by: 1,
              }
            }
          })
        });
      }
      return Promise.resolve({ json: () => ({ success: true, data: { items: [], total: 0 } }) });
    };

    globalThis.initDiarioList();
    const existing = {
      id: 50,
      tecnico: 'Antigo',
      equipe: 'Equipe Velha',
      placa: 'AAA-0000',
      data: '2026-10-01',
      categoria: 'preventiva',
      site: 'OLD',
    };
    globalThis.renderDiarioTable([existing], false);

    // Open edit modal
    globalThis.openDiarioModal(50);
    document.getElementById('diarioModalTecnico').value = 'Novo Tecnico';
    document.getElementById('diarioModalSite').value = 'NEW_SITE';

    await globalThis.saveDiarioModal(new Event('submit'));

    expect(putBody).not.toBeNull();
    expect(putBody.id).toBe(50);
    expect(putBody.tecnico).toBe('Novo Tecnico');
    expect(putBody.site).toBe('NEW_SITE');

    const updatedTd = document.querySelector('td[data-field="tecnico"]');
    expect(updatedTd.textContent).toContain('Novo Tecnico');
  });

  it("builds query with filters correctly", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const query = globalThis.buildDiarioQuery(20, 0);
    expect(query).toContain('route=diario');
    expect(query).toContain('limit=20');
    expect(query).toContain('offset=0');
  });

  it("duplicates activity line calling apiFetch with copied fields", async function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    let postedBody = null;
    globalThis.apiFetch = function (url, opts) {
      if (opts && opts.method === 'POST') {
        postedBody = JSON.parse(opts.body);
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              item: {
                id: 202,
                ...postedBody,
                created_by: 1,
              }
            }
          })
        });
      }
      return Promise.resolve({ json: () => ({ success: true, data: { items: [], total: 0 } }) });
    };

    globalThis.renderDiarioTable([{
      id: 101,
      site: 'BMA',
      equipamento_id: 1,
      localidade: 'Sala 1',
      os: 'OS999',
      data: '2026-11-13',
      equipe: 'ALEXANDRE DONATO DA SILVA',
      placa: 'TBO-9J41',
    }], false);

    await globalThis.duplicateDiarioLine(101);

    expect(postedBody).not.toBeNull();
    expect(postedBody.site).toBe('BMA');
    expect(postedBody.data).toBe('2026-11-13');
    expect(postedBody.equipe).toBe('ALEXANDRE DONATO DA SILVA');
    expect(postedBody.placa).toBe('TBO-9J41');
    expect(document.querySelectorAll('#diarioTableBody tr.diario-row').length).toBe(2);
  });

  it("formats equipamento display with capacity in TR or fallback", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.formatEquipamentoDisplay('WM 01', '5.00')).toBe('WM 01 \u2014 5 TR');
    expect(globalThis.formatEquipamentoDisplay('Splitter', 2.5)).toBe('Splitter \u2014 2.5 TR');
    expect(globalThis.formatEquipamentoDisplay('Chiller', null)).toBe('Chiller');
    expect(globalThis.formatEquipamentoDisplay('Chiller', '')).toBe('Chiller');
    expect(globalThis.formatEquipamentoDisplay(null, null)).toBe('-');
    expect(globalThis.formatEquipamentoDisplay('-', null)).toBe('-');
    expect(globalThis.formatEquipamentoDisplay('N/A', null)).toBe('-');
  });

  it("extracts unique sites, localidades and strictly filters equipments for site", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const mockEquipments = [
      { id: 1, equipamento: 'WM 01', capacidade: '5.0', local: 'BMA', localidade: 'Container 1' },
      { id: 2, equipamento: 'WM 02', capacidade: '7.5', local: 'VIX', localidade: 'Sala Técnica' },
      { id: 3, equipamento: 'AC 01', capacidade: null, local: 'BMA', localidade: 'Container 2' },
    ];

    const sites = globalThis.getDiarioSites(mockEquipments);
    expect(sites).toEqual(['BMA', 'VIX']);

    const localidades = globalThis.getDiarioLocalidades(mockEquipments, 'BMA');
    expect(localidades).toEqual(['Container 1', 'Container 2']);

    const equipmentsForBma = globalThis.getDiarioEquipmentsForSite(mockEquipments, 'BMA');
    expect(equipmentsForBma.length).toBe(2);
    expect(equipmentsForBma[0].equipamento).toBe('WM 01');
    expect(equipmentsForBma[1].equipamento).toBe('AC 01');

    // Without site, returns all
    const allEquipments = globalThis.getDiarioEquipmentsForSite(mockEquipments, null);
    expect(allEquipments.length).toBe(3);

    // formatPvEquipmentLabel formats like PV without site name
    expect(globalThis.formatPvEquipmentLabel('WM 01', '5.0', 'Container 1')).toBe('WM 01 \u2014 5 TR - Container 1');
    expect(globalThis.formatPvEquipmentLabel('WM 01', '5.0', null)).toBe('WM 01 \u2014 5 TR');
    expect(globalThis.formatPvEquipmentLabel('WM 01', null, 'Container 1')).toBe('WM 01 \u2014 Container 1');
    expect(globalThis.formatPvEquipmentLabel('WM 01', null, null)).toBe('WM 01');
  });

  it("sets equipment id and auto-fills site and localidade in modal when selecting equipment", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const mockEquipments = [
      { id: 10, equipamento: 'CH 01', capacidade: '10.0', local: 'SPO', localidade: 'Central Gelada' }
    ];

    const siteInput = document.getElementById('diarioModalSite');
    const eqInput = document.getElementById('diarioModalEquipamento');
    const eqIdInput = document.getElementById('diarioModalEquipamentoId');
    const locInput = document.getElementById('diarioModalLocalidade');
    const eqDropdown = document.getElementById('diarioModalEquipamentoDropdown');

    // Simulate autocomplete selection using initModalDropdownAutocomplete
    globalThis.initModalDropdownAutocomplete({
      input: eqInput,
      dropdown: eqDropdown,
      getOptions: () => mockEquipments,
      formatItem: (eq) => globalThis.formatPvEquipmentLabel(eq.equipamento, eq.capacidade, eq.localidade),
      onSelect: (eq) => {
        eqIdInput.value = eq.id;
        if (eq.local && !siteInput.value.trim()) siteInput.value = eq.local;
        if (eq.localidade && !locInput.value.trim()) locInput.value = eq.localidade;
      }
    });

    eqInput.focus();
    eqInput.value = 'CH';
    eqInput.dispatchEvent(new Event('input'));

    expect(eqDropdown.classList.contains('hidden')).toBe(false);
    const itemDiv = eqDropdown.querySelector('div');
    expect(itemDiv.textContent).toContain('CH 01');

    itemDiv.dispatchEvent(createMouseEvent('mousedown'));

    expect(eqIdInput.value).toBe('10');
    expect(siteInput.value).toBe('SPO');
    expect(locInput.value).toBe('Central Gelada');
  });

  it("accepts free text in modal dropdown autocompletes without clearing input", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    globalThis.openDiarioModal(null);

    const tecInput = document.getElementById('diarioModalTecnico');
    tecInput.value = 'Técnico Externo Qualquer';
    tecInput.dispatchEvent(new Event('input'));
    tecInput.dispatchEvent(new Event('blur'));

    expect(tecInput.value).toBe('Técnico Externo Qualquer');

    const eqInput = document.getElementById('diarioModalEquipamento');
    eqInput.value = 'Equipamento Customizado Avulso';
    eqInput.dispatchEvent(new Event('input'));
    eqInput.dispatchEvent(new Event('blur'));

    expect(eqInput.value).toBe('Equipamento Customizado Avulso');
  });

  it("exports refreshDiarioList which clears tbody and reinitializes infinite scroll", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    const tbody = document.getElementById('diarioTableBody');
    tbody.innerHTML = '<tr class="diario-row"><td>teste</td></tr>';
    expect(tbody.querySelectorAll('tr.diario-row').length).toBe(1);

    const initCallsBefore = globalThis._scrollCalls ? globalThis._scrollCalls.init : 0;
    globalThis.refreshDiarioList();

    expect(tbody.querySelectorAll('tr.diario-row').length).toBe(0);
    if (globalThis._scrollCalls) {
      expect(globalThis._scrollCalls.reset).toBeGreaterThan(0);
      expect(globalThis._scrollCalls.init).toBeGreaterThan(initCallsBefore);
    }
  });

  it("builds query with sort=data&dir=DESC initially and handles __none__ for empty selections", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();
    const defaultQuery = globalThis.buildDiarioQuery(20, 0);
    expect(defaultQuery).toContain('sort=data');
    expect(defaultQuery).toContain('dir=DESC');

    // Uncheck "Todos" in status dropdown so 0 are selected
    const statusTodosCb = document.getElementById('diarioStatusTodos');
    if (statusTodosCb) {
      statusTodosCb.checked = false;
      statusTodosCb.dispatchEvent(new Event('change', { bubbles: true }));
      const emptyStatusQuery = globalThis.buildDiarioQuery(20, 0);
      expect(emptyStatusQuery).toContain('status[]=__none__');
    }

    // Uncheck "Todas" in category dropdown so 0 are selected
    const catTodosCb = document.getElementById('diarioCatTodos');
    if (catTodosCb) {
      catTodosCb.checked = false;
      catTodosCb.dispatchEvent(new Event('change', { bubbles: true }));
      const emptyCatQuery = globalThis.buildDiarioQuery(20, 0);
      expect(emptyCatQuery).toContain('categoria[]=__none__');
    }
  });

  it("handles header sorting: sets initial icon, toggles ASC/DESC, and updates icons", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.initDiarioList();

    const dataTh = document.querySelector('th[data-sort="data"]');
    const dataIcon = dataTh.querySelector('.sort-icon');
    // Initial icon should indicate DESC (set on init)
    expect(dataIcon.textContent).toContain('\u2193');

    // Clicking Data toggles to ASC
    dataTh.click();
    expect(dataIcon.textContent).toContain('\u2191');
    let q = globalThis.buildDiarioQuery(20, 0);
    expect(q).toContain('sort=data');
    expect(q).toContain('dir=ASC');

    // Clicking Data again toggles to DESC
    dataTh.click();
    expect(dataIcon.textContent).toContain('\u2193');
    q = globalThis.buildDiarioQuery(20, 0);
    expect(q).toContain('sort=data');
    expect(q).toContain('dir=DESC');

    // Clicking Site switches column and sets ASC
    const siteTh = document.querySelector('th[data-sort="site"]');
    const siteIcon = siteTh.querySelector('.sort-icon');
    siteTh.click();
    expect(siteIcon.textContent).toContain('\u2191');
    expect(dataIcon.textContent).toBe('');
    q = globalThis.buildDiarioQuery(20, 0);
    expect(q).toContain('sort=site');
    expect(q).toContain('dir=ASC');

    // Clicking Técnico header (tecnico)
    const tecTh = document.querySelector('th[data-sort="tecnico"]');
    expect(tecTh).not.toBeNull();
    tecTh.click();
    q = globalThis.buildDiarioQuery(20, 0);
    expect(q).toContain('sort=tecnico');
    expect(q).toContain('dir=ASC');
  });

  it("does not re-declare imported identifiers in public/js/diario/list.js", function () {
    const filePath = resolve(__dirname, '../public/js/diario/list.js');
    const content = readFileSync(filePath, 'utf-8');
    const importMatches = [...content.matchAll(/^import\s*\{([^}]+)\}/gm)];
    const importedNames = [];
    for (const match of importMatches) {
      const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
      importedNames.push(...names);
    }
    for (const name of importedNames) {
      const redeclareRegex = new RegExp(`^(?:export\\s+)?(?:function|const|let|var|class)\\s+${name}\\b`, 'm');
      expect(content).not.toMatch(redeclareRegex);
    }
  });
});
