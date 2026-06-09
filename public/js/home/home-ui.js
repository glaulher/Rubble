function hubRecase(str) {
  if (!str || str !== str.toUpperCase()) return str;
  const u = str.toUpperCase();
  if (u.startsWith('HUB ') || u.startsWith('HEADEND ')) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return str;
}

function formatPvDisplay(pvEntry) {
  const parts = pvEntry.split('|');
  const pvNum = parts[0];
  const osNum = parts[1] || '';
  return osNum ? `PV${pvNum} - OS${osNum}` : `PV${pvNum}`;
}

function buildEquipmentCardHtml(e, canEdit) {
  return `
    <div class="card-item bg-white rounded-2xl shadow-sm hover:shadow-xl transition border border-slate-200" data-equip-id="${e.id}">

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
                e.valor_tr
                  ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-sm font-semibold"
                       data-role="admin coordenador">
                      R$ ${e.valor_tr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>`
                  : ''
              }

              ${
                e.tickets_count > 0
                  ? `<span class="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-sm">
                      ${e.tickets_count} OS
                    </span>`
                  : ''
              }

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

        <div id="det${e.id}" class="hidden border-t border-slate-200 mt-4 pt-4 tickets-container" data-loaded="false">

          ${
            e.pvs_pendentes_count > 0
              ? `
                <div class="bg-red-50 rounded-xl p-4 border border-red-200 mb-3">
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
  const valueEl = document.getElementById('counterValue');

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
      if (valueEl) {
        valueEl.textContent = '';
        valueEl.style.display = 'none';
      }
    } else {
      counter.textContent = totalEquipment;
      label.textContent = 'máquinas cadastradas';

      if (valueEl) {
        const isAdminOrCoord = userRole === 'admin' || userRole === 'coordenador';
        if (isAdminOrCoord && totalValor > 0) {
          valueEl.textContent = `\u2014 R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          valueEl.style.display = '';
        } else {
          valueEl.textContent = '';
          valueEl.style.display = 'none';
        }
      }
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
      <div class="site-group mb-10" data-site="${escapeHtml(site)}">

        <div class="mb-4">

           <h2 class="text-2xl font-medium tracking-[0.05em] text-slate-800">

            ${escapeHtml(site)}

            <span class="text-base font-medium text-slate-600 mx-1">-</span>
            <span class="text-base font-medium text-slate-600">
              ${escapeHtml(hubRecase(localEquipment[0].local_scm ?? ''))}
            </span>

            <span class="text-base font-medium text-slate-600 mx-1">&mdash;</span>
            <span class="text-base font-medium text-slate-600">
              ${escapeHtml(localEquipment[0].localidade ?? '')}
            </span>

            <span class="text-base font-medium text-slate-600 mx-1">-</span>
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
      html += buildEquipmentCardHtml(e, canEdit);
    });

    html += `
        </div>
      </div>
    `;

    content.innerHTML += html;
  });
}

