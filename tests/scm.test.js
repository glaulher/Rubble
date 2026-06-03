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

// --- buildScmCardHtml tests ---

// Minimal stubs for globals used by buildScmCardHtml
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(value) {
    const val = parseFloat(value) || 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(date) {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getUser() {
    return { role: 'admin' };
}

// Re-define buildScmCardHtml here (same logic as scm-list.js) since it's a global in prod
function buildScmCardHtml(s) {
    const statusColors = {
        'SCM Aprovado': 'bg-emerald-100 text-emerald-700',
        'SCM Negado': 'bg-red-100 text-red-700',
        'SCM Verificado': 'bg-blue-100 text-blue-800',
        'SCM Enviado': 'bg-purple-100 text-purple-700',
    };
    const statusClass = statusColors[s.status] || 'bg-slate-100 text-slate-700';

    const pvDisplay = s.numero_pv ? `PV ${escapeHtml(s.numero_pv)}` : '';
    const equipDisplay = s.equipamento ? `${escapeHtml(s.equipamento)}` : '';
    const capDisplay = s.capacidade ? `${s.capacidade} TR` : '';
    const totalDisplay = s.total_valor ? formatCurrency(s.total_valor) : '';

    let mercadoBadge = '';
    if (s.origem && s.mercado) {
        const match = s.origem.toLowerCase() === s.mercado.toLowerCase();
        if (match) {
            mercadoBadge = `<span class="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">${escapeHtml(s.mercado)}</span>`;
        } else {
            mercadoBadge = `<span class="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Erro no mercado</span>`;
        }
    }

    const dataDisplay = s.data ? formatDateBr(s.data) : '';
    const dataExecDisplay = s.data_execucao ? formatDateBr(s.data_execucao) : '';

    return `
    <div class="card-item bg-white rounded-xl border border-slate-200 p-4" data-scm-id="${s.id}">
        <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900">${escapeHtml(s.scm)}</h3>
            <span class="text-slate-400">—</span>
            <span class="text-sm text-slate-600">${escapeHtml(s.localidade || s.cidade || '')}</span>
            ${dataDisplay ? `<span class="text-xs text-slate-400">${dataDisplay}</span>` : ''}
            ${dataExecDisplay ? `<span class="text-xs text-slate-400">${dataExecDisplay}</span>` : ''}
            <div class="ml-auto flex items-center gap-2">
                ${pvDisplay ? `<span class="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-xl text-xs">${pvDisplay}</span>` : ''}
                ${totalDisplay ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xl text-xs">${totalDisplay}</span>` : ''}
                <span class="text-xs px-2 py-0.5 rounded-xl ${statusClass}">${escapeHtml(s.status)}</span>
                ${getUser().role === 'admin' ? `
                <div class="relative group">
                    <button class="scm-delete-btn bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition" data-delete-id="${s.id}">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <span class="absolute bottom-full right-0 mb-2 scale-0 group-hover:scale-100 origin-bottom-right transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">Excluir</span>
                </div>` : ''}
            </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            ${equipDisplay ? `<span>${equipDisplay}</span>` : ''}
            ${capDisplay ? `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-xl text-xs">${capDisplay}</span>` : ''}
            ${mercadoBadge}
        </div>
        <div class="mt-3 flex gap-3">
            <button class="scm-toggle-btn bg-slate-200 hover:bg-slate-300 text-slate-900 px-3 py-1 rounded-xl text-sm transition-colors" data-toggle-id="${s.id}">
                Ver
            </button>
        </div>
        <div class="scm-details hidden mt-3" id="scmDet${s.id}">
            <div class="text-sm text-slate-500 italic">Carregando detalhes...</div>
        </div>
    </div>`;
}

describe('buildScmCardHtml', () => {
    const base = {
        id: 1,
        scm: 'SCM001',
        status: 'SCM Aprovado',
        localidade: 'HUB Recreio',
        data: null,
        data_execucao: null,
        origem: null,
        mercado: null,
        equipamento: null,
        capacidade: null,
        numero_pv: null,
        total_valor: null,
    };

    it('should render emerald badge when origem matches mercado', () => {
        const html = buildScmCardHtml({ ...base, origem: 'ES', mercado: 'ES' });
        expect(html).toContain('inline-flex items-center bg-emerald-100 text-emerald-700');
        expect(html).toContain('>ES<');
        expect(html).not.toContain('Erro no mercado');
    });

    it('should render emerald badge case-insensitive match', () => {
        const html = buildScmCardHtml({ ...base, origem: 'es', mercado: 'ES' });
        expect(html).toContain('inline-flex items-center bg-emerald-100 text-emerald-700');
        expect(html).toContain('>ES<');
    });

    it('should render red badge when origem differs from mercado', () => {
        const html = buildScmCardHtml({ ...base, origem: 'ES', mercado: 'RJ' });
        expect(html).toContain('inline-flex items-center bg-red-100 text-red-700');
        expect(html).toContain('Erro no mercado');
    });

    it('should not render badge when origem is empty', () => {
        const html = buildScmCardHtml({ ...base, origem: '', mercado: 'ES' });
        expect(html).not.toContain('Erro no mercado');
        expect(html).not.toContain('inline-flex items-center bg-emerald-100 text-emerald-700');
    });

    it('should not render badge when mercado is empty', () => {
        const html = buildScmCardHtml({ ...base, origem: 'ES', mercado: '' });
        expect(html).not.toContain('Erro no mercado');
        expect(html).not.toContain('inline-flex items-center bg-emerald-100 text-emerald-700');
    });

    it('should not render badge when both are null', () => {
        const html = buildScmCardHtml({ ...base, origem: null, mercado: null });
        expect(html).not.toContain('Erro no mercado');
        expect(html).not.toContain('inline-flex items-center bg-emerald-100 text-emerald-700');
    });

    it('should format data as DD/MM/YYYY', () => {
        const html = buildScmCardHtml({ ...base, data: '2026-03-15' });
        expect(html).toContain('15/03/2026');
    });

    it('should format data_execucao as DD/MM/YYYY', () => {
        const html = buildScmCardHtml({ ...base, data_execucao: '2026-05-01' });
        expect(html).toContain('01/05/2026');
    });

    it('should render both dates when set', () => {
        const html = buildScmCardHtml({ ...base, data: '2026-01-10', data_execucao: '2026-02-20' });
        expect(html).toContain('10/01/2026');
        expect(html).toContain('20/02/2026');
    });

    it('should not render date spans when dates are null', () => {
        const html = buildScmCardHtml({ ...base, data: null, data_execucao: null });
        const dateSpanPattern = /text-xs text-slate-400">\d{2}\/\d{2}\/\d{4}/;
        expect(dateSpanPattern.test(html)).toBe(false);
    });

    it('should not render date spans when dates are empty strings', () => {
        const html = buildScmCardHtml({ ...base, data: '', data_execucao: '' });
        const dateSpanPattern = /text-xs text-slate-400">\d{2}\/\d{2}\/\d{4}/;
        expect(dateSpanPattern.test(html)).toBe(false);
    });
});
