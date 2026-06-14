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
    s['delete'](1);
    expect(s.has(1)).toBe(false);
  });
});
