let _toastTimer = null;

export function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

export function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  const toastMessage = document.getElementById("toastMessage");

  const toastIcon = document.getElementById("toastIcon");

  const toastProgress = document.getElementById("toastProgress");

  if (!toast) return;

  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  toastMessage.textContent = message;

  toastIcon.className = "w-3 h-3 rounded-full";

  if (type === "success") {
    toastIcon.classList.add("bg-emerald-400");
  } else if (type === "error") {
    toastIcon.classList.add("bg-red-400");
  } else if (type === "loading") {
    toastIcon.classList.add("bg-sky-400");
    toastIcon.classList.add("animate-pulse");
  } else {
    toastIcon.classList.add("bg-blue-400");
  }

  if (toastProgress) {
    toastProgress.classList.toggle("hidden", type !== "loading");
  }

  toast.classList.remove("hidden");

  toast.classList.add("animate-[fadeIn_.2s_ease]");

  if (type !== "loading") {
    _toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
}

export function updateToastProgress(percent, label) {
  const bar = document.getElementById("toastProgressBar");
  const labelEl = document.getElementById("toastProgressLabel");
  if (bar) bar.style.width = Math.min(100, Math.max(0, percent)) + "%";
  if (labelEl && label) labelEl.textContent = label;
}

export function dismissToast() {
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  const toast = document.getElementById("toast");
  if (toast) toast.classList.add("hidden");

  const bar = document.getElementById("toastProgressBar");
  if (bar) bar.style.width = "0%";

  const labelEl = document.getElementById("toastProgressLabel");
  if (labelEl) labelEl.textContent = "";
}

export function confirmAction(title, message, buttonText, variant) {
  return new Promise((resolve) => {
    const titleEl = document.getElementById("modalConfirmTitle");
    const msgEl = document.getElementById("modalConfirmMessage");
    const btnOk = document.getElementById("modalConfirmOk");
    const btnCancel = document.getElementById("modalConfirmCancel");

    if (titleEl) titleEl.textContent = title || 'Confirmar ação';
    if (msgEl) msgEl.textContent = message || 'Deseja continuar?';
    if (btnOk) btnOk.textContent = buttonText || 'Excluir';

    if (variant === 'confirm') {
      btnOk.className = 'flex-1 bg-blue-300 hover:bg-blue-400 active:bg-blue-500 text-blue-800 py-3 rounded-xl font-medium transition';
    } else {
      btnOk.className = 'flex-1 bg-red-300 hover:bg-red-400 active:bg-red-500 text-red-800 py-3 rounded-xl font-medium transition';
    }

    showModal('modalConfirm');

    btnCancel.onclick = () => {
      hideModal('modalConfirm');
      resolve(false);
    };

    btnOk.onclick = () => {
      hideModal('modalConfirm');
      resolve(true);
    };
  });
}

export function confirmDelete(title, message, itemName) {
  return new Promise((resolve) => {
    var titleEl = document.getElementById('deleteConfirmTitle');
    var msgEl = document.getElementById('deleteConfirmMessage');
    var itemEl = document.getElementById('deleteConfirmItem');
    var btnOk = document.getElementById('deleteConfirmOk');
    var btnCancel = document.getElementById('deleteConfirmCancel');

    if (titleEl) titleEl.textContent = title || 'Excluir';
    if (msgEl) msgEl.textContent = message || 'Tem certeza que deseja excluir ';
    if (itemEl) itemEl.textContent = itemName || '';

    showModal('modalDeleteConfirm');

    btnOk.onclick = () => {
      hideModal('modalDeleteConfirm');
      resolve(true);
    };

    btnCancel.onclick = () => {
      hideModal('modalDeleteConfirm');
      resolve(false);
    };
  });
}
