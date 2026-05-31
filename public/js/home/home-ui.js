function formatPvDisplay(pvEntry) {
  const parts = pvEntry.split('|');
  const pvNum = parts[0];
  const osNum = parts[1] || '';
  return osNum ? `PV${pvNum} - OS${osNum}` : `PV${pvNum}`;
}

function render(list, append = false) {
  const content = document.getElementById('content');

  if (!content) {
    console.error('Elemento #content não encontrado');
    return;
  }

  if (!append) {
    content.innerHTML = '';
  }

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : '';
  const canEdit = userRole !== 'cliente';

  const counter = document.getElementById('machineCounter');
  const label = document.getElementById('counterLabel');

  if (counter && label) {
    const statusKeywords = [
      'pendente',
      'conclu',
      'planej',
      'andamento',
      'clean',
    ];
    const isStatusSearch =
      currentSearch !== '' &&
      statusKeywords.some((kw) => currentSearch.includes(kw));

    if (isStatusSearch) {
      counter.textContent = totalOS;
      label.textContent = 'OS cadastradas';
    } else {
      counter.textContent = totalEquipment;
      label.textContent = 'máquinas cadastradas';
    }
  }

  const grouped = {};

  list.forEach((e) => {
    if (!grouped[e.local]) {
      grouped[e.local] = [];
    }

    grouped[e.local].push(e);
  });

  Object.keys(grouped).forEach((site) => {
    const localEquipment = grouped[site];

    let html = `
      <div class="site-group mb-10">

        <div class="mb-4">

           <h2 class="text-2xl font-medium tracking-[0.05em] text-slate-800">

            ${escapeHtml(site)}

            <span class="text-base font-medium text-slate-600">
              ${escapeHtml(localEquipment[0].local_do_endereco ?? '')}
            </span>

            <span class="hidden md:inline text-base font-normal text-slate-600">
              ${escapeHtml(
                formatAddress(
                  localEquipment[0].endereco
                    ? '- ' + localEquipment[0].endereco
                    : ''
                )
              )}
            </span>

          </h2>

          <p class="text-slate-500">
            ${localEquipment.length} equipamentos
          </p>

        </div>

        <div class="space-y-4">
    `;

    localEquipment.forEach((e) => {
      html += `
        <div class="card-item bg-white rounded-2xl shadow-sm hover:shadow-xl transition border border-slate-200">

          <div class="p-5">

            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div>

                <div class="flex items-center gap-2 flex-wrap">

                   <h3 class="text-xl font-light tracking-[0.05em] px-3 py-1 rounded-lg ${e.color}">
                    ${escapeHtml(e.equipamento)}
                  </h3>

                  <span class="text-slate-400">-</span>

                  <p class="text-slate-600 text-sm font-medium flex items-center gap-1">
                    ${escapeHtml(titleCase(e.localidade ?? ''))} ${e.icon ?? ''}
                  </p>

                </div>

                <div class="mt-2 flex flex-wrap items-center gap-2">

                  <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-semibold">
                    ${escapeHtml(e.capacidade)} TR
                  </span>

                  ${
                    e.pvs_pendentes_count > 0
                      ? `<button
                          data-pv-toggle-id="${e.id}"
                          class="pv-toggle-btn bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-sm font-semibold transition"
                        >
                          ${e.pvs_pendentes_count} PV${e.pvs_pendentes_count > 1 ? 's' : ''} não faturada${e.pvs_pendentes_count > 1 ? 's' : ''}
                        </button>`
                      : ''
                  }

                </div>

              </div>

              <div class="flex gap-3">

                ${
                  canEdit
                    ? `<a href="#/form?id=${e.id}"
                      class="bg-emerald-200 hover:bg-emerald-300 text-emerald-800 px-5 py-2 rounded-xl font-medium transition">
                      Registrar
                    </a>`
                    : ''
                }

                <button
                  data-toggle-id="${e.id}"
                  class="toggle-details-btn bg-slate-200 hover:bg-slate-300 text-slate-900 px-5 py-2 rounded-xl font-medium transition">

                  Ver

                </button>

              </div>

            </div>

            <div id="det${e.id}" class="hidden border-t border-slate-200 mt-4 pt-4">

              ${
                (e.tickets || []).length > 0
                  ? e.tickets
                      .map((r) => {
                        const status = (r.status || '').toLowerCase();

                        const statusColor =
                          status === 'concluído' || status === 'concluido'
                            ? 'bg-green-100 text-green-700'
                            : status === 'pendente'
                              ? 'bg-red-100 text-red-700'
                              : status === 'planejado'
                                ? 'bg-yellow-100 text-yellow-700'
                                : status === 'projeto clean up'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700';

                        return `
                          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3">

                            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">

                              <div class="flex-1 space-y-2">

                                <div class="flex flex-wrap items-center gap-4 text-sm">

                                  <span class="font-semibold text-slate-900">
                                    OS: ${escapeHtml(r.os)}
                                  </span>

                                  <span class="text-slate-600">
                                    📅 ${escapeHtml(r.data ?? '-')}
                                  </span>

                                  <span class="text-slate-600">
                                      🧰 Material: ${escapeHtml(r.material || '-')} 
                                  </span>

                                  <span class="text-slate-600">
                                    🔧 Técnico: ${escapeHtml(r.equipe || '-')}
                                  </span>

                                </div>

                                <div class="text-slate-600 text-sm">
                                  ${escapeHtml(r.obs || 'Sem observações')}
                                </div>

                              </div>

                              <div class="shrink-0 flex items-center gap-2">

                                <span class="${statusColor} px-3 py-1 rounded-full text-sm font-semibold">
                                  ${escapeHtml(r.status)}
                                </span>

                                ${
                                  canEdit
                                    ? `<div class="relative group">
                                  <a href="#/form?ticket=${r.id}"
                                    class="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-xl transition block">
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                  </a>
                                  <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">
                                    Editar
                                  </span>
                                </div>

                                <div class="relative group">
                                  <button
                                    data-delete-id="${r.id}"
                                    class="delete-ticket-btn bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition">
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                  <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-0 group-hover:scale-100 origin-bottom transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">
                                    Excluir
                                  </span>
                                </div>`
                                    : ''
                                }

                              </div>

                            </div>

                          </div>
                        `;
                      })
                      .join('')
                  : `<p class="text-slate-500">Nenhum registro encontrado.</p>`
              }

              ${
                e.pvs_pendentes_count > 0
                  ? `
                    <div class="bg-red-50 rounded-xl p-4 border border-red-200 mt-3">
                      <p class="text-sm font-semibold text-red-700 mb-2">
                        PV${e.pvs_pendentes_count > 1 ? 's' : ''} não faturada${e.pvs_pendentes_count > 1 ? 's' : ''} (${e.pvs_pendentes_count})
                      </p>
                      <div class="flex flex-wrap gap-2">
                        ${e.pvs_pendentes
                          .split(', ')
                          .map(
                            (pv) => `
                          <span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-mono">
                            ${formatPvDisplay(pv)}
                          </span>
                        `
                          )
                          .join('')}
                      </div>
                    </div>
                  `
                  : ''
              }

            </div>

          </div>

        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    content.innerHTML += html;
  });
}

function resetState(search) {
  currentSearch = search;

  page = 0;

  allLoaded = false;

  loading = false;

  equipment = [];

  filteredEquipment = [];

  const content = document.getElementById('content');

  if (content) {
    content.innerHTML = '';
  }
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');

  if (!searchInput) return;

  searchInput.addEventListener('click', async function () {
    if (this.value.trim() !== '') {
      this.value = '';

      resetState('');

      await loadEquipment();
    }
  });

  const onSearch = debounce(async () => {
    resetState(searchInput.value.toLowerCase().trim());

    await loadEquipment();
  }, 1000);

  searchInput.addEventListener('input', onSearch);
}

function setupInfiniteScroll() {
  createInfiniteScroll('sentinel', () => loadEquipment());
}

function getExpandedIds() {
  const ids = [];
  document.querySelectorAll('[id^="det"]').forEach((el) => {
    if (!el.classList.contains('hidden')) {
      ids.push(el.id.replace('det', ''));
    }
  });
  return ids;
}

function restoreExpandedIds(ids) {
  ids.forEach((id) => {
    const el = document.getElementById('det' + id);
    if (el) el.classList.remove('hidden');
  });
}

function handleContentClick(event) {
  const target = event.target.closest('button');
  if (!target) return;

  const toggleId = target.getAttribute('data-toggle-id');
  if (toggleId) {
    const el = document.getElementById('det' + toggleId);
    if (el) el.classList.toggle('hidden');
    return;
  }

  const deleteId = target.getAttribute('data-delete-id');
  if (deleteId) {
    deleteTicket(deleteId, target);
  }
}

function initHome() {
  page = 0;

  allLoaded = false;

  loading = false;

  equipment = [];

  filteredEquipment = [];

  const content = document.getElementById('content');

  if (content) {
    content.innerHTML = '';
    content.removeEventListener('click', handleContentClick);
    content.addEventListener('click', handleContentClick);
  }

  const searchInput = document.getElementById('searchInput');

  if (searchInput) {
    searchInput.value = currentSearch || '';
  }

  setupSearch();

  setupInfiniteScroll();

  loadEquipment();

  fetch('/app/api/index.php?route=notify')
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        if (data.sent > 0) {
          showToast(data.message, 'success');
        }
      } else {
        showToast(
          'Erro: ' + (data.message || 'falha ao enviar e-mail'),
          'error'
        );
      }
    })
    .catch((err) => console.error('Erro ao verificar notificações:', err));
}
