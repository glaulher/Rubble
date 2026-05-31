import { describe, it, expect, beforeEach } from "bun:test";

var mockFetchResponse = { success: true, data: { filename: "test.pdf" } };
globalThis.fetch = async () => ({
  json: async () => mockFetchResponse,
});

var mockInput;

function uploadFile({ accept = '.pdf', multiple = false, uploadType, onSuccess, onError }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.onchange = async function () {
    const files = this.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);
      try {
        const res = await fetch('/app/api/index.php?route=pv&action=upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          onSuccess(data.data.filename, file);
        } else {
          onError(data.message || 'Erro no upload', file);
        }
      } catch (err) {
        onError('Erro de conexao', file);
      }
    }
  };
  mockInput = input;
  input.click();
}

describe("uploadFile", () => {
  beforeEach(() => {
    mockInput = null;
    mockFetchResponse = { success: true, data: { filename: "test.pdf" } };
  });

  it("creates a file input with the given accept and multiple", () => {
    uploadFile({ accept: ".pdf", multiple: true, uploadType: "os", onSuccess: () => {} });
    expect(mockInput).not.toBeNull();
    expect(mockInput.type).toBe("file");
    expect(mockInput.accept).toBe(".pdf");
    expect(mockInput.multiple).toBe(true);
  });

  it("calls onSuccess with filename when upload succeeds", async () => {
    return new Promise((done) => {
      uploadFile({
        accept: ".pdf",
        multiple: false,
        uploadType: "laudo",
        onSuccess: (filename, file) => {
          expect(filename).toBe("test.pdf");
          done();
        },
        onError: () => { done(new Error("should not error")); },
      });
      var file = new File(["content"], "doc.pdf", { type: "application/pdf" });
      Object.defineProperty(mockInput, "files", { value: [file] });
      mockInput.onchange();
    });
  });

  it("calls onError when server returns success:false", async () => {
    mockFetchResponse = { success: false, message: "Formato inválido" };

    return new Promise((done) => {
      uploadFile({
        accept: ".pdf",
        uploadType: "os",
        onSuccess: () => { done(new Error("should not succeed")); },
        onError: (msg, file) => {
          expect(msg).toBe("Formato inválido");
          done();
        },
      });
      var file = new File(["bad"], "bad.pdf", { type: "application/pdf" });
      Object.defineProperty(mockInput, "files", { value: [file] });
      mockInput.onchange();
    });
  });

  it("does nothing when no files selected", () => {
    var called = false;
    uploadFile({
      uploadType: "os",
      onSuccess: () => { called = true; },
    });
    Object.defineProperty(mockInput, "files", { value: [] });
    mockInput.onchange();
    expect(called).toBe(false);
  });
});
