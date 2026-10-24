/**
 * team-autocomplete.js
 *
 * Wrapper providing registered team suggestions for any team/technician input.
 * Caches teams in memory (_teamOptions) per page view.
 *
 * Critical rule: Free text is ALWAYS accepted. On blur, only hide the dropdown;
 * never reject or clear unlisted inputs.
 */

let _teamOptions = null;

/**
 * Fetch and cache registered active teams.
 */
export async function getTeamOptions() {
  if (_teamOptions !== null) return _teamOptions;
  try {
    const res = await fetch('/app/api/index.php?route=teams&limit=9999');
    const result = await res.json();
    _teamOptions = (result.data || []).filter(item => item.ativo == 1 || item.active == 1);
  } catch {
    _teamOptions = [];
  }
  return _teamOptions;
}

/**
 * Invalidate cached team options (e.g. after team CRUD actions).
 */
export function invalidateTeamCache() {
  _teamOptions = null;
}

/**
 * Initialize team autocomplete on an input element.
 *
 * @param {HTMLInputElement|string} input - Input element or selector
 * @param {HTMLElement|string|null} [dropdown] - Dropdown container element or selector
 * @param {Object} [options]
 * @param {number} [options.maxItems=20]
 * @param {Function} [options.onSelect]
 */
export async function initTeamAutocomplete(input, dropdown = null, options = {}) {
  const inputEl = typeof input === 'string' ? document.querySelector(input) : input;
  if (!inputEl) return;

  let dropdownEl = typeof dropdown === 'string' ? document.querySelector(dropdown) : dropdown;
  if (!dropdownEl) {
    dropdownEl = document.createElement('ul');
    dropdownEl.className = 'autocomplete-dropdown hidden absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#3b4459] rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800';
    if (inputEl.parentNode) {
      if (window.getComputedStyle && window.getComputedStyle(inputEl.parentNode).position === 'static') {
        inputEl.parentNode.style.position = 'relative';
      }
      inputEl.parentNode.appendChild(dropdownEl);
    }
  }

  const maxItems = options.maxItems ?? 20;
  const onSelect = options.onSelect ?? null;

  const teamList = await getTeamOptions();

  function showDropdown(query) {
    const lower = (query || '').toLowerCase().trim();
    const filtered = teamList
      .filter(item => (item.nome || item.name || '').toLowerCase().includes(lower))
      .slice(0, maxItems);

    if (filtered.length === 0) {
      dropdownEl.innerHTML = '';
      dropdownEl.classList.add('hidden');
      dropdownEl.style.display = 'none';
      return;
    }

    dropdownEl.innerHTML = filtered.map(item => {
      const name = item.nome || item.name || '';
      return '<li class="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 text-sm text-slate-800 dark:text-slate-100 transition" data-name="' +
        name.replace(/"/g, '&quot;') + '">' + name + '</li>';
    }).join('');
    dropdownEl.classList.remove('hidden');
    dropdownEl.style.display = 'block';
  }

  function hideDropdown() {
    dropdownEl.innerHTML = '';
    dropdownEl.classList.add('hidden');
    dropdownEl.style.display = 'none';
  }

  inputEl.addEventListener('input', () => {
    showDropdown(inputEl.value);
  });

  inputEl.addEventListener('focus', () => {
    showDropdown(inputEl.value);
  });

  // onBlur: only hide dropdown, never clear or revert free text
  inputEl.addEventListener('blur', () => {
    setTimeout(hideDropdown, 180);
  });

  inputEl.addEventListener('keydown', e => {
    const items = dropdownEl.querySelectorAll('li');
    if (!items.length) return;

    const active = dropdownEl.querySelector('li.bg-slate-200');
    let index = Array.from(items).indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      index = (index + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      index = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      const selectedName = active.dataset.name;
      inputEl.value = selectedName;
      hideDropdown();
      if (onSelect) onSelect(selectedName);
      return;
    } else if (e.key === 'Escape') {
      hideDropdown();
      return;
    } else {
      return;
    }

    items.forEach(li => li.classList.remove('bg-slate-200', 'dark:bg-slate-700'));
    if (items[index]) items[index].classList.add('bg-slate-200', 'dark:bg-slate-700');
  });

  dropdownEl.addEventListener('mousedown', e => {
    const li = e.target.closest('li[data-name]');
    if (!li) return;
    e.preventDefault();
    const selectedName = li.dataset.name;
    inputEl.value = selectedName;
    hideDropdown();
    if (onSelect) onSelect(selectedName);
  });
}

// For test exposure
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, '_teamOptions', {
    get: () => _teamOptions,
    set: v => { _teamOptions = v; },
    configurable: true,
  });
}
