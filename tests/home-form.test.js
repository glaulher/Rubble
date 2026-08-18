import { describe, it, expect, beforeEach } from "bun:test";
import { evalModule } from "./helpers/eval-module.js";

var HELPERS =
  '\nfunction showToast() {}\n';

function loadFormModule() {
  delete globalThis.generateEmergenciaOs;
  delete globalThis.loadHomeForm;
  evalModule('../public/js/home/form.js', HELPERS);
}

function makeFormDom() {
  document.body.innerHTML =
    '<form id="ticketForm">' +
    '<input type="hidden" id="ticketId">' +
    '<input type="hidden" id="equipmentId" name="equipamento_id" value="">' +
    '<input type="text" name="os" id="osNumero">' +
    '<input type="checkbox" id="emergenciaCheckbox">' +
    '<input type="date" name="data">' +
    '<input type="text" name="equipe">' +
    '<select name="status"></select>' +
    '<input type="date" name="data_concluido">' +
    '<input type="date" name="data_planejada">' +
    '<select name="material"></select>' +
    '<textarea name="obs"></textarea>' +
    '<button type="submit"></button>' +
    '</form>';
}

beforeEach(function () {
  document.body.innerHTML = "";
  globalThis.fetch = async function () {
    return { json: async function () { return { success: true, data: { os: 'EMERGENCIAL01' } }; } };
  };
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