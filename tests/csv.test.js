import { describe, it, expect, beforeEach } from "bun:test";

var mockBlobUrl = "blob:mock-url";
var createdObjects = [];

globalThis.URL.createObjectURL = (blob) => {
  createdObjects.push(blob);
  return mockBlobUrl;
};
globalThis.URL.revokeObjectURL = (url) => {};

function downloadCSV(filename, headerRow, rowBuilder) {
  let csv = headerRow + '\n';
  rowBuilder((cells) => {
    csv += cells.join(';') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

describe("downloadCSV", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    createdObjects = [];
  });

  it("builds CSV content and triggers download", () => {
    var addRowCalls = [];
    downloadCSV("test.csv", "Nome;Valor", (addRow) => {
      addRow(["Item A", "100"]);
      addRow(["Item B", "200"]);
      addRowCalls.push("called");
    });

    expect(addRowCalls).toHaveLength(1);
    expect(createdObjects).toHaveLength(1);

    var blob = createdObjects[0];
    expect(blob.type).toBe("text/csv;charset=utf-8;");
  });

  it("includes BOM at start of CSV as UTF-8 bytes", () => {
    downloadCSV("test.csv", "A", (addRow) => {
      addRow(["1"]);
    });

    var blob = createdObjects[0];
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      expect(bytes[0]).toBe(0xEF);
      expect(bytes[1]).toBe(0xBB);
      expect(bytes[2]).toBe(0xBF);
    });
  });

  it("creates and removes a link element", () => {
    var linksAdded = [];
    var origAppend = document.body.appendChild.bind(document.body);
    var origRemove = document.body.removeChild.bind(document.body);

    document.body.appendChild = (el) => {
      linksAdded.push(el);
      origAppend(el);
    };
    document.body.removeChild = (el) => {
      var idx = linksAdded.indexOf(el);
      if (idx >= 0) linksAdded.splice(idx, 1);
      origRemove(el);
    };

    downloadCSV("test.csv", "H", (addRow) => addRow(["v"]));

    expect(linksAdded).toHaveLength(0);
  });
});
