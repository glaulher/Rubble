import { describe, it, expect } from "bun:test";
import { parsePlannedCSV } from "../public/js/planned-activity/planned-import.js";

describe("parsePlannedCSV", () => {
  it("should parse semicolon-delimited CSV with standard headers", () => {
    const csv = `DATA;SITE;POP;ATIVIDADE;TÉCNICO;CICLO;PERIODO;EMPRESA;TIPO
03/11/2026;RJOFRG;MENSAL;CLIMA;Luiz Gustavo;16-OUT À 15-NOV;DIURNO;ENGEMON CLIMA;PREVENTIVA
04/11/2026;NRIDTC;MENSAL;CLIMA;Marcelo Borillo;16-OUT À 15-NOV;DIURNO;ENGEMON CLIMA;PREVENTIVA`;

    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      data: "2026-11-03",
      site: "RJOFRG",
      tipo: "preventiva",
    });
    expect(rows[1]).toEqual({
      data: "2026-11-04",
      site: "NRIDTC",
      tipo: "preventiva",
    });
  });

  it("should handle comma-delimited CSV and ISO date format", () => {
    const csv = `data,site,tipo
2026-11-05,CPDGDTC,preventiva
2026-11-06,RJOBOT,adm`;

    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      data: "2026-11-05",
      site: "CPDGDTC",
      tipo: "preventiva",
    });
    expect(rows[1]).toEqual({
      data: "2026-11-06",
      site: "RJOBOT",
      tipo: "adm",
    });
  });

  it("should default tipo to 'preventiva' if missing or empty", () => {
    const csv = `DATA;SITE
07/11/2026;PAV11DTC`;

    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      data: "2026-11-07",
      site: "PAV11DTC",
      tipo: "preventiva",
    });
  });

  it("should strip UTF-8 BOM if present", () => {
    const csv = `\uFEFFDATA;SITE;TIPO\n08/11/2026;MESQDTC;PREVENTIVA`;
    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].site).toBe("MESQDTC");
    expect(rows[0].data).toBe("2026-11-08");
  });

  it("should skip rows with missing site or date", () => {
    const csv = `DATA;SITE;TIPO
;RJOFRG;PREVENTIVA
03/11/2026;;PREVENTIVA
03/11/2026;   ;PREVENTIVA
invalid-date;RJOFRG;PREVENTIVA
09/11/2026;RJOEN;PREVENTIVA`;

    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].site).toBe("RJOEN");
    expect(rows[0].data).toBe("2026-11-09");
  });

  it("should return empty array for empty input or header-only", () => {
    expect(parsePlannedCSV("")).toEqual([]);
    expect(parsePlannedCSV("   ")).toEqual([]);
    expect(parsePlannedCSV("DATA;SITE;TIPO")).toEqual([]);
  });

  it("should preserve quotes with semicolons if present", () => {
    const csv = `DATA;SITE;TIPO
"03/11/2026";"RJO, FR;G";"PREVENTIVA"`;

    const rows = parsePlannedCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].site).toBe("RJO, FR;G");
    expect(rows[0].data).toBe("2026-11-03");
  });
});
