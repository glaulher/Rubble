import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function fileContains(path, needle) {
  try {
    const txt = readFileSync(resolve(path), 'utf-8');
    return txt.includes(needle);
  } catch { return false; }
}

describe('Tempo Fechado manual batch upload configuration', () => {
  test('Nginx site.conf allows up to 250M for /tempo-fechado/ proxy', () => {
    const nginx = readFileSync(resolve('config/nginx/site.conf'), 'utf-8');
    expect(nginx).toContain('location ^~ /tempo-fechado/');
    expect(nginx).toContain('client_max_body_size 250M;');
    expect(nginx).toContain('proxy_read_timeout 300s;');
  });

  test('app.js implements chunked batch upload with progress in uploadPdfsRoboManualV82138', () => {
    const appJs = readFileSync(resolve('tempo_fechado/static/app.js'), 'utf-8');
    expect(appJs).toContain('const LOTE_TAMANHO =');
    expect(appJs).toContain('Enviando lote');
    expect(appJs).toContain('totalSalvos');
  });

  test('robo_ponto_web.py normalizes saved PDF names and handles case-insensitivity', () => {
    const py = readFileSync(resolve('tempo_fechado/robo_ponto_web.py'), 'utf-8');
    expect(py).toContain('p.suffix.lower() == ".pdf"');
    expect(py).toContain('nome_seguro = f"{stem}.pdf"');
  });

  test('Script_Robo_Ponto_v7_PRO.py lists PDFs case-insensitively on Linux', () => {
    const script = readFileSync(resolve('tempo_fechado/Script_Robo_Ponto_v7_PRO.py'), 'utf-8');
    expect(script).toContain('f.suffix.lower() == ".pdf"');
  });
});
