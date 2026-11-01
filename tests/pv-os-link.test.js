import { describe, it, expect } from 'bun:test';
import { buildPvRowHtml, createPvRow, openOsPdf } from '../public/js/pv/list.js';

describe('PV list OS column - Secure Blob URL and copy button', () => {
  it('renders open-os button without any token in HTML markup', () => {
    const pv = {
      id: 1,
      numero_pv: '260001',
      os: '123456',
      local: 'Site Teste',
      equipamento: 'Chiller 01',
      worst_status: 'Em aberto',
      ultimo_assunto_email: null,
      itens_count: 2,
      valor_total: 1500,
    };

    const html = buildPvRowHtml(pv);

    // Must have open-os action and OS text
    expect(html).toContain('data-action="open-os"');
    expect(html).toContain('data-os="123456"');
    expect(html).toContain('123456');

    // Security check: must NEVER contain JWT tokens in HTML
    expect(html).not.toContain('token=');
    expect(html).not.toContain('Bearer');

    // Dedicated copy button
    expect(html).toContain('data-action="copy-os"');
  });

  it('handles multiple OS numbers with individual open-os and copy buttons', () => {
    const pv = {
      id: 2,
      numero_pv: '260002',
      os: '123456, 789012',
      local: 'Site Teste',
      equipamento: 'Split 01',
      worst_status: 'Em aberto',
      ultimo_assunto_email: null,
      itens_count: 1,
      valor_total: 500,
    };

    const html = buildPvRowHtml(pv);

    expect(html).toContain('data-os="123456"');
    expect(html).toContain('data-os="789012"');
    expect(html).not.toContain('token=');
  });

  it("renders '-' without buttons when OS is empty or '-'", () => {
    const pvNull = { id: 3, numero_pv: '260003', os: null, local: 'Site Teste' };
    const htmlNull = buildPvRowHtml(pvNull);
    expect(htmlNull).not.toContain('data-action="open-os"');
    expect(htmlNull).not.toContain('data-action="copy-os"');

    const pvDash = { id: 4, numero_pv: '260004', os: '-', local: 'Site Teste' };
    const htmlDash = buildPvRowHtml(pvDash);
    expect(htmlDash).not.toContain('data-action="open-os"');
    expect(htmlDash).not.toContain('data-action="copy-os"');
  });

  it('copies the OS number to clipboard when copy button is clicked', () => {
    let written = '';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: (text) => { written = text; return Promise.resolve(); } },
      writable: true,
      configurable: true,
    });

    const pv = { id: 5, numero_pv: '260005', os: '998877', local: 'Site Teste' };
    const tr = createPvRow(pv);
    document.body.appendChild(tr);

    const copyBtn = tr.querySelector('button[data-action="copy-os"]');
    expect(copyBtn).not.toBeNull();
    copyBtn.click();
    expect(written).toBe('998877');

    document.body.removeChild(tr);
  });

  it('opens a new tab and fetches PDF with Authorization Bearer header, creating Blob URL', async () => {
    let capturedHeaders = null;
    let capturedUrl = null;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedHeaders = options.headers;
      return {
        ok: true,
        blob: async () => new Blob(['%PDF-1.4 TEST'], { type: 'application/pdf' }),
      };
    };

    let createdBlobObject = null;
    globalThis.URL.createObjectURL = (blob) => {
      createdBlobObject = blob;
      return 'blob:https://rubbleapp.duckdns.org/mock-guid';
    };

    const mockTab = {
      document: {
        write: () => {},
        body: { innerHTML: '' },
      },
      location: { href: '' },
      close: () => {},
    };

    globalThis.window.open = () => mockTab;
    globalThis.sessionStorage.setItem('rubble_token', 'my-secret-jwt-token');

    await openOsPdf('123456');

    // 1. Endpoint requested without token in query string
    expect(capturedUrl).toBe('/app/api/index.php?route=pv&action=view-os&os=123456');
    expect(capturedUrl).not.toContain('token=');

    // 2. Token sent securely in Authorization header
    expect(capturedHeaders['Authorization']).toBe('Bearer my-secret-jwt-token');

    // 3. New tab redirected to blob URL
    expect(mockTab.location.href).toBe('blob:https://rubbleapp.duckdns.org/mock-guid');
    expect(createdBlobObject).not.toBeNull();

    globalThis.sessionStorage.removeItem('rubble_token');
  });
});
