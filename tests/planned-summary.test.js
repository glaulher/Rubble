import { describe, it, expect, beforeEach } from "bun:test";
import {
  summaryTipoBadgeClass,
  summaryFormatTipo,
  summaryStatusBadgeClass,
  summaryFormatDate,
  renderSummaryTable,
  buildSummaryQuery,
  initPlannedSummary,
} from "../public/js/planned-activity/summary.js";

globalThis.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, data: { items: [], total: 0 } }),
  clone: function () { return this; },
});

describe("Planned Activity Summary - Tipo & Table Render", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="summaryBadge">0</div>
      <input id="summarySearchInput" value="">
      <input id="summaryDateFrom" value="">
      <input id="summaryDateTo" value="">
      <select id="summaryTipoFilter">
        <option value="">Todos</option>
        <option value="preventiva">Preventiva</option>
        <option value="corretiva">Corretiva</option>
      </select>
      <select id="summaryStatusFilter">
        <option value="">Todos</option>
        <option value="Planejado">Planejado</option>
      </select>
      <button id="summaryCsvBtn"></button>
      <table id="summaryTable">
        <thead>
          <tr>
            <th data-sort="local">Site <span class="sort-icon"></span></th>
            <th data-sort="equipe">Nome do Técnico <span class="sort-icon"></span></th>
            <th data-sort="data_planejada">Data <span class="sort-icon"></span></th>
            <th>Tipo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="summaryTableBody"></tbody>
      </table>
      <div id="summarySentinel"></div>
      <div id="summaryScrollContainer"></div>
      <div id="summaryEmpty" class="hidden"></div>
    `;
  });

  describe("summaryTipoBadgeClass", () => {
    it("returns blue classes for preventiva", () => {
      expect(summaryTipoBadgeClass('preventiva')).toBe('bg-blue-100 text-blue-700');
      expect(summaryTipoBadgeClass('PREVENTIVA')).toBe('bg-blue-100 text-blue-700');
    });

    it("returns amber classes for corretiva", () => {
      expect(summaryTipoBadgeClass('corretiva')).toBe('bg-amber-100 text-amber-700');
      expect(summaryTipoBadgeClass('CORRETIVA')).toBe('bg-amber-100 text-amber-700');
    });

    it("returns slate classes for unknown or empty", () => {
      expect(summaryTipoBadgeClass('')).toBe('bg-slate-100 text-slate-700');
      expect(summaryTipoBadgeClass(null)).toBe('bg-slate-100 text-slate-700');
      expect(summaryTipoBadgeClass('outro')).toBe('bg-slate-100 text-slate-700');
    });
  });

  describe("summaryFormatTipo", () => {
    it("formats known tipos in title case", () => {
      expect(summaryFormatTipo('preventiva')).toBe('Preventiva');
      expect(summaryFormatTipo('corretiva')).toBe('Corretiva');
    });

    it("handles null or empty values", () => {
      expect(summaryFormatTipo('')).toBe('-');
      expect(summaryFormatTipo(null)).toBe('-');
    });
  });

  describe("renderSummaryTable", () => {
    it("renders rows with tipo badge and status badge", () => {
      const items = [
        {
          id: 1,
          local: 'Site Alpha',
          equipe: 'Carlos Silva',
          data_planejada: '2026-10-15',
          tipo: 'preventiva',
          status: 'Planejado',
        },
        {
          id: 2,
          local: 'Site Beta',
          equipe: 'João Souza',
          data_planejada: '2026-10-16',
          tipo: 'corretiva',
          status: 'Concluído',
        },
      ];

      renderSummaryTable(items, false);

      const rows = document.querySelectorAll('#summaryTableBody tr');
      expect(rows.length).toBe(2);

      const firstRowCells = rows[0].querySelectorAll('td');
      expect(firstRowCells.length).toBe(5);
      expect(firstRowCells[0].textContent).toBe('Site Alpha');
      expect(firstRowCells[1].textContent).toBe('Carlos Silva');
      expect(firstRowCells[2].textContent).toBe('15/10/2026');
      expect(firstRowCells[3].textContent).toBe('Preventiva');
      expect(firstRowCells[3].querySelector('span').className).toContain('bg-blue-100 text-blue-700');
      expect(firstRowCells[4].textContent).toBe('Planejado');

      const secondRowCells = rows[1].querySelectorAll('td');
      expect(secondRowCells[3].textContent).toBe('Corretiva');
      expect(secondRowCells[3].querySelector('span').className).toContain('bg-amber-100 text-amber-700');
    });

    it("displays empty state when list is empty and append is false", () => {
      renderSummaryTable([], false);
      const empty = document.getElementById('summaryEmpty');
      expect(empty.classList.contains('hidden')).toBe(false);
    });
  });

  describe("buildSummaryQuery", () => {
    it("includes tipo when filter is selected", () => {
      initPlannedSummary();
      const tipoSelect = document.getElementById('summaryTipoFilter');
      tipoSelect.value = 'preventiva';
      tipoSelect.dispatchEvent(new Event('change'));

      const query = buildSummaryQuery();
      expect(query).toContain('tipo=preventiva');
    });
  });
});
