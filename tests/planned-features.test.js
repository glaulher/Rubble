import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  startTeamInlineEdit,
  saveTeamInlineEdit,
  startQtdInlineEdit,
  saveQtdInlineEdit,
  _updateGroupSlaProgress,
  deletePlanned,
  buildPlannedCardHtml,
  openStatusPreventiva,
  submitStatusPreventiva,
} from "../public/js/planned-activity/list.js";

describe("Planned Activity - SLA Reversion & Replication Features", () => {

  beforeEach(() => {
    const store = new Map();
    global.sessionStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    sessionStorage.setItem('auth_user', JSON.stringify({ id: 1, name: 'Admin', role: 'admin' }));
    sessionStorage.setItem('auth_token', 'test-token');

    document.body.innerHTML = `
      <div id="toast" class="hidden">
        <span id="toastIcon"></span>
        <span id="toastMessage"></span>
        <div id="toastProgress"></div>
      </div>
      <div id="modalConfirm" class="hidden">
        <h2 id="modalConfirmTitle"></h2>
        <p id="modalConfirmMessage"></p>
        <button id="modalConfirmCancel">Cancelar</button>
        <button id="modalConfirmOk">Confirmar</button>
      </div>
      <div id="modalDeleteConfirm" class="hidden">
        <h2 id="deleteConfirmTitle"></h2>
        <p id="deleteConfirmMessage"></p>
        <span id="deleteConfirmItem"></span>
        <button id="deleteConfirmCancel">Cancelar</button>
        <button id="deleteConfirmOk">Confirmar</button>
      </div>
      <div id="modalStatusPreventiva" class="hidden">
        <input id="statusPreventivaId" value="10">
        <select id="statusSelect"></select>
        <textarea id="statusObs"></textarea>
        <div id="statusDataGroup" class="hidden">
          <input id="statusDataPlanejada" value="2026-09-30">
        </div>
        <div id="statusQtdGroup" class="hidden">
          <input id="statusQtdExecutada" value="1">
        </div>
        <form id="statusForm">
          <button type="submit">Confirmar</button>
        </form>
      </div>
      <div id="plannedContent"></div>
    `;
    global.window = global.window || {};
    window._plannedTotal = 3;
  });

  describe("STATUS_TRANSITIONS: Reversion to Planejado", () => {
    it("allows transitioning from Em Andamento back to Planejado", () => {
      openStatusPreventiva(10, 'Em Andamento', '2026-09-30');
      const select = document.getElementById('statusSelect');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
      expect(options).toContain('Planejado');
    });

    it("allows transitioning from Concluído back to Planejado", () => {
      openStatusPreventiva(10, 'Concluído', '2026-09-30');
      const select = document.getElementById('statusSelect');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
      expect(options).toContain('Planejado');
      expect(options).toContain('Em Andamento');
    });
  });

  describe("startQtdInlineEdit & saveQtdInlineEdit: Reset to 0", () => {
    it("configures input with min='0' and placeholder='0' allowing full reversion", () => {
      document.body.innerHTML += `
        <div class="planned-card" data-id="15" data-machine-count="5" data-sla-feito="1">
          <div class="qtd-container">
            <span class="qtd-text">1 de 5 máquinas preventivadas</span>
            <button class="qtd-edit-btn" data-id="15">Editar</button>
          </div>
        </div>
      `;
      const btn = document.querySelector('.qtd-edit-btn');
      startQtdInlineEdit(btn);

      const input = document.querySelector('.qtd-edit-input');
      expect(input).not.toBeNull();
      expect(input.min).toBe('0');
      expect(input.placeholder).toBe('0');
      expect(input.value).toBe('1');
    });

    it("sends qtd_executada=0 when user clears input or types 0", async () => {
      let requestedBody = null;
      global.fetch = mock((url, opts) => {
        requestedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              item: {
                id: 15,
                status: 'Planejado',
                qtd_executada: null,
                machine_count: 5,
                sla_days: 2,
                sla_feito: 0,
                sla_restam: 5,
                sla_pct: 0
              }
            }
          })
        });
      });

      document.body.innerHTML += `
        <div id="plannedContent">
          <div class="timeline-group" data-date="2026-09-30">
            <div class="planned-card-wrapper">
              <div class="planned-card" data-key="preventiva:15" data-id="15" data-machine-count="5">
                <div class="qtd-container">
                  <span class="qtd-text">1 de 5 máquinas preventivadas</span>
                  <button class="qtd-edit-btn" data-id="15">Editar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      const btn = document.querySelector('.qtd-edit-btn');
      startQtdInlineEdit(btn);

      const input = document.querySelector('.qtd-edit-input');
      const span = document.querySelector('.qtd-text');
      input.value = '0';

      saveQtdInlineEdit(input, span, btn);

      // Allow microtask to process fetch
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(requestedBody).not.toBeNull();
      expect(requestedBody.id).toBe(15);
      expect(requestedBody.qtd_executada).toBe(0);
    });
  });

  describe("startTeamInlineEdit & saveTeamInlineEdit: Technician Replication on Day 1", () => {
    it("sets empty value and 'Nome do técnico' placeholder when team is 'A definir'", () => {
      document.body.innerHTML += `
        <div class="planned-card" data-id="20" data-sla-days="3" data-sla-day-number="1" data-sla-group-id="20">
          <span class="team-name-wrap">
            <strong class="team-name-text">A definir</strong>
            <button class="team-edit-btn" data-id="20" data-tipo="preventiva">Editar</button>
          </span>
        </div>
      `;
      const btn = document.querySelector('.team-edit-btn');
      startTeamInlineEdit(btn);

      const input = document.querySelector('.team-edit-input');
      expect(input).not.toBeNull();
      expect(input.value).toBe('');
      expect(input.placeholder).toBe('Nome do técnico');
    });

    it("prompts for SLA replication when setting technician on day 1 of a multi-day SLA", async () => {
      let modalShown = false;
      document.body.innerHTML += `
        <div class="planned-card" data-id="20" data-sla-days="3" data-sla-day-number="1" data-sla-group-id="20">
          <span class="team-name-wrap">
            <strong class="team-name-text">A definir</strong>
            <button class="team-edit-btn" data-id="20" data-tipo="preventiva">Editar</button>
          </span>
        </div>
        <div class="planned-card" data-id="21" data-sla-days="3" data-sla-day-number="2" data-sla-group-id="20">
          <span class="team-name-wrap">
            <strong class="team-name-text">A definir</strong>
            <button class="team-edit-btn" data-id="21" data-tipo="preventiva">Editar</button>
          </span>
        </div>
      `;
      const btn = document.querySelector('.team-edit-btn');
      startTeamInlineEdit(btn);

      const input = document.querySelector('.team-edit-input');
      const strong = document.querySelector('.team-name-text');
      input.value = 'Carlos Silva';

      let requestedBody = null;
      global.fetch = mock((url, opts) => {
        requestedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              item: { id: 20, equipe: 'Carlos Silva', tipo: 'preventiva' }
            }
          })
        });
      });

      // Trigger save
      saveTeamInlineEdit(input, strong);

      // Verify modalConfirm is opened with confirmation question
      const confirmModal = document.getElementById('modalConfirm');
      expect(confirmModal.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('modalConfirmTitle').textContent).toBe('Replicar Técnico');
      expect(document.getElementById('modalConfirmMessage').textContent).toContain('Carlos Silva');

      // Click Confirm button on modal
      document.getElementById('modalConfirmOk').click();

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(requestedBody).not.toBeNull();
      expect(requestedBody.equipe).toBe('Carlos Silva');
      expect(requestedBody.replicate_sla).toBe(true);

      // Verify sibling card in DOM was updated to the new technician name
      const siblingCard = document.querySelector('.planned-card[data-id="21"]');
      expect(siblingCard.querySelector('.team-name-text').textContent).toBe('Carlos Silva');
    });
  });

  describe("SLA Progress Bar Calculation & Fallback", () => {
    it("renders progress bar and advances correctly when machine_count is 0 but feito > 0", () => {
      const cardHtml = buildPlannedCardHtml({
        id: 30,
        tipo: 'preventiva',
        status: 'Em Andamento',
        site: 'Site Alpha',
        local: 'Site Alpha',
        machine_count: 0,
        sla_days: 2,
        sla_day_number: 1,
        sla_group_id: 30,
        sla_feito: 1,
        sla_restam: 0
      });

      expect(cardHtml).toContain('sla-progress-bar');
      // Fallback pct for Em Andamento with feito > 0 when machine_count is 0 is 50%
      expect(cardHtml).toContain('width:50%');
      expect(cardHtml).toContain('bg-amber-500');
    });

    it("renders green 100% progress bar when item status is Concluído even if machine_count is 0", () => {
      const cardHtml = buildPlannedCardHtml({
        id: 31,
        tipo: 'preventiva',
        status: 'Concluído',
        site: 'Site Alpha',
        local: 'Site Alpha',
        machine_count: 0,
        sla_days: 2,
        sla_day_number: 2,
        sla_group_id: 30,
        sla_feito: 2,
        sla_restam: 0
      });

      expect(cardHtml).toContain('width:100%');
      expect(cardHtml).toContain('bg-emerald-500');
    });

    it("updates sibling progress bar correctly in _updateGroupSlaProgress with fallback", () => {
      document.body.innerHTML += `
        <div class="planned-card" data-id="40" data-sla-group-id="40" data-machine-count="0" data-sla-feito="0">
          <div class="sla-progress-container">
            <span class="sla-progress-text">Progresso SLA: 0 preventivadas</span>
            <span class="font-medium">0%</span>
            <div class="sla-progress-bar bg-slate-300" style="width:0%"></div>
          </div>
        </div>
      `;

      _updateGroupSlaProgress({
        id: 41,
        sla_group_id: 40,
        machine_count: 0,
        sla_feito: 1,
        status: 'Em Andamento'
      });

      const card = document.querySelector('.planned-card[data-id="40"]');
      expect(card.querySelector('.sla-progress-bar').style.width).toBe('50%');
      expect(card.querySelector('.sla-progress-bar').classList.contains('bg-amber-500')).toBe(true);
      expect(card.querySelector('.font-medium').textContent).toBe('50%');
    });
  });

  describe("deletePlanned: SLA Decrement & Refresh", () => {
    it("calls resetPlannedState when an SLA card is deleted so remaining cards update days from 3 to 2", async () => {
      document.body.innerHTML += `
        <div id="plannedContent">
          <div class="timeline-group" data-date="2026-09-30">
            <div class="planned-card-wrapper">
              <div class="planned-card" data-key="preventiva:50" data-id="50" data-sla-group-id="50" data-sla-days="3" data-sla-day-number="1"></div>
            </div>
            <div class="planned-card-wrapper">
              <div class="planned-card" data-key="preventiva:51" data-id="51" data-sla-group-id="50" data-sla-days="3" data-sla-day-number="2"></div>
            </div>
            <div class="planned-card-wrapper">
              <div class="planned-card" data-key="preventiva:52" data-id="52" data-sla-group-id="50" data-sla-days="3" data-sla-day-number="3"></div>
            </div>
          </div>
        </div>
      `;

      let deletePayload = null;
      global.fetch = mock((url, opts) => {
        deletePayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 52,
              tipo: 'preventiva',
              sla_reconciled: {
                group_id: 50,
                new_sla_days: 2,
                remaining_count: 2
              }
            }
          })
        });
      });

      deletePlanned(52, 'preventiva', '2026-09-30', 3);

      // Confirm delete in modal
      document.getElementById('deleteConfirmOk').click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(deletePayload).not.toBeNull();
      expect(deletePayload.id).toBe(52);
      expect(deletePayload.sla_day_number).toBe(3);

      // Verify plannedContent was cleared by resetPlannedState to re-render updated cards
      const content = document.getElementById('plannedContent');
      expect(content.innerHTML).toBe('');
    });
  });
});
