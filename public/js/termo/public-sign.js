import { initSignaturePad } from '/public/js/termo/signature-pad.js?v=30';
import { generateTermoPdf } from '/public/js/termo/termo-pdf.js?v=30';
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

function renderTermoItems(container, badgeEl, itens) {
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(itens) ? itens : [];

  if (badgeEl) {
    badgeEl.textContent = `${list.length} ${list.length === 1 ? 'item' : 'itens'}`;
  }

  if (list.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Nenhum equipamento/ferramenta relacionado neste termo.</p>';
    return;
  }

  list.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 text-xs shadow-xs gap-3';
    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">${index + 1}</span>
        <div class="min-w-0 flex-1">
          <strong class="text-slate-900 block font-semibold text-sm truncate">${escapeHtml(item.material_nome || '-')}</strong>
          <div class="text-slate-500 text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            ${item.modelo ? `<span>Modelo: <strong class="text-slate-700 font-medium">${escapeHtml(item.modelo)}</strong></span>` : ''}
          </div>
        </div>
      </div>
      <div class="shrink-0 text-right">
        <span class="font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 text-xs font-semibold block">${escapeHtml(item.serial || 'S/N')}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSuccessState(termo) {
  const codEl = document.getElementById('successCodigo');
  const tecEl = document.getElementById('successTecnico');
  const entEl = document.getElementById('successEntreguePor');
  const dateEl = document.getElementById('successAssinadoEm');
  const imgEl = document.getElementById('successSignatureImg');
  const pdfBtn = document.getElementById('btnDownloadPdfSuccess');
  const itemsContainer = document.getElementById('successItemsList');
  const badgeEl = document.getElementById('successItemsCountBadge');
  const obsContainer = document.getElementById('successObservacoesContainer');
  const obsText = document.getElementById('successObservacoesText');

  if (codEl) codEl.textContent = termo.codigo;
  if (tecEl) tecEl.textContent = termo.tecnico_nome + (termo.tecnico_documento ? ` (${termo.tecnico_documento})` : '');
  if (entEl) entEl.textContent = termo.entregue_por;
  if (dateEl && termo.assinado_em) dateEl.textContent = 'Assinado digitalmente em ' + termo.assinado_em;
  if (imgEl && termo.assinatura_imagem) imgEl.src = termo.assinatura_imagem;

  // Renderizar itens sob custódia
  renderTermoItems(itemsContainer, badgeEl, termo.itens);

  // Observações se existirem
  if (obsContainer && obsText) {
    if (termo.observacoes && termo.observacoes.trim()) {
      obsText.textContent = termo.observacoes.trim();
      obsContainer.classList.remove('hidden');
    } else {
      obsContainer.classList.add('hidden');
    }
  }

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
  const badgeEl = document.getElementById('signItemsCountBadge');
  const obsContainer = document.getElementById('signObservacoesContainer');
  const obsText = document.getElementById('signObservacoesText');
  const canvas = document.getElementById('signatureCanvas');
  const placeholder = document.getElementById('signaturePlaceholder');
  const clearBtn = document.getElementById('btnClearSignature');
  const confirmBtn = document.getElementById('btnConfirmSignature');

  if (badge) badge.textContent = termo.codigo;
  if (entEl) entEl.textContent = termo.entregue_por;
  if (tecEl) tecEl.textContent = termo.tecnico_nome + (termo.tecnico_documento ? ` (${termo.tecnico_documento})` : '');

  // Renderizar lista de ferramentas e materiais
  renderTermoItems(listEl, badgeEl, termo.itens);

  // Observações se existirem
  if (obsContainer && obsText) {
    if (termo.observacoes && termo.observacoes.trim()) {
      obsText.textContent = termo.observacoes.trim();
      obsContainer.classList.remove('hidden');
    } else {
      obsContainer.classList.add('hidden');
    }
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
