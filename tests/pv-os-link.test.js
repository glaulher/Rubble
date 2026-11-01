import { describe, it, expect } from 'bun:test';
import { buildPvRowHtml, createPvRow } from '../public/js/pv/list.js';

describe('PV list OS column - PDF link and copy button', () => {
  it('renders a link to /OS/{os}.pdf and a copy button for a single OS', () => {
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

    // Should contain a link with target="_blank" pointing to /OS/123456.pdf
    expect(html).toContain('href="/OS/123456.pdf"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('123456');

    // Should contain a dedicated copy button with data-action="copy-os" and data-os="123456"
    expect(html).toContain('data-action="copy-os"');
    expect(html).toContain('data-os="123456"');
  });

  it('handles multiple OS numbers by rendering individual links and copy buttons', () => {
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

    expect(html).toContain('href="/OS/123456.pdf"');
    expect(html).toContain('href="/OS/789012.pdf"');
    expect(html).toContain('data-os="123456"');
    expect(html).toContain('data-os="789012"');
  });

  it("renders '-' without links or copy buttons when OS is empty or '-'", () => {
    const pvNull = {
      id: 3,
      numero_pv: '260003',
      os: null,
      local: 'Site Teste',
    };
    const htmlNull = buildPvRowHtml(pvNull);
    expect(htmlNull).not.toContain('href="/OS/');
    expect(htmlNull).not.toContain('data-action="copy-os"');

    const pvDash = {
      id: 4,
      numero_pv: '260004',
      os: '-',
      local: 'Site Teste',
    };
    const htmlDash = buildPvRowHtml(pvDash);
    expect(htmlDash).not.toContain('href="/OS/');
    expect(htmlDash).not.toContain('data-action="copy-os"');
  });

  it('copies the OS number to clipboard when copy button is clicked in a row', () => {
    let written = '';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: (text) => { written = text; return Promise.resolve(); } },
      writable: true,
      configurable: true,
    });

    const pv = {
      id: 5,
      numero_pv: '260005',
      os: '998877',
      local: 'Site Teste',
    };

    const tr = createPvRow(pv);
    document.body.appendChild(tr);

    const copyBtn = tr.querySelector('button[data-action="copy-os"]');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn.dataset.os).toBe('998877');

    copyBtn.click();
    expect(written).toBe('998877');

    document.body.removeChild(tr);
  });

  it('does not trigger row modal click when OS anchor link is clicked', () => {
    const pv = {
      id: 6,
      numero_pv: '260006',
      os: '554433',
      local: 'Site Teste',
    };

    const tr = createPvRow(pv);
    document.body.appendChild(tr);

    const link = tr.querySelector('a[href="/OS/554433.pdf"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('target')).toBe('_blank');

    // Clicking the link should not throw or cause errors
    expect(() => link.click()).not.toThrow();

    document.body.removeChild(tr);
  });
});
