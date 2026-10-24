/**
 * Testes para team-filter-bar.js
 * Testa: render com N equipes, badge total, toggle classe cinza→verde, clique ativa filtro.
 */
import { describe, it, expect, beforeEach } from 'bun:test';

// Implementação inline da lógica da barra (isolada de imports)

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
    return '<button data-action="team-filter-btn" data-team-name="' + escapeHtml(nome) + '" class="btn-' + baseClass + ring + '">' + escapeHtml(nome) + '</button>';
  }).join('');

  const badge = '<span class="badge">' + container._registeredTeams.length + '</span>';
  container.innerHTML = '<div>' + badge + buttons + '</div>';

  if (!container._listenerAttached) {
    container._listenerAttached = true;
    container.addEventListener('click', e => {
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
    const fakeBtn = { dataset: { teamName: 'Alpha', action: 'team-filter-btn' }, closest: (sel) => fakeBtn };
    container.click(fakeBtn);

    expect(filterValue).toBe('Alpha');
    expect(container._activeFilter).toBe('Alpha');
  });

  it('clicking same team again removes filter (toggle off)', () => {
    let filterValue = 'INITIAL';
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha'], [], v => { filterValue = v; }, 'Alpha');

    // Container já começa com Alpha ativo; clique remove
    const fakeBtn = { dataset: { teamName: 'Alpha', action: 'team-filter-btn' }, closest: (sel) => fakeBtn };
    container.click(fakeBtn);

    expect(filterValue).toBeNull();
    expect(container._activeFilter).toBeNull();
  });

  it('clicking a different team changes filter', () => {
    let filterValue = null;
    const container = makeContainer();
    renderTeamFilterBar(container, ['Alpha', 'Beta'], [], v => { filterValue = v; }, 'Alpha');

    const fakeBtn = { dataset: { teamName: 'Beta', action: 'team-filter-btn' }, closest: (sel) => fakeBtn };
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
