import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { evalModule } from "./helpers/eval-module.js";

var htmlContent = readFileSync(resolve(__dirname, "../app/Views/inventory/form.html"), "utf-8");

var toastCalls = [];
globalThis.showToast = function (msg, type) {
  toastCalls.push({ msg, type });
};

globalThis.escapeHtml = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function loadFormController() {
  toastCalls = [];
  evalModule("../public/js/inventory/form.js", "");
}

describe("Inventory Form — View (app/Views/inventory/form.html)", function () {
  beforeEach(function () {
    document.body.innerHTML = htmlContent;
  });

  it("contains standard sub-header with title and subtitle", function () {
    var title = document.getElementById("inventoryFormTitle");
    expect(title).not.toBeNull();
    expect(title.textContent).toContain("Novo Registro de Inventário");
    expect(title.className).toContain("text-2xl font-light tracking-[0.1em]");

    var subtitle = document.getElementById("inventoryFormSubtitle");
    expect(subtitle).not.toBeNull();
    expect(subtitle.className).toContain("text-sm text-slate-400/80 mt-0.5");
  });

  it("contains pastel Back button with no shadow-lg", function () {
    var btnBack = document.querySelector('[data-action="navigate-inventory"]');
    expect(btnBack).not.toBeNull();
    expect(btnBack.textContent.trim()).toContain("← Voltar");
    expect(btnBack.className).toContain("bg-slate-300");
    expect(btnBack.className).toContain("text-slate-900");
    expect(btnBack.className).not.toContain("shadow-lg");
  });

  it("contains form element and hidden inventoryId", function () {
    var form = document.getElementById("inventoryForm");
    expect(form).not.toBeNull();

    var idInput = document.getElementById("inventoryId");
    expect(idInput).not.toBeNull();
    expect(idInput.type).toBe("hidden");
  });

  it("contains category select with all 5 required options", function () {
    var select = document.getElementById("inventoryCategoria");
    expect(select).not.toBeNull();

    var options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["veiculo", "ferramenta", "celular_ti", "equipamento", "outros"]);
  });

  it("contains technician input and autocomplete dropdown container", function () {
    var input = document.getElementById("inventoryTecnicoNome");
    expect(input).not.toBeNull();
    expect(input.getAttribute("autocomplete")).toBe("off");

    var dropdown = document.getElementById("inventoryTecnicoDropdown");
    expect(dropdown).not.toBeNull();
    expect(dropdown.classList.contains("autocomplete-dropdown")).toBe(true);
    expect(dropdown.classList.contains("hidden")).toBe(true);
  });

  it("contains required inputs for material, model and serial", function () {
    var material = document.getElementById("inventoryMaterialNome");
    expect(material).not.toBeNull();
    expect(material.required).toBe(true);

    var modelo = document.getElementById("inventoryModelo");
    expect(modelo).not.toBeNull();
    expect(modelo.required).toBe(true);

    var serial = document.getElementById("inventorySerial");
    expect(serial).not.toBeNull();
    expect(serial.required).toBe(true);
  });

  it("contains withdrawal date (required) and return date (optional)", function () {
    var retirada = document.getElementById("inventoryDataRetirada");
    expect(retirada).not.toBeNull();
    expect(retirada.required).toBe(true);
    expect(retirada.type).toBe("date");

    var devolucao = document.getElementById("inventoryDataDevolucao");
    expect(devolucao).not.toBeNull();
    expect(devolucao.required).toBe(false);
    expect(devolucao.type).toBe("date");
  });

  it("contains observations textarea", function () {
    var obs = document.getElementById("inventoryObservacoes");
    expect(obs).not.toBeNull();
    expect(obs.tagName.toLowerCase()).toBe("textarea");
  });

  it("contains action buttons following pastel palette without shadow-lg", function () {
    var btnCancel = document.getElementById("inventoryFormCancel");
    expect(btnCancel).not.toBeNull();
    expect(btnCancel.className).toContain("bg-slate-300");
    expect(btnCancel.className).toContain("text-slate-900");
    expect(btnCancel.className).not.toContain("shadow-lg");

    var btnSubmit = document.getElementById("inventoryFormSubmit");
    expect(btnSubmit).not.toBeNull();
    expect(btnSubmit.className).toContain("bg-blue-300");
    expect(btnSubmit.className).toContain("text-blue-800");
    expect(btnSubmit.className).not.toContain("shadow-lg");
  });
});

