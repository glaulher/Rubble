import { describe, it, expect, beforeEach, afterEach } from "bun:test";

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");
  if (!toast) return;

  toastMessage.textContent = message;
  toastIcon.className = "w-3 h-3 rounded-full";

  if (type === "success") {
    toastIcon.classList.add("bg-emerald-400");
  } else if (type === "error") {
    toastIcon.classList.add("bg-red-400");
  } else {
    toastIcon.classList.add("bg-blue-400");
  }

  toast.classList.remove("hidden");
  toast.classList.add("animate-[fadeIn_.2s_ease]");

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

describe("showToast", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="toast" class="hidden">' +
        '<span id="toastMessage"></span>' +
        '<span id="toastIcon"></span>' +
      '</div>';
  });

  it("sets the message text", () => {
    showToast("Test message");
    expect(document.getElementById("toastMessage").textContent).toBe("Test message");
  });

  it("adds success class by default", () => {
    showToast("OK");
    var icon = document.getElementById("toastIcon");
    expect(icon.classList.contains("bg-emerald-400")).toBe(true);
  });

  it("adds error class when type is error", () => {
    showToast("Error", "error");
    var icon = document.getElementById("toastIcon");
    expect(icon.classList.contains("bg-red-400")).toBe(true);
  });

  it("adds blue class for unknown type", () => {
    showToast("Info", "info");
    var icon = document.getElementById("toastIcon");
    expect(icon.classList.contains("bg-blue-400")).toBe(true);
  });

  it("shows the toast", () => {
    showToast("Test");
    var toast = document.getElementById("toast");
    expect(toast.classList.contains("hidden")).toBe(false);
  });

  it("returns early when toast element missing", () => {
    document.body.innerHTML = "";
    expect(() => showToast("Test")).not.toThrow();
  });
});

describe("confirmAction", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="modalConfirm" class="hidden">' +
        '<p id="modalConfirmMessage"></p>' +
        '<button id="modalConfirmOk">OK</button>' +
        '<button id="modalConfirmCancel">Cancelar</button>' +
      '</div>';
  });

  afterEach(() => {
    clearTimeout(globalThis._confirmTimer);
  });

  it("sets the message text", async () => {
    var promise = confirmAction("Tem certeza?");
    expect(document.getElementById("modalConfirmMessage").textContent).toBe("Tem certeza?");
    document.getElementById("modalConfirmCancel").click();
    await promise;
  });

  it("resolves false when cancel is clicked", async () => {
    var promise = confirmAction();
    document.getElementById("modalConfirmCancel").click();
    var result = await promise;
    expect(result).toBe(false);
  });

  it("resolves true when OK is clicked", async () => {
    var promise = confirmAction();
    document.getElementById("modalConfirmOk").click();
    var result = await promise;
    expect(result).toBe(true);
  });
});
