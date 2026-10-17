import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const MIGRATION = join(import.meta.dir, '..', 'config', 'migrations', '007_create_usuarios.sql');

describe('Migration 007 — usuarios seed security', () => {
  const exists = existsSync(MIGRATION);
  const sql = exists ? readFileSync(MIGRATION, 'utf8') : '';

  it('does not reset existing passwords on re-run', () => {
    if (!exists) return;
    expect(sql).not.toContain('password = VALUES(password)');
    expect(sql).not.toMatch(/UPDATE\s+password/i);
  });

  it('does not contain a hardcoded bcrypt hash', () => {
    if (!exists) return;
    // Linhas ativas (nao-commentadas) com hash bcrypt.
    const activeLines = sql
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('--'));
    const bcrypt = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/;
    expect(activeLines.some((l) => bcrypt.test(l))).toBe(false);
  });
});
