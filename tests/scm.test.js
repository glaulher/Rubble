// tests/scm.test.js
import { describe, it, expect } from 'bun:test';

// Include parseScmCSV function directly for testing
function parseScmCSV(text) {
    // Remove BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    // Auto-detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        if (values.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });

        // Skip EM ABERTO
        const status = (row['STATUS'] || '').toUpperCase().trim();
        if (status === 'EM ABERTO') continue;

        // Skip empty SCM
        if (!row['SCM'] || !row['SCM'].trim()) continue;

        rows.push(row);
    }

    return rows;
}

describe('parseScmCSV', () => {
    it('should parse semicolon-delimited CSV', () => {
        const csv = 'SCM;DATA;ATIVIDADE;SITE;CIDADE;UNIDADE;VALOR;SUBTOTAL_EXECUÇÃO;DATA_EXECUÇÃO;DATA_VALIDAÇÃO;MEDIÇÃO;ORIGEM;SEGMENTO;ABERTURA;STATUS;SERVIÇO;OBS\nSCM001;01/01/2026;Atividade;HUB RECREIO;RJ;UN;1000;900;02/01/2026;03/01/2026;M1;Origem;Seg;Abert;GERADO;Serviço;Obs';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(1);
        expect(rows[0]['SCM']).toBe('SCM001');
        expect(rows[0]['STATUS']).toBe('GERADO');
    });

    it('should skip EM ABERTO rows', () => {
        const csv = 'SCM;STATUS\nSCM001;EM ABERTO\nSCM002;GERADO';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(1);
        expect(rows[0]['SCM']).toBe('SCM002');
    });

    it('should skip empty SCM', () => {
        const csv = 'SCM;STATUS\n;GERADO';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(0);
    });

    it('should handle comma delimiter', () => {
        const csv = 'SCM,STATUS\nSCM001,GERADO';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(1);
    });

    it('should strip BOM', () => {
        const csv = '\uFEFFSCM;STATUS\nSCM001;GERADO';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(1);
    });

    it('should return empty array for empty input', () => {
        const csv = '';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(0);
    });

    it('should return empty array for header only', () => {
        const csv = 'SCM;STATUS';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(0);
    });

    it('should handle multiple rows', () => {
        const csv = 'SCM;STATUS\nSCM001;GERADO\nSCM002;NEGADO\nSCM003;EXECUTADO';
        const rows = parseScmCSV(csv);
        expect(rows.length).toBe(3);
    });
});
