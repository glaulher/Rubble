import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Tools Menu (Ferramentas) and Submenu Interactivity', () => {
  const indexHtml = readFileSync(resolve(import.meta.dir, '../index.html'), 'utf-8');

  it('index.html contains toolsMenuContainer with correct roles and markup', () => {
    expect(indexHtml).toContain('id="toolsMenuContainer"');
    expect(indexHtml).toContain('id="toolsMenuToggle"');
    expect(indexHtml).toContain('id="toolsSubmenu"');
    expect(indexHtml).toContain('id="tempoFechadoLink"');
    expect(indexHtml).toContain('id="combustivelLink"');
    expect(indexHtml).toContain('Ferramentas');
    expect(indexHtml).toContain('Tempo Fechado');
    expect(indexHtml).toContain('Controle de Combust\u00edvel');
  });

  it('toolsMenuToggle has accessibility attributes role=button and aria-haspopup', () => {
    expect(indexHtml).toContain('id="toolsMenuToggle"');
    expect(indexHtml).toContain('role="button"');
    expect(indexHtml).toContain('aria-haspopup="true"');
    expect(indexHtml).toContain('aria-expanded="false"');
  });

  it('tools menu items have proper role restrictions', () => {
    // Both submenu links and container should be restricted to admin, coordenador, administrativo
    const containerMatch = indexHtml.match(/<div[^>]*id="toolsMenuContainer"[^>]*>/);
    expect(containerMatch).toBeTruthy();
    const tag = containerMatch[0];
    expect(tag).toContain('data-role="admin coordenador administrativo"');
  });
});
