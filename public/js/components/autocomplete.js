export function createAutocomplete({ inputSelector, dropdownSelector, dataSource, filterFn, onSelect, formatItem, onBlur, onInput, scrollToValue }) {
  const input = document.querySelector(inputSelector);
  const dropdown = document.querySelector(dropdownSelector);
  if (!input || !dropdown) return;

  const getOptions = () => typeof dataSource === 'function' ? dataSource() : dataSource;
  const filter = filterFn || ((items, q) => {
    if (!q) return [...items];
    const lower = q.toLowerCase();
    return items.filter(item => String(item).toLowerCase().includes(lower));
  });
  const format = formatItem || (item => String(item));

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
    filtered.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = `px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-sky-100 text-sky-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`;
      div.textContent = format(item);
      div.dataset.value = format(item);

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
        input.value = format(item);
        lastValid = format(item);
        hide();
        if (onSelect) onSelect(item, input);
      });

      dropdown.appendChild(div);
    });

    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const el = dropdown.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    if (scrollToValue && activeIndex < 0) {
      for (let i = 0; i < dropdown.children.length; i++) {
        if (dropdown.children[i].dataset.value === scrollToValue) {
          dropdown.children[i].scrollIntoView({ block: 'center' });
          break;
        }
      }
    }
  }

  input.addEventListener('input', () => {
    filtered = filter(getOptions(), input.value);
    activeIndex = -1;
    render();
    if (onInput) onInput(input.value);
  });

  input.addEventListener('focus', () => {
    filtered = filter(getOptions(), input.value);
    activeIndex = -1;
    render();
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
      let selectedItem;
      if (activeIndex >= 0 && filtered[activeIndex]) {
        input.value = format(filtered[activeIndex]);
        lastValid = format(filtered[activeIndex]);
        selectedItem = filtered[activeIndex];
      } else if (filtered.length > 0) {
        input.value = format(filtered[0]);
        lastValid = format(filtered[0]);
        selectedItem = filtered[0];
      }
      hide();
      if (onSelect) onSelect(selectedItem, input);
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  if (onBlur) {
    input.addEventListener('blur', () => {
      setTimeout(() => {
        onBlur({ input, getOptions, lastValid, setLastValid: v => { lastValid = v; }, hide });
      }, 200);
    });
  } else {
    input.addEventListener('blur', () => {
      setTimeout(() => {
        const options = getOptions();
        const val = input.value.trim();
        if (options.includes(val)) {
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
}

globalThis.createAutocomplete = createAutocomplete;
