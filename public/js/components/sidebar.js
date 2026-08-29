export function initSidebar() {
  let sidebarOpen = false;

  document
    .querySelectorAll('.sidebar-link')
    .forEach((el) => (el.style.justifyContent = 'center'));

  document
    .getElementById('sidebarToggle')
    .addEventListener('click', function () {
      sidebarOpen = !sidebarOpen;
      const sidebar = document.getElementById('sidebar');
      const app = document.getElementById('app');
      const labels = document.querySelectorAll('.sidebar-label');
      const icon = document.getElementById('sidebarToggleIcon');

      const links = document.querySelectorAll('.sidebar-link');

      sidebar.dataset.collapsed = 'false';
      if (sidebarOpen) {
        sidebar.style.width = '240px';
        app.style.marginLeft = '240px';
        icon.innerHTML = `
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    `;
        labels.forEach((el) => {
          el.style.display = 'inline';
          setTimeout(() => (el.style.opacity = '1'), 50);
        });
        links.forEach((el) => (el.style.justifyContent = 'flex-start'));
      } else {
        sidebar.dataset.collapsed = 'true';
        sidebar.style.width = '56px';
        app.style.marginLeft = '56px';
        icon.innerHTML = `
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    `;
        labels.forEach((el) => {
          el.style.opacity = '0';
          setTimeout(() => (el.style.display = 'none'), 300);
        });
        links.forEach((el) => (el.style.justifyContent = 'center'));
      }
    });

  // Dashboard submenu toggle (click only — hover via CSS group-hover)
  const dashToggle = document.getElementById('dashboardMenuToggle');
  const dashSubmenu = document.getElementById('dashboardSubmenu');

  if (dashToggle && dashSubmenu) {
    dashToggle.addEventListener('click', function (e) {
      e.preventDefault();
      dashSubmenu.classList.toggle('hidden');
    });
  }

  // Equip submenu toggle
  const equipToggle = document.getElementById('equipMenuToggle');
  const equipSubmenu = document.getElementById('equipSubmenu');

  if (equipToggle && equipSubmenu) {
    equipToggle.addEventListener('click', function (e) {
      e.preventDefault();
      equipSubmenu.classList.toggle('hidden');
    });
  }

  // Planejamento submenu toggle
  const plannedToggle = document.getElementById('plannedMenuToggle');
  const plannedSubmenu = document.getElementById('plannedSubmenu');

  if (plannedToggle && plannedSubmenu) {
    plannedToggle.addEventListener('click', function (e) {
      e.preventDefault();
      plannedSubmenu.classList.toggle('hidden');
    });
  }

  // Tempo Fechado link (nova aba com SSO via JWT Rubble)
  const tfLink = document.getElementById('tempoFechadoLink');
  if (tfLink) {
    function prepareTfHref() {
      const token = sessionStorage.getItem('rubble_token');
      if (token) {
        tfLink.href = '/tempo-fechado/sso?token=' + encodeURIComponent(token);
        tfLink.target = '_blank';
        tfLink.rel = 'noopener';
      } else {
        tfLink.href = '#/login';
        tfLink.removeAttribute('target');
      }
    }

    // Prepara o href imediatamente em interações de toque, mouse e foco
    tfLink.addEventListener('pointerdown', prepareTfHref);
    tfLink.addEventListener('touchstart', prepareTfHref, { passive: true });
    tfLink.addEventListener('mouseenter', prepareTfHref);
    tfLink.addEventListener('focus', prepareTfHref);

    tfLink.addEventListener('click', function (e) {
      prepareTfHref();
      const token = sessionStorage.getItem('rubble_token');
      if (!token) {
        e.preventDefault();
        window.location.hash = '#/login';
      }
      // Quando autenticado, não bloqueia o evento padrão:
      // O navegador segue nativamente o href="/tempo-fechado/sso?token=..." com target="_blank",
      // funcionando em 100% dos navegadores mobile sem bloqueio de pop-up.
    });
  }

  // Fechar submenus ao clicar fora
  document.addEventListener('click', function (e) {
    const dashContainer = document.getElementById('dashboardMenuContainer');
    if (dashSubmenu && dashContainer && !dashContainer.contains(e.target)) {
      dashSubmenu.classList.add('hidden');
    }
    const equipContainer = document.getElementById('equipMenuContainer');
    if (equipSubmenu && equipContainer && !equipContainer.contains(e.target)) {
      equipSubmenu.classList.add('hidden');
    }
    const plannedContainer = document.getElementById('plannedMenuContainer');
    if (plannedSubmenu && plannedContainer && !plannedContainer.contains(e.target)) {
      plannedSubmenu.classList.add('hidden');
    }
  });
}

initSidebar();
