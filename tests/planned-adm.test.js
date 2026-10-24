import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildPlannedCardHtml } from "../public/js/planned-activity/list.js";
import {
  summaryTipoBadgeClass,
  summaryFormatTipo,
} from "../public/js/planned-activity/summary.js";

globalThis.sessionStorage = {
  store: {},
  getItem: function (k) { return this.store[k] || null; },
  setItem: function (k, v) { this.store[k] = String(v); },
  removeItem: function (k) { delete this.store[k]; },
  clear: function () { this.store = {}; },
};
globalThis.sessionStorage.setItem('rubble_user', JSON.stringify({ id: 1, nome: 'Admin', role: 'admin' }));
globalThis.sessionStorage.setItem('auth_token', 'test-token');

/* ────────────────────────────────────────────────────────────────────────────
| PlanModal (component) — Adm
|--------------------------------------------------------------------------
*/
var toastCalls = [];
var fetchCalls = [];
var acConfigs = [];

function acSite() { return acConfigs[0]; }

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
    '<option value="adm">Adm</option>' +
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
    '<div id="planSlaFields">' +
    '<input id="planSlaDays" type="number" />' +
    '<input type="checkbox" id="planSlaSat" />' +
    '<input type="checkbox" id="planSlaSun" />' +
    '<div id="slaPreview" class="hidden"><span id="slaPreviewText"></span></div>' +
    '</div>' +
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
  acConfigs = [];
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
  globalThis.getUser = function () { return { role: 'admin' }; };
  globalThis.createAutocomplete = overrides.createAutocomplete || function (opts) {
    acConfigs.push(opts);
  };
  globalThis.initTeamAutocomplete = globalThis.initTeamAutocomplete || function () {};
  globalThis.formatDate = function (v) { return v || ''; };
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 10); });
}

function submitFetchCalls() {
  return fetchCalls.filter(function (c) { return c.url.indexOf('route=preventiva') !== -1; });
}

