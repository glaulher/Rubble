import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { evalModule } from "./helpers/eval-module.js";

var htmlContent = readFileSync(resolve(__dirname, "../app/Views/inventory/list.html"), "utf-8");

var mockInfiniteScroll = `
  var _mockScrollInstance = null;
  function createInfiniteScroll(opts) {
    _mockScrollInstance = {
      _opts: opts,
      _state: { data: [], page: 0, allLoaded: false, loading: false, total: 0 },
      init: function () {
        if (opts.fetchFn) {
          var p = opts.fetchFn({ limit: opts.limit || 20, offset: 0 }, {});
          if (p && typeof p.then === 'function') {
            p.then((res) => {
              if (res && res.data) {
                this._state.data = res.data;
                this._state.total = res.total || res.data.length;
              }
              if (opts.renderFn) opts.renderFn();
            });
          }
        }
        return this;
      },
      destroy: function () {},
      reset: function () {
        this._state.data = [];
        this._state.page = 0;
        return this;
      },
      load: function () {},
      getState: function () { return this._state; },
    };
    return _mockScrollInstance;
  }
`;

// Global mocks
globalThis.escapeHtml = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

globalThis.iconButtonHtml = function (type, tooltip, attrs, tooltipPos) {
  var c = type === "edit" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500";
  var attrStr = "";
  if (attrs) {
    for (var k in attrs) {
      attrStr += " " + k + '="' + attrs[k] + '"';
    }
  }
  return '<button class="' + c + ' p-2 rounded-xl"' + attrStr + ">" + tooltip + "</button>";
};

var toastCalls = [];
globalThis.showToast = function (msg, type) {
  toastCalls.push({ msg, type });
};

var confirmDeleteResult = true;
globalThis.confirmDelete = async function (title, msg, name) {
  return confirmDeleteResult;
};

globalThis.getUser = function () {
  return { id: 1, role: "admin", nome: "Admin" };
};

var downloadCsvCalls = [];
globalThis.downloadCSV = function (filename, header, rowBuilder) {
  var rows = [];
  rowBuilder((cells) => {
    rows.push(cells);
  });
  downloadCsvCalls.push({ filename, header, rows });
};

globalThis.sanitizeCSV = function (val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/;/g, ",").replace(/\n/g, " ").replace(/\r/g, " ").replace(/"/g, "'").trim();
};

