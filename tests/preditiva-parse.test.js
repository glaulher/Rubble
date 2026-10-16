import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Preditiva Parse Feature - View, Router and Markup Integration', () => {
  const indexHtml = readFileSync(resolve(import.meta.dir, '../index.html'), 'utf-8');
  const routerJs = readFileSync(resolve(import.meta.dir, '../public/js/router.js'), 'utf-8');
  const viewPath = resolve(import.meta.dir, '../app/Views/preditiva-parse/index.html');
  const scriptPath = resolve(import.meta.dir, '../public/js/preditiva-parse/preditiva-parse.js');

  it('index.html contains preditivaParseLink inside toolsSubmenu', () => {
    expect(indexHtml).toContain('id="preditivaParseLink"');
    expect(indexHtml).toContain('href="#/preditiva-parse"');
    expect(indexHtml).toContain('Parser Preditiva');
  });

  it('router.js registers route and init for preditiva-parse', () => {
    expect(routerJs).toContain('#/preditiva-parse');
    expect(routerJs).toContain('/app/Views/preditiva-parse/index.html');
    expect(routerJs).toContain('initPreditivaParse');
  });

  it('view index.html exists with required form elements and dropzone', () => {
    expect(existsSync(viewPath)).toBe(true);
    const viewHtml = readFileSync(viewPath, 'utf-8');
    expect(viewHtml).toContain('id="preditivaParseForm"');
    expect(viewHtml).toContain('id="climaDropzone"');
    expect(viewHtml).toContain('id="climaFileInput"');
    expect(viewHtml).toContain('id="processBtn"');
    expect(viewHtml).toContain('id="resultsPanel"');
    expect(viewHtml).toContain('id="statTotalRows"');
    expect(viewHtml).toContain('id="statMatchedRows"');
    expect(viewHtml).toContain('id="statUnmatchedRows"');
  });

  it('frontend script exists and exports initPreditivaParse', () => {
    expect(existsSync(scriptPath)).toBe(true);
    const scriptJs = readFileSync(scriptPath, 'utf-8');
    expect(scriptJs).toContain('export function initPreditivaParse');
    expect(scriptJs).toContain('fetch(\'/app/api/index.php?route=preditiva-parse\'');
    expect(scriptJs).toContain('X-Parse-Stats');
  });
});
