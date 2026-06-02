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
    html = await loadPage("/app/Views/index.html?v=" + Date.now());
  } else if (hash.startsWith("#/equipament-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPAMENT DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipamentDashboard.html?v=" + Date.now());
  } else if (hash.startsWith("#/pv-dashboard")) {
    /*
  |--------------------------------------------------------------------------
  | PV DASHBOARD
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pvDashboard.html?v=" + Date.now());
  } else if (hash.startsWith("#/form")) {
    /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/homeForm.html?v=" + Date.now());
  } else if (hash.startsWith("#/pvForm")) {
    /*
  |--------------------------------------------------------------------------
  | PV FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pvForm.html?v=" + Date.now());
  } else if (hash === "#/pv" || hash.startsWith("#/pv?")) {
    /*
  |--------------------------------------------------------------------------
  | PV (PROPOSTA DE VENDA)
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/pv.html?v=" + Date.now());
  } else if (hash.startsWith("#/usersForm")) {
    /*
  |--------------------------------------------------------------------------
  | USER FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/userForm.html?v=" + Date.now());
  } else if (hash === "#/users" || hash.startsWith("#/users?")) {
    /*
  |--------------------------------------------------------------------------
  | USERS
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/users.html?v=" + Date.now());
  } else if (hash.startsWith("#/equipmentForm")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT FORM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipmentManagerForm.html?v=" + Date.now());
  } else if (hash === "#/equipment-manager" || hash.startsWith("#/equipment-manager?")) {
    /*
  |--------------------------------------------------------------------------
  | EQUIPMENT MANAGER
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/equipmentManager.html?v=" + Date.now());
  } else if (hash === "#/scm") {
    /*
  |--------------------------------------------------------------------------
  | SCM
  |--------------------------------------------------------------------------
  */
    html = await loadPage("/app/Views/scm.html?v=" + Date.now());
  } else if (hash === "#/login") {
    html = await loadPage("/app/Views/login.html?v=" + Date.now());
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
