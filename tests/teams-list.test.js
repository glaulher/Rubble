import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { evalModule } from "./helpers/eval-module.js";

const htmlContent = readFileSync(resolve(__dirname, "../app/Views/teams/list.html"), "utf-8");

globalThis.escapeHtml = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

globalThis.iconButtonHtml = function (type, tooltip, attrs) {
  const c = type === "edit" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500";
  let attrStr = "";
  if (attrs) {
    for (const k in attrs) {
      attrStr += " " + k + '="' + attrs[k] + '"';
    }
  }
  return '<button class="' + c + ' p-2 rounded-xl"' + attrStr + ">" + tooltip + "</button>";
};

let toastCalls = [];
globalThis.showToast = function (msg, type) {
  toastCalls.push({ msg, type });
};

let confirmDeleteResult = true;
let deleteCalls = [];
globalThis.confirmDelete = async function (title, msg, name) {
  deleteCalls.push({ title, msg, name });
  return confirmDeleteResult;
};

globalThis.invalidateTeamCache = function () {};

const mockTeams = [
  { id: 1, nome: "Alpha Team", tecnico: "João Silva", placa: "TBO-9J41", veiculo: "Kangoo", contrato: "ARCON", ativo: 1, created_at: "2026-10-23 10:00:00" },
  { id: 2, nome: "Beta Team", tecnico: "Carlos Pereira", placa: "KOY-5F34", veiculo: "Duster", contrato: "SUBCONTRATADA", ativo: 0, created_at: "2026-10-23 11:00:00" },
];

let lastFetchRequest = null;
globalThis.fetch = async (url, opts) => {
  lastFetchRequest = { url, opts };
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: mockTeams,
    }),
  };
};

evalModule("../public/js/teams/list.js", "");

describe("Teams List — Navigation and Action Listeners", () => {
  beforeEach(() => {
    toastCalls = [];
    deleteCalls = [];
    lastFetchRequest = null;
    document.body.innerHTML = htmlContent;
  });

  it("attaches action listeners on initial visit", async () => {
    await initTeams();

    const editBtn = document.querySelector('button[data-action="edit-team"][data-team-id="1"]');
    expect(editBtn).not.toBeNull();

    editBtn.click();

    const modal = document.getElementById("teamModal");
    expect(modal.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("teamModalNome").value).toBe("Alpha Team");
    expect(document.getElementById("teamModalTitle").textContent).toBe("Editar Equipe");
  });

  it("reattaches action listeners when navigating away and back without page refresh", async () => {
    // Visit 1
    await initTeams();

    // Simulate SPA navigation away: DOM replaced by another view
    document.body.innerHTML = '<div id="other-view">Another view</div>';

    // Simulate SPA navigation back: DOM replaced with teams/list.html again
    document.body.innerHTML = htmlContent;

    // Visit 2
    await initTeams();

    const editBtn = document.querySelector('button[data-action="edit-team"][data-team-id="1"]');
    expect(editBtn).not.toBeNull();

    // In the buggy version, this click fails to open the modal because the listener was only attached to visit 1's tbody
    editBtn.click();

    const modal = document.getElementById("teamModal");
    expect(modal.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("teamModalNome").value).toBe("Alpha Team");
  });

  it("allows deleting teams when navigating back to the view", async () => {
    // Visit 1
    await initTeams();

    // Navigate away and back
    document.body.innerHTML = htmlContent;
    await initTeams();

    const deleteBtn = document.querySelector('button[data-action="delete-team"][data-team-id="2"]');
    expect(deleteBtn).not.toBeNull();

    deleteBtn.click();

    // confirmDelete should have been triggered
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0].name).toBe("Beta Team");
  });

  it("renders new columns (tecnico, placa, veiculo, contrato) in table rows", async () => {
    await initTeams();

    const row = document.querySelector('tr[data-team-id="1"]');
    expect(row).not.toBeNull();
    expect(row.textContent).toContain("João Silva");
    expect(row.textContent).toContain("TBO-9J41");
    expect(row.textContent).toContain("Kangoo");
    expect(row.textContent).toContain("ARCON");
  });

  it("populates modal with tecnico, placa, veiculo, contrato on edit and sends on save", async () => {
    await initTeams();

    const editBtn = document.querySelector('button[data-action="edit-team"][data-team-id="1"]');
    editBtn.click();

    expect(document.getElementById("teamModalTecnico").value).toBe("João Silva");
    expect(document.getElementById("teamModalPlaca").value).toBe("TBO-9J41");
    expect(document.getElementById("teamModalVeiculo").value).toBe("Kangoo");
    expect(document.getElementById("teamModalContrato").value).toBe("ARCON");

    // Change vehicle and save
    document.getElementById("teamModalVeiculo").value = "Fiorino";
    const saveBtn = document.querySelector('button[data-action="save-team"]');
    await saveBtn.click();

    expect(lastFetchRequest).not.toBeNull();
    const sentBody = JSON.parse(lastFetchRequest.opts.body);
    expect(sentBody.tecnico).toBe("João Silva");
    expect(sentBody.placa).toBe("TBO-9J41");
    expect(sentBody.veiculo).toBe("Fiorino");
    expect(sentBody.contrato).toBe("ARCON");
  });
});
