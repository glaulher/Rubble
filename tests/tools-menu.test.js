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
  it('nginx blocks pocketbase admin dashboard /combustivel/_/', () => {
    const nginxConf = readFileSync(resolve(import.meta.dir, '../config/nginx/site.conf'), 'utf-8');
    expect(nginxConf).toContain('location ^~ /combustivel/_/');
    expect(nginxConf).toContain('deny all;');
    expect(nginxConf).toContain('return 403;');
  });

  it('controle de combustivel SSO restricts admin strictly to Rubble admin role', () => {
    const ssoHook = readFileSync(resolve(import.meta.dir, '../controle-combustivel-volante/pocketbase/hooks/auth_sso.js'), 'utf-8');
    expect(ssoHook).toContain("const isAdmin = role === 'admin'");
    expect(ssoHook).not.toContain("role === 'admin' || role === 'coordenador'");
  });

  it('pocketbase has protect_admin_field hook and hardening migration', () => {
    const hook = readFileSync(resolve(import.meta.dir, '../controle-combustivel-volante/pocketbase/hooks/protect_admin_field.js'), 'utf-8');
    expect(hook).toContain("onRecordUpdateRequest");
    expect(hook).toContain("isOriginalAdmin !== isNextAdmin");
    expect(hook).toContain("ForbiddenError");

    const migration = readFileSync(resolve(import.meta.dir, '../controle-combustivel-volante/pocketbase/migrations/0021_security_hardening_rules.js'), 'utf-8');
    expect(migration).toContain("@request.auth.id != ''");
    expect(migration).toContain("@request.auth.admin = true");
  });
});
