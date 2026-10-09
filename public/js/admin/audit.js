import { showToast } from '/public/js/core/dom.js';
import { escapeHtml } from '/public/js/core/utils.js';
import { apiFetch } from '/public/js/core/auth.js';
import { downloadCSV } from '/public/js/utils/csv.js';

let auditPage = 0;
const PAGE_SIZE = 20;
let auditTotal = 0;

let accessPage = 0;
let accessTotal = 0;

let searchTimeout = null;

export async function initAdminAudit() {
  auditPage = 0;
  accessPage = 0;

  setupTabs();
  setupAuditEvents();
  setupAccessEvents();
  setupModalEvents();

  document.getElementById('btnRefreshAdminAudit')?.addEventListener('click', () => {
    loadStats();
    loadAuditLogs();
    loadAccessLogs();
    loadActiveSessions();
    showToast('Dados atualizados com sucesso', 'success');
  });

  document.getElementById('btnRefreshSessions')?.addEventListener('click', () => {
    loadActiveSessions();
  });

  // Carregamento inicial
  await loadStats();
  await loadAuditLogs();
  await loadAccessLogs();
  await loadActiveSessions();
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach((b) => {
        b.classList.remove('active', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
        b.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      });

      btn.classList.add('active', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
      btn.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');

      document.getElementById('tabContentAudit')?.classList.add('hidden');
      document.getElementById('tabContentAccess')?.classList.add('hidden');
      document.getElementById('tabContentSessions')?.classList.add('hidden');

      if (tab === 'audit') {
        document.getElementById('tabContentAudit')?.classList.remove('hidden');
      } else if (tab === 'access') {
        document.getElementById('tabContentAccess')?.classList.remove('hidden');
      } else if (tab === 'sessions') {
        document.getElementById('tabContentSessions')?.classList.remove('hidden');
        loadActiveSessions();
      }
    });
  });
}

function setupAuditEvents() {
  const moduleSelect = document.getElementById('filterAuditModule');
  const actionSelect = document.getElementById('filterAuditAction');
  const dateFrom = document.getElementById('filterAuditDateFrom');
  const dateTo = document.getElementById('filterAuditDateTo');
  const searchInput = document.getElementById('filterAuditSearch');
  const btnClear = document.getElementById('btnAuditClear');
  const btnExport = document.getElementById('btnAuditExportCsv');
  const btnPrev = document.getElementById('btnAuditPrevPage');
  const btnNext = document.getElementById('btnAuditNextPage');

  const triggerSearch = () => {
    auditPage = 0;
    loadAuditLogs();
  };

  moduleSelect?.addEventListener('change', triggerSearch);
  actionSelect?.addEventListener('change', triggerSearch);
  dateFrom?.addEventListener('change', triggerSearch);
  dateTo?.addEventListener('change', triggerSearch);

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(triggerSearch, 300);
  });

  btnClear?.addEventListener('click', () => {
    if (moduleSelect) moduleSelect.value = '';
    if (actionSelect) actionSelect.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (searchInput) searchInput.value = '';
    auditPage = 0;
    loadAuditLogs();
  });

  btnPrev?.addEventListener('click', () => {
    if (auditPage > 0) {
      auditPage--;
      loadAuditLogs();
    }
  });

  btnNext?.addEventListener('click', () => {
    if ((auditPage + 1) * PAGE_SIZE < auditTotal) {
      auditPage++;
      loadAuditLogs();
    }
  });

  btnExport?.addEventListener('click', exportAuditCsv);

  // Delegação de cliques na tabela de auditoria
  document.getElementById('auditTableBody')?.addEventListener('click', (e) => {
    const btnDetail = e.target.closest('[data-action="view-detail"]');
    if (btnDetail) {
      const id = parseInt(btnDetail.dataset.id);
      openAuditDetail(id);
    }
  });
}

