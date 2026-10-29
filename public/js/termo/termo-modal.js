import { showToast } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { getUser } from '/public/js/core/auth.js';
import { initSignaturePad } from '/public/js/termo/signature-pad.js';
import { generateTermoPdf } from '/public/js/termo/termo-pdf.js';

export function getTermoPublicUrl(token, origin = '') {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/#/assinar-termo?token=${encodeURIComponent(token)}`;
}

export function buildWhatsAppMessage({ tecnico, entregue_por, codigo, url }) {
  return `Olá ${tecnico}! Segue o Termo de Responsabilidade (${codigo}) referente à retirada de equipamentos/ferramentas com ${entregue_por}.\n\nPor favor, confira os itens e assine digitalmente pelo link abaixo:\n${url}`;
}

export async function openCreateTermoModal(preselectedItem = null) {
  const modalId = 'modalTermoCreate';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const user = getUser();
  const defaultEntregador = user ? (user.nome || user.username) : 'Engemon';

  // Buscar técnicos e itens do inventário disponíveis
  let technicians = [];
  let inventoryItems = [];

  try {
    const [techRes, invRes] = await Promise.all([
      fetch('/app/api/index.php?route=inventory&action=technicians').then((r) => r.json()),
      fetch('/app/api/index.php?route=inventory&limit=100&status=em_posse').then((r) => r.json()),
    ]);
    if (techRes.success && Array.isArray(techRes.data)) technicians = techRes.data;
    if (invRes.success && Array.isArray(invRes.data)) inventoryItems = invRes.data;
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
        <button type="button" id="btnCloseTermoCreateModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none">&times;</button>
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
            <button type="button" id="btnAddManualItemBtn" class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">+ Adicionar Item Avulso</button>
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
      <button type="button" class="btn-remove-item text-red-500 hover:text-red-700 text-base leading-none px-1.5">&times;</button>
    `;
    row.querySelector('.btn-remove-item').onclick = () => {
      row.remove();
      if (container.children.length === 0) addItemRow();
    };
    container.appendChild(row);
  }

  // Pre-popular item se fornecido
  if (preselectedItem) {
    addItemRow(preselectedItem);
  } else {
    addItemRow();
  }

  document.getElementById('btnAddManualItemBtn').onclick = () => addItemRow();

  const closeModal = () => modal.remove();
  document.getElementById('btnCloseTermoCreateModal').onclick = closeModal;
  document.getElementById('btnCancelTermoCreate').onclick = closeModal;

  // Submit do formulário
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
      const res = await fetch('/app/api/index.php?route=termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}`,
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

  const publicUrl = getTermoPublicUrl(termo.token);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`;
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
        <div class="w-12 h-12 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">
          ✓
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Termo Gerado: ${escapeHtml(termo.codigo)}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Escolha como o técnico <strong>${escapeHtml(termo.tecnico_nome)}</strong> irá assinar:</p>
      </div>

      <div class="p-6 space-y-4">
        <!-- OPÇÃO 1: WHATSAPP -->
        <a href="${waLink}" target="_blank" rel="noopener noreferrer"
          class="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition group cursor-pointer">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold text-lg">📱</div>
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

        <!-- OPÇÃO 3: QR CODE -->
        <div class="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Ou aponte a câmera do celular para o QR Code:</p>
          <img src="${qrUrl}" alt="QR Code Assinatura" class="w-36 h-36 mx-auto rounded-xl shadow-sm border border-slate-200 bg-white p-1" />
        </div>

        <!-- OPÇÃO 4: ASSINAR AGORA NA TELA -->
        <button type="button" id="btnSignNowModalBtn"
          class="w-full bg-blue-300 hover:bg-blue-400 active:bg-blue-500 text-blue-900 py-3 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2">
          <span>✍️ Técnico está presente? Assinar aqui agora</span>
        </button>

        <button type="button" id="btnCloseShareModal" class="w-full text-slate-400 hover:text-slate-600 dark:hover:text-white py-2 text-xs transition">
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
    window.location.hash = `#/assinar-termo?token=${encodeURIComponent(termo.token)}`;
  };
}
