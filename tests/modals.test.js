import { describe, it, expect, beforeEach } from "bun:test";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

function confirmDelete(title, message, itemName) {
  return new Promise((resolve) => {
    var titleEl = document.getElementById('deleteConfirmTitle');
    var msgEl = document.getElementById('deleteConfirmMessage');
    var itemEl = document.getElementById('deleteConfirmItem');
    var btnOk = document.getElementById('deleteConfirmOk');
    var btnCancel = document.getElementById('deleteConfirmCancel');

    if (titleEl) titleEl.textContent = title || 'Excluir';
    if (msgEl) msgEl.textContent = message || 'Tem certeza que deseja excluir ';
    if (itemEl) itemEl.textContent = itemName || '';

    showModal('modalDeleteConfirm');

    btnOk.onclick = () => {
      hideModal('modalDeleteConfirm');
      resolve(true);
    };

    btnCancel.onclick = () => {
      hideModal('modalDeleteConfirm');
      resolve(false);
    };
  });
}

var PV_STATUSES = ['Ativo', 'SCM aprovado', 'Cancelado'];

function populateStatusSelect(selectId, selected) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  PV_STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

var pvSearch = '';
var pvStatusFilter = '';
var pvCycleFilter = '';
var pvEmailPvId = null;
var pvEmailPvData = null;
var pvList = [];

function resetPvState(search, status, cycle) {
  pvSearch = search;
  pvStatusFilter = status;
  pvCycleFilter = cycle || '';
}

function openStatusModal(id, pvNumber) {
  document.getElementById('statusPvId').value = id;
  document.getElementById('statusPvNumber').textContent = pvNumber;
  populateStatusSelect('statusSelect', '');
  showModal('statusModal');
}

function closeStatusModal() {
  hideModal('statusModal');
}

// --- confirmDelete ---

describe("confirmDelete", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="modalDeleteConfirm" class="hidden">' +
        '<h2 id="deleteConfirmTitle"></h2>' +
        '<span id="deleteConfirmMessage"></span>' +
        '<span id="deleteConfirmItem"></span>' +
        '<button id="deleteConfirmOk"></button>' +
        '<button id="deleteConfirmCancel"></button>' +
      '</div>';
  });

  it("sets title, message and item name, shows modal", () => {
    const p = confirmDelete('Excluir PV', 'Tem certeza que deseja excluir a PV', '26001');
    expect(document.getElementById('deleteConfirmTitle').textContent).toBe('Excluir PV');
    expect(document.getElementById('deleteConfirmMessage').textContent).toBe('Tem certeza que deseja excluir a PV');
    expect(document.getElementById('deleteConfirmItem').textContent).toBe('26001');
    expect(document.getElementById('modalDeleteConfirm').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modalDeleteConfirm').classList.contains('flex')).toBe(true);
  });

  it("resolves true when OK is clicked", async () => {
    const p = confirmDelete('Excluir', 'Tem certeza que deseja excluir', 'Item');
    document.getElementById('deleteConfirmOk').click();
    const result = await p;
    expect(result).toBe(true);
    expect(document.getElementById('modalDeleteConfirm').classList.contains('hidden')).toBe(true);
  });

  it("resolves false when Cancel is clicked", async () => {
    const p = confirmDelete('Excluir', 'Tem certeza que deseja excluir', 'Item');
    document.getElementById('deleteConfirmCancel').click();
    const result = await p;
    expect(result).toBe(false);
    expect(document.getElementById('modalDeleteConfirm').classList.contains('hidden')).toBe(true);
  });

  it("uses defaults when no params provided", () => {
    confirmDelete();
    expect(document.getElementById('deleteConfirmTitle').textContent).toBe('Excluir');
    expect(document.getElementById('deleteConfirmMessage').textContent).toBe('Tem certeza que deseja excluir ');
    expect(document.getElementById('deleteConfirmItem').textContent).toBe('');
  });
});

// --- openStatusModal / closeStatusModal ---

describe("openStatusModal", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="statusPvId">' +
      '<span id="statusPvNumber"></span>' +
      '<select id="statusSelect"></select>' +
      '<div id="statusModal" class="hidden"></div>';
  });

  it("sets PV id and number, populates status, shows modal", () => {
    openStatusModal(7, '26007');
    expect(document.getElementById('statusPvId').value).toBe('7');
    expect(document.getElementById('statusPvNumber').textContent).toBe('26007');
    const select = document.getElementById('statusSelect');
    expect(select.children.length).toBeGreaterThan(1);
    expect(select.children[0].value).toBe('');
    expect(document.getElementById('statusModal').classList.contains('hidden')).toBe(false);
  });
});

describe("closeStatusModal", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="statusModal" class="flex"></div>';
  });

  it("hides the status modal", () => {
    closeStatusModal();
    expect(document.getElementById('statusModal').classList.contains('hidden')).toBe(true);
  });
});