function setupAccessEvents() {
  const eventSelect = document.getElementById('filterAccessEvent');
  const dateFrom = document.getElementById('filterAccessDateFrom');
  const dateTo = document.getElementById('filterAccessDateTo');
  const searchInput = document.getElementById('filterAccessSearch');
  const btnClear = document.getElementById('btnAccessClear');
  const btnExport = document.getElementById('btnAccessExportCsv');
  const btnPrev = document.getElementById('btnAccessPrevPage');
  const btnNext = document.getElementById('btnAccessNextPage');

  const triggerSearch = () => {
    accessPage = 0;
    loadAccessLogs();
  };

  eventSelect?.addEventListener('change', triggerSearch);
  dateFrom?.addEventListener('change', triggerSearch);
  dateTo?.addEventListener('change', triggerSearch);

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(triggerSearch, 300);
  });

  btnClear?.addEventListener('click', () => {
    if (eventSelect) eventSelect.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (searchInput) searchInput.value = '';
    accessPage = 0;
    loadAccessLogs();
  });

  btnPrev?.addEventListener('click', () => {
    if (accessPage > 0) {
      accessPage--;
      loadAccessLogs();
    }
  });

  btnNext?.addEventListener('click', () => {
    if ((accessPage + 1) * PAGE_SIZE < accessTotal) {
      accessPage++;
      loadAccessLogs();
    }
  });

  btnExport?.addEventListener('click', exportAccessCsv);
}

function setupModalEvents() {
  const modal = document.getElementById('auditDetailModal');
  const btnClose = document.getElementById('btnCloseAuditModal');
  const btnDismiss = document.getElementById('btnDismissAuditModal');

  const closeModal = () => {
    modal?.classList.add('hidden');
  };

  btnClose?.addEventListener('click', closeModal);
  btnDismiss?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// --------------------------------------------------------------------------
// CARREGAMENTO DE DADOS
// --------------------------------------------------------------------------

async function loadStats() {
  try {
    const res = await apiFetch('/app/api/index.php?route=admin-audit&action=stats');
    const json = await res.json();
    if (!json.success) return;

    const data = json.data;
    document.getElementById('kpiOnlineUsers').textContent = data.online_users ?? 0;
    document.getElementById('kpiLoginsToday').textContent = data.logins_today ?? 0;
    document.getElementById('kpiChangesToday').textContent = data.changes_today ?? 0;
    document.getElementById('kpiFailedLoginsToday').textContent = data.failed_logins_today ?? 0;
  } catch (e) {
    console.error('Erro ao carregar estatísticas:', e);
  }
}

async function loadAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  const moduleVal = document.getElementById('filterAuditModule')?.value || '';
  const actionVal = document.getElementById('filterAuditAction')?.value || '';
  const dateFrom = document.getElementById('filterAuditDateFrom')?.value || '';
  const dateTo = document.getElementById('filterAuditDateTo')?.value || '';
  const search = document.getElementById('filterAuditSearch')?.value || '';

  const params = new URLSearchParams({
    route: 'admin-audit',
    action: 'audit-logs',
    limit: PAGE_SIZE,
    offset: auditPage * PAGE_SIZE,
  });

  if (moduleVal) params.append('module', moduleVal);
  if (actionVal) params.append('action_type', actionVal);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (search) params.append('search', search);

  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400">Carregando dados...</td></tr>';

  try {
    const res = await apiFetch('/app/api/index.php?' + params.toString());
    const json = await res.json();

    if (!json.success) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Erro ao carregar auditoria</td></tr>';
      return;
    }

    auditTotal = json.total || 0;
    renderAuditTable(json.data || []);
    updateAuditPagination();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Erro ao conectar à API</td></tr>';
  }
}

function renderAuditTable(items) {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-slate-400">Nenhum registro de alteração encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((item) => {
    const actionBadge = getActionBadge(item.action);
    const dateFormatted = formatDateTime(item.created_at);
    const userName = escapeHtml(item.nome || item.username || 'Sistema');
    const userRole = escapeHtml(item.role || '');
    const moduleName = formatModuleName(item.module);
    const recordId = escapeHtml(item.record_id || '-');
    const summary = escapeHtml(item.summary || '-');
    const ip = escapeHtml(item.ip_address || '-');

    const detailBtn = item.has_diff
      ? `<button data-action="view-detail" data-id="${item.id}" class="bg-sky-100 hover:bg-sky-200 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-3 py-1 rounded-lg text-xs font-medium transition" title="Ver campos alterados">
          Ver Diff
        </button>`
      : `<span class="text-slate-400 text-xs">-</span>`;

    return `
      <tr class="hover:bg-slate-50/60 dark:hover:bg-[#1a2133] transition">
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">${dateFormatted}</td>
        <td class="px-5 py-3.5 whitespace-nowrap">
          <div class="font-medium text-slate-800 dark:text-slate-200">${userName}</div>
          ${userRole ? `<span class="text-[10px] uppercase font-semibold text-slate-400">${userRole}</span>` : ''}
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300">${moduleName}</td>
        <td class="px-5 py-3.5 whitespace-nowrap">${actionBadge}</td>
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">${recordId}</td>
        <td class="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title="${summary}">${summary}</td>
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-400">${ip}</td>
        <td class="px-5 py-3.5 whitespace-nowrap text-right">${detailBtn}</td>
      </tr>
    `;
  }).join('');
}

