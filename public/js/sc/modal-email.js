// public/js/sc/modal-email.js

import { showToast } from '/public/js/core/dom.js';
import { apiFetch } from '/public/js/core/auth.js';
import { escapeHtml } from '/public/js/core/utils.js';

const MAX_PHOTOS     = 10;
const MAX_SIZE_KB   = 500;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

let _smEmailIds     = [];
let _smEmailData    = [];
let _selectedFiles  = [];

function isImageFile(f) {
  if (!f) return false;
  const ext = (f.name || '').split('.').pop()?.toLowerCase();
  const validExts = ['jpg', 'jpeg', 'png', 'webp'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/pjpeg',
    'image/x-png',
    'image/jfif',
  ];
  return validExts.includes(ext) || (Boolean(f.type) && validMimes.includes(f.type));
}

async function compressImageIfNeeded(file, maxKb = MAX_SIZE_KB) {
  if (file.size <= maxKb * 1024) {
    return file;
  }

  if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const baseName = file.name.replace(/\.[^.]+$/, '');
              const newFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
              resolve(newFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function openSmEmailModal(ids, scs) {
  _smEmailIds     = ids;
  _smEmailData    = scs;
  _selectedFiles  = [];

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
  if (count) count.textContent = `0/${MAX_PHOTOS} fotos selecionadas`;
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
  _smEmailIds     = [];
  _smEmailData    = [];
  _selectedFiles  = [];
}

export function initSmEmailModal(onSuccess) {
  const dropzone  = document.getElementById('smPhotoDropzone');
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

  // Previne comportamento padrão de arrasto no modal para evitar navegação do navegador
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
    modal.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  function renderPhotoPreview() {
    if (count) {
      count.textContent = `${_selectedFiles.length}/${MAX_PHOTOS} fotos selecionadas`;
    }
    if (preview) {
      preview.innerHTML = _selectedFiles
        .map(
          (f, idx) =>
            `<span class="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 pl-2.5 pr-1.5 py-1 rounded-lg border border-slate-200">
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span class="truncate max-w-[130px]" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
              <span class="text-[10px] text-slate-400 shrink-0">(${Math.max(1, Math.round(f.size / 1024))} KB)</span>
              <button type="button" class="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer" data-remove-photo="${idx}" aria-label="Remover foto">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </span>`
        )
        .join('');
    }
  }

  async function handleFilesSelected(incomingFiles) {
    if (errEl) errEl.classList.add('hidden');
    let error = '';

    if (!incomingFiles || incomingFiles.length === 0) return;

    if (_selectedFiles.length + incomingFiles.length > MAX_PHOTOS) {
      error = `Limite de ${MAX_PHOTOS} fotos excedido. Você já selecionou ${_selectedFiles.length}.`;
      if (errEl) {
        errEl.textContent = error;
        errEl.classList.remove('hidden');
      }
      return;
    }

    for (const f of incomingFiles) {
      if (!isImageFile(f)) {
        error = `O arquivo "${f.name}" não é uma imagem aceita (JPG, PNG, WEBP).`;
        break;
      }
    }

    if (error) {
      if (errEl) {
        errEl.textContent = error;
        errEl.classList.remove('hidden');
      }
      return;
    }

    // Processa compressão em background se necessário
    for (const f of incomingFiles) {
      try {
        const processed = await compressImageIfNeeded(f, MAX_SIZE_KB);
        if (processed.size > MAX_SIZE_BYTES) {
          error = `A foto "${f.name}" excede ${MAX_SIZE_KB} KB.`;
          break;
        }
        _selectedFiles.push(processed);
      } catch {
        _selectedFiles.push(f);
      }
    }

    if (error && errEl) {
      errEl.textContent = error;
      errEl.classList.remove('hidden');
    }

    if (input) input.value = '';
    renderPhotoPreview();
  }

  if (preview) {
    preview.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-photo]');
      if (btn) {
        const idx = Number(btn.dataset.removePhoto);
        if (!Number.isNaN(idx) && idx >= 0 && idx < _selectedFiles.length) {
          _selectedFiles.splice(idx, 1);
          renderPhotoPreview();
        }
      }
    });
  }

  if (dropzone && input) {
    dropzone.addEventListener('click', () => {
      input.click();
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-sky-500', 'bg-sky-50');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-sky-500', 'bg-sky-50');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        await handleFilesSelected(Array.from(dt.files));
      }
    });
  }

  if (input) {
    input.addEventListener('change', async () => {
      const rawFiles = Array.from(input.files || []);
      await handleFilesSelected(rawFiles);
    });
  }

  if (btnSend) {
    btnSend.addEventListener('click', async () => {
      if (_smEmailIds.length === 0) {
        showToast('Nenhuma solicitação selecionada para envio', 'error');
        return;
      }

      const isBatch = _smEmailIds.length > 1;
      const action = isBatch ? 'send-batch-email' : 'send-email';

      const formData = new FormData();
      if (isBatch) {
        _smEmailIds.forEach((id) => formData.append('ids[]', id));
      } else {
        formData.append('id', _smEmailIds[0]);
      }
      _selectedFiles.forEach((f) => formData.append('fotos[]', f));

      btnSend.disabled = true;
      const origText = btnSend.textContent;
      btnSend.textContent = 'Enviando...';
      showToast('Enviando e-mail da solicitação...', 'loading');

      try {
        const res = await apiFetch(`/app/api/index.php?route=sc&action=${action}`, {
          method: 'POST',
          body: formData,
        });

        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          const cleanMsg = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          throw new Error(cleanMsg || `Erro no servidor (status ${res.status})`);
        }

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
