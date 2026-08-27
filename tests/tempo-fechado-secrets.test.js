import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

function fileContains(path, needle) {
  try {
    const txt = readFileSync(resolve(path), 'utf-8');
    return txt.includes(needle);
  } catch { return false; }
}

function isIgnored(relPath) {
  try {
    execSync(`git check-ignore -q "${relPath}"`);
    return true;
  } catch { return false; }
}

describe('tempo-fechado secrets must be in .env, not hardcoded', () => {
  test('robo_ponto_web.py must not contain hardcoded secret bbf4b', () => {
    expect(fileContains('tempo_fechado/robo_ponto_web.py', 'bbf4b37477c714f4df81447fcdfdc58e1be480cc0342885f')).toBe(false);
  });

  test('robo_ponto_web.py must read secret from env TEMPO_FECHADO_SECRET_KEY', () => {
    expect(fileContains('tempo_fechado/robo_ponto_web.py', 'TEMPO_FECHADO_SECRET_KEY')).toBe(true);
  });

  test('user_db.py must not contain hardcoded default passwords admin123/ponto123', () => {
    expect(fileContains('tempo_fechado/user_db.py', 'admin123')).toBe(false);
    expect(fileContains('tempo_fechado/user_db.py', 'ponto123')).toBe(false);
  });

  test('user_db.py must support TEMPO_FECHADO_DEFAULT_USERS_JSON env', () => {
    expect(fileContains('tempo_fechado/user_db.py', 'TEMPO_FECHADO_DEFAULT_USERS_JSON')).toBe(true);
  });

  test('tempo_fechado/data/usuarios.db must be gitignored', () => {
    expect(isIgnored('tempo_fechado/data/usuarios.db')).toBe(true);
  });

  test('tempo_fechado/*.db must be gitignored', () => {
    expect(isIgnored('tempo_fechado/tempo_fechado.db')).toBe(true);
  });

  test('.env.example must document TEMPO_FECHADO_SECRET_KEY', () => {
    expect(fileContains('.env.example', 'TEMPO_FECHADO_SECRET_KEY')).toBe(true);
  });
});