function updateAuditPagination() {
  const start = auditTotal === 0 ? 0 : auditPage * PAGE_SIZE + 1;
  const end = Math.min((auditPage + 1) * PAGE_SIZE, auditTotal);

  document.getElementById('auditOffsetStart').textContent = start;
  document.getElementById('auditOffsetEnd').textContent = end;
  document.getElementById('auditTotalCount').textContent = auditTotal;

  const btnPrev = document.getElementById('btnAuditPrevPage');
  const btnNext = document.getElementById('btnAuditNextPage');

  if (btnPrev) btnPrev.disabled = auditPage === 0;
  if (btnNext) btnNext.disabled = end >= auditTotal;
}

async function loadAccessLogs() {
  const tbody = document.getElementById('accessTableBody');
  if (!tbody) return;

  const eventVal = document.getElementById('filterAccessEvent')?.value || '';
  const dateFrom = document.getElementById('filterAccessDateFrom')?.value || '';
  const dateTo = document.getElementById('filterAccessDateTo')?.value || '';
  const search = document.getElementById('filterAccessSearch')?.value || '';

  const params = new URLSearchParams({
    route: 'admin-audit',
    action: 'access-logs',
    limit: PAGE_SIZE,
    offset: accessPage * PAGE_SIZE,
  });

  if (eventVal) params.append('event_type', eventVal);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (search) params.append('search', search);

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">Carregando dados...</td></tr>';

  try {
    const res = await apiFetch('/app/api/index.php?' + params.toString());
    const json = await res.json();

    if (!json.success) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Erro ao carregar logs de acesso</td></tr>';
      return;
    }

    accessTotal = json.total || 0;
    renderAccessTable(json.data || []);
    updateAccessPagination();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Erro ao conectar à API</td></tr>';
  }
}

function renderAccessTable(items) {
  const tbody = document.getElementById('accessTableBody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-slate-400">Nenhum log de acesso encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((item) => {
    const statusBadge = getAccessStatusBadge(item.event_type);
    const dateFormatted = formatDateTime(item.created_at);
    const username = escapeHtml(item.username || '-');
    const displayName = item.nome ? escapeHtml(item.nome) : null;
    const ip = escapeHtml(item.ip_address || '-');
    const ua = escapeHtml(item.user_agent || '-');
    const reason = escapeHtml(item.failure_reason || '-');

    return `
      <tr class="hover:bg-slate-50/60 dark:hover:bg-[#1a2133] transition">
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">${dateFormatted}</td>
        <td class="px-5 py-3.5 whitespace-nowrap">
          <div class="font-medium text-slate-800 dark:text-slate-200">${username}</div>
          ${displayName ? `<div class="text-[11px] text-slate-400">${displayName}</div>` : ''}
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap">${statusBadge}</td>
        <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-300">${ip}</td>
        <td class="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title="${ua}">${ua}</td>
        <td class="px-5 py-3.5 text-xs ${item.failure_reason ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-400'}">${reason}</td>
      </tr>
    `;
  }).join('');
}

function updateAccessPagination() {
  const start = accessTotal === 0 ? 0 : accessPage * PAGE_SIZE + 1;
  const end = Math.min((accessPage + 1) * PAGE_SIZE, accessTotal);

  document.getElementById('accessOffsetStart').textContent = start;
  document.getElementById('accessOffsetEnd').textContent = end;
  document.getElementById('accessTotalCount').textContent = accessTotal;

  const btnPrev = document.getElementById('btnAccessPrevPage');
  const btnNext = document.getElementById('btnAccessNextPage');

  if (btnPrev) btnPrev.disabled = accessPage === 0;
  if (btnNext) btnNext.disabled = end >= accessTotal;
}

