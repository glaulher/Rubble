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
  if (globalThis.PollingManager) {
    PollingManager.stopAll();
  }

  const app = document.getElementById("app");

  const hash = window.location.hash;

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
    html = await loadPage("/app/Views/home/index.html?v=" + Date.now());
  } else if (hash.startsWith("#/equipament-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPAMENT DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/dashboard.html?v=" + Date.now());
  } else if (hash.startsWith("#/pv-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | PV DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/dashboard.html?v=" + Date.now());
  } else if (hash.startsWith("#/form")) {
    /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/home/form.html?v=" + Date.now());
  } else if (hash.startsWith("#/pvForm")) {
    /*
  |--------------------------------------------------------------------------
  | PV FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/form.html?v=" + Date.now());
  } else if (hash === "#/pv" || hash.startsWith("#/pv?")) {
    /*
  |--------------------------------------------------------------------------
  | PV (PROPOSTA DE VENDA)
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv/list.html?v=" + Date.now());
  } else if (hash.startsWith("#/usersForm")) {
    /*
  |--------------------------------------------------------------------------
  | USER FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/user/form.html?v=" + Date.now());
  } else if (hash === "#/users" || hash.startsWith("#/users?")) {
    /*
  |--------------------------------------------------------------------------
  | USERS
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/user/list.html?v=" + Date.now());
  } else if (hash.startsWith("#/equipmentForm")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/form.html?v=" + Date.now());
  } else if (hash === "#/equipment-manager" || hash.startsWith("#/equipment-manager?")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT MANAGER
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment/list.html?v=" + Date.now());
  } else if (hash.startsWith("#/equipment-prices-form")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT PRICES FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment-prices/form.html?v=" + Date.now());
  } else if (hash === "#/equipment-prices" || hash.startsWith("#/equipment-prices?")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT PRICES
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipment-prices/list.html?v=" + Date.now());
  } else if (hash === "#/scm") {
    /*
  |--------------------------------------------------------------------------
  | SCM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/scm/scm.html?v=" + Date.now());
  } else if (hash === "#/login") {
    html = await loadPage("/app/Views/auth/login.html?v=" + Date.now());
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
      if (typeof loadHomeForm === "function") {
        loadHomeForm();
      }
    } else if (hash.startsWith("#/pvForm")) {
      if (typeof loadPvForm === "function") {
        loadPvForm();
      }
    } else if (hash.startsWith("#/equipament-dashboard")) {
      if (typeof initEquipamentDashboard === "function") {
        initEquipamentDashboard();
      }
    } else if (hash.startsWith("#/pv-dashboard")) {
      if (typeof initPvDashboard === "function") {
        initPvDashboard();
      }
    } else if (hash === "#/pv" || hash.startsWith("#/pv?")) {
      if (typeof initPv === "function") {
        initPv();
      }
    } else if (hash.startsWith("#/usersForm")) {
      if (typeof loadUserForm === "function") {
        loadUserForm();
      }
    } else if (hash === "#/users" || hash.startsWith("#/users?")) {
      if (typeof initUsers === "function") {
        initUsers();
      }
    } else if (hash.startsWith("#/equipmentForm")) {
      if (typeof loadEquipmentForm === "function") {
        loadEquipmentForm();
      }
    } else if (hash === "#/equipment-manager" || hash.startsWith("#/equipment-manager?")) {
      if (typeof initEquipmentManager === "function") {
        initEquipmentManager();
      }
    } else if (hash.startsWith("#/equipment-prices-form")) {
      if (typeof initPriceForm === "function") {
        initPriceForm();
      }
    } else if (hash === "#/equipment-prices" || hash.startsWith("#/equipment-prices?")) {
      if (typeof initPriceList === "function") {
        initPriceList();
      }
    } else if (hash === "#/scm") {
      if (typeof initScm === "function") {
        initScm();
      }
    } else if (hash === "#/login") {
      if (typeof initLogin === "function") {
        initLogin();
      }
    } else {
      if (typeof initHome === "function") {
        initHome();
      }
    }
  });
}

window.addEventListener("load", router);

window.addEventListener("hashchange", router);
