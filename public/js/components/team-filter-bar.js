/**
 * team-filter-bar.js
 *
 * Renders registered team buttons in the planned activity sub-header.
 * - Button per registered team: slate when not assigned, emerald when assigned in date range.
 * - Clicking a button toggles the active team filter (plannedTeamFilter).
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

  const buttonsHtml = registeredTeams.map(name => {
    const lower = name.toLowerCase().trim();
    const isAssigned = assignedTeams.includes(lower);
    const isActive = activeFilter && activeFilter.toLowerCase().trim() === lower;

    const baseClass = isAssigned
      ? 'bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800'
      : 'bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900';
    const ringClass = isActive ? ' ring-2 ring-offset-1 ring-slate-600' : '';

    return '<button data-action="team-filter-btn" data-team-name="' +
      name.replace(/"/g, '&quot;') + '" ' +
      'class="px-3 py-1 rounded-xl text-xs font-medium transition' + ringClass + ' ' + baseClass + '">' +
      escapeHtml(name) +
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
      const button = event.target.closest('[data-action="team-filter-btn"]');
      if (!button) return;
      const teamName = button.dataset.teamName;
      toggleFilter(teamName, container);
    });
  }
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
      button.className = 'px-3 py-1 rounded-xl text-xs font-medium transition bg-emerald-300 hover:bg-emerald-400 active:bg-emerald-500 text-emerald-800';
    } else {
      button.className = 'px-3 py-1 rounded-xl text-xs font-medium transition bg-slate-300 hover:bg-slate-400 active:bg-slate-500 text-slate-900';
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
