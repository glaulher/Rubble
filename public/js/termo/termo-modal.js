import { showToast } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { getUser, getToken } from '/public/js/core/auth.js';
import { initSignaturePad } from '/public/js/termo/signature-pad.js';
import { generateTermoPdf } from '/public/js/termo/termo-pdf.js';
import { generateQrCodeSvg } from '/public/js/termo/qr-code.js';

export function getTermoPublicUrl(token, origin = '') {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/#/assinar-termo?token=${encodeURIComponent(token)}`;
}

export function buildWhatsAppMessage({ tecnico, entregue_por, codigo, url }) {
  return `Olá ${tecnico}! Segue o Termo de Responsabilidade (${codigo}) referente à retirada de equipamentos/ferramentas com ${entregue_por}.\n\nPor favor, confira os itens e assine digitalmente pelo link abaixo:\n${url}`;
}

export async function openCreateTermoModal(preselectedItems = null) {
  const modalId = 'modalTermoCreate';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const user = getUser();
  const defaultEntregador = user ? (user.nome || user.username) : 'Engemon';

  let technicians = [];
  try {
    const techRes = await fetch('/app/api/index.php?route=inventory&action=technicians').then((r) => r.json());
    if (techRes.success && Array.isArray(techRes.data)) technicians = techRes.data;
  } catch (_) {}

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-200">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Novo Termo de Responsabilidade / Cautela</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Emissão de termo com assinatura digital para retirada de ferramentas</p>
        </div>
        <button type="button" id="btnCloseTermoCreateModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
      </div>

      <form id="formCreateTermo" class="p-6 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Entregue por *</label>
            <input type="text" id="termoEntreguePor" required value="${escapeHtml(defaultEntregador)}"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Ex: Mauro, Engemon" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Técnico Recebedor *</label>
            <input type="text" id="termoTecnicoNome" required list="listTecnicosTermo"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Nome do técnico que está pegando" />
            <datalist id="listTecnicosTermo">
              ${technicians.map((t) => `<option value="${escapeHtml(t)}"></option>`).join('')}
            </datalist>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Documento (CPF / Matrícula)</label>
            <input type="text" id="termoTecnicoDocumento"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Opcional" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">WhatsApp do Técnico (com DDD)</label>
            <input type="tel" id="termoTecnicoTelefone"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Ex: 21999999999" />
          </div>
        </div>

        <!-- SELEÇÃO DE FERRAMENTAS -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Ferramentas / Equipamentos do Termo *</label>
            <button type="button" id="btnAddManualItemBtn" class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer">+ Adicionar Item Avulso</button>
          </div>

          <div id="termoItemsContainer" class="space-y-2 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <!-- Itens inseridos aqui -->
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
          <textarea id="termoObservacoes" rows="2"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Estado de conservação, acessórios inclusos, etc."></textarea>
        </div>

        <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button type="button" id="btnCancelTermoCreate" class="flex-1 bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" id="btnSubmitTermoCreate" class="flex-1 bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-900 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5">
            <span>Emitir Termo e Gerar Link</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const container = document.getElementById('termoItemsContainer');

  function addItemRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs item-row';
    row.innerHTML = `
      <input type="hidden" class="item-inv-id" value="${item.id || ''}" />
      <input type="text" class="item-mat flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2.5 py-1.5 text-xs text-slate-800 dark:text-white" placeholder="Descrição do Material *" required value="${escapeHtml(item.material_nome || '')}" />
      <input type="text" class="item-mod w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2.5 py-1.5 text-xs text-slate-800 dark:text-white" placeholder="Modelo" value="${escapeHtml(item.modelo || '')}" />
      <input type="text" class="item-ser w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono" placeholder="Serial / Placa" value="${escapeHtml(item.serial || '')}" />
      <button type="button" class="btn-remove-item text-red-500 hover:text-red-700 text-base leading-none px-1.5 cursor-pointer">&times;</button>
    `;
    row.querySelector('.btn-remove-item').onclick = () => {
      row.remove();
      if (container.children.length === 0) addItemRow();
    };
    container.appendChild(row);
  }

  if (Array.isArray(preselectedItems) && preselectedItems.length > 0) {
    preselectedItems.forEach((item) => addItemRow(item));
    const firstTecnico = preselectedItems[0].tecnico_nome;
    if (firstTecnico && preselectedItems.every((x) => x.tecnico_nome === firstTecnico)) {
      const entregueEl = document.getElementById('termoEntreguePor');
      if (entregueEl) entregueEl.value = firstTecnico;
    }
  } else if (preselectedItems && typeof preselectedItems === 'object') {
    addItemRow(preselectedItems);
    if (preselectedItems.tecnico_nome) {
      const entregueEl = document.getElementById('termoEntreguePor');
      if (entregueEl) entregueEl.value = preselectedItems.tecnico_nome;
    }
  } else {
    addItemRow();
  }

  document.getElementById('btnAddManualItemBtn').onclick = () => addItemRow();

  const closeModal = () => modal.remove();
  document.getElementById('btnCloseTermoCreateModal').onclick = closeModal;
  document.getElementById('btnCancelTermoCreate').onclick = closeModal;

  document.getElementById('formCreateTermo').onsubmit = async (e) => {
    e.preventDefault();
    const rows = container.querySelectorAll('.item-row');
    const itens = [];
    rows.forEach((r) => {
      const invId = r.querySelector('.item-inv-id').value;
      const mat = r.querySelector('.item-mat').value.trim();
      const mod = r.querySelector('.item-mod').value.trim();
      const ser = r.querySelector('.item-ser').value.trim();
      if (mat) {
        itens.push({
          inventario_id: invId ? parseInt(invId, 10) : null,
          material_nome: mat,
          modelo: mod,
          serial: ser,
        });
      }
    });

    if (itens.length === 0) {
      alert('Adicione pelo menos um item ao termo.');
      return;
    }

    const payload = {
      entregue_por: document.getElementById('termoEntreguePor').value.trim(),
      tecnico_nome: document.getElementById('termoTecnicoNome').value.trim(),
      tecnico_documento: document.getElementById('termoTecnicoDocumento').value.trim(),
      tecnico_telefone: document.getElementById('termoTecnicoTelefone').value.trim(),
      observacoes: document.getElementById('termoObservacoes').value.trim(),
      itens,
    };

    const submitBtn = document.getElementById('btnSubmitTermoCreate');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Salvando...';

    try {
      const token = getToken();
      const res = await fetch('/app/api/index.php?route=termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Erro ao criar termo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Emitir Termo e Gerar Link';
        return;
      }

      closeModal();
      showToast('Termo criado com sucesso!');
      openShareTermoModal({
        ...json.data,
        tecnico_nome: payload.tecnico_nome,
        tecnico_telefone: payload.tecnico_telefone,
        entregue_por: payload.entregue_por,
        itens: payload.itens,
      });
    } catch (err) {
      alert('Erro de conexão com o servidor.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Emitir Termo e Gerar Link';
    }
  };
}