async function loadActiveSessions() {
  const tbody = document.getElementById('sessionsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">Buscando sessões ativas...</td></tr>';

  try {
    const res = await apiFetch('/app/api/index.php?route=admin-audit&action=active-sessions');
    const json = await res.json();

    if (!json.success) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Erro ao carregar sessões</td></tr>';
      return;
    }

    const sessions = json.data || [];
    if (sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-slate-400">Nenhum usuário ativo nos últimos 30 minutos</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map((s) => {
      const minutes = parseInt(s.minutes_ago || 0);
      const isVeryActive = minutes <= 5;
      const statusHtml = isVeryActive
        ? `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online Agora
          </span>`
        : `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            Ausente
          </span>`;

      return `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-[#1a2133] transition">
          <td class="px-5 py-3.5 whitespace-nowrap">${statusHtml}</td>
          <td class="px-5 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">${escapeHtml(s.nome)}</td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">${escapeHtml(s.username)}</td>
          <td class="px-5 py-3.5 whitespace-nowrap">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">${escapeHtml(s.role)}</span>
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-300">${formatDateTime(s.last_activity)}</td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">${minutes === 0 ? 'Agora mesmo' : minutes + ' min atrás'}</td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-400">${escapeHtml(s.ip_address || '-')}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Erro ao carregar sessões</td></tr>';
  }
}

// --------------------------------------------------------------------------
// MODAL DE DETALHES DA ALTERAÇÃO
// --------------------------------------------------------------------------

async function openAuditDetail(id) {
  const modal = document.getElementById('auditDetailModal');
  if (!modal) return;

  try {
    const res = await apiFetch(`/app/api/index.php?route=admin-audit&action=detail&id=${id}`);
    const json = await res.json();
    if (!json.success || !json.data) {
      showToast('Não foi possível carregar os detalhes', 'error');
      return;
    }

    const data = json.data;

    document.getElementById('modalAuditUser').textContent = data.nome || data.username || 'Sistema';
    document.getElementById('modalAuditDate').textContent = formatDateTime(data.created_at);
    document.getElementById('modalAuditTarget').textContent = `${formatModuleName(data.module)} - ${data.record_id || ''}`;
    document.getElementById('modalAuditIp').textContent = data.ip_address || '-';
    document.getElementById('modalAuditSummary').textContent = data.summary || '-';

    const diffContainer = document.getElementById('modalDiffContainer');
    const diff = data.diff || {};
    const diffKeys = Object.keys(diff);

    if (diffKeys.length === 0) {
      // Nenhum campo modificado diretamente (criação pura ou exclusão)
      const oldVals = data.old_values ? JSON.parse(data.old_values) : null;
      const newVals = data.new_values ? JSON.parse(data.new_values) : null;

      diffContainer.innerHTML = `
        <div class="p-4 text-xs space-y-3 bg-slate-50 dark:bg-[#161b26]">
          ${newVals ? `<div><span class="font-semibold text-emerald-600 block mb-1">Dados Registrados:</span><pre class="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono overflow-x-auto text-[11px]">${escapeHtml(JSON.stringify(newVals, null, 2))}</pre></div>` : ''}
          ${oldVals ? `<div><span class="font-semibold text-red-600 block mb-1">Dados Anteriores:</span><pre class="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono overflow-x-auto text-[11px]">${escapeHtml(JSON.stringify(oldVals, null, 2))}</pre></div>` : ''}
        </div>
      `;
    } else {
      let diffHtml = `
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
            <tr>
              <th class="px-4 py-2.5">Campo</th>
              <th class="px-4 py-2.5">Valor Anterior</th>
              <th class="px-4 py-2.5">Novo Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

      diffKeys.forEach((key) => {
        const item = diff[key];
        const oldStr = formatDiffValue(item.old);
        const newStr = formatDiffValue(item.new);

        diffHtml += `
          <tr class="hover:bg-slate-50 dark:hover:bg-[#1f2637]">
            <td class="px-4 py-2 font-mono font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(key)}</td>
            <td class="px-4 py-2 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 font-mono">${escapeHtml(oldStr)}</td>
            <td class="px-4 py-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-mono">${escapeHtml(newStr)}</td>
          </tr>
        `;
      });

      diffHtml += '</tbody></table>';
      diffContainer.innerHTML = diffHtml;
    }

    modal.classList.remove('hidden');
  } catch (e) {
    showToast('Erro ao carregar detalhes', 'error');
  }
}

// --------------------------------------------------------------------------
// EXPORTAÇÃO CSV
// --------------------------------------------------------------------------

