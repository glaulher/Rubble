import { describe, test, expect, beforeEach } from "bun:test";
import { evalModule } from "./helpers/eval-module.js";

var mockInfiniteScroll = `
  function createInfiniteScroll(opts) {
    return {
      init: function () { if (opts.fetchFn) opts.fetchFn({ limit: 20, offset: 0, data: [] }, {}); return this; },
      destroy: function () {},
      reset: function () { return this; },
      load: function () {},
      getState: function () { return { data: [], page: 0, allLoaded: false, loading: false, total: 0 }; },
    };
  }
  function debounce(fn, delay) { var t; return function () { clearTimeout(t); t = setTimeout(fn, delay); }; }
`;

var stepOptionsData = [
  { id: 1, valor: 'Filtro AR', in_use: true },
  { id: 2, valor: 'Retirada', in_use: false },
];

var apiCalls = [];

function loadPendingModule() {
  (0, eval)(mockInfiniteScroll);
  globalThis.apiFetch = function (url, opts) {
    apiCalls.push({ url, opts });
    var method = (opts && opts.method) || 'GET';
    if (method === 'PATCH') {
      var body = JSON.parse(opts.body || '{}');
      var target = stepOptionsData.find(function (o) { return o.valor.toLowerCase() === String(body.value).toLowerCase(); });
      if (target) target.in_use = true;
      return Promise.resolve({ json: function () { return Promise.resolve({ success: true, message: 'ok' }); } });
    }
    return Promise.resolve({ json: function () { return Promise.resolve({ success: true, data: stepOptionsData.map(function (o) { return { id: o.id, valor: o.valor, in_use: o.in_use }; }) }); } });
  };
  globalThis.getUser = function () { return { role: 'admin' }; };
  globalThis.escapeHtml = function (v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  globalThis.sanitizeCSV = function (v) { return String(v); };
  globalThis.showToast = function () {};
  globalThis.confirmAction = function () { return Promise.resolve(true); };
  globalThis.iconButtonHtml = function () { return '<div class="icon-btn"></div>'; };
  globalThis.downloadCSV = function () {};
  globalThis.PlanModal = { open: function () {} };
  globalThis.formatDate = function (d) { return String(d || ''); };

  evalModule('../public/js/pending-tickets/list.js', '');
}

function buildTd(field, raw, active) {
  var td = document.createElement('td');
  td.setAttribute('data-field', field);
  if (active) td.classList.add('managed-active');
  td.innerHTML = '<span class="inline-flex items-center gap-1">'
    + '<span class="pending-value" data-raw="' + raw + '">' + raw + '</span>'
    + '<button type="button" class="pending-edit" data-field="' + field + '"></button>'
    + '</span>';
  var tr = document.createElement('tr');
  tr.setAttribute('class', 'pending-row');
  tr.setAttribute('data-id', '42');
  tr.appendChild(td);
  document.body.appendChild(tr);
  return td;
}

beforeEach(function () {
  apiCalls = [];
  stepOptionsData[0].in_use = true;
  stepOptionsData[1].in_use = false;
  document.body.innerHTML = '';
  delete globalThis.enterPendingManagedEdit;
  delete globalThis.loadPendingFieldOptions;
  delete globalThis.refreshPendingCell;
  delete globalThis.savePendingManagedOption;
  delete globalThis.cancelPendingEdit;
});

describe('pending managed dropdown', function () {
  test('refreshPendingCell removes managed-active and data-prev-raw', async function () {
    loadPendingModule();
    var td = buildTd('step', 'Filtro AR', true);
    td.setAttribute('data-prev-raw', 'Filtro AR');
    globalThis.refreshPendingCell(td, 'step', 'Retirada');

    expect(td.classList.contains('managed-active')).toBe(false);
    expect(td.hasAttribute('data-prev-raw')).toBe(false);
    expect(td.textContent).toContain('Retirada');
  });

  test('option click does not save and keeps dropdown open', async function () {
    loadPendingModule();
    await globalThis.loadPendingFieldOptions('step');
    var td = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    var option = td.querySelector('[data-option-value="Retirada"]');
    expect(option).not.toBe(null);

    option.dispatchEvent(new Event('click', { bubbles: true }));

    var patchCalls = apiCalls.filter(function (c) { return (c.opts && c.opts.method) === 'PATCH'; });
    expect(patchCalls.length).toBe(0);
    expect(td.querySelector('.managed-dropdown')).not.toBe(null);
    expect(td.dataset.pendingValue).toBe('Retirada');
  });

  test('confirm sends PATCH with selected value and refreshes cell', async function () {
    loadPendingModule();
    await globalThis.loadPendingFieldOptions('step');
    var td = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    td.querySelector('[data-option-value="Retirada"]').dispatchEvent(new Event('click', { bubbles: true }));
    td.querySelector('.managed-confirm').dispatchEvent(new Event('click', { bubbles: true }));

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    var patchCalls = apiCalls.filter(function (c) { return (c.opts && c.opts.method) === 'PATCH'; });
    expect(patchCalls.length).toBe(1);
    var body = JSON.parse(patchCalls[0].opts.body);
    expect(body.field).toBe('step');
    expect(body.value).toBe('Retirada');
    expect(td.querySelector('.managed-dropdown')).toBe(null);
    expect(td.classList.contains('managed-active')).toBe(false);
  });

  test('cancel reverts to previous raw value', async function () {
    loadPendingModule();
    await globalThis.loadPendingFieldOptions('step');
    var td = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    td.querySelector('[data-option-value="Retirada"]').dispatchEvent(new Event('click', { bubbles: true }));
    td.querySelector('.managed-cancel-edit').dispatchEvent(new Event('click', { bubbles: true }));

    expect(td.textContent).toContain('Filtro AR');
    expect(td.classList.contains('managed-active')).toBe(false);
    expect(apiCalls.filter(function (c) { return (c.opts && c.opts.method) === 'PATCH'; }).length).toBe(0);
  });

  test('confirm without selection just closes without PATCH', async function () {
    loadPendingModule();
    await globalThis.loadPendingFieldOptions('step');
    var td = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    td.querySelector('.managed-confirm').dispatchEvent(new Event('click', { bubbles: true }));

    expect(apiCalls.filter(function (c) { return (c.opts && c.opts.method) === 'PATCH'; }).length).toBe(0);
    expect(td.textContent).toContain('Filtro AR');
  });

  test('saving an existing option refreshes options so it shows "em uso"', async function () {
    loadPendingModule();
    await globalThis.loadPendingFieldOptions('step');
    var td = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    td.querySelector('[data-option-value="Retirada"]').dispatchEvent(new Event('click', { bubbles: true }));
    td.querySelector('.managed-confirm').dispatchEvent(new Event('click', { bubbles: true }));

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    var td2 = buildTd('step', 'Filtro AR', false);
    globalThis.enterPendingManagedEdit(td2, 'step');
    var optionRow = td2.querySelector('[data-option-value="Retirada"]');

    expect(optionRow.textContent).toContain('em uso');
    expect(optionRow.querySelector('.managed-delete')).toBe(null);
  });

  test('removing the value from cells refreshes options so it shows delete X', async function () {
    loadPendingModule();
    stepOptionsData[1].in_use = true;
    await globalThis.loadPendingFieldOptions('step');

    var td = buildTd('step', 'Retirada', false);
    globalThis.enterPendingManagedEdit(td, 'step');

    stepOptionsData[1].in_use = false;
    td.querySelector('[data-option-value="Filtro AR"]').dispatchEvent(new Event('click', { bubbles: true }));
    td.querySelector('.managed-confirm').dispatchEvent(new Event('click', { bubbles: true }));

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    var td2 = buildTd('step', 'Retirada', false);
    globalThis.enterPendingManagedEdit(td2, 'step');
    var optionRow = td2.querySelector('[data-option-value="Retirada"]');

    expect(optionRow.querySelector('.managed-delete')).not.toBe(null);
    expect(optionRow.textContent).not.toContain('em uso');
  });
});
