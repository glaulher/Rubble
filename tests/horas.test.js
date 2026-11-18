import { describe, it, expect, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { evalModule } from './helpers/eval-module.js';

describe('Gestão de Horas — View, Router and Sidebar Integration', () => {
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const viewHtmlPath = path.resolve(__dirname, '../app/Views/horas/index.html');
  const routerJsPath = path.resolve(__dirname, '../public/js/router.js');
  const horasUiJsPath = path.resolve(__dirname, '../public/js/horas/horas-ui.js');

  it('index.html contains #horasLink inside #toolsSubmenu with correct role and href', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(html).toContain('id="horasLink"');
    expect(html).toContain('href="#/horas"');
    expect(html).toContain('data-role="admin coordenador gerente administrativo"');
    expect(html).toContain('Gestão de Horas');
    // Coexistence: tempoFechadoLink is preserved as legacy
    expect(html).toContain('id="tempoFechadoLink"');
    expect(html).toContain('Tempo Fechado (Legado)');
  });

  it('router.js registers route and init for #/horas', () => {
    const routerJs = fs.readFileSync(routerJsPath, 'utf-8');
    expect(routerJs).toContain('initHoras');
    expect(routerJs).toContain('#/horas');
    expect(routerJs).toContain('/app/Views/horas/index.html');
  });

  it('view app/Views/horas/index.html exists and has required elements', () => {
    const view = fs.readFileSync(viewHtmlPath, 'utf-8');
    // Sub-header and Badges
    expect(view).toContain('Gestão de Horas');
    expect(view).toContain('id="horasSummaryBadge"');
    expect(view).toContain('id="btnToggleUploadPdfs"');

    // Upload Panel
    expect(view).toContain('id="panelUploadPdfs"');
    expect(view).toContain('id="pdfDropzone"');
    expect(view).toContain('id="inputPdfFiles"');

    // Tabs
    expect(view).toContain('id="tabBtnBancoHoras"');
    expect(view).toContain('id="tabBtnHoraExtra"');
    expect(view).toContain('id="tabContentBancoHoras"');
    expect(view).toContain('id="tabContentHoraExtra"');

    // Tables
    expect(view).toContain('id="tbodyBancoHoras"');
    expect(view).toContain('id="tbodyHoraExtra"');

    // Extrato Modal
    expect(view).toContain('id="modalExtratoBancoHoras"');
    expect(view).toContain('id="tbodyExtratoDetalhe"');

    // Dark Mode compliant (NO dark:* classes in HTML as per AGENTS.md)
    expect(view).not.toMatch(/\bdark:[a-zA-Z0-9_-]+/);
  });

  it('view contains infinite scroll sentinels and containers for both Banco de Horas and Hora Extra', () => {
    const view = fs.readFileSync(viewHtmlPath, 'utf-8');
    expect(view).toContain('id="bhSentinel"');
    expect(view).toContain('id="heSentinel"');
    expect(view).toContain('id="bhScrollContainer"');
    expect(view).toContain('id="heScrollContainer"');
  });

  it('horas-ui.js exists and exports initHoras, loadBancoHoras, loadHoraExtraSimplificada', () => {
    const code = fs.readFileSync(horasUiJsPath, 'utf-8');
    expect(code).toContain('export async function initHoras');
    expect(code).toContain('loadBancoHoras');
    expect(code).toContain('loadHoraExtraSimplificada');
  });

  it('horas-ui.js imports and uses createInfiniteScroll for both tabs', () => {
    const code = fs.readFileSync(horasUiJsPath, 'utf-8');
    expect(code).toContain('createInfiniteScroll');
    expect(code).toContain('bhSentinel');
    expect(code).toContain('heSentinel');
    expect(code).toContain('bhScrollContainer');
    expect(code).toContain('heScrollContainer');
  });

  it('buildBhQuery and buildHeQuery serialize limit and offset parameters correctly', () => {
    globalThis.apiFetch = () => Promise.resolve({ ok: true, json: () => ({}) });
    globalThis.getUser = () => ({ name: 'Test' });
    globalThis.escapeHtml = (s) => (s ? String(s) : '');
    globalThis.createInfiniteScroll = (cfg) => ({
      init: () => {},
      reset: () => ({ init: () => {} }),
      destroy: () => {},
      getState: () => ({ page: 1, data: [] }),
    });
    globalThis.debounce = (fn) => fn;

    evalModule('../public/js/horas/horas-ui.js', '');

    const bhQuery = globalThis.buildBhQuery(0, 30);
    expect(bhQuery.get('action')).toBe('banco');
    expect(bhQuery.get('limit')).toBe('30');
    expect(bhQuery.get('offset')).toBe('0');

    const heQuery = globalThis.buildHeQuery(60, 30);
    expect(heQuery.get('action')).toBe('he-simplificada');
    expect(heQuery.get('limit')).toBe('30');
    expect(heQuery.get('offset')).toBe('60');
  });
});
