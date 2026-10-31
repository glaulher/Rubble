import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { generateTermoPdf } from '../public/js/termo/termo-pdf.js';

describe('Termo PDF Generator', () => {
  let docMock;
  let jsPdfConstructorMock;

  beforeEach(() => {
    docMock = {
      setFont: mock(() => {}),
      setFontSize: mock(() => {}),
      text: mock(() => {}),
      setDrawColor: mock(() => {}),
      line: mock(() => {}),
      setFillColor: mock(() => {}),
      rect: mock(() => {}),
      splitTextToSize: mock((str) => [str]),
      addImage: mock(() => {}),
      save: mock(() => {}),
    };

    jsPdfConstructorMock = mock(() => docMock);

    if (!globalThis.window) {
      globalThis.window = {};
    }
    globalThis.window.jspdf = { jsPDF: jsPdfConstructorMock };
  });

  afterEach(() => {
    if (globalThis.window) {
      delete globalThis.window.jspdf;
    }
  });

  it('instantiates jsPDF and generates PDF with signature image', () => {
    const termo = {
      codigo: 'TR-2026-0001',
      entregue_por: 'Mauro',
      tecnico_nome: 'Raphael',
      tecnico_documento: '123.456.789-00',
      created_at: '2026-10-29',
      assinado_em: '2026-10-29 19:30:00',
      assinado_ip: '192.168.1.100',
      assinatura_imagem: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      itens: [
        { material_nome: 'Bomba de Vácuo', modelo: '7 CFM', serial: 'BV-9901' },
      ],
    };

    generateTermoPdf(termo);

    expect(jsPdfConstructorMock).toHaveBeenCalled();
    expect(docMock.text).toHaveBeenCalled();
    expect(docMock.addImage).toHaveBeenCalled();
    expect(docMock.save).toHaveBeenCalledWith('Termo_TR-2026-0001.pdf');
  });

  it('saves PDF even if signature image is not present yet', () => {
    const termo = {
      codigo: 'TR-2026-0002',
      entregue_por: 'Engemon',
      tecnico_nome: 'Tiago',
      itens: [],
    };

    generateTermoPdf(termo);

    expect(jsPdfConstructorMock).toHaveBeenCalled();
    expect(docMock.save).toHaveBeenCalledWith('Termo_TR-2026-0002.pdf');
  });
});
