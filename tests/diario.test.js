import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { evalModule } from "./helpers/eval-module.js";

var mockInfiniteScroll = `
  function createInfiniteScroll(opts) {
    return {
      init: function () { if (opts.fetchFn) opts.fetchFn({ limit: 20, offset: 0, data: [] }, {}); return this; },
      destroy: function () {},
      reset: function () { return this; },
      load: function () {},
      getState: function () { return { data: [], page: 0, allLoaded: false, loading: false, total: 0 }; },
    };
  }
  function debounce(fn, delay) { var t; return function () { clearTimeout(t); t = setTimeout(fn, delay); }; }
`;

var DIARIO_HELPERS =
  '\nfunction escapeHtml(v) { return String(v); }\n' +
  'function formatDate(v) { if (!v) return ""; var parts = String(v).split("-"); return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : String(v); }\n' +
  'function sanitizeCSV(v) { if (v === null || v === undefined) return ""; var s = String(v); return /[;"\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s; }\n';

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
            <th data-sort="site">Site <span class="sort-icon"></span></th>
            <th data-sort="equipamento">Equipamento <span class="sort-icon"></span></th>
            <th data-sort="localidade">Localidade <span class="sort-icon"></span></th>
            <th data-sort="os">OS <span class="sort-icon"></span></th>
            <th data-sort="data">Data <span class="sort-icon"></span></th>
            <th data-sort="categoria">Categoria <span class="sort-icon"></span></th>
            <th data-sort="status">Status <span class="sort-icon"></span></th>
            <th data-sort="equipe">Equipe <span class="sort-icon"></span></th>
            <th>Observação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="diarioTableBody"></tbody>
      </table>
      <div id="diarioSentinel"></div>
    </div>
    <div id="diarioEmpty" class="hidden"></div>
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
        categoria: 'corretiva',
        status: 'Pendente',
        equipe: 'Técnico Silva',
        obs: 'Obs teste',
        created_by: 1,
      }
    ];

    globalThis.renderDiarioTable(mockItems, false);
    const rows = document.querySelectorAll('#diarioTableBody tr.diario-row');
    expect(rows.length).toBe(1);
    expect(document.getElementById('diarioEmpty').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('td[data-field="equipe"]').textContent).toContain('Técnico Silva');

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

  it("enters inline edit for a text cell", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.renderDiarioTable([{ id: 1, site: 'BMA', categoria: 'corretiva' }], false);
    const tdSite = document.querySelector('td[data-field="site"]');
    globalThis.enterDiarioEdit(tdSite, 'site');

    expect(tdSite.querySelector('input.diario-edit-input')).not.toBeNull();
    expect(tdSite.querySelector('.diario-save-btn')).not.toBeNull();
    expect(tdSite.querySelector('.diario-cancel-btn')).not.toBeNull();
  });

  it("enters inline edit for obs textarea", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    globalThis.renderDiarioTable([{ id: 1, obs: 'Linha 1' }], false);
    const wrap = document.querySelector('.obs-wrap');
    globalThis.enterDiarioObsEdit(wrap);

    expect(wrap.querySelector('textarea.diario-obs-input')).not.toBeNull();
    expect(wrap.querySelector('.diario-save-obs')).not.toBeNull();
    expect(wrap.querySelector('.diario-cancel-obs')).not.toBeNull();
  });

  it("builds query with filters correctly", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const query = globalThis.buildDiarioQuery(20, 0);
    expect(query).toContain('route=diario');
    expect(query).toContain('limit=20');
    expect(query).toContain('offset=0');
  });

  it("includes EQUIPE in DIARIO_COLUMNS and allows inline editing of equipe", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    expect(globalThis.DIARIO_COLUMNS).toContain('EQUIPE');

    globalThis.renderDiarioTable([{ id: 1, equipe: 'Carlos / João' }], false);
    const tdEquipe = document.querySelector('td[data-field="equipe"]');
    expect(tdEquipe).not.toBeNull();
    expect(tdEquipe.textContent).toContain('Carlos / João');

    globalThis.enterDiarioEdit(tdEquipe, 'equipe');
    expect(tdEquipe.querySelector('input.diario-edit-input')).not.toBeNull();
    expect(tdEquipe.querySelector('input.diario-edit-input').value).toBe('Carlos / João');
    expect(tdEquipe.querySelector('.diario-save-btn')).not.toBeNull();
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

  it("extracts unique sites, localidades and prioritizes equipments for site", function () {
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
    expect(localidades[0]).toBe('Container 1');
    expect(localidades[1]).toBe('Container 2');
    expect(localidades[2]).toBe('Sala Técnica');

    const equipmentsForBma = globalThis.getDiarioEquipmentsForSite(mockEquipments, 'BMA');
    expect(equipmentsForBma[0].local).toBe('BMA');
    expect(equipmentsForBma[1].local).toBe('BMA');
    expect(equipmentsForBma[2].local).toBe('VIX');
  });

  it("enters inline edit for site, equipamento_id and localidade with autocomplete wrap", function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const row = {
      id: 1,
      site: 'BMA',
      equipamento_id: 1,
      equipamento_nome: 'WM 01',
      equipamento_capacidade: '5.0',
      localidade: 'Container 1',
    };
    globalThis.renderDiarioTable([row], false);

    // Site edit
    const tdSite = document.querySelector('td[data-field="site"]');
    globalThis.enterDiarioEdit(tdSite, 'site');
    expect(tdSite.querySelector('.diario-autocomplete-wrap')).not.toBeNull();
    expect(tdSite.querySelector('.diario-autocomplete-dropdown')).not.toBeNull();

    // Equipamento edit
    const tdEquip = document.querySelector('td[data-field="equipamento_id"]');
    globalThis.enterDiarioEdit(tdEquip, 'equipamento_id');
    expect(tdEquip.querySelector('.diario-autocomplete-wrap')).not.toBeNull();
    expect(tdEquip.querySelector('.diario-autocomplete-dropdown')).not.toBeNull();

    // Localidade edit
    const tdLoc = document.querySelector('td[data-field="localidade"]');
    globalThis.enterDiarioEdit(tdLoc, 'localidade');
    expect(tdLoc.querySelector('.diario-autocomplete-wrap')).not.toBeNull();
    expect(tdLoc.querySelector('.diario-autocomplete-dropdown')).not.toBeNull();
  });

  it("performs smart cascade when selecting equipment on empty site and localidade", async function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const calls = [];
    globalThis.apiFetch = function (url, opts) {
      if (url.includes('route=equipment')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 10, equipamento: 'CH 01', capacidade: '10.0', local: 'SPO', localidade: 'Central Gelada' }
            ]
          })
        });
      }
      if (opts && opts.method === 'PATCH') {
        const body = JSON.parse(opts.body);
        calls.push(body);
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { id: body.id, field: body.field, value: body.value } })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { items: [], total: 0 } })
      });
    };

    const row = {
      id: 42,
      site: null,
      equipamento_id: null,
      equipamento_nome: null,
      equipamento_capacidade: null,
      localidade: null,
    };
    globalThis.renderDiarioTable([row], false);

    const tdEquip = document.querySelector('td[data-field="equipamento_id"]');
    globalThis.enterDiarioEdit(tdEquip, 'equipamento_id');

    // Simulate selecting CH 01
    const input = tdEquip.querySelector('.diario-edit-input');
    input.dataset.selectedId = '10';
    input.dataset.selectedEq = JSON.stringify({
      id: 10,
      equipamento: 'CH 01',
      capacidade: '10.0',
      local: 'SPO',
      localidade: 'Central Gelada'
    });
    input.value = 'CH 01 \u2014 10 TR';

    await globalThis.saveDiarioField(tdEquip);

    // Verify PATCH calls: first equipamento_id, then cascading site, then cascading localidade
    expect(calls.some(c => c.field === 'equipamento_id' && c.value === 10)).toBe(true);
    expect(calls.some(c => c.field === 'site' && c.value === 'SPO')).toBe(true);
    expect(calls.some(c => c.field === 'localidade' && c.value === 'Central Gelada')).toBe(true);
  });

  it("saves null when selecting N/A for site, equipamento_id or localidade", async function () {
    (0, eval)(mockInfiniteScroll);
    evalModule('../public/js/diario/list.js', DIARIO_HELPERS);

    const calls = [];
    globalThis.apiFetch = function (url, opts) {
      if (opts && opts.method === 'PATCH') {
        const body = JSON.parse(opts.body);
        calls.push(body);
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { id: body.id, field: body.field, value: body.value } })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { items: [], total: 0 } })
      });
    };

    const row = {
      id: 55,
      site: 'BMA',
      equipamento_id: 1,
      equipamento_nome: 'WM 01',
      equipamento_capacidade: '5.0',
      localidade: 'Container 1',
    };
    globalThis.renderDiarioTable([row], false);

    // 1. Equipamento to N/A
    const tdEquip = document.querySelector('td[data-field="equipamento_id"]');
    globalThis.enterDiarioEdit(tdEquip, 'equipamento_id');
    const inputEquip = tdEquip.querySelector('.diario-edit-input');
    inputEquip.value = 'N/A';
    inputEquip.dataset.selectedId = '';
    await globalThis.saveDiarioField(tdEquip);
    expect(calls.some(c => c.field === 'equipamento_id' && c.value === null)).toBe(true);

    // 2. Site to N/A
    const tdSite = document.querySelector('td[data-field="site"]');
    globalThis.enterDiarioEdit(tdSite, 'site');
    const inputSite = tdSite.querySelector('.diario-edit-input');
    inputSite.value = 'N/A';
    await globalThis.saveDiarioField(tdSite);
    expect(calls.some(c => c.field === 'site' && c.value === null)).toBe(true);
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
