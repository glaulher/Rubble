import { describe, it, expect } from "bun:test";

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const PLANNED_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatDateTimeline(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const dt = new Date(ano, mes, dia);
  const diaSemana = DIAS_SEMANA[dt.getDay()];
  return diaSemana + ', ' + dia + ' de ' + PLANNED_MESES[mes] + ' de ' + ano;
}

function duplicateDayIconHtml(dateStr) {
  if (!dateStr) return '';
  return '<button data-action="duplicate-day" data-date="' + dateStr.replace(/"/g, '\\"') + '">copy</button>';
}

describe("formatDateTimeline", () => {
  it("returns day of week + formatted date for a weekday", () => {
    // 2026-07-15 is a Wednesday
    var result = formatDateTimeline("2026-07-15");
    expect(result).toBe("quarta-feira, 15 de julho de 2026");
  });

  it("returns day of week + formatted date for Monday", () => {
    // 2026-07-06 is a Monday
    var result = formatDateTimeline("2026-07-06");
    expect(result).toBe("segunda-feira, 6 de julho de 2026");
  });

  it("returns day of week + formatted date for Sunday", () => {
    // 2026-07-12 is a Sunday
    var result = formatDateTimeline("2026-07-12");
    expect(result).toBe("domingo, 12 de julho de 2026");
  });

  it("returns empty string for null/empty input", () => {
    expect(formatDateTimeline("")).toBe("");
    expect(formatDateTimeline(null)).toBe("");
    expect(formatDateTimeline(undefined)).toBe("");
  });

  it("returns raw string for malformed input", () => {
    expect(formatDateTimeline("abc")).toBe("abc");
  });
});

describe("duplicateDayIconHtml", () => {
  it("returns button with data-date attribute", () => {
    var html = duplicateDayIconHtml("2026-07-15");
    expect(html).toContain('data-action="duplicate-day"');
    expect(html).toContain('data-date="2026-07-15"');
  });

  it("escapes double quotes in date value", () => {
    var html = duplicateDayIconHtml('2026-07-15" onclick="alert(1)');
    expect(html).toContain('\\"');
    expect(html).not.toContain('data-date="2026-07-15" onclick=');
  });
});
