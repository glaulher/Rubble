import { describe, it, expect } from 'bun:test';

describe('PreventiveCycle', () => {
  it('generateCicloOptions returns (range * 12) options with referenceYear', () => {
    function generateCicloOptions(referenceYear) {
      var currentYear = referenceYear || new Date().getFullYear();
      var startYear = currentYear - 5;
      var endYear = currentYear + 5;
      var opts = [];
      for (var y = startYear; y <= endYear; y++) {
        for (var m = 1; m <= 12; m++) {
          opts.push(y + '-' + String(m).padStart(2, '0'));
        }
      }
      return opts;
    }
    var opts = generateCicloOptions(2026);
    expect(opts.length).toBe(132);
    expect(opts[0]).toBe('2021-01');
    expect(opts[opts.length - 1]).toBe('2031-12');
  });

  it('escapeHtml escapes special characters', () => {
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    expect(escapeHtml('a&b')).toBe('a&amp;b');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
  });

  it('cycleSelectedIds behaves as a Set', () => {
    var s = new Set();
    s.add(1);
    s.add(2);
    s.add(1);
    expect(s.size).toBe(2);
    expect(s.has(1)).toBe(true);
    expect(s.has(3)).toBe(false);
  });

  it('getMeasurementCycleRange calculates 16 to 15 correctly across months', () => {
    function getMeasurementCycleRange(offset, refDate) {
      var now = refDate ? new Date(refDate) : new Date();
      var y = now.getFullYear();
      var m = now.getMonth();
      var d = now.getDate();

      var baseMonth = d >= 16 ? m : m - 1;
      baseMonth += (offset || 0);

      var startDate = new Date(y, baseMonth, 16);
      var endDate = new Date(y, baseMonth + 1, 15);

      var pad = function (n) { return String(n).padStart(2, '0'); };
      var formatYmd = function (dt) {
        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
      };

      return {
        from: formatYmd(startDate),
        to: formatYmd(endDate)
      };
    }

    // No dia 29/08/2026:
    // Ciclo Atual (offset 0): 16/08/2026 a 15/09/2026
    var currentAug = getMeasurementCycleRange(0, '2026-08-29T12:00:00');
    expect(currentAug.from).toBe('2026-08-16');
    expect(currentAug.to).toBe('2026-09-15');

    // Ciclo Anterior (offset -1): 16/07/2026 a 15/08/2026
    var prevAug = getMeasurementCycleRange(-1, '2026-08-29T12:00:00');
    expect(prevAug.from).toBe('2026-07-16');
    expect(prevAug.to).toBe('2026-08-15');

    // 2 cliques em Ciclo Anterior (offset -2): 16/06/2026 a 15/07/2026
    var prevAug2 = getMeasurementCycleRange(-2, '2026-08-29T12:00:00');
    expect(prevAug2.from).toBe('2026-06-16');
    expect(prevAug2.to).toBe('2026-07-15');

    // 3 cliques em Ciclo Anterior (offset -3): 16/05/2026 a 15/06/2026
    var prevAug3 = getMeasurementCycleRange(-3, '2026-08-29T12:00:00');
    expect(prevAug3.from).toBe('2026-05-16');
    expect(prevAug3.to).toBe('2026-06-15');

    // No dia 10/08/2026 (antes do dia 16):
    // Ciclo Atual (offset 0): 16/07/2026 a 15/08/2026
    var currentEarlyAug = getMeasurementCycleRange(0, '2026-08-10T12:00:00');
    expect(currentEarlyAug.from).toBe('2026-07-16');
    expect(currentEarlyAug.to).toBe('2026-08-15');

    // Ciclo Anterior (offset -1): 16/06/2026 a 15/07/2026
    var prevEarlyAug = getMeasurementCycleRange(-1, '2026-08-10T12:00:00');
    expect(prevEarlyAug.from).toBe('2026-06-16');
    expect(prevEarlyAug.to).toBe('2026-07-15');
  });

  it('squarifyTreemap produces exact proportional rectangle areas', async () => {
    var { squarifyTreemap } = await import('../public/js/preventiva/dashboard.js');

    var items = [
      { site: 'SITE_8', value: 8 },
      { site: 'SITE_4', value: 4 },
      { site: 'SITE_2A', value: 2 },
      { site: 'SITE_2B', value: 2 }
    ];

    var layout = squarifyTreemap(items, 100, 100);
    expect(layout.length).toBe(4);

    var map = {};
    for (var i = 0; i < layout.length; i++) {
      var r = layout[i];
      map[r.item.site] = r.w * r.h; // calculated area
    }

    // Site com 8 máquinas deve ter área 4x maior que site com 2 máquinas
    expect(map['SITE_8']).toBeCloseTo(5000, 0); // 50% de 10.000
    expect(map['SITE_4']).toBeCloseTo(2500, 0); // 25% de 10.000
    expect(map['SITE_2A']).toBeCloseTo(1250, 0); // 12.5% de 10.000
    expect(map['SITE_2B']).toBeCloseTo(1250, 0); // 12.5% de 10.000

    expect(map['SITE_8']).toBeGreaterThan(map['SITE_4']);
    expect(map['SITE_4']).toBeGreaterThan(map['SITE_2A']);
    expect(map['SITE_2A']).toEqual(map['SITE_2B']);
  });
});
