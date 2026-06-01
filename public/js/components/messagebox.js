let _toastTimer = null;

function showToast(message, type = "success") {
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

function updateToastProgress(percent, label) {
  const bar = document.getElementById("toastProgressBar");
  const labelEl = document.getElementById("toastProgressLabel");
  if (bar) bar.style.width = Math.min(100, Math.max(0, percent)) + "%";
  if (labelEl && label) labelEl.textContent = label;
}

function dismissToast() {
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

function confirmAction(message = "Deseja continuar?") {
  return new Promise((resolve) => {
    const text = document.getElementById("modalConfirmMessage");

    const btnOk = document.getElementById("modalConfirmOk");

    const btnCancel = document.getElementById("modalConfirmCancel");

    text.textContent = message;

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
