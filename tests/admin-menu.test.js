import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Admin Menu and Administrative Audit Panel', () => {
  const indexHtml = readFileSync(resolve(import.meta.dir, '../index.html'), 'utf-8');
  const sidebarJs = readFileSync(resolve(import.meta.dir, '../public/js/components/sidebar.js'), 'utf-8');
  const routerJs = readFileSync(resolve(import.meta.dir, '../public/js/router.js'), 'utf-8');
  const auditHtml = readFileSync(resolve(import.meta.dir, '../app/Views/admin/audit.html'), 'utf-8');
  const migrationSql = readFileSync(resolve(import.meta.dir, '../config/migrations/063_create_audit_and_access_logs.sql'), 'utf-8');

  it('index.html contains adminMenuContainer with admin role and submenu markup', () => {
    expect(indexHtml).toContain('id="adminMenuContainer"');
    expect(indexHtml).toContain('id="adminMenuToggle"');
    expect(indexHtml).toContain('id="adminSubmenu"');
    expect(indexHtml).toContain('href="#/users"');
    expect(indexHtml).toContain('href="#/admin-audit"');
    expect(indexHtml).toContain('Administrativo');
    expect(indexHtml).toContain('Usuários');

    const containerMatch = indexHtml.match(/<div[^>]*id="adminMenuContainer"[^>]*>/);
    expect(containerMatch).toBeTruthy();
    expect(containerMatch[0]).toContain('data-role="admin"');
  });

  it('adminMenuToggle has accessibility attributes role=button and aria-haspopup', () => {
    const toggleMatch = indexHtml.match(/<a[^>]*id="adminMenuToggle"[^>]*>/);
    expect(toggleMatch).toBeTruthy();
    expect(toggleMatch[0]).toContain('role="button"');
    expect(toggleMatch[0]).toContain('aria-haspopup="true"');
    expect(toggleMatch[0]).toContain('aria-expanded="false"');
  });

  it('sidebar.js initializes adminSubmenu and handles mutual closing', () => {
    expect(sidebarJs).toContain("setupSubmenu('adminMenuContainer', 'adminMenuToggle', 'adminSubmenu')");
    expect(sidebarJs).toContain('#adminSubmenu');
  });

  it('router.js registers #/admin-audit with admin role protection and initialization', () => {
    expect(routerJs).toContain('#/admin-audit');
    expect(routerJs).toContain('/app/Views/admin/audit.html');
    expect(routerJs).toContain('_currentUser.role !== \'admin\'');
    expect(routerJs).toContain('initAdminAudit()');
  });

  it('audit.html contains KPI metrics, navigation tabs, tables and diff modal', () => {
    expect(auditHtml).toContain('id="kpiOnlineUsers"');
    expect(auditHtml).toContain('id="kpiLoginsToday"');
    expect(auditHtml).toContain('id="kpiChangesToday"');
    expect(auditHtml).toContain('id="kpiFailedLoginsToday"');

    expect(auditHtml).toContain('id="tabBtnAudit"');
    expect(auditHtml).toContain('id="tabBtnAccess"');
    expect(auditHtml).toContain('id="tabBtnSessions"');

    expect(auditHtml).toContain('id="auditTableBody"');
    expect(auditHtml).toContain('id="accessTableBody"');
    expect(auditHtml).toContain('id="sessionsTableBody"');

    expect(auditHtml).toContain('id="auditDetailModal"');
    expect(auditHtml).toContain('id="modalDiffContainer"');
  });

  it('migration 063 defines access_logs and audit_logs tables with indexes', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS `access_logs`');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS `audit_logs`');
    expect(migrationSql).toContain('idx_access_logs_created');
    expect(migrationSql).toContain('idx_audit_logs_created');
    expect(migrationSql).toContain('idx_audit_logs_module');
  });
});
