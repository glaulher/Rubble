import { describe, it, expect } from 'bun:test';
import { resolve } from 'path';

// Load the module - will fail if buttonHtml doesn't exist
var mod = await import(resolve(__dirname, '../public/js/components/button.js'));
var iconButtonHtml = mod.iconButtonHtml;
var buttonHtml = mod.buttonHtml;

function containsAll(haystack, needles) {
  return needles.every(function (n) { return haystack.indexOf(n) !== -1; });
}

describe('iconButtonHtml', function () {
  it('returns a string starting with <div', function () {
    var html = iconButtonHtml('edit', 'Editar');
    expect(html.substring(0, 5)).toBe('<div ');
  });

  it('includes the tooltip text', function () {
    var html = iconButtonHtml('edit', 'Editar');
    expect(html.indexOf('Editar')).not.toBe(-1);
  });

  it('escapes tooltip', function () {
    var html = iconButtonHtml('edit', '<script>');
    expect(html.indexOf('&lt;script&gt;')).not.toBe(-1);
    expect(html.indexOf('<script>')).toBe(-1);
  });

  it('uses correct color classes for each type', function () {
    var editHtml = iconButtonHtml('edit', 'Edit');
    expect(editHtml.indexOf('bg-blue-100')).not.toBe(-1);

    var deleteHtml = iconButtonHtml('delete', 'Delete');
    expect(deleteHtml.indexOf('bg-red-100')).not.toBe(-1);

    var statusHtml = iconButtonHtml('status', 'Status');
    expect(statusHtml.indexOf('bg-amber-100')).not.toBe(-1);
  });

  it('applies custom attrs', function () {
    var html = iconButtonHtml('edit', 'Edit', { 'data-action': 'edit', 'data-id': '5' });
    expect(html.indexOf('data-action="edit"')).not.toBe(-1);
    expect(html.indexOf('data-id="5"')).not.toBe(-1);
  });

  it('applies extra class', function () {
    var html = iconButtonHtml('edit', 'Edit', { class: 'my-extra' });
    expect(html.indexOf('my-extra')).not.toBe(-1);
  });

  it('escapes attribute values', function () {
    var html = iconButtonHtml('edit', 'Edit', { 'data-val': 'a"b' });
    expect(html.indexOf('a&quot;b')).not.toBe(-1);
  });

  it('positions tooltip right when tooltipPos is right', function () {
    var html = iconButtonHtml('edit', 'Edit', null, 'right');
    expect(html.indexOf('right-0')).not.toBe(-1);
    expect(html.indexOf('origin-bottom-right')).not.toBe(-1);
    expect(html.indexOf('left-1/2')).toBe(-1);
  });

  it('positions tooltip center by default', function () {
    var html = iconButtonHtml('edit', 'Edit');
    expect(html.indexOf('left-1/2')).not.toBe(-1);
  });
});

describe('buttonHtml', function () {
  it('returns a string starting with <button', function () {
    var html = buttonHtml('primary', 'Salvar');
    expect(html.substring(0, 7)).toBe('<button');
  });

  it('includes the label text', function () {
    var html = buttonHtml('primary', 'Salvar');
    expect(html.indexOf('Salvar')).not.toBe(-1);
  });

  it('escapes HTML in label', function () {
    var html = buttonHtml('primary', '<script>alert("xss")</script>');
    expect(html.indexOf('&lt;script&gt;')).not.toBe(-1);
    expect(html.indexOf('<script>')).toBe(-1);
  });

  describe('button types', function () {
    it('primary uses emerald classes', function () {
      var html = buttonHtml('primary', 'OK');
      expect(containsAll(html, ['bg-emerald-200', 'hover:bg-emerald-300', 'text-emerald-800'])).toBe(true);
    });

    it('secondary uses sky classes', function () {
      var html = buttonHtml('secondary', 'OK');
      expect(containsAll(html, ['bg-sky-200', 'hover:bg-sky-300', 'text-sky-800'])).toBe(true);
    });

    it('submit uses blue classes', function () {
      var html = buttonHtml('submit', 'OK');
      expect(containsAll(html, ['bg-blue-200', 'hover:bg-blue-300', 'text-blue-800'])).toBe(true);
    });

    it('danger uses red classes', function () {
      var html = buttonHtml('danger', 'OK');
      expect(containsAll(html, ['bg-red-200', 'hover:bg-red-300', 'text-red-800'])).toBe(true);
    });

    it('neutral uses slate classes', function () {
      var html = buttonHtml('neutral', 'OK');
      expect(containsAll(html, ['bg-slate-300', 'hover:bg-slate-400', 'text-slate-900'])).toBe(true);
    });

    it('unknown type defaults to neutral', function () {
      var html = buttonHtml('nonexistent', 'OK');
      expect(containsAll(html, ['bg-slate-300'])).toBe(true);
    });
  });

  describe('sizes', function () {
    it('default size is md', function () {
      var html = buttonHtml('primary', 'OK');
      expect(containsAll(html, ['px-4', 'py-2', 'text-sm'])).toBe(true);
    });

    it('sm uses smaller padding', function () {
      var html = buttonHtml('primary', 'OK', null, 'sm');
      expect(containsAll(html, ['px-3', 'py-1.5', 'text-sm'])).toBe(true);
    });

    it('lg uses larger padding', function () {
      var html = buttonHtml('primary', 'OK', null, 'lg');
      expect(containsAll(html, ['px-5', 'py-2.5', 'text-base'])).toBe(true);
    });
  });

  it('applies custom attrs', function () {
    var html = buttonHtml('primary', 'Salvar', { 'data-action': 'save', disabled: '' });
    expect(html.indexOf('data-action="save"')).not.toBe(-1);
    expect(html.indexOf('disabled=""')).not.toBe(-1);
  });

  it('applies extra class', function () {
    var html = buttonHtml('primary', 'Salvar', { class: 'w-full mt-2' });
    expect(html.indexOf('w-full')).not.toBe(-1);
    expect(html.indexOf('mt-2')).not.toBe(-1);
  });

  it('escapes attribute values', function () {
    var html = buttonHtml('primary', 'Salvar', { 'data-val': 'a"b' });
    expect(html.indexOf('a&quot;b')).not.toBe(-1);
  });

  it('includes font-medium and rounded-xl and transition and cursor-pointer', function () {
    var html = buttonHtml('primary', 'OK');
    expect(containsAll(html, ['font-medium', 'rounded-xl', 'transition', 'cursor-pointer'])).toBe(true);
  });
});
