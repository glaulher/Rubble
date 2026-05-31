import { describe, it, expect } from "bun:test";

function parseCSVToJSON(text) {
  if (!text || text.trim() === '') return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  let headerIdx = lines.findIndex(line => line.includes('Tarefa'));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(';').map(h =>
    h.replace(/^\uFEFF/, '').trim()
  );

  const columnMap = {
    'Tarefa': 'tarefa',
    'Empresa': 'empresa',
    'Tipo': 'tipo',
    'Data Criação': 'dataCriacao',
    'Data Alteração': 'dataAlteracao',
    '6-Local': 'local',
    '11-TAG': 'tag',
    '12-1º Técnico': 'tecnico',
    '15-Problema': 'problema',
    '16-Causa': 'causa',
    '17-Solução': 'solucao',
    '19-Materiais': 'materiais',
    '20-Status': 'status',
  };

  const result = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    headers.forEach((header, idx) => {
      const key = columnMap[header] || header;
      row[key] = (values[idx] || '').trim();
    });
    result.push(row);
  }

  return result;
}

globalThis.importOS = () => {};
globalThis.showToast = () => {};

describe("parseCSVToJSON", () => {
  it("parses semicolon-delimited CSV with header detection", () => {
    const csv = `Tarefa;Empresa;Tipo;Data Criação;Data Alteração;6-Local;11-TAG;12-1º Técnico;15-Problema;16-Causa;17-Solução;19-Materiais;20-Status\nOS-001;RDJ - RSDDTC - Resende;Corretiva;21/05/2026 08:30:00;21/05/2026 17:00:00;Sala 1;SELF 01;João;Vazamento;Desgaste;Troca;kit;Concluido`;

    const result = parseCSVToJSON(csv);

    expect(result).toHaveLength(1);
    expect(result[0].tarefa).toBe("OS-001");
    expect(result[0].empresa).toBe("RDJ - RSDDTC - Resende");
    expect(result[0].dataCriacao).toBe("21/05/2026 08:30:00");
    expect(result[0].dataAlteracao).toBe("21/05/2026 17:00:00");
    expect(result[0].tag).toBe("SELF 01");
    expect(result[0].tecnico).toBe("João");
    expect(result[0].status).toBe("Concluido");
    expect(result[0].materiais).toBe("kit");
    expect(result[0].problema).toBe("Vazamento");
    expect(result[0].causa).toBe("Desgaste");
    expect(result[0].solucao).toBe("Troca");
  });

  it("handles empty CSV", () => {
    expect(parseCSVToJSON("")).toEqual([]);
  });

  it("handles CSV with BOM", () => {
    const csv = "\uFEFFTarefa;Empresa\nOS-001;RDJ - RSDDTC";
    const result = parseCSVToJSON(csv);
    expect(result).toHaveLength(1);
    expect(result[0].tarefa).toBe("OS-001");
  });

  it("skips empty lines", () => {
    const csv = "Tarefa;Empresa\nOS-001;RDJ\n\nOS-002;NRJ\n";
    const result = parseCSVToJSON(csv);
    expect(result).toHaveLength(2);
  });
});

describe("importOS", () => {
  it("calls API and shows success toast on import", async () => {
    let fetchUrl = "";

    globalThis.fetch = (url, opts) => {
      fetchUrl = url;
      return Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          data: { imported: 5, updated: 3, skipped: 1, errors: [] },
        }),
      });
    };

    const rows = [{ tarefa: "OS-001", empresa: "RDJ - RSDDTC" }];
    const response = await fetch("/app/api/index.php?route=tickets&action=import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
    const result = await response.json();

    expect(fetchUrl).toContain("route=tickets&action=import");
    expect(result.success).toBe(true);
    expect(result.data.imported).toBe(5);
  });
});
