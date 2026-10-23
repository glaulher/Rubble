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
