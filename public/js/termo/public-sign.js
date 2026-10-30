import { initSignaturePad } from '/public/js/termo/signature-pad.js?v=28';
import { generateTermoPdf } from '/public/js/termo/termo-pdf.js?v=28';
import { escapeHtml } from '/public/js/core/utils.js';

let signaturePadInstance = null;
let currentTermoData = null;

export function extractTokenFromHash() {
  const hash = window.location.hash || '';
  const searchIndex = hash.indexOf('?');
  if (searchIndex !== -1) {
    const params = new URLSearchParams(hash.substring(searchIndex + 1));
    if (params.has('token')) {
      return params.get('token');
    }
  }

  // Fallback para query string padrão da URL
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('token') || '';
}

export async function initPublicSign() {
  const loadingEl = document.getElementById('termoLoadingState');
  const errorEl = document.getElementById('termoErrorState');
  const successEl = document.getElementById('termoSuccessState');
  const signEl = document.getElementById('termoSignState');

  function showOnly(el) {
    [loadingEl, errorEl, successEl, signEl].forEach((e) => {
      if (e) e.classList.add('hidden');
    });
    if (el) el.classList.remove('hidden');
  }

  const token = extractTokenFromHash();
  if (!token) {
    showOnly(errorEl);
    const msg = document.getElementById('termoErrorMessage');
    if (msg) msg.textContent = 'Token de assinatura não fornecido na URL.';
    return;
  }

  try {
    const res = await fetch(`/app/api/index.php?route=termo&action=public-view&token=${encodeURIComponent(token)}`);
    const json = await res.json();

    if (!json.success) {
      showOnly(errorEl);
      const title = document.getElementById('termoErrorTitle');
      const msg = document.getElementById('termoErrorMessage');
      if (title && res.status === 410) title.textContent = 'Link Expirado';
      if (msg) msg.textContent = json.message || 'Link inválido ou indisponível.';
      return;
    }

    currentTermoData = json.data;

    if (json.already_signed) {
      renderSuccessState(currentTermoData);
      showOnly(successEl);
      return;
    }

    renderSignState(currentTermoData, token);
    showOnly(signEl);
  } catch (err) {
    showOnly(errorEl);
    const msg = document.getElementById('termoErrorMessage');
    if (msg) msg.textContent = 'Erro ao conectar ao servidor. Tente novamente mais tarde.';
  }
}

function renderSuccessState(termo) {
  const codEl = document.getElementById('successCodigo');
  const tecEl = document.getElementById('successTecnico');
  const entEl = document.getElementById('successEntreguePor');
  const dateEl = document.getElementById('successAssinadoEm');
  const imgEl = document.getElementById('successSignatureImg');
  const pdfBtn = document.getElementById('btnDownloadPdfSuccess');

  if (codEl) codEl.textContent = termo.codigo;
  if (tecEl) tecEl.textContent = termo.tecnico_nome;
  if (entEl) entEl.textContent = termo.entregue_por;
  if (dateEl && termo.assinado_em) dateEl.textContent = 'Assinado digitalmente em ' + termo.assinado_em;
  if (imgEl && termo.assinatura_imagem) imgEl.src = termo.assinatura_imagem;

  if (pdfBtn) {
    pdfBtn.onclick = () => {
      generateTermoPdf(termo);
    };
  }
}

function renderSignState(termo, token) {
  const badge = document.getElementById('signCodigoBadge');
  const entEl = document.getElementById('signEntreguePor');
  const tecEl = document.getElementById('signTecnicoNome');
  const listEl = document.getElementById('signItemsList');
  const canvas = document.getElementById('signatureCanvas');
  const placeholder = document.getElementById('signaturePlaceholder');
  const clearBtn = document.getElementById('btnClearSignature');
  const confirmBtn = document.getElementById('btnConfirmSignature');

  if (badge) badge.textContent = termo.codigo;
  if (entEl) entEl.textContent = termo.entregue_por;
  if (tecEl) tecEl.textContent = termo.tecnico_nome + (termo.tecnico_documento ? ` (${termo.tecnico_documento})` : '');

  if (listEl) {
    listEl.innerHTML = '';
    (termo.itens || []).forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs shadow-xs';
      card.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">${index + 1}</span>
          <div>
            <strong class="text-slate-900 dark:text-white block font-semibold">${escapeHtml(item.material_nome)}</strong>
            <span class="text-slate-600 dark:text-slate-400 text-[11px]">${escapeHtml(item.modelo || '-')}</span>
          </div>
        </div>
        <span class="font-mono bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold">${escapeHtml(item.serial || 'N/A')}</span>
      `;
      listEl.appendChild(card);
    });
  }

  if (canvas) {
    if (signaturePadInstance) {
      signaturePadInstance.destroy();
    }
    signaturePadInstance = initSignaturePad(canvas);

    // Ajustar tamanho com base na tela
    setTimeout(() => {
      if (signaturePadInstance) signaturePadInstance.resizeCanvas();
    }, 100);

    const onStart = () => {
      if (placeholder) placeholder.classList.add('hidden');
    };
    canvas.addEventListener('touchstart', onStart);
    canvas.addEventListener('mousedown', onStart);

    if (clearBtn) {
      clearBtn.onclick = () => {
        if (signaturePadInstance) signaturePadInstance.clear();
        if (placeholder) placeholder.classList.remove('hidden');
      };
    }
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (!signaturePadInstance || signaturePadInstance.isEmpty()) {
        alert('Por favor, desenhe sua assinatura na tela antes de confirmar.');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Gravando assinatura...';

      try {
        const signatureBase64 = signaturePadInstance.toDataURL('image/png');
        const res = await fetch('/app/api/index.php?route=termo&action=public-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            signature: signatureBase64,
          }),
        });
        const json = await res.json();

        if (!json.success) {
          alert(json.message || 'Erro ao salvar assinatura.');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Confirmar e Assinar Termo</span>';
          return;
        }

        // Sucesso: atualizar objeto local e renderizar sucesso
        termo.status = 'assinado';
        termo.assinatura_imagem = signatureBase64;
        termo.assinado_em = json.data?.assinado_em || new Date().toLocaleString();

        const successEl = document.getElementById('termoSuccessState');
        const signEl = document.getElementById('termoSignState');
        renderSuccessState(termo);
        if (signEl) signEl.classList.add('hidden');
        if (successEl) successEl.classList.remove('hidden');
      } catch (e) {
        alert('Erro ao enviar assinatura. Verifique sua conexão.');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Confirmar e Assinar Termo</span>';
      }
    };
  }
}