describe("Inventory Form — Controller & Logic (public/js/inventory/form.js)", function () {
  beforeEach(function () {
    document.body.innerHTML = htmlContent;
    window.location.hash = "#/inventoryForm";
    loadFormController();
  });

  describe("getTodayDateString", function () {
    it("returns date string matching YYYY-MM-DD", function () {
      var dateStr = globalThis.getTodayDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("updateCategoryPlaceholders", function () {
    it("adapts labels and placeholders for veiculo", function () {
      document.getElementById("inventoryCategoria").value = "veiculo";
      globalThis.updateCategoryPlaceholders();

      var labelSerial = document.getElementById("labelSerial");
      var serialInput = document.getElementById("inventorySerial");
      expect(labelSerial.textContent).toContain("Placa");
      expect(serialInput.placeholder).toContain("BRA-2E19");
    });

    it("adapts labels and placeholders for ferramenta", function () {
      document.getElementById("inventoryCategoria").value = "ferramenta";
      globalThis.updateCategoryPlaceholders();

      var labelMaterial = document.getElementById("labelMaterialNome");
      var labelSerial = document.getElementById("labelSerial");
      expect(labelMaterial.textContent).toContain("Ferramenta");
      expect(labelSerial.textContent).toContain("Série");
    });

    it("adapts labels and placeholders for celular_ti", function () {
      document.getElementById("inventoryCategoria").value = "celular_ti";
      globalThis.updateCategoryPlaceholders();

      var labelSerial = document.getElementById("labelSerial");
      expect(labelSerial.textContent).toContain("IMEI");
    });
  });

  describe("fetchTechnicians", function () {
    it("fetches technicians list from API and stores them", async function () {
      globalThis.fetch = async function (url) {
        if (url.includes("action=technicians")) {
          return {
            json: async () => ({
              success: true,
              data: ["Carlos Silva", "João Souza", "Maria Oliveira"],
            }),
          };
        }
        return { json: async () => ({ success: false }) };
      };

      var techs = await globalThis.fetchTechnicians();
      expect(techs).toEqual(["Carlos Silva", "João Souza", "Maria Oliveira"]);
      expect(globalThis.technicianList).toEqual(["Carlos Silva", "João Souza", "Maria Oliveira"]);
    });

    it("handles API error gracefully and returns empty array", async function () {
      globalThis.fetch = async function () {
        throw new Error("Network error");
      };

      var techs = await globalThis.fetchTechnicians();
      expect(techs).toEqual([]);
      expect(globalThis.technicianList).toEqual([]);
    });
  });

  describe("setupTechnicianAutocomplete", function () {
    beforeEach(function () {
      globalThis.technicianList = ["Carlos Silva", "Carlos Eduardo", "João Souza", "Mariana Rios"];
      globalThis.setupTechnicianAutocomplete();
    });

    it("renders filtered matches as user types", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      var dropdown = document.getElementById("inventoryTecnicoDropdown");

      input.value = "carlos";
      input.dispatchEvent(new Event("input"));

      expect(dropdown.classList.contains("hidden")).toBe(false);
      var items = dropdown.querySelectorAll(".autocomplete-item");
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain("Carlos Silva");
      expect(items[1].textContent).toContain("Carlos Eduardo");
    });

    it("hides dropdown when no match found", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      var dropdown = document.getElementById("inventoryTecnicoDropdown");

      input.value = "xyz_non_existent";
      input.dispatchEvent(new Event("input"));

      expect(dropdown.classList.contains("hidden")).toBe(true);
      expect(dropdown.querySelectorAll(".autocomplete-item").length).toBe(0);
    });

    it("selects technician on mousedown and hides dropdown", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      var dropdown = document.getElementById("inventoryTecnicoDropdown");

      input.value = "jo";
      input.dispatchEvent(new Event("input"));

      var item = dropdown.querySelector(".autocomplete-item");
      expect(item).not.toBeNull();
      var mdEvent = new Event("mousedown", { bubbles: true });
      item.dispatchEvent(mdEvent);

      expect(input.value).toBe("João Souza");
      expect(dropdown.classList.contains("hidden")).toBe(true);
    });

    it("supports keyboard navigation with ArrowDown, ArrowUp, and Enter", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      var dropdown = document.getElementById("inventoryTecnicoDropdown");

      input.value = "carlos";
      input.dispatchEvent(new Event("input"));

      // Press ArrowDown to highlight first item
      var down1 = new Event("keydown");
      down1.key = "ArrowDown";
      input.dispatchEvent(down1);

      var items = dropdown.querySelectorAll(".autocomplete-item");
      expect(items[0].className).toContain("bg-sky-100");

      // Press ArrowDown to highlight second item
      var down2 = new Event("keydown");
      down2.key = "ArrowDown";
      input.dispatchEvent(down2);

      expect(items[1].className).toContain("bg-sky-100");
      expect(items[0].className).not.toContain("bg-sky-100");

      // Press Enter to select highlighted item
      var enter = new Event("keydown");
      enter.key = "Enter";
      input.dispatchEvent(enter);

      expect(input.value).toBe("Carlos Eduardo");
      expect(dropdown.classList.contains("hidden")).toBe(true);
    });

    it("closes dropdown on Escape key", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      var dropdown = document.getElementById("inventoryTecnicoDropdown");

      input.value = "carlos";
      input.dispatchEvent(new Event("input"));
      expect(dropdown.classList.contains("hidden")).toBe(false);

      var esc = new Event("keydown");
      esc.key = "Escape";
      input.dispatchEvent(esc);
      expect(dropdown.classList.contains("hidden")).toBe(true);
    });

    it("allows custom technician name not in list", function () {
      var input = document.getElementById("inventoryTecnicoNome");
      input.value = "Novo Técnico Externo";
      expect(input.value).toBe("Novo Técnico Externo");
    });
  });

  describe("loadInventoryForm", function () {
    it("initializes form in Create mode by default", async function () {
      window.location.hash = "#/inventoryForm";
      globalThis.fetch = async function (url) {
        if (url.includes("action=technicians")) {
          return { json: async () => ({ success: true, data: ["Carlos Silva"] }) };
        }
        return { json: async () => ({ success: true }) };
      };

      await globalThis.loadInventoryForm();

      expect(document.getElementById("inventoryFormTitle").textContent).toContain("Novo Registro");
      expect(document.getElementById("inventoryFormSubmit").textContent).toContain("Salvar");
      expect(document.getElementById("inventoryId").value).toBe("");
      expect(document.getElementById("inventoryDataRetirada").value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("initializes form in Edit mode when id is present in hash query", async function () {
      window.location.hash = "#/inventoryForm?id=15";
      var fetchedItemUrl = null;

      globalThis.fetch = async function (url) {
        if (url.includes("action=technicians")) {
          return { json: async () => ({ success: true, data: ["Carlos Silva"] }) };
        }
        if (url.includes("id=15")) {
          fetchedItemUrl = url;
          return {
            json: async () => ({
              success: true,
              data: {
                id: 15,
                categoria: "veiculo",
                tecnico_nome: "Carlos Silva",
                material_nome: "Fiat Strada",
                modelo: "1.4 Endurance",
                serial: "BRA-2E19",
                data_retirada: "2026-09-01",
                data_devolucao: "2026-09-15",
                status: "devolvido",
                observacoes: "Em bom estado",
              },
            }),
          };
        }
        return { json: async () => ({ success: false }) };
      };

      await globalThis.loadInventoryForm();

      expect(fetchedItemUrl).toContain("id=15");
      expect(document.getElementById("inventoryFormTitle").textContent).toContain("Editar Registro");
      expect(document.getElementById("inventoryFormSubmit").textContent).toContain("Atualizar");

      expect(document.getElementById("inventoryId").value).toBe("15");
      expect(document.getElementById("inventoryCategoria").value).toBe("veiculo");
      expect(document.getElementById("inventoryTecnicoNome").value).toBe("Carlos Silva");
      expect(document.getElementById("inventoryMaterialNome").value).toBe("Fiat Strada");
      expect(document.getElementById("inventoryModelo").value).toBe("1.4 Endurance");
      expect(document.getElementById("inventorySerial").value).toBe("BRA-2E19");
      expect(document.getElementById("inventoryDataRetirada").value).toBe("2026-09-01");
      expect(document.getElementById("inventoryDataDevolucao").value).toBe("2026-09-15");
      expect(document.getElementById("inventoryObservacoes").value).toBe("Em bom estado");
    });

    it("shows error toast if edit item cannot be found", async function () {
      window.location.hash = "#/inventoryForm?id=999";
      globalThis.fetch = async function (url) {
        if (url.includes("action=technicians")) {
          return { json: async () => ({ success: true, data: [] }) };
        }
        return { json: async () => ({ success: false, message: "Item não encontrado." }) };
      };

      await globalThis.loadInventoryForm();

      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("error");
    });

    it("clicking Back or Cancel button navigates to #/inventory", async function () {
      window.location.hash = "#/inventoryForm";
      globalThis.fetch = async function () {
        return { json: async () => ({ success: true, data: [] }) };
      };

      await globalThis.loadInventoryForm();

      var btnCancel = document.getElementById("inventoryFormCancel");
      btnCancel.click();
      expect(window.location.hash).toBe("#/inventory");

      window.location.hash = "#/inventoryForm";
      var btnBack = document.getElementById("btnBackInventory");
      btnBack.click();
      expect(window.location.hash).toBe("#/inventory");
    });
  });

  describe("saveInventoryForm — Validations", function () {
    beforeEach(function () {
      document.getElementById("inventoryCategoria").value = "ferramenta";
      document.getElementById("inventoryTecnicoNome").value = "Carlos Silva";
      document.getElementById("inventoryMaterialNome").value = "Furadeira Bosch";
      document.getElementById("inventoryModelo").value = "GSB 13 RE";
      document.getElementById("inventorySerial").value = "SN123456";
      document.getElementById("inventoryDataRetirada").value = "2026-09-10";
      document.getElementById("inventoryDataDevolucao").value = "";
      toastCalls = [];
    });

    it("rejects when tecnico_nome is missing", async function () {
      document.getElementById("inventoryTecnicoNome").value = "   ";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("técnico responsável");
    });

    it("rejects when material_nome is missing", async function () {
      document.getElementById("inventoryMaterialNome").value = "";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("material/veículo");
    });

    it("rejects when modelo is missing", async function () {
      document.getElementById("inventoryModelo").value = "";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("modelo");
    });

    it("rejects when serial is missing", async function () {
      document.getElementById("inventorySerial").value = "";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("número de série ou placa");
    });

    it("rejects when data_retirada is missing", async function () {
      document.getElementById("inventoryDataRetirada").value = "";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("data de retirada");
    });

    it("rejects when data_devolucao is earlier than data_retirada", async function () {
      document.getElementById("inventoryDataRetirada").value = "2026-09-10";
      document.getElementById("inventoryDataDevolucao").value = "2026-09-05";
      var result = await globalThis.saveInventoryForm();
      expect(result).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].msg).toContain("não pode ser anterior");
    });
  });

  describe("saveInventoryForm — Submit handling", function () {
    beforeEach(function () {
      document.getElementById("inventoryCategoria").value = "veiculo";
      document.getElementById("inventoryTecnicoNome").value = "Carlos Silva";
      document.getElementById("inventoryMaterialNome").value = "Fiat Strada";
      document.getElementById("inventoryModelo").value = "1.4 Endurance";
      document.getElementById("inventorySerial").value = "BRA-2E19";
      document.getElementById("inventoryDataRetirada").value = "2026-09-01";
      document.getElementById("inventoryDataDevolucao").value = "";
      document.getElementById("inventoryObservacoes").value = "Revisado";
      toastCalls = [];
    });

    it("sends POST request when creating a new item", async function () {
      document.getElementById("inventoryId").value = "";

      var calledUrl = "";
      var calledMethod = "";
      var calledBody = null;

      globalThis.fetch = async function (url, opts) {
        calledUrl = url;
        calledMethod = opts.method;
        calledBody = JSON.parse(opts.body);
        return {
          json: async () => ({
            success: true,
            message: "Item cadastrado com sucesso.",
            data: { id: 88 },
          }),
        };
      };

      var res = await globalThis.saveInventoryForm({ preventDefault: () => {} });

      expect(res.success).toBe(true);
      expect(calledMethod).toBe("POST");
      expect(calledUrl).toContain("route=inventory");
      expect(calledBody.categoria).toBe("veiculo");
      expect(calledBody.tecnico_nome).toBe("Carlos Silva");
      expect(calledBody.material_nome).toBe("Fiat Strada");
      expect(calledBody.serial).toBe("BRA-2E19");
      expect(calledBody.data_devolucao).toBeNull();
      expect(calledBody.observacoes).toBe("Revisado");

      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("success");
      expect(window.location.hash).toBe("#/inventory");
    });

    it("sends PUT request when updating an existing item", async function () {
      document.getElementById("inventoryId").value = "42";
      document.getElementById("inventoryDataDevolucao").value = "2026-09-18";

      var calledUrl = "";
      var calledMethod = "";
      var calledBody = null;

      globalThis.fetch = async function (url, opts) {
        calledUrl = url;
        calledMethod = opts.method;
        calledBody = JSON.parse(opts.body);
        return {
          json: async () => ({
            success: true,
            message: "Item atualizado com sucesso.",
          }),
        };
      };

      var res = await globalThis.saveInventoryForm({ preventDefault: () => {} });

      expect(res.success).toBe(true);
      expect(calledMethod).toBe("PUT");
      expect(calledUrl).toContain("id=42");
      expect(calledBody.id).toBe(42);
      expect(calledBody.data_devolucao).toBe("2026-09-18");

      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("success");
      expect(toastCalls[0].msg).toBe("Item atualizado com sucesso.");
      expect(window.location.hash).toBe("#/inventory");
    });

    it("shows error toast when server returns failure", async function () {
      globalThis.fetch = async function () {
        return {
          json: async () => ({
            success: false,
            message: "Campos obrigatórios não preenchidos.",
          }),
        };
      };

      var res = await globalThis.saveInventoryForm({ preventDefault: () => {} });

      expect(res.success).toBe(false);
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("error");
      expect(toastCalls[0].msg).toBe("Campos obrigatórios não preenchidos.");
    });

    it("handles network error gracefully and shows error toast", async function () {
      globalThis.fetch = async function () {
        throw new Error("Connection failed");
      };

      var res = await globalThis.saveInventoryForm({ preventDefault: () => {} });

      expect(res).toBeNull();
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("error");
      expect(toastCalls[0].msg).toContain("Erro ao salvar item");
    });
  });
});
