import { describe, it, expect, beforeEach } from "bun:test";

function sanitizeCSV(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/;/g, ',')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/"/g, "'")
    .trim();
}

function buildCsvLines(equipment, ticketsByEquipId, currentSearch) {
  var lines = [];
  var header = 'LOCAL;LOCALIDADE;EQUIPAMENTO;CAPACIDADE;STATUS;OS;DATA;DATA_CONCLUSAO;MATERIAL;OBSERVACAO';
  lines.push(header);

  var searchTerm = (currentSearch || '').toLowerCase().trim();
  var searchNorm = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  var statusKeywords = ['pendente', 'conclu', 'planej', 'andamento', 'clean'];
  var isStatusSearch = searchTerm && statusKeywords.some(function (kw) { return searchTerm.includes(kw); });

  equipment.forEach(function (e) {
    var allTickets = ticketsByEquipId[String(e.id)] || [];

    var matchedTickets = isStatusSearch
      ? allTickets.filter(function (t) {
          var statusNorm = (t.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return statusNorm.indexOf(searchNorm) >= 0;
        })
      : allTickets;

    if (matchedTickets.length === 0) {
      lines.push([
        sanitizeCSV(e.local),
        sanitizeCSV(e.localidade),
        sanitizeCSV(e.equipamento),
        sanitizeCSV(e.capacidade != null ? e.capacidade + ' TR' : ''),
        sanitizeCSV(e.searchStatus || ''),
        '', '', '', '', '',
      ].join(';'));
    } else {
      matchedTickets.forEach(function (t) {
        lines.push([
          sanitizeCSV(e.local),
          sanitizeCSV(e.localidade),
          sanitizeCSV(e.equipamento),
          sanitizeCSV(e.capacidade != null ? e.capacidade + ' TR' : ''),
          sanitizeCSV(t.status || ''),
          sanitizeCSV(t.os || ''),
          sanitizeCSV(t.data || ''),
          sanitizeCSV(t.data_concluido || ''),
          sanitizeCSV(t.material || ''),
          sanitizeCSV(t.obs || ''),
        ].join(';'));
      });
    }
  });

  return lines.join('\n');
}

describe("CSV Report format", () => {
  it("generates header with all columns", () => {
    var csv = buildCsvLines([], {}, '');
    var header = csv.split('\n')[0];
    expect(header).toBe('LOCAL;LOCALIDADE;EQUIPAMENTO;CAPACIDADE;STATUS;OS;DATA;DATA_CONCLUSAO;MATERIAL;OBSERVACAO');
  });

  it("generates one line per ticket when equipment has tickets", () => {
    var equipment = [
      { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: 'pendente' },
    ];
    var tickets = {
      '1': [
        { os: 'OS-001', data: '2026-01-15', data_concluido: '2026-01-16', material: 'Cabo', obs: 'Troca' },
        { os: 'OS-002', data: '2026-02-10', data_concluido: '', material: '', obs: '' },
      ],
    };

    var csv = buildCsvLines(equipment, tickets, '');
    var lines = csv.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('RSD');
    expect(lines[1]).toContain('OS-001');
    expect(lines[1]).toContain('2026-01-15');
    expect(lines[1]).toContain('Cabo');
    expect(lines[1]).toContain('Troca');
    expect(lines[2]).toContain('OS-002');
    expect(lines[2]).toContain('2026-02-10');
  });

  it("generates single line with empty ticket fields when equipment has no tickets", () => {
    var equipment = [
      { id: 1, local: 'XYZ', localidade: 'Local X', equipamento: 'WM 01', capacidade: 5, searchStatus: '' },
    ];
    var tickets = {};

    var csv = buildCsvLines(equipment, tickets, '');
    var lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('XYZ;Local X;WM 01;5 TR;;;;;;');
  });

  describe("filters by currentSearch", () => {
    it("shows only pendente tickets when search is pendente", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: 'pendente' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'concluido', data: '2026-01-15' },
          { os: 'OS-002', status: 'pendente', data: '2026-02-10' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, 'pendente');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('pendente');
      expect(lines[1]).toContain('OS-002');
      expect(lines[1]).not.toContain('OS-001');
    });

    it("shows only concluido tickets when search is concluido", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: 'pendente' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'concluido', data: '2026-01-15' },
          { os: 'OS-002', status: 'pendente', data: '2026-02-10' },
          { os: 'OS-003', status: 'concluído', data: '2026-03-01' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, 'concluido');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('OS-001');
      expect(lines[2]).toContain('OS-003');
      expect(lines[1]).not.toContain('OS-002');
      expect(lines[2]).not.toContain('OS-002');
    });

    it("shows only projeto clean up tickets when search is clean up", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: '' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'projeto clean up', data: '2026-01-15' },
          { os: 'OS-002', status: 'pendente', data: '2026-02-10' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, 'clean up');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('OS-001');
      expect(lines[1]).not.toContain('OS-002');
    });

    it("shows all tickets when search is empty", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: '' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'concluido', data: '2026-01-15' },
          { os: 'OS-002', status: 'pendente', data: '2026-02-10' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, '');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('OS-001');
      expect(lines[2]).toContain('OS-002');
    });

    it("shows all tickets when search is a site name (not a status keyword)", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: '' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'concluido', data: '2026-01-15' },
          { os: 'OS-002', status: 'pendente', data: '2026-02-10' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, 'RSD');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('OS-001');
      expect(lines[2]).toContain('OS-002');
      expect(lines[1]).toContain('concluido');
      expect(lines[2]).toContain('pendente');
    });

    it("shows single line with empty fields when no tickets match the filter", () => {
      var equipment = [
        { id: 1, local: 'RSD', localidade: 'Resende', equipamento: 'SELF 01', capacidade: 10, searchStatus: 'pendente' },
      ];
      var tickets = {
        '1': [
          { os: 'OS-001', status: 'concluido', data: '2026-01-15' },
        ],
      };

      var csv = buildCsvLines(equipment, tickets, 'pendente');
      var lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('RSD');
      expect(lines[1]).toContain('SELF 01');
      var cols = lines[1].split(';');
      expect(cols[5]).toBe('');
      expect(cols[6]).toBe('');
    });
  });
});
