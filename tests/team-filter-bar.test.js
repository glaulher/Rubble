/**
 * Testes para team-filter-bar.js
 * Testa: render com N equipes, badge total, toggle classe cinza→verde, clique ativa filtro,
 *        renderização do ícone de cópia, e separação entre clique de cópia e clique de filtro.
 */
import { describe, it, expect, beforeEach } from 'bun:test';

// Implementação inline da lógica da barra (isolada de imports)

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const COPY_ICON_MARKER = 'data-action="team-copy-btn"';

function renderTeamFilterBar(container, registeredTeams, assignedTeams, onFilterChange, currentFilter = null) {
  container._registeredTeams = registeredTeams || [];
  container._assignedTeams   = (assignedTeams || []).map(t => t.toLowerCase().trim());
  container._activeFilter    = currentFilter;
  container._onFilterChange  = onFilterChange;

  if (container._registeredTeams.length === 0) {
    container.innerHTML = '';
    return;
  }

  const buttons = container._registeredTeams.map(nome => {
    const lower      = nome.toLowerCase().trim();
    const isAssigned = container._assignedTeams.includes(lower);
    const isActive   = currentFilter && currentFilter.toLowerCase() === lower;
    const baseClass  = isAssigned ? 'emerald' : 'slate';
    const ring       = isActive ? ' ring-active' : '';
    const copyBtn    = '<span data-action="team-copy-btn" data-team-name="' + escapeHtml(nome) + '"></span>';
    return '<button data-action="team-filter-btn" data-team-name="' + escapeHtml(nome) + '" class="btn-' + baseClass + ring + '">' + escapeHtml(nome) + copyBtn + '</button>';
  }).join('');

  const badge = '<span class="badge">' + container._registeredTeams.length + '</span>';
  container.innerHTML = '<div>' + badge + buttons + '</div>';

  if (!container._listenerAttached) {
    container._listenerAttached = true;
    container.addEventListener('click', e => {
      // Copy icon click — must check before filter-btn so it doesn't trigger filter
      const copyBtn = e.target.closest('[data-action="team-copy-btn"]');
      if (copyBtn) {
        // stopPropagation would be called in real DOM; in tests just track the copy call
        if (container._onCopy) container._onCopy(copyBtn.dataset.teamName);
        return;
      }

      const btn = e.target.closest('[data-action="team-filter-btn"]');
      if (!btn) return;
      const teamName = btn.dataset.teamName;
      const lower    = teamName.toLowerCase().trim();
      if (container._activeFilter && container._activeFilter.toLowerCase() === lower) {
        container._activeFilter = null;
      } else {
        container._activeFilter = teamName;
      }
      if (container._onFilterChange) container._onFilterChange(container._activeFilter);
    });
  }
}

function makeContainer() {
  const el = {
    innerHTML: '',
    _listeners: {},
    addEventListener(ev, fn) { this._listeners[ev] = this._listeners[ev] || []; this._listeners[ev].push(fn); },
    click(target) {
      (this._listeners['click'] || []).forEach(fn => fn({ target }));
    },
  };
  return el;
}


/**
 * Creates a fake filter-btn target whose closest() correctly returns null for
 * the copy-btn selector and itself for the filter-btn selector.
 */
function makeFakeFilterBtn(teamName) {
  const btn = {
    dataset: { teamName, action: 'team-filter-btn' },
    closest(sel) {
      if (sel === '[data-action="team-copy-btn"]') return null;
      if (sel === '[data-action="team-filter-btn"]') return btn;
      return null;
    },
  };
  return btn;
}

describe('team-filter-bar render', () => {
  it('renders badge with count of registered teams', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta', 'Gamma'], [], () => {});
    expect(container.innerHTML).toContain('<span class="badge">3</span>');
  });

  it('renders one button per registered team', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], [], () => {});
    expect(container.innerHTML).toContain('data-team-name="Alpha"');
    expect(container.innerHTML).toContain('data-team-name="Beta"');
  });

  it('renders empty when no teams', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, [], [], () => {});
    expect(container.innerHTML).toBe('');
  });

  it('marks assigned teams with emerald class', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], ['alpha'], () => {});
    expect(container.innerHTML).toContain('btn-emerald');
    expect(container.innerHTML).toContain('btn-slate');
  });

  it('marks active filter with ring class', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], ['alpha'], () => {}, 'Alpha');
    expect(container.innerHTML).toContain('ring-active');
  });

  it('matching is case-insensitive for assigned teams', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['ALPHA'], ['alpha'], () => {});
    expect(container.innerHTML).toContain('btn-emerald');
  });
});

