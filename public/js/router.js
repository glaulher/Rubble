import { PollingManager } from '/public/js/core/polling.js';
import { authGuard, updateUserDisplay, applyRoleVisibility, destroyTurnstile, initLogin } from '/public/js/core/auth.js';
import { initHome } from '/public/js/home/home-ui.js';
import { loadHomeForm } from '/public/js/home/form.js';
import { loadPvForm } from '/public/js/pv/form.js';
import { initPvDashboard } from '/public/js/pv/dashboard.js';
import { initPv } from '/public/js/pv/list.js';
import { loadUserForm } from '/public/js/user/form.js';
import { initUsers } from '/public/js/user/list.js';
import { loadEquipmentForm } from '/public/js/equipment/form.js';
import { initEquipmentManager } from '/public/js/equipment/list.js';
import { initPriceForm } from '/public/js/equipment-prices/form.js';
import { initPriceList } from '/public/js/equipment-prices/list.js';
import { initPreventiveCycle } from '/public/js/preventive-cycle/list.js';
import { initScm } from '/public/js/scm/scm-list.js';
import { initPlannedActivity } from '/public/js/planned-activity/list.js';
import { initPendingTickets } from '/public/js/pending-tickets/list.js';
import { initOsDashboard } from '/public/js/os/dashboard.js';
import { initFilters } from '/public/js/filter-exchanges/list.js';
import { initPdfAudit } from '/public/js/pdf-audit/audit.js';
import { initEquipamentDashboard } from '/public/js/equipment/dashboard.js';

const VIEW_VERSION = 35;

async function loadPage(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return `<p>Erro ao carregar página</p>`;
    }

    return await response.text();
  } catch (error) {
    console.error(error);

    return `<p>Erro ao carregar página</p>`;
  }
}

async function router() {
  PollingManager.stopAll();

  const hash = window.location.hash;

  if (hash !== '#/login') {
    destroyTurnstile();
  }

  const app = document.getElementById("app");

  if (!authGuard()) {
    return;
  }

  updateUserDisplay();

  let html = "";

  /*
  |--------------------------------------------------------------------------
  | HOME
  |--------------------------------------------------------------------------
  */
  if (hash === "" || hash === "#/" || hash === "#/home") {
    html = await loadPage("/app/Views/home/index.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/equipament-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPAMENT DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/dashboard.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/pv-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | PV DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/dashboard.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/form")) {
    /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/home/form.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/pvForm")) {
    /*
  |--------------------------------------------------------------------------
  | PV FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/form.html?v=" + VIEW_VERSION);
  } else if (hash === "#/pv" || hash.startsWith("#/pv?")) {
    /*
  |--------------------------------------------------------------------------
  | PV (PROPOSTA DE VENDA)
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/list.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/usersForm")) {
    /*
  |--------------------------------------------------------------------------
  | USER FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/user/form.html?v=" + VIEW_VERSION);
  } else if (hash === "#/users" || hash.startsWith("#/users?")) {
    /*
  |--------------------------------------------------------------------------
  | USERS
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/user/list.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/equipmentForm")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/form.html?v=" + VIEW_VERSION);
  } else if (hash === "#/equipment-manager" || hash.startsWith("#/equipment-manager?")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT MANAGER
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/list.html?v=" + VIEW_VERSION);
  } else if (hash.startsWith("#/equipment-prices-form")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT PRICES FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment-prices/form.html?v=" + VIEW_VERSION);
  } else if (hash === "#/equipment-prices" || hash.startsWith("#/equipment-prices?")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT PRICES
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment-prices/list.html?v=" + VIEW_VERSION);
  } else if (hash === "#/preventive-cycle") {
    /*
  |--------------------------------------------------------------------------
  | PREVENTIVE CYCLE
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/preventive-cycle/list.html?v=" + VIEW_VERSION);
  } else if (hash === "#/scm") {
    /*
    |--------------------------------------------------------------------------
    | SCM
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/scm/scm.html?v=" + VIEW_VERSION);
  } else if (hash === "#/planned-activity") {
    /*
    |--------------------------------------------------------------------------
    | PLANNED ACTIVITY
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/planned-activity/list.html?v=" + VIEW_VERSION);
  } else if (hash === "#/pending-tickets") {
    /*
    |--------------------------------------------------------------------------
    | PENDING TICKETS (Gestão de OS)
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/pending-tickets/list.html?v=" + VIEW_VERSION);
  } else if (hash === "#/os-dashboard") {
    /*
    |--------------------------------------------------------------------------
    | OS DASHBOARD (Gestão de OS KPI)
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/os/dashboard.html?v=" + VIEW_VERSION);
  } else if (hash === "#/filter-exchanges") {
    /*
    |--------------------------------------------------------------------------
    | FILTER EXCHANGES (Troca de Filtros)
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/filter-exchanges/list.html?v=" + VIEW_VERSION);
  } else if (hash === "#/pdf-audit") {
    /*
    |--------------------------------------------------------------------------
    | PDF AUDIT
    |--------------------------------------------------------------------------
    */
    html = await loadPage("/app/Views/pdf-audit/audit.html?v=" + VIEW_VERSION);
  } else if (hash === "#/login") {
    html = await loadPage("/app/Views/auth/login.html?v=" + VIEW_VERSION);
  } else {
    html = `
      <div class="p-10 text-center">
        <h1 class="text-3xl font-light tracking-[0.1em] text-slate-800">
          Página não encontrada
        </h1>
      </div>
    `;
  }

  app.innerHTML = html;

  if (hash === '#/login') {
    document.documentElement.classList.remove('dark');
  }

  applyRoleVisibility();

  /*
  |--------------------------------------------------------------------------
  | INIT DAS PÁGINAS
  |--------------------------------------------------------------------------
  */
  requestAnimationFrame(() => {
    if (hash.startsWith("#/form")) {
      loadHomeForm();
    } else if (hash.startsWith("#/pvForm")) {
      loadPvForm();
    } else if (hash.startsWith("#/equipament-dashboard")) {
      initEquipamentDashboard();
    } else if (hash.startsWith("#/pv-dashboard")) {
      initPvDashboard();
    } else if (hash === "#/pv" || hash.startsWith("#/pv?")) {
      initPv();
    } else if (hash.startsWith("#/usersForm")) {
      loadUserForm();
    } else if (hash === "#/users" || hash.startsWith("#/users?")) {
      initUsers();
    } else if (hash.startsWith("#/equipmentForm")) {
      loadEquipmentForm();
    } else if (hash === "#/equipment-manager" || hash.startsWith("#/equipment-manager?")) {
      initEquipmentManager();
    } else if (hash.startsWith("#/equipment-prices-form")) {
      initPriceForm();
    } else if (hash === "#/equipment-prices" || hash.startsWith("#/equipment-prices?")) {
      initPriceList();
    } else if (hash === "#/preventive-cycle") {
      initPreventiveCycle();
    } else if (hash === "#/scm") {
      initScm();
    } else if (hash === "#/planned-activity") {
      initPlannedActivity();
    } else if (hash === "#/pending-tickets") {
      initPendingTickets();
    } else if (hash === "#/os-dashboard") {
      initOsDashboard();
    } else if (hash === "#/filter-exchanges") {
      initFilters();
    } else if (hash === "#/pdf-audit") {
      initPdfAudit();
    } else if (hash === "#/login") {
      initLogin();
    } else {
      initHome();
    }
  });
}

window.addEventListener("load", router);

window.addEventListener("hashchange", router);
