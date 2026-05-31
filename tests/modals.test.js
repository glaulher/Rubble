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

function openDeleteModal(id, pvNumber) {
  document.getElementById('deletePvId').value = id;
  document.getElementById('deletePvNumber').textContent = pvNumber;
  showModal('deleteModal');
}

function closeDeleteModal() {
  hideModal('deleteModal');
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

// --- openDeleteModal / closeDeleteModal ---

describe("openDeleteModal", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="deletePvId">' +
      '<span id="deletePvNumber"></span>' +
      '<div id="deleteModal" class="hidden"></div>';
  });

  it("sets PV id and number, shows modal", () => {
    openDeleteModal(42, '26001');
    expect(document.getElementById('deletePvId').value).toBe('42');
    expect(document.getElementById('deletePvNumber').textContent).toBe('26001');
    expect(document.getElementById('deleteModal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('deleteModal').classList.contains('flex')).toBe(true);
  });
});

describe("closeDeleteModal", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="deleteModal" class="flex"></div>';
  });

  it("hides the delete modal", () => {
    closeDeleteModal();
    expect(document.getElementById('deleteModal').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('deleteModal').classList.contains('flex')).toBe(false);
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
