// public/js/planned-activity/planned-import.js

import { showToast, dismissToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';
import { resetPlannedState } from './list.js';

export function parseCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function readFileAsText(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const offset = hasUtf8Bom ? 3 : 0;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(offset));
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

export function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  return '';
}

export function parsePlannedCSV(text) {
  if (!text || !text.trim()) return [];

  // Remove BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Auto-detect delimiter (; or ,)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const headers = parseCsvLine(firstLine, delimiter).map((h) =>
    h.trim().toUpperCase().replace(/[\uFEFF]/g, '')
  );

  const dataIdx = headers.findIndex(
    (h) => h === 'DATA' || h === 'DATA_PLANEJADA' || h === 'DATA PLANEJADA'
  );
  const siteIdx = headers.findIndex((h) => h === 'SITE' || h === 'LOCAL');
  const tipoIdx = headers.findIndex((h) => h === 'TIPO');

  if (dataIdx === -1 || siteIdx === -1) {
    return [];
  }

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter).map((v) => v.trim());
    if (values.length <= Math.max(dataIdx, siteIdx)) continue;

    const rawSite = values[siteIdx] || '';
    const site = rawSite.trim();
    if (!site) continue;

    const rawDate = values[dataIdx] || '';
    const dateFormatted = normalizeDate(rawDate);
    if (!dateFormatted) continue;

    let tipo = 'preventiva';
    if (tipoIdx !== -1 && values[tipoIdx]) {
      const rawTipo = values[tipoIdx].toLowerCase().trim();
      if (rawTipo.includes('adm')) {
        tipo = 'adm';
      }
    }

    rows.push({
      data: dateFormatted,
      site,
      tipo,
    });
  }

  return rows;
}

export async function importPlannedActivities() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Importando planejamento...', 'loading');

    try {
      const text = await readFileAsText(file);
      const rows = parsePlannedCSV(text);

      if (rows.length === 0) {
        dismissToast();
        showToast('Nenhum registro válido encontrado no CSV (verifique as colunas DATA e SITE)', 'error');
        return;
      }

      const response = await apiFetch('/app/api/index.php?route=preventiva&action=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const result = await response.json();
      dismissToast();

      if (result.success) {
        showToast(result.message || 'Planejamento importado com sucesso', 'success');
        resetPlannedState();
      } else {
        showToast(result.message || 'Erro na importação do planejamento', 'error');
      }
    } catch (error) {
      dismissToast();
      showToast('Erro ao importar CSV: ' + error.message, 'error');
    }
  };

  input.click();
}
