import { describe, it, expect } from "bun:test";

function parseCSVToJSON(text) {
  if (!text || text.trim() === '') return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const verifaiColumnMap = {
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

  const infratelColumnMap = {
    'Site': 'site',
    'Equipamento': 'equipamento',
    'Justificativas': 'justificativas',
    'Ação Técnico': 'acao_tecnico',
    'Ação Validador': 'acao_validador',
    'Fim': 'fim',
    'Executor': 'executor',
  };

  const firstDataLine = lines.findIndex(line => line.includes(';'));
  if (firstDataLine === -1) return [];

  const rawHeaders = lines[firstDataLine].split(';').map(h =>
    h.replace(/^\uFEFF/, '').trim()
  );
  const headerText = rawHeaders.join(' ');

  const isInfratel = headerText.includes('Site') && headerText.includes('Equipamento') && headerText.includes('Justificativas');
  const isVerifai = headerText.includes('Tarefa');

  let columnMap;
  if (isInfratel) {
    columnMap = infratelColumnMap;
  } else if (isVerifai) {
    columnMap = verifaiColumnMap;
  } else {
    return [];
  }

  const result = [];
  for (let i = firstDataLine + 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    rawHeaders.forEach((header, idx) => {
      const key = columnMap[header] || header;
      row[key] = (values[idx] || '').trim();
    });
    result.push(row);
  }

  return result;
}

globalThis.importOS = () => {};
globalThis.showToast = () => {};

describe("parseCSVToJSON — Verifai", () => {
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

describe("parseCSVToJSON — Infratel", () => {
  it("parses Infratel CSV and maps expected columns", () => {
    const csv = `Site;Regional;Cluster;UF;Início;Fim;Fato;Motivo do Expurgo;Equipamento;Status;Executor;SLA;Chancelador;SLA;Validador;SLA;Validação;Justificativas;Ação Técnico;Data Prevista;Ação Validador\nBGU02DTC;REGIONAL LESTE;CLUSTER RJ/ES;RJ;22/06/2026;22/06/2026;OK;N/A;CLIMA - ARCON 02;Finalizada;Moisés Torres;0;INFRATEL;0;INFRATEL;0;V;Equipamento inoperante;Necessário reparo;N/A;N/A;N/A`;

    const result = parseCSVToJSON(csv);

    expect(result).toHaveLength(1);
    expect(result[0].site).toBe("BGU02DTC");
    expect(result[0].equipamento).toBe("CLIMA - ARCON 02");
    expect(result[0].justificativas).toBe("Equipamento inoperante");
    expect(result[0].acao_tecnico).toBe("Necessário reparo");
    expect(result[0].acao_validador).toBe("N/A");
    expect(result[0].fim).toBe("22/06/2026");
    expect(result[0].executor).toBe("Moisés Torres");
  });

  it("ignores lines where justificativas are N/A", () => {
    const csv = `Site;Equipamento;Justificativas;Ação Técnico;Ação Validador;Fim;Executor\nBGU02DTC;CLIMA - ARCON 02;N/A;N/A;N/A;22/06/2026;João\nBGU02DTC;CLIMA - ARCON 02;Real problema;Reparar;N/A;23/06/2026;João`;

    const result = parseCSVToJSON(csv);

    expect(result).toHaveLength(2);
    expect(result[1].justificativas).toBe("Real problema");
  });

  it("handles multiple rows", () => {
    const csv = `Site;Equipamento;Justificativas;Ação Técnico;Ação Validador;Fim;Executor\nBGU02DTC;CLIMA - ARCON 02;Vazamento;Reparar;N/A;22/06/2026;Moisés Torres\nBGU02DTC;CLIMA - ARCON 02;Ventilador;Trocar;N/A;28/06/2026;Moisés Torres`;

    const result = parseCSVToJSON(csv);

    expect(result).toHaveLength(2);
    expect(result[0].justificativas).toBe("Vazamento");
    expect(result[1].justificativas).toBe("Ventilador");
    expect(result[0].fim).toBe("22/06/2026");
    expect(result[1].fim).toBe("28/06/2026");
  });
});

describe("parseCSVToJSON — unknown format", () => {
  it("returns empty array for unrecognized CSV", () => {
    const csv = "Nome;Idade\nJoão;30";
    const result = parseCSVToJSON(csv);
    expect(result).toEqual([]);
  });
});
