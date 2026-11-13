import { describe, test, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const store = {};
globalThis.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.localStorage = globalThis.sessionStorage;

const VIEW = readFileSync(resolve(import.meta.dir, '../app/Views/sc/list.html'), 'utf-8');
const TOAST = '<div id="toast" class="hidden"><span id="toastIcon"></span><span id="toastMessage"></span><div id="toastProgress" class="hidden"></div></div>';

function mountView() {
  document.body.innerHTML = VIEW + TOAST;
}

describe('SM Email Modal and Photo Attachment', () => {
  beforeEach(() => {
    mountView();
  });

  test('smEmailModal contains dropzone, hidden file input, preview, and counter', () => {
    const dropzone = document.getElementById('smPhotoDropzone');
    const input = document.getElementById('smPhotoInput');
    const preview = document.getElementById('smPhotoPreview');
    const count = document.getElementById('smPhotoCount');
    const errEl = document.getElementById('smPhotoError');

    expect(dropzone).not.toBeNull();
    expect(input).not.toBeNull();
    expect(input.classList.contains('hidden')).toBe(true);
    expect(preview).not.toBeNull();
    expect(count.textContent).toContain('0/10');
    expect(errEl.classList.contains('hidden')).toBe(true);
  });

  test('openSmEmailModal opens modal and populates subject and resets photo count', async () => {
    const { openSmEmailModal, closeSmEmailModal } = await import('../public/js/sc/modal-email.js?v=2');

    const scSample = {
      id: 10,
      numero_sm: '260010',
      site: 'BMADTC',
      equipamento: 'AC 01',
    };

    openSmEmailModal([10], [scSample]);

    const modal = document.getElementById('smEmailModal');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('smEmailSubject').textContent).toContain('260010');
    expect(document.getElementById('smEmailSubject').textContent).toContain('BMADTC');
    expect(document.getElementById('smPhotoCount').textContent).toBe('0/10 fotos selecionadas');

    closeSmEmailModal();
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