describe("Inventory List — View (app/Views/inventory/list.html)", function () {
  beforeEach(function () {
    document.body.innerHTML = htmlContent;
  });

  it("contains standard sub-header with title and subtitle", function () {
    var h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1.textContent.trim()).toContain("Inventário");
    expect(h1.className).toContain("text-2xl font-light tracking-[0.1em]");

    var subtitle = document.querySelector("p");
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain("Controle de materiais, ferramentas, celulares e veículos");
    expect(subtitle.className).toContain("text-sm text-slate-400/80 mt-0.5");
  });

  it("contains counter element for items currently in possession", function () {
    var counter = document.getElementById("inventoryCounter");
    var counterLabel = document.getElementById("inventoryCounterLabel");
    expect(counter).not.toBeNull();
    expect(counter.textContent).toBe("0");
    expect(counterLabel).not.toBeNull();
    expect(counterLabel.textContent).toContain("em campo");
  });

  it("contains + Novo Item pastel emerald button without shadow-lg", function () {
    var btn = document.querySelector('[data-action="navigate-inventory-form"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toContain("+ Novo Item");
    expect(btn.className).toContain("bg-emerald-300");
    expect(btn.className).toContain("text-emerald-800");
    expect(btn.className).not.toContain("shadow-lg");
  });

  it("contains search input with proper placeholder", function () {
    var input = document.getElementById("inventorySearchInput");
    expect(input).not.toBeNull();
    expect(input.placeholder).toContain("Buscar");
  });

  it("contains status filter pills (Todos, Em posse, Devolvido)", function () {
    var pillGroup = document.getElementById("inventoryStatusPills");
    expect(pillGroup).not.toBeNull();
    var pills = pillGroup.querySelectorAll(".status-pill");
    expect(pills.length).toBe(3);

    var statuses = Array.from(pills).map((p) => p.dataset.status);
    expect(statuses).toEqual(["", "em_posse", "devolvido"]);
  });

  it("contains status filter select with expected options", function () {
    var select = document.getElementById("inventoryStatusFilter");
    expect(select).not.toBeNull();
    var options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["", "em_posse", "devolvido"]);
  });

  it("contains CSV download button with file SVG, tooltip, and pastel emerald palette", function () {
    var csvBtn = document.querySelector('[data-action="generate-csv"]');
    expect(csvBtn).not.toBeNull();
    expect(csvBtn.className).toContain("bg-emerald-300");
    expect(csvBtn.className).toContain("text-emerald-800");
    expect(csvBtn.className).not.toContain("shadow-lg");

    var svg = csvBtn.querySelector("svg");
    expect(svg).not.toBeNull();

    var tooltip = csvBtn.parentElement.querySelector("span");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent.trim()).toBe("Gerar relatório CSV");
  });

  it("contains category filter select with expected categories", function () {
    var select = document.getElementById("inventoryCategoryFilter");
    expect(select).not.toBeNull();
    var options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("");
    expect(options).toContain("veiculo");
    expect(options).toContain("ferramenta");
    expect(options).toContain("celular_ti");
    expect(options).toContain("equipamento");
    expect(options).toContain("outros");
  });

  it("contains responsive table structure and sentinel", function () {
    var tbody = document.getElementById("inventoryTableBody");
    expect(tbody).not.toBeNull();

    var empty = document.getElementById("inventoryEmpty");
    expect(empty).not.toBeNull();
    expect(empty.classList.contains("hidden")).toBe(true);

    var sentinel = document.getElementById("sentinel");
    expect(sentinel).not.toBeNull();
  });
});

