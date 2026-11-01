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

  test('comercialMenuToggle possui atributos de acessibilidade e cursor-pointer', () => {
    const toggleMatch = html.match(/<a[^>]*id="comercialMenuToggle"[^>]*>/);
    expect(toggleMatch).toBeTruthy();
    expect(toggleMatch[0]).toContain('role="button"');
    expect(toggleMatch[0]).toContain('aria-haspopup="true"');
    expect(toggleMatch[0]).toContain('aria-expanded="false"');
    expect(toggleMatch[0]).toContain('cursor-pointer');
  });

  test('comercialMenuToggle nao possui sidebar-tooltip para evitar conflito no mobile', () => {
    const block = html.slice(html.indexOf('id="comercialMenuToggle"'), html.indexOf('id="comercialSubmenu"'));
    expect(block).not.toContain('sidebar-tooltip');
  });

  test('sidebar.js possui cache buster v=12 em index.html', () => {
    expect(html).toContain('sidebar.js?v=12');
  });

  test('sidebar.js interrompe propagacao no click fantasma touchHandled', () => {
    const sidebarJs = readFileSync(resolve(import.meta.dir, '../public/js/components/sidebar.js'), 'utf-8');
    expect(sidebarJs).toContain('if (touchHandled) {');
    const match = sidebarJs.match(/if\s*\(touchHandled\)\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    expect(match[1]).toContain('e.stopPropagation()');
  });
});