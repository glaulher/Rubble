// public/js/scm/scm-import.js

async function importScm() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast('Importando SCM...', 'loading');

        try {
            const text = await readFileAsText(file);
            const rows = parseScmCSV(text);

            if (rows.length === 0) {
                dismissToast();
                showToast('Nenhum registro válido encontrado no CSV', 'error');
                return;
            }

            const response = await apiFetch('app/api/index.php?route=scm&action=import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });

            const result = await response.json();
            dismissToast();

            if (result.success) {
                showToast(result.message, 'success');
                resetScmState();
                loadScm();
            } else {
                showToast(result.message || 'Erro na importação', 'error');
            }
        } catch (error) {
            dismissToast();
            showToast('Erro ao importar CSV: ' + error.message, 'error');
        }
    };

    input.click();
}

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

        // Skip EM ABERTO / ABERTO
        const status = (row['STATUS'] || '').toUpperCase().trim();
        if (status.includes('ABERTO')) continue;

        // Skip empty SCM
        if (!row['SCM'] || !row['SCM'].trim()) continue;

        rows.push(row);
    }

    return rows;
}

async function readFileAsText(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const offset = hasUtf8Bom ? 3 : 0;
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(offset));
    } catch {
        return new TextDecoder('iso-8859-1').decode(buffer);
    }
}
