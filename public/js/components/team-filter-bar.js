/**
 * team-filter-bar.js
 *
 * Renders registered team buttons in the planned activity sub-header.
 * - Button per registered team: slate when not assigned, emerald when assigned in date range.
 * - Clicking a button toggles the active team filter (plannedTeamFilter).
 * - Mini copy icon inside each button: clicking it copies the team name to clipboard
 *   (with toast feedback) without triggering the filter toggle.
 * - Visible for all roles permitted to view the planned activities board.
 * - Matching is case-insensitive (toLowerCase).
 */

let registeredTeams = [];
let assignedTeams = [];
let activeFilter = null;
let onFilterChangeCallback = null;

/**
 * Render the team filter bar inside container.
 *
 * @param {HTMLElement} container
 * @param {string[]} registeredList
 * @param {string[]} assignedList
 * @param {Function} onChange
 * @param {string|null} currentFilter
 */
export function renderTeamFilterBar(container, registeredList, assignedList, onChange, currentFilter = null) {
  if (!container) return;

  registeredTeams = registeredList || [];
  assignedTeams   = (assignedList || []).map(item => item.toLowerCase().trim());
  onFilterChangeCallback = onChange;
  activeFilter    = currentFilter;

  if (registeredTeams.length === 0) {
    container.innerHTML = '';
    return;
  }

  const COPY_ICON_SVG =
    '<svg class="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" ' +
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
    '</svg>';

  const buttonsHtml = registeredTeams.map(name => {
    const lower = name.toLowerCase().trim();
    const isAssigned = assignedTeams.includes(lower);
    const isActive = activeFilter && activeFilter.toLowerCase().trim() === lower;

    const baseClass = isAssigned
      ? 'bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800'
      : 'bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900';
    const ringClass = isActive ? ' ring-2 ring-offset-1 ring-slate-600' : '';

    const copyBtn =
      '<span data-action="team-copy-btn" data-team-name="' + name.replace(/"/g, '&quot;') + '" ' +
      'class="relative group inline-flex items-center justify-center ml-1 p-0.5 rounded cursor-pointer" ' +
      'aria-label="Copiar nome da equipe" title="Copiar nome da equipe">' +
      COPY_ICON_SVG +
      '<span class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 origin-bottom scale-0 ' +
      'group-hover:scale-100 transition-transform duration-150 bg-slate-900 text-white text-xs ' +
      'px-2 py-1 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50 pointer-events-none">' +
      'Copiar nome' +
      '</span>' +
      '</span>';

    return '<button data-action="team-filter-btn" data-team-name="' +
      name.replace(/"/g, '&quot;') + '" ' +
      'class="inline-flex items-center gap-0.5 px-3 py-1 rounded-xl text-xs font-medium transition' + ringClass + ' ' + baseClass + '">' +
      escapeHtml(name) +
      copyBtn +
      '</button>';
  }).join('');

  const countBadge = '<span class="text-xs text-slate-300 font-semibold">' +
    registeredTeams.length + ' equipe' + (registeredTeams.length !== 1 ? 's' : '') +
    '</span>';

  container.innerHTML =
    '<div class="flex flex-wrap items-center gap-2 px-6 pb-2">' +
    countBadge + buttonsHtml +
    '</div>';

  if (!container._teamBarListenerAttached) {
    container._teamBarListenerAttached = true;
    container.addEventListener('click', event => {
      // Copy icon click — must check before filter-btn so stopPropagation works
      const copyBtn = event.target.closest('[data-action="team-copy-btn"]');
      if (copyBtn) {
        event.stopPropagation();
        copyTeamName(copyBtn.dataset.teamName);
        return;
      }

      const button = event.target.closest('[data-action="team-filter-btn"]');
      if (!button) return;
      const teamName = button.dataset.teamName;
      toggleFilter(teamName, container);
    });
  }
}

/**
 * Copy team name to clipboard with toast feedback.
 * @param {string} teamName
 */
export function copyTeamName(teamName) {
  if (!teamName) return;
  const text = teamName;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => { if (typeof showToast === 'function') showToast('Equipe copiada: ' + text, 'success'); })
      .catch(() => _fallbackCopyTeam(text));
  } else {
    _fallbackCopyTeam(text);
  }
}

function _fallbackCopyTeam(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    if (typeof showToast === 'function') showToast('Equipe copiada: ' + text, 'success');
  } catch (_e) {
    if (typeof showToast === 'function') showToast('Erro ao copiar', 'error');
  }
  document.body.removeChild(textarea);
}

function toggleFilter(teamName, container) {
  const lower = teamName.toLowerCase().trim();
  if (activeFilter && activeFilter.toLowerCase().trim() === lower) {
    activeFilter = null;
  } else {
    activeFilter = teamName;
  }

  reapplyButtonStates(container);

  if (onFilterChangeCallback) {
    onFilterChangeCallback(activeFilter);
  }
}

function reapplyButtonStates(container) {
  const buttons = container.querySelectorAll('[data-action="team-filter-btn"]');
  buttons.forEach(button => {
    const name = button.dataset.teamName;
    const lower = name.toLowerCase().trim();
    const isAssigned = assignedTeams.includes(lower);
    const isActive = activeFilter && activeFilter.toLowerCase().trim() === lower;

    button.className = button.className.replace(/ring[\w-]+/g, '').trim();

    if (isAssigned) {
      button.className = 'inline-flex items-center gap-0.5 px-3 py-1 rounded-xl text-xs font-medium transition bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800';
    } else {
      button.className = 'inline-flex items-center gap-0.5 px-3 py-1 rounded-xl text-xs font-medium transition bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900';
    }

    if (isActive) {
      button.className += ' ring-2 ring-offset-1 ring-slate-600';
    }
  });
}

/**
 * Update only assigned teams list without refetching registered teams.
 *
 * @param {HTMLElement} container
 * @param {string[]} newAssignedList
 */
export function updateAssignedTeams(container, newAssignedList) {
  assignedTeams = (newAssignedList || []).map(item => item.toLowerCase().trim());
  if (container) {
    reapplyButtonStates(container);
  }
}

export function getActiveTeamFilter() {
  return activeFilter;
}

export function resetTeamFilter() {
  activeFilter = null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// For test exposure
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, '_registeredTeams', {
    get: () => registeredTeams,
    set: v => { registeredTeams = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, '_assignedTeams', {
    get: () => assignedTeams,
    set: v => { assignedTeams = v; },
    configurable: true,
  });
  Object.defineProperty(globalThis, '_activeFilter', {
    get: () => activeFilter,
    set: v => { activeFilter = v; },
    configurable: true,
  });
}
