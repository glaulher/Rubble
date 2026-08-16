import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

var toastCalls = [];
var fetchCalls = [];

function modalTemplateHtml() {
  return '' +
    '<template id="planModalTemplate">' +
    '<div id="modalPlanActivity" class="hidden">' +
    '<form id="planForm" novalidate>' +
    '<input id="planSite" type="text" />' +
    '<div class="site-dropdown hidden"></div>' +
    '<select id="planTipo">' +
    '<option value="">Selecione</option>' +
    '<option value="preventiva">Preventiva</option>' +
    '<option value="corretiva">Corretiva</option>' +
    '</select>' +
    '<div id="preventivaFields" class="hidden"><input id="planTicket" type="text" /></div>' +
    '<div id="corretivaFields" class="hidden">' +
    '<input id="planEquipamento" type="text" />' +
    '<div class="equipamento-dropdown hidden"></div>' +
    '<input id="planEquipamentoId" type="hidden" />' +
    '<input id="planOs" type="text" />' +
    '</div>' +
    '<input id="planData" type="date" />' +
    '<input id="planEquipe" type="text" />' +
    '<input id="planObs" type="text" />' +
    '<input id="planSlaDays" type="number" />' +
    '<input type="checkbox" id="planSlaSat" />' +
    '<input type="checkbox" id="planSlaSun" />' +
    '<div id="slaPreview" class="hidden"><span id="slaPreviewText"></span></div>' +
    '<button type="button" id="btnCancelPlan">Cancelar</button>' +
    '<button type="submit">Planejar</button>' +
    '</form>' +
    '</div>' +
    '</template>';
}

function evalComponent() {
  var code = readFileSync(resolve(__dirname, '../public/js/components/plan-modal.js'), 'utf-8');
  if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
  code = code.replace(/^import .+$/gm, '').replace(/^export /gm, '');
  (0, eval)(code);
}

function setupGlobals(overrides) {
  overrides = overrides || {};
  toastCalls = [];
  fetchCalls = [];
  globalThis.apiFetch = overrides.apiFetch || function (url, options) {
    fetchCalls.push({ url: url, options: options });
    return Promise.resolve({
      json: function () {
        return { success: true, data: { action: 'created', id: 1, item: { id: 1, data_planejada: '2026-08-20' } }, message: 'ok' };
      },
    });
  };
  globalThis.showToast = overrides.showToast || function (msg, type) {
    toastCalls.push({ msg: msg, type: type });
  };
  globalThis.getUser = overrides.getUser || function () { return { role: 'admin' }; };
  globalThis.createAutocomplete = overrides.createAutocomplete || function () {};
  globalThis.formatDate = function (v) { return v || ''; };
}

function plannedFetchCalls() {
  return fetchCalls.filter(function (c) {
    return String(c.url).indexOf('route=planned-activities') !== -1;
  });
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 10); });
}

var TICKET = {
  id: 42,
  local: 'BMA',
  os: 'OS123',
  equipamento: 'WM 01',
  equipamento_id: 7,
  data_planejada: '',
  equipe: '',
  obs: 'teste',
};

