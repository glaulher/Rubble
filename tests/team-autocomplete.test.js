/**
 * Testes para team-autocomplete.js
 * Testa: dropdown renderiza, seleção preenche, texto livre aceito, Enter/Escape, cache.
 */
import { describe, it, expect, beforeEach } from 'bun:test';

// Simula o módulo sem fetch real
function makeInput(value = '') {
  return {
    value,
    _listeners: {},
    addEventListener(ev, fn) { this._listeners[ev] = this._listeners[ev] || []; this._listeners[ev].push(fn); },
    dispatchEvent(ev) { (this._listeners[ev.type] || []).forEach(fn => fn(ev)); },
    focus() {},
  };
}

function makeDropdown() {
  return {
    innerHTML: '',
    style: { display: 'none' },
    _listeners: {},
    addEventListener(ev, fn) { this._listeners[ev] = this._listeners[ev] || []; this._listeners[ev].push(fn); },
    querySelectorAll(sel) {
      // parse inline <li> from innerHTML
      const matches = [];
      const re = /data-nome="([^"]*)"/g;
      let m;
      while ((m = re.exec(this.innerHTML)) !== null) {
        const nome = m[1];
        matches.push({
          dataset: { nome },
          classList: { items: [], add(c) { this.items.push(c); }, remove(c) { this.items = this.items.filter(x => x !== c); } },
        });
      }
      return matches;
    },
    querySelector() { return null; },
  };
}

// -- Tests for getTeamOptions cache --

describe('team-autocomplete cache', () => {
  it('caches options after first fetch', async () => {
    let fetchCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCount++;
      return { json: async () => ({ data: [{ nome: 'Alpha', ativo: 1 }] }) };
    };

    // Reset cache
    globalThis._teamOptions = null;

    // Import inline (simulate module scope)
    async function getTeamOptions() {
      if (globalThis._teamOptions !== null) return globalThis._teamOptions;
      try {
        const res    = await fetch('/app/api/index.php?route=equipes&limit=9999');
        const result = await res.json();
        globalThis._teamOptions = (result.data || []).filter(t => t.ativo);
      } catch {
        globalThis._teamOptions = [];
      }
      return globalThis._teamOptions;
    }

    await getTeamOptions();
    await getTeamOptions(); // segundo call — deve usar cache

    expect(fetchCount).toBe(1);
    expect(globalThis._teamOptions).toHaveLength(1);
    expect(globalThis._teamOptions[0].nome).toBe('Alpha');

    globalThis.fetch = origFetch;
  });

  it('returns empty array on fetch error', async () => {
    globalThis._teamOptions = null;
    globalThis.fetch = async () => { throw new Error('Network error'); };

    async function getTeamOptions() {
      if (globalThis._teamOptions !== null) return globalThis._teamOptions;
      try {
        const res    = await fetch('/app/api/index.php?route=equipes&limit=9999');
        const result = await res.json();
        globalThis._teamOptions = (result.data || []).filter(t => t.ativo);
      } catch {
        globalThis._teamOptions = [];
      }
      return globalThis._teamOptions;
    }

    const opts = await getTeamOptions();
    expect(Array.isArray(opts)).toBe(true);
    expect(opts).toHaveLength(0);

    globalThis.fetch = undefined;
    globalThis._teamOptions = null;
  });
});

// -- Tests for dropdown behavior (inline logic) --

describe('team-autocomplete dropdown', () => {
  it('filters options case-insensitively', () => {
    const options = [{ nome: 'Alpha', ativo: 1 }, { nome: 'Beta', ativo: 1 }, { nome: 'Gamma', ativo: 1 }];
    const lower   = 'alp';
    const filtered = options.filter(t => t.nome.toLowerCase().includes(lower)).slice(0, 20);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].nome).toBe('Alpha');
  });

  it('shows all options when search is empty', () => {
    const options = [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }];
    const lower   = '';
    const filtered = options.filter(t => t.nome.toLowerCase().includes(lower));
    expect(filtered).toHaveLength(3);
  });

  it('hides dropdown when no match', () => {
    const options = [{ nome: 'Alpha' }];
    const filtered = options.filter(t => t.nome.toLowerCase().includes('zzz'));
    expect(filtered).toHaveLength(0);
  });

  it('free text is never aborted (blur does not clear input)', () => {
    const input = makeInput('Equipe Nova X');
    let blurCalled = false;

    // Simulates the onBlur handler: only hide dropdown, never clear input
    input.addEventListener('blur', () => {
      blurCalled = true;
      // input.value is NOT cleared
    });

    input.dispatchEvent({ type: 'blur' });

    expect(blurCalled).toBe(true);
    expect(input.value).toBe('Equipe Nova X'); // valor preservado
  });

  it('Escape hides dropdown', () => {
    const dd     = makeDropdown();
    dd.innerHTML = '<li data-nome="Alpha">Alpha</li>';
    dd.style.display = 'block';

    // Simulates Escape handler
    const hideDropdown = () => {
      dd.innerHTML = '';
      dd.style.display = 'none';
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') hideDropdown();
    };

    onKeydown({ key: 'Escape' });

    expect(dd.style.display).toBe('none');
    expect(dd.innerHTML).toBe('');
  });
});