export function openShareTermoModal(termo) {
  const modalId = 'modalTermoShare';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const publicUrl = getTermoPublicUrl(termo.token || termo.token_assinatura);
  const qrSvgDataUrl = generateQrCodeSvg(publicUrl, 180);

  const waMsg = buildWhatsAppMessage({
    tecnico: termo.tecnico_nome,
    entregue_por: termo.entregue_por,
    codigo: termo.codigo,
    url: publicUrl,
  });

  let phone = (termo.tecnico_telefone || '').replace(/\D/g, '');
  if (phone && phone.length <= 11 && !phone.startsWith('55')) {
    phone = '55' + phone;
  }
  const waLink = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMsg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden my-8 animate-in zoom-in-95 duration-200">
      <div class="p-6 text-center border-b border-slate-100 dark:border-slate-700/60 bg-emerald-50/50 dark:bg-emerald-950/20">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
          <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Termo: ${escapeHtml(termo.codigo)}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Escolha como o técnico <strong>${escapeHtml(termo.tecnico_nome)}</strong> irá assinar:</p>
      </div>

      <div class="p-6 space-y-4">
        <!-- OPÇÃO 1: WHATSAPP -->
        <a href="${waLink}" target="_blank" rel="noopener noreferrer"
          class="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition group cursor-pointer">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <div class="text-left">
              <strong class="text-xs text-emerald-950 dark:text-emerald-200 block font-semibold">Enviar por WhatsApp</strong>
              <span class="text-[11px] text-emerald-700 dark:text-emerald-400">Abre com mensagem pronta para o técnico</span>
            </div>
          </div>
          <span class="text-emerald-700 dark:text-emerald-300 text-xs font-bold">&rarr;</span>
        </a>

        <!-- OPÇÃO 2: COPIAR LINK -->
        <div class="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <input type="text" readonly value="${escapeHtml(publicUrl)}" id="shareTermoUrlInput"
            class="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 font-mono outline-none select-all truncate" />
          <button type="button" id="btnCopyTermoUrl" class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer">
            Copiar
          </button>
        </div>

        <!-- OPÇÃO 3: QR CODE LOCAL -->
        <div class="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Ou aponte a câmera do celular para o QR Code:</p>
          <img src="${qrSvgDataUrl}" alt="QR Code Assinatura" class="w-36 h-36 mx-auto rounded-xl shadow-sm border border-slate-200 bg-white p-1" />
        </div>

        <!-- OPÇÃO 4: ASSINAR AGORA NA TELA -->
        <button type="button" id="btnSignNowModalBtn"
          class="w-full bg-blue-300 hover:bg-blue-400 active:bg-blue-500 text-blue-900 py-3 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2">
          <svg class="w-4 h-4 text-blue-900 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>Técnico presente? Assinar agora na tela</span>
        </button>

        <button type="button" id="btnCloseShareModal" class="w-full text-slate-400 hover:text-slate-600 dark:hover:text-white py-2 text-xs transition cursor-pointer">
          Fechar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('btnCloseShareModal').onclick = close;

  document.getElementById('btnCopyTermoUrl').onclick = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      showToast('Link de assinatura copiado para a área de transferência!');
    }).catch(() => {
      showToast('Não foi possível copiar automaticamente. Selecione e copie o link.');
    });
  };

  document.getElementById('btnSignNowModalBtn').onclick = () => {
    close();
    const token = termo.token || termo.token_assinatura;
    window.location.hash = `#/assinar-termo?token=${encodeURIComponent(token)}`;
  };
}