describe("PlanModal Adm", function () {
  beforeEach(function () {
    document.body.innerHTML = modalTemplateHtml();
    delete globalThis.PlanModal;
  });

  it("toggle adm esconde campos preventiva, corretiva e SLA", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    var tipo = document.getElementById('planTipo');
    tipo.value = 'adm';
    tipo.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('preventivaFields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('corretivaFields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('planSlaFields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('planSite').placeholder).toContain('Adm');
  });

  it("toggle preventiva volta a mostrar SLA e oculta corretiva", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    var tipo = document.getElementById('planTipo');
    tipo.value = 'adm';
    tipo.dispatchEvent(new Event('change', { bubbles: true }));
    tipo.value = 'preventiva';
    tipo.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('planSlaFields').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('corretivaFields').classList.contains('hidden')).toBe(true);
  });

  it("submit adm envia POST route=preventiva com tipo adm, site livre e sem OS/equipamento", async function () {
    var onSubmitData = null;
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function (data) { onSubmitData = data; } });

    document.getElementById('planTipo').value = 'adm';
    document.getElementById('planTipo').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('planSite').value = 'Levar motor na empresa';
    document.getElementById('planData').value = '2026-08-20';
    document.getElementById('planEquipe').value = 'João e Maria';
    document.getElementById('planObs').value = 'Levar motor';
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(submitFetchCalls().length).toBe(1);
    expect(submitFetchCalls()[0].url).toContain('route=preventiva');
    var body = JSON.parse(submitFetchCalls()[0].options.body);
    expect(body.tipo).toBe('adm');
    expect(body.site).toBe('Levar motor na empresa');
    expect(body.data_planejada).toBe('2026-08-20');
    expect(body.equipe).toBe('João e Maria');
    expect(body.obs).toBe('Levar motor');
    expect(body.os).toBeUndefined();
    expect(body.equipamento_id).toBeUndefined();
    expect(body.sla_days).toBeUndefined();
    expect(onSubmitData).toEqual({ action: 'created', id: 1, item: { id: 1, data_planejada: '2026-08-20' } });
  });

  it("submit adm bloqueia sem local e usa equipe padrão", async function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    document.getElementById('planTipo').value = 'adm';
    document.getElementById('planTipo').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('planForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(submitFetchCalls().length).toBe(0);
    expect(toastCalls.some(function (t) { return t.msg === 'Informe o local da atividade.' && t.type === 'error'; })).toBe(true);
  });

  it("blur do site adm aceita texto livre (não reverte para lastValid)", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    document.getElementById('planTipo').value = 'adm';
    document.getElementById('planTipo').dispatchEvent(new Event('change', { bubbles: true }));

    var input = document.getElementById('planSite');
    input.value = '  Local livre  ';
    var lastValidHolder = { v: 'BMA' };
    acSite().onBlur({
      input: input,
      getOptions: function () { return ['BMA']; },
      lastValid: lastValidHolder.v,
      setLastValid: function (v) { lastValidHolder.v = v; },
      hide: function () {},
    });

    expect(input.value).toBe('Local livre');
    expect(lastValidHolder.v).toBe('Local livre');
  });

  it("blur do site preventiva reverte para opção registrada", function () {
    setupGlobals();
    evalComponent();
    globalThis.PlanModal.open({ mode: 'create', onSubmit: function () {} });

    var input = document.getElementById('planSite');
    input.value = 'SITE FORA DA LISTA';
    var lastValidHolder = { v: 'BMA' };
    acSite().onBlur({
      input: input,
      getOptions: function () { return ['BMA']; },
      lastValid: lastValidHolder.v,
      setLastValid: function (v) { lastValidHolder.v = v; },
      hide: function () {},
    });

    expect(input.value).toBe('BMA');
    expect(lastValidHolder.v).toBe('BMA');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
| Card builder (list.js) — Adm
|--------------------------------------------------------------------------
*/
describe("buildPlannedCardHtml Adm", function () {
  var admItem = {
    id: 30,
    tipo: 'adm',
    local: 'Subir laudos internos',
    local_scm: '',
    localidade: '',
    equipamento: '',
    capacidade: '',
    os: '',
    data_planejada: '2026-10-24',
    equipe: 'Carlos',
    status: 'Planejado',
    obs: 'Escanear e enviar',
    material: '',
    mercado: '',
    machine_count: 0,
  };

  it("renderiza badge Adm violeta e header com o local digitado", function () {
    var html = buildPlannedCardHtml(admItem);
    expect(html).toContain('bg-violet-100 text-violet-700');
    expect(html).toContain('data-tipo="adm"');
    expect(html).toContain('Subir laudos internos');
    expect(html).not.toContain('OS ');
    expect(html).not.toContain('N/A');
  });

  it("não exibe set-sla, progresso SLA, linha qtd nem material", function () {
    var html = buildPlannedCardHtml(admItem);
    expect(html).not.toContain('data-action="set-sla"');
    expect(html).not.toContain('sla-progress-container');
    expect(html).not.toContain('qtd-container');
    expect(html).not.toContain('Material:');
    expect(html).not.toContain('extend-sla');
  });

  it("usa botão de status do modal corretiva e delete sem data-date", function () {
    var html = buildPlannedCardHtml(admItem);
    expect(html).toContain('planned-corretiva-status-btn');
    expect(html).toContain('planned-delete-btn');
    expect(html).toContain('data-tipo="adm"');
    // delete do adm é full-row: sem atributo data-date
    var deleteSnippet = html.substring(html.indexOf('planned-delete-btn'));
    expect(deleteSnippet).not.toContain('data-date');
  });

  it("team edit btn carrega data-tipo adm", function () {
    var html = buildPlannedCardHtml(admItem);
    expect(html).toContain('data-action="edit-team"');
    expect(html).toContain('data-tipo="adm"');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
| Summary badges — Adm
|--------------------------------------------------------------------------
*/
describe("summary Adm tipo", function () {
  it("badge violeta para adm e formato do label", function () {
    expect(summaryTipoBadgeClass('adm')).toBe('bg-violet-100 text-violet-700');
    expect(summaryTipoBadgeClass('ADM')).toBe('bg-violet-100 text-violet-700');
    expect(summaryFormatTipo('adm')).toBe('Adm');
  });
});
