function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  const toastMessage = document.getElementById("toastMessage");

  const toastIcon = document.getElementById("toastIcon");

  if (!toast) return;

  toastMessage.textContent = message;

  /*
  |--------------------------------------------------------------------------
  | COLORS
  |--------------------------------------------------------------------------
  */
  toastIcon.className = "w-3 h-3 rounded-full";

  if (type === "success") {
    toastIcon.classList.add("bg-emerald-400");
  } else if (type === "error") {
    toastIcon.classList.add("bg-red-400");
  } else {
    toastIcon.classList.add("bg-blue-400");
  }

  /*
  |--------------------------------------------------------------------------
  | SHOW
  |--------------------------------------------------------------------------
  */
  toast.classList.remove("hidden");

  toast.classList.add("animate-[fadeIn_.2s_ease]");

  /*
  |--------------------------------------------------------------------------
  | HIDE
  |--------------------------------------------------------------------------
  */
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
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