async function exportAuditCsv() {
  try {
    showToast('Gerando relatório de auditoria...', 'info');

    const moduleVal = document.getElementById('filterAuditModule')?.value || '';
    const actionVal = document.getElementById('filterAuditAction')?.value || '';
    const dateFrom = document.getElementById('filterAuditDateFrom')?.value || '';
    const dateTo = document.getElementById('filterAuditDateTo')?.value || '';
    const search = document.getElementById('filterAuditSearch')?.value || '';

    const params = new URLSearchParams({
      route: 'admin-audit',
      action: 'audit-logs',
      limit: 1000,
      offset: 0,
    });
    if (moduleVal) params.append('module', moduleVal);
    if (actionVal) params.append('action_type', actionVal);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (search) params.append('search', search);

    const res = await apiFetch('/app/api/index.php?' + params.toString());
    const json = await res.json();
    if (!json.success || !json.data) {
      showToast('Erro ao exportar CSV', 'error');
      return;
    }

    const items = json.data;
    const header = 'DATA_HORA;USUARIO;PERFIL;MODULO;ACAO;REGISTRO;RESUMO;IP';

    downloadCSV(`auditoria_rubble_${new Date().toISOString().slice(0, 10)}.csv`, header, (row) => {
      items.forEach((it) => {
        row([
          it.created_at || '',
          it.nome || it.username || '',
          it.role || '',
          it.module || '',
          it.action || '',
          it.record_id || '',
          it.summary || '',
          it.ip_address || '',
        ]);
      });
    });

    showToast('Download concluído', 'success');
  } catch (e) {
    showToast('Falha na exportação', 'error');
  }
}

async function exportAccessCsv() {
  try {
    showToast('Gerando relatório de acessos...', 'info');

    const eventVal = document.getElementById('filterAccessEvent')?.value || '';
    const dateFrom = document.getElementById('filterAccessDateFrom')?.value || '';
    const dateTo = document.getElementById('filterAccessDateTo')?.value || '';
    const search = document.getElementById('filterAccessSearch')?.value || '';

    const params = new URLSearchParams({
      route: 'admin-audit',
      action: 'access-logs',
      limit: 1000,
      offset: 0,
    });
    if (eventVal) params.append('event_type', eventVal);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (search) params.append('search', search);

    const res = await apiFetch('/app/api/index.php?' + params.toString());
    const json = await res.json();
    if (!json.success || !json.data) {
      showToast('Erro ao exportar CSV', 'error');
      return;
    }

    const items = json.data;
    const header = 'DATA_HORA;USUARIO;STATUS;IP;DISPOSITIVO_NAVEGADOR;MOTIVO';

    downloadCSV(`acessos_rubble_${new Date().toISOString().slice(0, 10)}.csv`, header, (row) => {
      items.forEach((it) => {
        row([
          it.created_at || '',
          it.username || '',
          it.event_type || '',
          it.ip_address || '',
          it.user_agent || '',
          it.failure_reason || '',
        ]);
      });
    });

    showToast('Download concluído', 'success');
  } catch (e) {
    showToast('Falha na exportação', 'error');
  }
}

// --------------------------------------------------------------------------
// FORMATADORES E HELPERS VISUAIS
// --------------------------------------------------------------------------

function formatDateTime(str) {
  if (!str) return '-';
  const parts = str.split(' ');
  if (parts.length < 2) return str;
  const d = parts[0].split('-');
  if (d.length < 3) return str;
  return `${d[2]}/${d[1]}/${d[0]} ${parts[1]}`;
}

function formatModuleName(mod) {
  const map = {
    usuarios: 'Usuários',
    pv: 'PVs',
    equipamentos: 'Equipamentos',
    chamados: 'Chamados',
    scm: 'SCM',
  };
  return map[mod] || (mod ? mod.toUpperCase() : '-');
}

function getActionBadge(action) {
  switch (action) {
    case 'create':
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">Criação</span>`;
    case 'update':
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">Edição</span>`;
    case 'status_change':
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Status</span>`;
    case 'delete':
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">Exclusão</span>`;
    case 'import':
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">Importação</span>`;
    default:
      return `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${escapeHtml(action)}</span>`;
  }
}

function getAccessStatusBadge(eventType) {
  switch (eventType) {
    case 'login_success':
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Sucesso
      </span>`;
    case 'login_failed':
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        Falha
      </span>`;
    case 'logout':
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Logout
      </span>`;
    default:
      return `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${escapeHtml(eventType)}</span>`;
  }
}

function formatDiffValue(val) {
  if (val === null || val === undefined) return '(vazio)';
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