export async function openTermosListModal() {
  const modalId = 'modalTermosHistory';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in duration-200">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Termos de Cautela Emitidos</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Histórico de cautelas, assinaturas digitais e baixas de ferramentas</p>
        </div>
        <button type="button" id="btnCloseTermosHistoryModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
      </div>

      <div class="p-6">
        <div id="termosHistoryLoading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p class="text-xs text-slate-400">Carregando termos...</p>
        </div>

        <div id="termosHistoryContainer" class="hidden max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
          <!-- Lista injetada aqui -->
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('btnCloseTermosHistoryModal').onclick = close;

  try {
    const token = getToken();
    const currentUser = getUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    const res = await fetch('/app/api/index.php?route=termo&limit=50', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    document.getElementById('termosHistoryLoading').classList.add('hidden');
    const container = document.getElementById('termosHistoryContainer');
    container.classList.remove('hidden');

    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      container.innerHTML = '<p class="text-center text-slate-400 text-xs py-8">Nenhum termo de cautela registrado até o momento.</p>';
      return;
    }

    container.innerHTML = json.data.map((t) => {
      let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Pendente</span>';
      if (t.status === 'assinado') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Assinado</span>';
      } else if (t.status === 'devolvido') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Devolvido</span>';
      } else if (t.status === 'devolvido_parcial') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Devolvido Parcial</span>';
      }

      const itemCount = (t.itens || []).length;
      return `
        <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-750 px-2 rounded-xl transition">
          <div>
            <div class="flex items-center gap-2">
              <strong class="font-mono font-bold text-slate-900 dark:text-white">${escapeHtml(t.codigo)}</strong>
              ${statusBadge}
              <span class="text-slate-400 text-[11px]">${escapeHtml(t.created_at ? t.created_at.substring(0, 10) : '')}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 mt-1">
              <strong>${escapeHtml(t.tecnico_nome)}</strong> recebeu de <em>${escapeHtml(t.entregue_por)}</em> &bull; ${itemCount} ferramenta(s)
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button type="button" class="btn-share-termo px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold cursor-pointer text-xs flex items-center gap-1.5" data-termo='${escapeHtml(JSON.stringify(t))}'>
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Link</span>
            </button>
            <button type="button" class="btn-pdf-termo px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer text-xs flex items-center gap-1.5" data-id="${t.id}">
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>PDF</span>
            </button>
            ${t.status === 'assinado' || t.status === 'devolvido_parcial' ? `
              <button type="button" class="btn-devolver-termo px-2.5 py-1.5 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold cursor-pointer text-xs flex items-center gap-1.5" data-id="${t.id}">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
                <span>Devolver</span>
              </button>
            ` : ''}
            ${isAdmin ? `
              <button type="button" class="btn-delete-termo px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-300 font-semibold cursor-pointer text-xs flex items-center gap-1.5 transition" data-id="${t.id}" title="Excluir Termo">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                <span>Excluir</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-share-termo').forEach((b) => {
      b.onclick = () => {
        const data = JSON.parse(b.dataset.termo);
        openShareTermoModal(data);
      };
    });

    container.querySelectorAll('.btn-pdf-termo').forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.id;
        const res = await fetch(`/app/api/index.php?route=termo&action=get&id=${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const detail = await res.json();
        if (detail.success) {
          generateTermoPdf(detail.data);
        }
      };
    });

    container.querySelectorAll('.btn-devolver-termo').forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.id;
        const res = await fetch(`/app/api/index.php?route=termo&action=get&id=${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const detail = await res.json();
        if (detail.success) {
          close();
          openDevolucaoModal(detail.data);
        }
      };
    });

    container.querySelectorAll('.btn-delete-termo').forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.id;
        if (!confirm('Deseja realmente excluir este termo de responsabilidade? Esta ação removerá o termo do histórico.')) {
          return;
        }
        try {
          const res = await fetch(`/app/api/index.php?route=termo&id=${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const result = await res.json();
          if (result.success) {
            showToast('Termo excluído com sucesso.');
            openTermosListModal();
            if (typeof window.initInventoryList === 'function') {
              window.initInventoryList();
            }
          } else {
            alert(result.message || 'Erro ao excluir termo.');
          }
        } catch (e) {
          alert('Erro ao excluir termo.');
        }
      };
    });
  } catch (_) {
    document.getElementById('termosHistoryLoading').innerHTML = '<p class="text-red-500 text-xs">Erro ao carregar histórico de termos.</p>';
  }
}

export function openDevolucaoModal(termo) {
  const modalId = 'modalTermoDevolucao';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const pendingItems = (termo.itens || []).filter((i) => i.status_item === 'em_posse');

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden my-8 animate-in zoom-in-95 duration-200">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Registrar Devolução: ${escapeHtml(termo.codigo)}</h3>
          <p class="text-xs text-slate-500">Técnico: ${escapeHtml(termo.tecnico_nome)}</p>
        </div>
        <button type="button" id="btnCloseDevolucaoModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
      </div>

      <form id="formDevolucaoTermo" class="p-6 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Selecione os itens devolvidos:</label>
          <div class="space-y-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
            ${pendingItems.map((item) => `
              <label class="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" name="item_devolucao" value="${item.id}" checked class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span class="font-medium">${escapeHtml(item.material_nome)}</span>
                <span class="font-mono text-slate-400 text-[11px]">(${escapeHtml(item.serial || 'N/A')})</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Devolução</label>
          <input type="date" id="devolucaoData" required value="${new Date().toISOString().substring(0, 10)}"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-xs" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações de Devolução</label>
          <textarea id="devolucaoObs" rows="2"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-xs" placeholder="Estado de conservação, integridade, etc."></textarea>
        </div>

        <div class="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button type="button" id="btnCancelDevolucao" class="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" id="btnSubmitDevolucao" class="flex-1 bg-emerald-300 hover:bg-emerald-400 text-emerald-900 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
            Confirmar Baixa
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('btnCloseDevolucaoModal').onclick = close;
  document.getElementById('btnCancelDevolucao').onclick = close;

  document.getElementById('formDevolucaoTermo').onsubmit = async (e) => {
    e.preventDefault();
    const checked = Array.from(modal.querySelectorAll('input[name="item_devolucao"]:checked')).map((c) => parseInt(c.value, 10));
    if (checked.length === 0) {
      alert('Selecione pelo menos um item para devolver.');
      return;
    }

    const payload = {
      termo_id: termo.id,
      item_ids: checked,
      data_devolucao: document.getElementById('devolucaoData').value,
      observacoes: document.getElementById('devolucaoObs').value.trim(),
    };

    const submitBtn = document.getElementById('btnSubmitDevolucao');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';

    try {
      const token = getToken();
      const res = await fetch('/app/api/index.php?route=termo&action=devolver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Erro ao registrar devolução.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Baixa';
        return;
      }

      close();
      showToast('Devolução registrada com sucesso!');
      if (typeof window.initInventoryList === 'function') {
        window.initInventoryList();
      }
    } catch (_) {
      alert('Erro ao conectar ao servidor.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Baixa';
    }
  };
}
