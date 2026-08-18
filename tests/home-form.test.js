import { describe, it, expect, beforeEach } from "bun:test";
import { evalModule } from "./helpers/eval-module.js";

var HELPERS =
  '\nfunction showToast() {}\n' +
  '\nfunction createAutocomplete() { globalThis._createAutocompleteCalls += 1; }\n' +
  'function loadLocals() { return Promise.resolve([]); }\n' +
  'function getPvLocalOptions() { return []; }\n';

function loadFormModule() {
  delete globalThis.generateEmergenciaOs;
  delete globalThis.loadHomeForm;
  delete globalThis.loadGestaoEquipamentos;
  globalThis._createAutocompleteCalls = 0;
  evalModule('../public/js/home/form.js', HELPERS);
}

function makeFormDom() {
  document.body.innerHTML =
    '<form id="ticketForm">' +
    '<input type="hidden" id="ticketId">' +
    '<input type="hidden" id="equipmentId" name="equipamento_id" value="">' +
    '<div id="gestaoEquipFields" class="hidden">' +
    '<div class="autocomplete-wrap relative">' +
    '<input type="text" id="local">' +
    '<div class="local-dropdown hidden"></div>' +
    '</div>' +
    '<select id="equipamentoId"><option value="">Selecione...</option></select>' +
    '</div>' +
    '<input type="text" name="os" id="osNumero">' +
    '<input type="checkbox" id="emergenciaCheckbox">' +
    '<input type="date" name="data">' +
    '<input type="text" name="equipe">' +
    '<select name="status"></select>' +
    '<input type="date" name="data_concluido">' +
    '<input type="date" name="data_planejada">' +
    '<select name="material"></select>' +
    '<textarea name="obs"></textarea>' +
    '<a href="#/" id="voltarLink">Voltar</a>' +
    '<button type="submit"></button>' +
    '</form>';
}

beforeEach(function () {
  document.body.innerHTML = "";
  globalThis.fetch = async function () {
    return { json: async function () { return { success: true, data: { os: 'EMERGENCIAL01' } }; } };
  };
  try {
    window.location.hash = '';
  } catch (e) {
    globalThis.location = { hash: '' };
  }
});

// --- generateEmergenciaOs ---

describe("generateEmergenciaOs", function () {
  beforeEach(function () {
    loadFormModule();
  });

  it("fetches the next emergencia OS from the API", async function () {
    var called = null;
    globalThis.fetch = async function (url) {
      called = url;
      return { json: async function () { return { success: true, data: { os: 'EMERGENCIAL42' } }; } };
    };
    var os = await globalThis.generateEmergenciaOs();
    expect(os).toBe('EMERGENCIAL42');
    expect(called).toContain('action=next-emergencia-os');
  });

  it("throws when response is not successful", async function () {
    globalThis.fetch = async function () {
      return { json: async function () { return { success: false, message: 'erro' }; } };
    };
    await expect(globalThis.generateEmergenciaOs()).rejects.toThrow();
  });

  it("throws when os is missing from data", async function () {
    globalThis.fetch = async function () {
      return { json: async function () { return { success: true, data: {} }; } };
    };
    await expect(globalThis.generateEmergenciaOs()).rejects.toThrow();
  });
});

// --- loadHomeForm: emergencia checkbox wiring ---

describe("loadHomeForm emergencia checkbox", function () {
  beforeEach(function () {
    makeFormDom();
    loadFormModule();
  });

  it("disables the OS input and fills the next value when checked", async function () {
    await globalThis.loadHomeForm();
    var checkbox = document.getElementById('emergenciaCheckbox');
    var osInput = document.querySelector('[name="os"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 0); });
    expect(osInput.disabled).toBe(true);
    expect(osInput.value).toBe('EMERGENCIAL01');
  });

  it("re-enables the OS input and clears it when unchecked", async function () {
    await globalThis.loadHomeForm();
    var checkbox = document.getElementById('emergenciaCheckbox');
    var osInput = document.querySelector('[name="os"]');
    osInput.disabled = true;
    osInput.value = 'EMERGENCIAL01';
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 0); });
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 0); });
    expect(osInput.disabled).toBe(false);
    expect(osInput.value).toBe('');
  });
});

// --- loadHomeForm: gestao de OS origin ---

describe("loadHomeForm from Gestão de OS", function () {
  beforeEach(function () {
    makeFormDom();
    loadFormModule();
  });

  it("shows the site/equipment fields and wires autocomplete when source=gestao", async function () {
    window.location.hash = '#/form?source=gestao';
    await globalThis.loadHomeForm();
    var fields = document.getElementById('gestaoEquipFields');
    expect(fields.classList.contains('hidden')).toBe(false);
    expect(globalThis._createAutocompleteCalls).toBe(1);
    expect(document.getElementById('voltarLink').getAttribute('href')).toBe('#/pending-tickets');
  });

  it("keeps the site/equipment fields hidden without source=gestao", async function () {
    window.location.hash = '#/form?id=5';
    await globalThis.loadHomeForm();
    var fields = document.getElementById('gestaoEquipFields');
    expect(fields.classList.contains('hidden')).toBe(true);
    expect(globalThis._createAutocompleteCalls).toBe(0);
    expect(document.getElementById('voltarLink').getAttribute('href')).toBe('#/');
  });

  it("syncs the hidden equipmentId when an equipment is selected", async function () {
    window.location.hash = '#/form?source=gestao';
    await globalThis.loadHomeForm();
    var select = document.getElementById('equipamentoId');
    var option = document.createElement('option');
    option.value = '99';
    option.textContent = 'WM 02 — 10 TR - Container 1';
    select.appendChild(option);
    select.value = '99';
    select.dispatchEvent(new Event('change'));
    expect(document.getElementById('equipmentId').value).toBe('99');
  });
});