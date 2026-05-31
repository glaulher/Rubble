import { describe, it, expect } from "bun:test";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAddress(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function titleCase(str) {
  if (!str) return '';
  return str
    .toLocaleLowerCase('pt-BR')
    .replace(/(\p{L})(\p{L}*)/gu, (_, first, rest) => first.toLocaleUpperCase('pt-BR') + rest);
}

function sanitizeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/;/g, ',')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/"/g, "'")
    .trim();
}

describe("escapeHtml", () => {
  it("returns empty string for null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("escapes & < > \" '", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#039;");
  });

  it("returns plain string unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("escapes multiple occurrences", () => {
    expect(escapeHtml("<a>&</a>")).toBe("&lt;a&gt;&amp;&lt;/a&gt;");
  });

  it("converts number to string", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("formatAddress", () => {
  it("returns empty for null/undefined", () => {
    expect(formatAddress(null)).toBe("");
    expect(formatAddress(undefined)).toBe("");
  });

  it("capitalizes first letter of each ASCII word", () => {
    expect(formatAddress("rua são joão")).toBe("Rua SãO JoãO");
  });

  it("handles already mixed case", () => {
    expect(formatAddress("AV. PAULISTA")).toBe("Av. Paulista");
  });
});

describe("titleCase", () => {
  it("returns empty for null/undefined", () => {
    expect(titleCase(null)).toBe("");
    expect(titleCase(undefined)).toBe("");
  });

  it("converts to title case with pt-BR locale", () => {
    expect(titleCase("av. paulista, 1000")).toBe("Av. Paulista, 1000");
  });

  it("converts using pt-BR locale with Unicode support", () => {
    expect(titleCase("joão são paulo")).toBe("João São Paulo");
  });
});

describe("sanitizeCSV", () => {
  it("returns empty for null", () => {
    expect(sanitizeCSV(null)).toBe("");
  });

  it("returns empty for undefined", () => {
    expect(sanitizeCSV(undefined)).toBe("");
  });

  it("replaces semicolons with commas", () => {
    expect(sanitizeCSV("a;b;c")).toBe("a,b,c");
  });

  it("replaces newlines with spaces", () => {
    expect(sanitizeCSV("line1\nline2")).toBe("line1 line2");
  });

  it("replaces double quotes with single quotes", () => {
    expect(sanitizeCSV('he"llo')).toBe("he'llo");
  });

  it("trims whitespace", () => {
    expect(sanitizeCSV("  text  ")).toBe("text");
  });

  it("applies all transformations", () => {
    expect(sanitizeCSV(' a;b\nc"d ')).toBe("a,b c'd");
  });

  it("converts numbers to string", () => {
    expect(sanitizeCSV(123)).toBe("123");
  });
});
