function setupLpuDescriptionAutocomplete(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const input = row.querySelector('.item-descricao-lpu');
  const dropdown = row.querySelector('.autocomplete-dropdown');
  const lpuOrigemSelect = row.querySelector('.item-lpu-origem');
  const numeroItemInput = row.querySelector('.item-numero-item');
  const valorInput = row.querySelector('.item-valor');

  let activeIndex = -1;
  let items = [];

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (items.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = `${item.numero_item} - ${item.descricao}`;
      div.dataset.index = i;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove(
            'bg-sky-100',
            'text-sky-900',
            'font-medium'
          );
          dropdown.children[activeIndex].classList.add(
            'text-slate-700',
            'hover:bg-slate-100'
          );
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
        numeroItemInput.value = item.numero_item;
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.descricao;
        numeroItemInput.value = item.numero_item;
        valorInput.value = item.valor;
        updateItemUnit(row, item.unidade);
        hide();
        calculateItemTotal(index);
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < items.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  async function search(q) {
    const lpu = lpuOrigemSelect.value;
    if (!lpu || q.length < 2) {
      items = [];
      render();
      return;
    }
    try {
      const res = await fetch(
        `/app/api/index.php?route=pv&action=search-lpu&lpu_origem=${encodeURIComponent(lpu)}&q=${encodeURIComponent(q)}`
      );
      const result = await res.json();
      items = result.success ? result.data || [] : [];
    } catch {
      items = [];
    }
    activeIndex = -1;
    render();
  }

  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = input.value;
    if (val.length < 2) {
      items = [];
      render();
      return;
    }
    debounceTimer = setTimeout(() => search(val), 250);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      render();
      if (items[activeIndex])
        numeroItemInput.value = items[activeIndex].numero_item;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      if (items[activeIndex])
        numeroItemInput.value = items[activeIndex].numero_item;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) {
        input.value = item.descricao;
        numeroItemInput.value = item.numero_item;
        valorInput.value = item.valor;
        updateItemUnit(row, item.unidade);
        hide();
        calculateItemTotal(index);
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 200));

  lpuOrigemSelect.addEventListener('change', () => {
    items = [];
    hide();
  });
}

function setupStatusAutocomplete(index) {
  const row = document.querySelector(`.item-row[data-item-index="${index}"]`);
  if (!row) return;

  const input = row.querySelector('.item-status');
  const dropdown = row.querySelector('.status-dropdown');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let filtered = [];
  let lastValid = input.value;

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    filtered.forEach((status, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = status;
      div.dataset.value = status;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
          dropdown.children[activeIndex].classList.add('text-slate-700', 'hover:bg-slate-100');
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = status;
        lastValid = status;
        hide();
      });

      dropdown.appendChild(div);
    });
  }

  function filterStatuses(query) {
    if (!query) {
      filtered = [...PV_STATUSES];
    } else {
      const q = query.toLowerCase();
      filtered = PV_STATUSES.filter((s) => s.toLowerCase().includes(q));
    }
    activeIndex = -1;
    render();
  }

  input.addEventListener('input', () => {
    filterStatuses(input.value);
  });

  input.addEventListener('focus', () => {
    filterStatuses(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        input.value = filtered[activeIndex];
        lastValid = filtered[activeIndex];
      } else if (filtered.length > 0) {
        input.value = filtered[0];
        lastValid = filtered[0];
      }
      hide();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      const val = input.value.trim();
      if (PV_STATUSES.includes(val)) {
        lastValid = val;
      } else {
        input.value = lastValid;
      }
      hide();
    }, 200);
  });
}

