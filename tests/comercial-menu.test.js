import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(import.meta.dir, '../index.html'), 'utf-8');

describe('menu Comercial', () => {
  test('existe o menu Comercial com submenu PV, SCM e SC', () => {
    expect(html).toContain('id="comercialMenuContainer"');
    expect(html).toContain('id="comercialSubmenu"');
    expect(html).toContain('href="#/sc"');
    expect(html).toContain('href="#/pv"');
    expect(html).toContain('href="#/scm"');
  });

  test('PV e SCM nao sao mais links de topo', () => {
    const topLevelPv = html.match(/class="sidebar-link[^"]*"[\s\S]{0,200}?href="#\/pv"/g) || [];
    const topLevelScm = html.match(/class="sidebar-link[^"]*"[\s\S]{0,200}?href="#\/scm"/g) || [];
    expect(topLevelPv.length).toBe(0);
    expect(topLevelScm.length).toBe(0);
  });

  test('o submenu Comercial restrito aos papeis do comercial', () => {
    const block = html.slice(html.indexOf('id="comercialMenuContainer"'));
    expect(block.slice(0, 400)).toContain('data-role="admin coordenador gerente administrativo"');
  });
});