describe("Inventory List — Controller & Logic (public/js/inventory/list.js)", function () {
  beforeEach(function () {
    document.body.innerHTML = htmlContent;
    toastCalls = [];
    confirmDeleteResult = true;
    window.location.hash = "#/inventory";
    globalThis.fetch = async function () {
      return {
        json: async () => ({ success: true, data: [], total: 0 }),
      };
    };
    (0, eval)(mockInfiniteScroll);
    evalModule("../public/js/inventory/list.js", "");
  });

  describe("formatDate helper", function () {
    it("formats ISO date (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY)", function () {
      expect(globalThis.formatDate("2026-09-19")).toBe("19/09/2026");
      expect(globalThis.formatDate("2025-12-01")).toBe("01/12/2025");
    });

    it("returns '-' when date is empty or null", function () {
      expect(globalThis.formatDate("")).toBe("-");
      expect(globalThis.formatDate(null)).toBe("-");
      expect(globalThis.formatDate(undefined)).toBe("-");
    });

    it("returns original string when not in YYYY-MM-DD format", function () {
      expect(globalThis.formatDate("invalid-date")).toBe("invalid-date");
    });
  });

  describe("getCategoryBadge helper", function () {
    it("renders vehicle badge for veiculo", function () {
      var badge = globalThis.getCategoryBadge("veiculo");
      expect(badge).toContain("Veículo");
      expect(badge).toContain("bg-indigo-50");
    });

    it("renders tool badge for ferramenta", function () {
      var badge = globalThis.getCategoryBadge("ferramenta");
      expect(badge).toContain("Ferramenta");
      expect(badge).toContain("bg-amber-50");
    });

    it("renders IT badge for celular_ti", function () {
      var badge = globalThis.getCategoryBadge("celular_ti");
      expect(badge).toContain("Celular / TI");
      expect(badge).toContain("bg-sky-50");
    });

    it("renders equipment badge for equipamento", function () {
      var badge = globalThis.getCategoryBadge("equipamento");
      expect(badge).toContain("Equipamento");
      expect(badge).toContain("bg-teal-50");
    });

    it("renders outros badge for outros or unknown", function () {
      var badge = globalThis.getCategoryBadge("outros");
      expect(badge).toContain("Outros");
      var fallback = globalThis.getCategoryBadge("desconhecido");
      expect(fallback).toContain("Outros");
    });
  });

  describe("getStatusBadge helper", function () {
    it("renders green badge for devolvido", function () {
      var badge = globalThis.getStatusBadge("devolvido");
      expect(badge).toContain("Devolvido");
      expect(badge).toContain("bg-emerald-100");
    });

    it("renders amber badge for em_posse", function () {
      var badge = globalThis.getStatusBadge("em_posse");
      expect(badge).toContain("Em posse");
      expect(badge).toContain("bg-amber-100");
    });
  });

  describe("renderInventory function", function () {
    it("renders empty state message when inventoryList is empty", function () {
      globalThis.inventoryList = [];
      globalThis.renderInventory();

      var tbody = document.getElementById("inventoryTableBody");
      var empty = document.getElementById("inventoryEmpty");
      var counter = document.getElementById("inventoryCounter");

      expect(tbody.innerHTML).toBe("");
      expect(empty.classList.contains("hidden")).toBe(false);
      expect(counter.textContent).toBe("0");
    });

    it("renders table rows and updates counter of items em_posse", function () {
      globalThis.inventoryList = [
        {
          id: 1,
          categoria: "veiculo",
          material_nome: "Fiat Strada",
          modelo: "1.4 Endurance",
          serial: "BRA-2E19",
          tecnico_nome: "Carlos Silva",
          data_retirada: "2026-09-01",
          data_devolucao: null,
          status: "em_posse",
        },
        {
          id: 2,
          categoria: "ferramenta",
          material_nome: "Furadeira Bosch",
          modelo: "GSB 13 RE",
          serial: "SN123456",
          tecnico_nome: "João Souza",
          data_retirada: "2026-08-15",
          data_devolucao: "2026-08-30",
          status: "devolvido",
        },
        {
          id: 3,
          categoria: "celular_ti",
          material_nome: "Samsung Galaxy A15",
          modelo: "128GB",
          serial: "356789012345678",
          tecnico_nome: "Carlos Silva",
          data_retirada: "2026-09-10",
          data_devolucao: null,
          status: "em_posse",
        },
      ];

      globalThis.renderInventory();

      var tbody = document.getElementById("inventoryTableBody");
      var empty = document.getElementById("inventoryEmpty");
      var counter = document.getElementById("inventoryCounter");

      expect(empty.classList.contains("hidden")).toBe(true);
      expect(counter.textContent).toBe("2"); // 2 items in possession

      var rows = tbody.querySelectorAll("tr");
      expect(rows.length).toBe(3);

      expect(rows[0].textContent).toContain("Fiat Strada");
      expect(rows[0].textContent).toContain("BRA-2E19");
      expect(rows[0].textContent).toContain("Carlos Silva");
      expect(rows[0].textContent).toContain("01/09/2026");
      expect(rows[0].textContent).toContain("Em posse");

      expect(rows[1].textContent).toContain("Furadeira Bosch");
      expect(rows[1].textContent).toContain("Devolvido");
      expect(rows[1].textContent).toContain("30/08/2026");
    });

    it("escapes HTML to prevent XSS", function () {
      globalThis.inventoryList = [
        {
          id: 99,
          categoria: "outros",
          material_nome: "<script>alert('xss')</script>",
          modelo: '<b>Bold</b>',
          serial: '<img src=x onerror=alert(1)>',
          tecnico_nome: 'O"Reilly',
          data_retirada: "2026-09-01",
          data_devolucao: null,
          status: "em_posse",
        },
      ];

      globalThis.renderInventory();
      var tbody = document.getElementById("inventoryTableBody");
      expect(tbody.innerHTML).not.toContain("<script>");
      expect(tbody.innerHTML).toContain("&lt;script&gt;");
      expect(tbody.innerHTML).not.toContain("<b>");
      expect(tbody.innerHTML).toContain("&lt;b&gt;Bold&lt;/b&gt;");
      expect(tbody.innerHTML).not.toContain("<img");
      expect(tbody.innerHTML).toContain("&lt;img");
    });
  });

  describe("Navigation handlers", function () {
    it("navigateInventoryForm sets hash to #/inventoryForm", function () {
      globalThis.navigateInventoryForm();
      expect(window.location.hash).toBe("#/inventoryForm");
    });

    it("editInventoryItem sets hash with id parameter", function () {
      globalThis.editInventoryItem(123);
      expect(window.location.hash).toBe("#/inventoryForm?id=123");
    });

    it("clicking + Novo Item button triggers navigation", async function () {
      await globalThis.initInventoryList();
      var btn = document.querySelector('[data-action="navigate-inventory-form"]');
      btn.click();
      expect(window.location.hash).toBe("#/inventoryForm");
    });

    it("clicking edit button in table row triggers editInventoryItem", async function () {
      await globalThis.initInventoryList();
      globalThis.inventoryList = [
        {
          id: 77,
          categoria: "ferramenta",
          material_nome: "Multímetro Minipa",
          modelo: "ET-1002",
          serial: "SN999",
          tecnico_nome: "Lucas Lima",
          data_retirada: "2026-09-01",
          data_devolucao: null,
          status: "em_posse",
        },
      ];
      globalThis.renderInventory();

      var editBtn = document.querySelector('[data-action="edit"]');
      expect(editBtn).not.toBeNull();
      editBtn.click();
      expect(window.location.hash).toBe("#/inventoryForm?id=77");
    });
  });

  describe("Filter handlers", function () {
    it("setStatusFilter updates inventoryStatus and active pill CSS class", function () {
      globalThis.setStatusFilter("em_posse");
      expect(globalThis.inventoryStatus).toBe("em_posse");

      var pillEmPosse = document.querySelector('.status-pill[data-status="em_posse"]');
      var pillTodos = document.querySelector('.status-pill[data-status=""]');

      expect(pillEmPosse.className).toContain("bg-white");
      expect(pillTodos.className).not.toContain("bg-white");
    });

    it("setCategoryFilter updates inventoryCategory and select value", function () {
      globalThis.setCategoryFilter("veiculo");
      expect(globalThis.inventoryCategory).toBe("veiculo");

      var select = document.getElementById("inventoryCategoryFilter");
      expect(select.value).toBe("veiculo");
    });

    it("clicking status pill calls setStatusFilter", async function () {
      await globalThis.initInventoryList();
      var pillDevolvido = document.querySelector('.status-pill[data-status="devolvido"]');
      pillDevolvido.click();
      expect(globalThis.inventoryStatus).toBe("devolvido");
    });

    it("changing category select calls setCategoryFilter", async function () {
      await globalThis.initInventoryList();
      var select = document.getElementById("inventoryCategoryFilter");
      select.value = "ferramenta";
      select.dispatchEvent(new Event("change"));
      expect(globalThis.inventoryCategory).toBe("ferramenta");
    });
  });

  describe("Delete action", function () {
    it("prompts user and aborts delete if confirmation rejected", async function () {
      confirmDeleteResult = false;
      var fetchCalled = false;
      globalThis.fetch = async function () {
        fetchCalled = true;
        return { json: async () => ({ success: true }) };
      };

      globalThis.inventoryList = [{ id: 10, material_nome: "Item X", serial: "123" }];
      await globalThis.deleteInventoryItem(10);

      expect(fetchCalled).toBe(false);
      expect(toastCalls.length).toBe(0);
    });

    it("deletes item via API and shows success toast when confirmed", async function () {
      confirmDeleteResult = true;
      var calledUrl = "";
      var calledMethod = "";

      globalThis.fetch = async function (url, opts) {
        calledUrl = url;
        calledMethod = opts ? opts.method : "GET";
        return {
          json: async () => ({ success: true, message: "Item excluído com sucesso." }),
        };
      };

      globalThis.inventoryList = [{ id: 10, material_nome: "Item X", serial: "123" }];
      await globalThis.deleteInventoryItem(10);

      expect(calledUrl).toBe("/app/api/index.php?route=inventory&id=10");
      expect(calledMethod).toBe("DELETE");
      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("success");
      expect(toastCalls[0].msg).toBe("Item excluído com sucesso.");
    });

    it("shows error toast if API returns error on delete", async function () {
      confirmDeleteResult = true;
      globalThis.fetch = async function () {
        return {
          json: async () => ({ success: false, message: "Falha ao excluir item." }),
        };
      };

      globalThis.inventoryList = [{ id: 10, material_nome: "Item X", serial: "123" }];
      await globalThis.deleteInventoryItem(10);

      expect(toastCalls.length).toBe(1);
      expect(toastCalls[0].type).toBe("error");
      expect(toastCalls[0].msg).toBe("Falha ao excluir item.");
    });
  });

  describe("exportInventoryCsv", function () {
    it("fetches filtered items and calls downloadCSV with formatted rows", async function () {
      downloadCsvCalls = [];
      globalThis.inventorySearch = "Strada";
      globalThis.inventoryStatus = "em_posse";
      globalThis.inventoryCategory = "veiculo";

      var calledUrl = "";
      globalThis.fetch = async function (url) {
        calledUrl = url;
        return {
          json: async () => ({
            success: true,
            data: [
              {
                id: 1,
                categoria: "veiculo",
                material_nome: "Fiat Strada",
                modelo: "1.4 Endurance",
                serial: "BRA2E19",
                tecnico_nome: "Carlos Silva",
                data_retirada: "2026-09-01",
                data_devolucao: null,
                status: "em_posse",
                observacoes: "Sem avarias",
              },
            ],
          }),
        };
      };

      await globalThis.exportInventoryCsv();

      expect(calledUrl).toContain("action=export-csv");
      expect(calledUrl).toContain("search=Strada");
      expect(calledUrl).toContain("status=em_posse");
      expect(calledUrl).toContain("categoria=veiculo");

      expect(downloadCsvCalls.length).toBe(1);
      var call = downloadCsvCalls[0];
      expect(call.filename).toBe("inventario_Strada.csv");
      expect(call.header).toContain("ID;Categoria;Material;Modelo;Serial ou Placa;Técnico Responsável;Data de Retirada;Data de Devolução;Status;Observações");
      expect(call.rows.length).toBe(1);

      var row = call.rows[0];
      expect(row[0]).toBe("1");
      expect(row[1]).toBe("Veículo");
      expect(row[2]).toBe("Fiat Strada");
      expect(row[3]).toBe("1.4 Endurance");
      expect(row[4]).toBe("BRA2E19");
      expect(row[5]).toBe("Carlos Silva");
      expect(row[6]).toBe("2026-09-01");
      expect(row[7]).toBe("");
      expect(row[8]).toBe("Em posse");
      expect(row[9]).toBe("Sem avarias");
    });

    it("shows error toast if no items found to export", async function () {
      downloadCsvCalls = [];
      toastCalls = [];
      globalThis.fetch = async function () {
        return {
          json: async () => ({ success: true, data: [] }),
        };
      };

      await globalThis.exportInventoryCsv();

      expect(downloadCsvCalls.length).toBe(0);
      expect(toastCalls.some((t) => t.type === "error" && t.msg.includes("Nenhum dado"))).toBe(true);
    });
  });

  describe("Search debounce & click-to-clear", function () {
    it("clears search input and triggers re-fetch on input click when not empty", async function () {
      await globalThis.initInventoryList();
      var input = document.getElementById("inventorySearchInput");
      input.value = "Strada";
      globalThis.inventorySearch = "Strada";

      input.click();
      expect(input.value).toBe("");
      expect(globalThis.inventorySearch).toBe("");
    });
  });
});
