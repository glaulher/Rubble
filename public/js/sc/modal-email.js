// public/js/sc/modal-email.js

import { showToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';

const MAX_PHOTOS     = 10;
const MAX_SIZE_KB   = 500;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

let _smEmailIds  = [];
let _smEmailData = [];

export function openSmEmailModal(ids, scs) {
  _smEmailIds  = ids;
  _smEmailData = scs;

  const modal   = document.getElementById('smEmailModal');
  const subject = document.getElementById('smEmailSubject');
  const preview = document.getElementById('smPhotoPreview');
  const count   = document.getElementById('smPhotoCount');
  const errEl   = document.getElementById('smPhotoError');
  const input   = document.getElementById('smPhotoInput');

  if (!modal) return;

  if (scs.length === 1) {
    const sc = scs[0];
    let subj = `SM: ${sc.numero_sm || '-'} - ${sc.site || '-'} - Solicitação de Materiais`;
    const equip = sc.equipamento || sc.equipamento_texto || '';
    if (equip) subj += ` - ${equip}`;
    if (sc.numero_pv) subj += ` - PV ${sc.numero_pv}`;
    if (subject) subject.textContent = subj;
  } else {
    const nums = scs.map((s) => s.numero_sm || '-').join(', ');
    if (subject) subject.textContent = `SMs: ${nums} - Solicitação de Materiais (lote)`;
  }

  if (preview) preview.innerHTML = '';
  if (count) count.textContent = '0/10 fotos selecionadas';
  if (errEl) errEl.classList.add('hidden');
  if (input) input.value = '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeSmEmailModal() {
  const modal = document.getElementById('smEmailModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  _smEmailIds  = [];
  _smEmailData = [];
}

export function initSmEmailModal(onSuccess) {
  const input     = document.getElementById('smPhotoInput');
  const preview   = document.getElementById('smPhotoPreview');
  const count     = document.getElementById('smPhotoCount');
  const errEl     = document.getElementById('smPhotoError');
  const btnSend   = document.getElementById('btnSendSmEmail');
  const btnCancel = document.getElementById('btnCancelSmEmail');
  const modal     = document.getElementById('smEmailModal');

  if (!modal) return;

  if (btnCancel) {
    btnCancel.addEventListener('click', closeSmEmailModal);
  }

  if (input) {
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (errEl) errEl.classList.add('hidden');

      let error = '';
      if (files.length > MAX_PHOTOS) {
        error = `Máximo de ${MAX_PHOTOS} fotos permitidas.`;
      } else {
        for (const f of files) {
          if (f.size > MAX_SIZE_BYTES) {
            error = `A foto "${f.name}" excede o limite de ${MAX_SIZE_KB} KB.`;
            break;
          }
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            error = `A foto "${f.name}" não é um formato aceito (JPG, PNG, WEBP).`;
            break;
          }
        }
      }

      if (error) {
        if (errEl) {
          errEl.textContent = error;
          errEl.classList.remove('hidden');
        }
        input.value = '';
        if (preview) preview.innerHTML = '';
        if (count) count.textContent = '0/10 fotos selecionadas';
        return;
      }

      if (count) {
        count.textContent = `${files.length}/${MAX_PHOTOS} fotos selecionadas`;
      }
      if (preview) {
        preview.innerHTML = files
          .map(
            (f) =>
              `<span class="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="truncate max-w-[120px]">${f.name}</span>
              </span>`
          )
          .join('');
      }
    });
  }

  if (btnSend) {
    btnSend.addEventListener('click', async () => {
      if (_smEmailIds.length === 0) {
        showToast('Nenhuma solicitação selecionada para envio', 'error');
        return;
      }

      const files = input ? Array.from(input.files || []) : [];
      const isBatch = _smEmailIds.length > 1;
      const action = isBatch ? 'send-batch-email' : 'send-email';

      const formData = new FormData();
      if (isBatch) {
        _smEmailIds.forEach((id) => formData.append('ids[]', id));
      } else {
        formData.append('id', _smEmailIds[0]);
      }
      files.forEach((f) => formData.append('fotos[]', f));

      btnSend.disabled = true;
      const origText = btnSend.textContent;
      btnSend.textContent = 'Enviando...';
      showToast('Enviando e-mail da solicitação...', 'loading');

      try {
        const res = await apiFetch(`/app/api/index.php?route=sc&action=${action}`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          showToast('E-mail enviado com sucesso!', 'success');
          closeSmEmailModal();
          if (typeof onSuccess === 'function') {
            await onSuccess();
          }
        } else {
          showToast(data.message || 'Erro ao enviar e-mail', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Erro ao enviar e-mail', 'error');
      } finally {
        btnSend.disabled = false;
        btnSend.textContent = origText;
      }
    });
  }
}