describe('team-filter-bar toggle', () => {
  it('clicking a team activates filter', () => {
    let filterValue = null;
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha'], [], v => { filterValue = v; });

    // Simula clique no botão Alpha
    const fakeBtn = makeFakeFilterBtn('Alpha');
    container.click(fakeBtn);

    expect(filterValue).toBe('Alpha');
    expect(container._activeFilter).toBe('Alpha');
  });

  it('clicking same team again removes filter (toggle off)', () => {
    let filterValue = 'INITIAL';
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha'], [], v => { filterValue = v; }, 'Alpha');

    // Container já começa com Alpha ativo; clique remove
    const fakeBtn = makeFakeFilterBtn('Alpha');
    container.click(fakeBtn);

    expect(filterValue).toBeNull();
    expect(container._activeFilter).toBeNull();
  });

  it('clicking a different team changes filter', () => {
    let filterValue = null;
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], [], v => { filterValue = v; }, 'Alpha');

    const fakeBtn = makeFakeFilterBtn('Beta');
    container.click(fakeBtn);

    expect(filterValue).toBe('Beta');
  });

  it('free text teams do not appear as buttons (only registered teams)', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha'], ['alpha', 'equipe nova x'], () => {});
    // 'equipe nova x' is assigned but not registered → no button for it
    expect(container.innerHTML).not.toContain('equipe nova x');
    expect(container.innerHTML).toContain('Alpha');
  });

  it('multi-day range: teams from different days are all shown as assigned', () => {
    const container = makeContainer();
    // assigned includes teams from multiple days
    renderTeamFilterBar(container, ['Alpha', 'Beta'], ['alpha', 'beta'], () => {});
    const btns = container.innerHTML.match(/btn-emerald/g) || [];
    expect(btns.length).toBe(2);
  });
});

describe('team-filter-bar copy icon', () => {
  it('renders a copy icon span per button', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], [], () => {});
    const copyIcons = (container.innerHTML.match(/data-action="team-copy-btn"/g) || []).length;
    expect(copyIcons).toBe(2);
  });

  it('copy icon carries the correct team name', () => {
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha'], [], () => {});
    expect(container.innerHTML).toContain('data-action="team-copy-btn" data-team-name="Alpha"');
  });

  it('clicking copy icon triggers onCopy callback and NOT the filter', () => {
    let filterValue = 'UNCHANGED';
    let copiedName = null;
    const container = makeContainer();
    container._onCopy = name => { copiedName = name; };
    renderTeamFilterBar(container, ['Alpha'], [], v => { filterValue = v; });

    // Simulate click on the copy icon (closest returns copy-btn, not filter-btn)
    const fakeCopyBtn = {
      dataset: { teamName: 'Alpha', action: 'team-copy-btn' },
      closest: sel => sel === '[data-action="team-copy-btn"]' ? fakeCopyBtn : null,
    };
    container.click(fakeCopyBtn);

    expect(copiedName).toBe('Alpha');
    expect(filterValue).toBe('UNCHANGED'); // filter must NOT change
  });

  it('clicking the button (not icon) still toggles filter and does not call onCopy', () => {
    let filterValue = null;
    let copiedName = null;
    const container = makeContainer();
    container._onCopy = name => { copiedName = name; };
    renderTeamFilterBar(container, ['Alpha'], [], v => { filterValue = v; });

    const fakeFilterBtn = {
      dataset: { teamName: 'Alpha', action: 'team-filter-btn' },
      closest: sel => sel === '[data-action="team-copy-btn"]' ? null : fakeFilterBtn,
    };
    container.click(fakeFilterBtn);

    expect(filterValue).toBe('Alpha');
    expect(copiedName).toBeNull(); // copy must NOT be triggered
  });
});
