import { describe, test, expect, mock } from 'bun:test';

var toastCalls = [];
mock.module('/public/js/core/dom.js', () => ({
  showToast: (m, t) => { toastCalls.push({ m, t }); },
  confirmAction: () => Promise.resolve(true),
  showModal: () => {}, hideModal: () => {},
  confirmDelete: () => Promise.resolve(true),
  updateToastProgress: () => {}, dismissToast: () => {},
}));
mock.module('/public/js/core/auth.js', () => ({
  apiFetch: () => Promise.resolve({ json: () => ({ success: true, data: { action: 'created', id: 1, item: { id: 1, data_planejada: '2026-08-20' } }, message: 'ok' }) }),
  getUser: () => ({ role: 'admin' }),
  applyRoleVisibility: () => {},
  getToken: () => 'tok', setToken: () => {}, setUser: () => {},
  isAuthenticated: () => true, parseJwtPayload: () => ({}), storeAuth: () => {},
  clearAuth: () => {}, destroyTurnstile: () => {}, login: () => {}, logout: () => {},
  authGuard: () => {}, toggleSidebar: () => {}, updateUserDisplay: () => {},
  initLogin: () => {}, startActiveCountPolling: () => {}, stopActiveCountPolling: () => {},
  fetchActiveCount: () => {},
}));
mock.module('/public/js/pv/form-autocomplete.js', () => ({
  createAutocomplete: () => {},
}));
mock.module('/public/js/core/utils.js', () => ({
  escapeHtml: (v) => { if (v === null || v === undefined) return ''; return String(v); },
  sanitizeCSV: (v) => String(v), formatCurrency: (v) => String(v), isDarkMode: () => false,
}));

describe('mock.module', () => {
  test('imports plan-modal com mocks', async () => {
    const mod = await import('/public/js/components/plan-modal.js');
    expect(typeof mod.PlanModal.open).toBe('function');
    // chamar open deve usar showToast mockado
    document.body.innerHTML =
      '<div id="modalPlanActivity" class="hidden"><form id="planForm" novalidate>' +
      '<input id="planSite" type="text" /><div class="site-dropdown hidden"></div>' +
      '<select id="planTipo"><option value="">Selecione</option><option value="preventiva">P</option><option value="corretiva">C</option></select>' +
      '<div id="preventivaFields" class="hidden"><input id="planTicket" /></div>' +
      '<div id="corretivaFields" class="hidden"><input id="planEquipamento" /><input id="planEquipamentoId" /><input id="planOs" /></div>' +
      '<input id="planData" /><input id="planEquipe" /><input id="planObs" /><input id="planSlaDays" />' +
      '<input type="checkbox" id="planSlaSat" /><input type="checkbox" id="planSlaSun" />' +
      '<div id="slaPreview" class="hidden"><span id="slaPreviewText"></span></div>' +
      '<button id="btnCancelPlan">Cancelar</button><button type="submit">Planejar</button></form></div>';
    mod.PlanModal.open({ mode: 'pending', ticket: { id: 42, os: 'OS1', local: 'BMA', equipamento: 'WM', equipamento_id: 7 }, onSubmit: () => {} });
    const modal = document.getElementById('modalPlanActivity');
    expect(modal.classList.contains('hidden')).toBe(false);
  });
});