describe("PlanModal component", function () {
  beforeEach(function () {
    document.body.innerHTML = modalTemplateHtml();
    delete globalThis.PlanModal;
  });

  it("expõe PlanModal global com open e close", function () {
    setupGlobals();
    evalComponent();
    expect(typeof globalThis.PlanModal).toBe('object');
    expect(typeof globalThis.PlanModal.open).toBe('function');
    expect(typeof globalThis.PlanModal.close).toBe('function');
  });

  it("open com mode=pending prefilla campos corretiva e mostra o modal", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'pending', ticket: TICKET, onSubmit: function () {} });

    var modal = document.getElementById('modalPlanActivity');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('planTipo').value).toBe('corretiva');
    expect(document.getElementById('planSite').value).toBe('BMA');
    expect(document.getElementById('planOs').value).toBe('OS123');
    expect(document.getElementById('planEquipamento').value).toBe('WM 01');
    expect(document.getElementById('planEquipamentoId').value).toBe('7');
    expect(document.getElementById('preventivaFields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('corretivaFields').classList.contains('hidden')).toBe(false);
  });

  it("submit envia payload corretiva e chama onSubmit com result.data (modal fecha)", async function () {
    var onSubmitData = null;
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({
      mode: 'pending',
      ticket: TICKET,
      onSubmit: function (data) { onSubmitData = data; },
    });

    document.getElementById('planData').value = '2026-08-20';
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(plannedFetchCalls().length).toBe(1);
    var body = JSON.parse(plannedFetchCalls()[0].options.body);
    expect(body.tipo).toBe('corretiva');
    expect(body.os).toBe('OS123');
    expect(body.equipamento_id).toBe(7);
    expect(body.data_planejada).toBe('2026-08-20');
    expect(body.material).toBe('Sim');
    expect(body.obs).toBe('teste');

    expect(onSubmitData).toEqual({ action: 'created', id: 1, item: { id: 1, data_planejada: '2026-08-20' } });
    expect(document.getElementById('modalPlanActivity').classList.contains('hidden')).toBe(true);
  });

  it("submit com success=false mostra toast de erro e NÃO chama onSubmit (modal fica aberto)", async function () {
    var onSubmitCalled = false;
    setupGlobals({
      apiFetch: function (url, options) {
        fetchCalls.push({ url: url, options: options });
        return Promise.resolve({
          json: function () { return { success: false, message: 'Equipamento obrigatório.' }; },
        });
      },
    });
    evalComponent();
    globalThis.PlanModal.open({
      mode: 'pending',
      ticket: TICKET,
      onSubmit: function () { onSubmitCalled = true; },
    });

    document.getElementById('planData').value = '2026-08-20';
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(onSubmitCalled).toBe(false);
    expect(toastCalls.some(function (t) { return t.msg === 'Equipamento obrigatório.' && t.type === 'error'; })).toBe(true);
    expect(document.getElementById('modalPlanActivity').classList.contains('hidden')).toBe(false);
  });

  it("validação bloqueia submit sem data planejada", async function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'pending', ticket: TICKET, onSubmit: function () {} });

    document.getElementById('planData').value = '';
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(plannedFetchCalls().length).toBe(0);
    expect(toastCalls.some(function (t) { return t.type === 'error'; })).toBe(true);
  });

  it("anexa listeners uma única vez (abrir 2x não duplica submit)", async function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'pending', ticket: TICKET, onSubmit: function () {} });
    globalThis.PlanModal.open({ mode: 'pending', ticket: TICKET, onSubmit: function () {} });

    document.getElementById('planData').value = '2026-08-20';
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(plannedFetchCalls().length).toBe(1);
  });

  it("open com mode=create reseta o formulário após prefill pending", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'pending', ticket: TICKET, onSubmit: function () {} });
    expect(document.getElementById('planOs').value).toBe('OS123');

    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    expect(document.getElementById('planOs').value).toBe('');
    expect(document.getElementById('planSite').value).toBe('');
    expect(document.getElementById('planEquipamentoId').value).toBe('');
    expect(document.getElementById('preventivaFields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('corretivaFields').classList.contains('hidden')).toBe(true);
  });

  it("exibe preview de SLA quando dias e data preenchidos", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    var preview = document.getElementById('slaPreview');
    expect(preview.classList.contains('hidden')).toBe(true);

    document.getElementById('planData').value = '2026-08-20';
    document.getElementById('planSlaDays').value = '2';
    document.getElementById('planSlaDays').dispatchEvent(new Event('input', { bubbles: true }));

    expect(preview.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('slaPreviewText').textContent.indexOf('2 dia')).toBeGreaterThan(-1);
  });
});