function setupLocalAutocomplete() {
  const input = document.getElementById('local');
  const dropdown = document.querySelector('.local-dropdown');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let filtered = [];
  let lastValid = input.value;

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    filtered.forEach((local, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = local;
      div.dataset.value = local;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
          dropdown.children[activeIndex].classList.add('text-slate-700', 'hover:bg-slate-100');
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = local;
        lastValid = local;
        hide();
        filterEquipamentos();
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function filterLocals(query) {
    if (!query) {
      filtered = [...pvLocalOptions];
    } else {
      const q = query.toLowerCase();
      filtered = pvLocalOptions.filter((l) => l.toLowerCase().includes(q));
    }
    activeIndex = -1;
    render();
  }

  input.addEventListener('input', () => {
    filterLocals(input.value);
    filterEquipamentos();
  });

  input.addEventListener('focus', () => {
    filterLocals(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        input.value = filtered[activeIndex];
        lastValid = filtered[activeIndex];
      } else if (filtered.length > 0) {
        input.value = filtered[0];
        lastValid = filtered[0];
      }
      hide();
      filterEquipamentos();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      const val = input.value.trim();
      if (pvLocalOptions.includes(val)) {
        lastValid = val;
      } else if (!val) {
        lastValid = '';
      } else {
        input.value = lastValid;
      }
      hide();
    }, 200);
  });
}

function setupOsAutocomplete() {
  const input = document.getElementById('os');
  const dropdown = document.querySelector('.os-dropdown');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let filtered = [];
  let lastValid = input.value;

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    filtered.forEach((os, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = os;
      div.dataset.value = os;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
          dropdown.children[activeIndex].classList.add('text-slate-700', 'hover:bg-slate-100');
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = os;
        lastValid = os;
        hide();
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function filterOs(query) {
    if (!query) {
      filtered = [...pvOsOptions];
    } else {
      const q = query.toLowerCase();
      filtered = pvOsOptions.filter((o) => o.toLowerCase().includes(q));
    }
    activeIndex = -1;
    render();
  }

  input.addEventListener('input', () => {
    filterOs(input.value);
  });

  input.addEventListener('focus', () => {
    filterOs(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        input.value = filtered[activeIndex];
        lastValid = filtered[activeIndex];
      } else if (filtered.length > 0) {
        input.value = filtered[0];
        lastValid = filtered[0];
      }
      hide();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      const val = input.value.trim();
      if (pvOsOptions.includes(val)) {
        lastValid = val;
      } else if (!val) {
        lastValid = '';
      } else {
        input.value = lastValid;
      }
      hide();
    }, 200);
  });
}

function setupCicloAutocomplete() {
  const input = document.getElementById('ciclo');
  const dropdown = document.querySelector('.ciclo-dropdown');
  if (!input || !dropdown) return;

  const allOptions = generateCicloOptions();

  let activeIndex = -1;
  let filtered = [];
  let lastValid = input.value;

  function hide() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function render() {
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    dropdown.classList.remove('hidden');
    filtered.forEach((ciclo, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = ciclo;

      div.addEventListener('mouseenter', () => {
        if (activeIndex >= 0 && dropdown.children[activeIndex]) {
          dropdown.children[activeIndex].classList.remove('bg-sky-100', 'text-sky-900', 'font-medium');
          dropdown.children[activeIndex].classList.add('text-slate-700', 'hover:bg-slate-100');
        }
        activeIndex = i;
        div.classList.remove('text-slate-700', 'hover:bg-slate-100');
        div.classList.add('bg-sky-100', 'text-sky-900', 'font-medium');
      });

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = ciclo;
        lastValid = ciclo;
        hide();
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function filterCiclos(query) {
    if (!query) {
      filtered = [...allOptions];
    } else {
      const q = query.toLowerCase();
      filtered = allOptions.filter((c) => c.toLowerCase().startsWith(q));
    }
    activeIndex = -1;
    render();
  }

  input.addEventListener('input', () => {
    filterCiclos(input.value);
  });

  input.addEventListener('focus', () => {
    filterCiclos(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        input.value = filtered[activeIndex];
        lastValid = filtered[activeIndex];
      } else if (filtered.length > 0) {
        input.value = filtered[0];
        lastValid = filtered[0];
      }
      hide();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      const val = input.value.trim();
      const match = val.match(/^(\d{4})-(\d)$/);
      if (match) {
        input.value = match[1] + '-0' + match[2];
      }
      const final = input.value.trim();
      if (allOptions.includes(final)) {
        lastValid = final;
      } else if (!final) {
        lastValid = '';
      } else {
        input.value = lastValid;
      }
      hide();
    }, 200);
  });
}