function syncHomeCards(newEquipment) {
  const content = document.getElementById('content');
  if (!content) return;

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : '';
  const canEdit = userRole !== 'cliente';

  const counter = document.getElementById('machineCounter');
  const label = document.getElementById('counterLabel');
  const valueEl = document.getElementById('counterValue');
  if (counter && label) {
    const statusKeywords = ['pendente', 'conclu', 'planej', 'andamento', 'clean'];
    const isStatusSearch = currentSearch !== '' && statusKeywords.some((kw) => currentSearch.includes(kw));
    if (isStatusSearch) {
      counter.textContent = totalOS;
      label.textContent = 'OS cadastradas';
      if (valueEl) {
        valueEl.textContent = '';
        valueEl.style.display = 'none';
      }
    } else {
      counter.textContent = totalEquipment;
      label.textContent = 'máquinas cadastradas';

      if (valueEl) {
        const isAdminOrCoord = userRole === 'admin' || userRole === 'coordenador';
        if (isAdminOrCoord && totalValor > 0) {
          valueEl.textContent = `\u2014 R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          valueEl.style.display = '';
        } else {
          valueEl.textContent = '';
          valueEl.style.display = 'none';
        }
      }
    }
  }

  const existingCards = {};
  content.querySelectorAll('.card-item[data-equip-id]').forEach((card) => {
    existingCards[card.dataset.equipId] = card;
  });

  const newById = {};
  const newByLocal = {};
  newEquipment.forEach((e) => {
    newById[e.id] = e;
    if (!newByLocal[e.local]) newByLocal[e.local] = [];
    newByLocal[e.local].push(e);
  });

  const seenIds = {};
  const expandedToReload = [];
  newEquipment.forEach((e) => {
    seenIds[e.id] = true;
    const existing = existingCards[e.id];
    if (existing) {
      const detEl = existing.querySelector('#det' + e.id);
      const wasExpanded = detEl && !detEl.classList.contains('hidden');
      const hadTicketsLoaded = wasExpanded && detEl.dataset.loaded === 'true';

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildEquipmentCardHtml(e, canEdit);
      const newCard = tempDiv.firstElementChild;
      const newDetEl = newCard.querySelector('#det' + e.id);

      if (wasExpanded && newDetEl) {
        newDetEl.classList.remove('hidden');
        if (hadTicketsLoaded) {
          expandedToReload.push({ equipId: e.id, container: newDetEl });
        }
      }

      existing.replaceWith(newCard);
    } else {
      const escapedLocal = e.local.replace(/"/g, '\\"');
      let siteGroup = content.querySelector(`.site-group[data-site="${escapedLocal}"]`);
      if (!siteGroup) {
        siteGroup = document.createElement('div');
        siteGroup.className = 'site-group mb-10';
        siteGroup.dataset.site = e.local;
        siteGroup.innerHTML = `
          <div class="mb-4">
            <h2 class="text-2xl font-medium tracking-[0.05em] text-slate-800">
              ${escapeHtml(e.local)}
              <span class="text-base font-medium text-slate-600 mx-1">-</span>
              <span class="text-base font-medium text-slate-600">${escapeHtml(hubRecase(e.local_scm ?? ''))}</span>
              <span class="text-base font-medium text-slate-600 mx-1">&mdash;</span>
              <span class="text-base font-medium text-slate-600">${escapeHtml(e.localidade ?? '')}</span>
              <span class="text-base font-medium text-slate-600 mx-1">-</span>
              <span class="text-base font-medium text-slate-600">${escapeHtml(e.local_do_endereco ?? '')}</span>
              <span class="hidden md:inline text-base font-normal text-slate-600">${escapeHtml(formatAddress(e.endereco ? '- ' + e.endereco : ''))}</span>
            </h2>
            <p class="text-slate-500">0 equipamentos</p>
          </div>
          <div class="space-y-4"></div>
        `;
        content.appendChild(siteGroup);
      }

      const spaceDiv = siteGroup.querySelector('.space-y-4');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildEquipmentCardHtml(e, canEdit);
      spaceDiv.appendChild(tempDiv.firstElementChild);

      const countEl = siteGroup.querySelector('.mb-4 p');
      if (countEl) {
        const siteCount = content.querySelectorAll(`.site-group[data-site="${escapedLocal}"] .card-item`).length;
        countEl.textContent = siteCount + ' equipamentos';
      }
    }
  });

  Object.keys(existingCards).forEach((id) => {
    if (!seenIds[id]) {
      const card = existingCards[id];
      const siteGroup = card.closest('.site-group');
      card.remove();
      if (siteGroup) {
        const remaining = siteGroup.querySelectorAll('.card-item').length;
        if (remaining === 0) {
          siteGroup.remove();
        } else {
          const countEl = siteGroup.querySelector('.mb-4 p');
          if (countEl) countEl.textContent = remaining + ' equipamentos';
        }
      }
    }
  });

  expandedToReload.forEach(({ equipId, container }) => {
    loadTicketsForEquipment(equipId, container);
  });
}

function resetState(search) {
  currentSearch = search;

  page = 0;

  allLoaded = false;

  loading = false;

  equipment = [];

  filteredEquipment = [];

  lastHomeHash = '';

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
    if (!el) return;

    const isHidden = el.classList.contains('hidden');

    el.classList.toggle('hidden');

    if (isHidden && el.dataset.loaded === 'false') {
      loadTicketsForEquipment(toggleId, el);
    }
    return;
  }

  var action = target.getAttribute('data-action');
  var ticketId = target.getAttribute('data-ticket-id');
  if (action === 'edit-ticket' && ticketId) {
    window.location.hash = '#/form?ticket=' + ticketId;
    return;
  }
  if (action === 'delete-ticket' && ticketId) {
    var ticketOs = target.getAttribute('data-ticket-os');
    deleteTicket(ticketId, target, ticketOs);
    return;
  }

  const deleteId = target.getAttribute('data-delete-id');
  if (deleteId) {
    deleteTicket(deleteId, target);
  }
}

async function loadTicketsForEquipment(equipId, container) {
  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : '';
  const canEdit = userRole !== 'cliente';

  container.dataset.loaded = 'loading';
  container.insertAdjacentHTML('afterbegin',
    '<p class="text-slate-400 text-sm animate-pulse">Carregando registros...</p>'
  );

  try {
    const resp = await fetch(`/app/api/index.php?route=equipment&action=tickets-by-equipment&id=${equipId}`);
    const result = await resp.json();

    const loadingEl = container.querySelector('.animate-pulse');
    if (loadingEl) loadingEl.remove();

    if (!result.success || !result.data || result.data.length === 0) {
      container.insertAdjacentHTML('afterbegin', '<p class="text-slate-500">Nenhum registro encontrado.</p>');
      container.dataset.loaded = 'true';
      return;
    }

    const html = result.data.map(r => buildTicketHtml(r, canEdit)).join('');
    container.insertAdjacentHTML('afterbegin', html);
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Erro ao carregar registros:', err);
    const loadingEl = container.querySelector('.animate-pulse');
    if (loadingEl) loadingEl.remove();
    container.insertAdjacentHTML('afterbegin', '<p class="text-red-500 text-sm">Erro ao carregar registros.</p>');
    container.dataset.loaded = 'true';
  }
}

function buildTicketHtml(r, canEdit) {
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

  let dateInfo = '';
  if (status === 'planejado' && r.data_planejada) {
    dateInfo = `📅 ${formatDate(r.data_planejada)}`;
  } else if ((status === 'concluído' || status === 'concluido') && r.data_concluido) {
    dateInfo = `📅 ${formatDate(r.data_concluido)}`;
  }

  return `
    <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div class="flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-4 text-sm">
            <span class="font-semibold text-slate-900">OS: ${escapeHtml(r.os)}</span>
            <span class="text-slate-600">📅 ${escapeHtml(r.data ?? '-')}</span>
            <span class="text-slate-600">🧰 Material: ${escapeHtml(r.material || '-')}</span>
            <span class="text-slate-600">🔧 Técnico: ${escapeHtml(r.equipe || '-')}</span>
          </div>
          <div class="text-slate-600 text-sm">${escapeHtml(r.obs || 'Sem observações')}</div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          ${dateInfo ? `<span class="text-slate-500 text-sm">${dateInfo}</span>` : ''}
          <span class="${statusColor} px-3 py-1 rounded-full text-sm font-semibold">${escapeHtml(r.status)}</span>
          ${canEdit ? `
            ${iconButtonHtml('edit', 'Editar', { 'data-action': 'edit-ticket', 'data-ticket-id': r.id })}
            ${iconButtonHtml('delete', 'Excluir', { 'data-action': 'delete-ticket', 'data-ticket-id': r.id, 'data-ticket-os': r.os || '', 'class': 'delete-ticket-btn' }, 'right')}
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

async function loadEquipmentSummary() {
  const search = currentSearch || '';
  const statusKeywords = ['pendente', 'conclu', 'planej', 'andamento', 'clean'];
  const isStatusSearch = search !== '' && statusKeywords.some((kw) => search.includes(kw));
  if (isStatusSearch) return;
  try {
    const resp = await fetch(`/app/api/index.php?route=equipment&action=sum-value&search=${encodeURIComponent(search)}`);
    const result = await resp.json();
    if (!result.success) return;

    if (result.total_equipment !== undefined) {
      document.getElementById('machineCounter').textContent = result.total_equipment;
    }
    if (result.total_valor !== undefined) {
      totalValor = result.total_valor;
      const valueEl = document.getElementById('counterValue');
      if (valueEl) {
        const currentUser = getUser();
        const userRole = currentUser ? currentUser.role : '';
        const isAdminOrCoord = userRole === 'admin' || userRole === 'coordenador';
        if (isAdminOrCoord && totalValor > 0) {
          valueEl.textContent = `\u2014 R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          valueEl.style.display = '';
        } else {
          valueEl.textContent = '';
          valueEl.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // silent — badge polling failures are non-critical
  }
}

function initHome() {
  page = 0;

  allLoaded = false;

  loading = false;

  equipment = [];

  filteredEquipment = [];

  lastHomeHash = '';

  const content = document.getElementById('content');

  if (content) {
    content.innerHTML = '';
    content.removeEventListener('click', handleContentClick);
    content.addEventListener('click', handleContentClick);
  }

  const csvBtn = document.querySelector('[data-action="generate-csv"]');
  if (csvBtn) {
    csvBtn.removeEventListener('click', generateCSVReport);
    csvBtn.addEventListener('click', generateCSVReport);
  }
  const importBtn = document.querySelector('[data-action="import-os"]');
  if (importBtn) {
    importBtn.removeEventListener('click', importOS);
    importBtn.addEventListener('click', importOS);
  }

  const searchInput = document.getElementById('searchInput');

  if (searchInput) {
    searchInput.value = currentSearch || '';
  }

  setupSearch();

  setupInfiniteScroll();

  PollingManager.start('home', function () { loadEquipment(true); }, 30000);

  PollingManager.start('home-badge', function () { loadEquipmentSummary(); }, 30000);
  loadEquipmentSummary();

  loadEquipment(false);

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
