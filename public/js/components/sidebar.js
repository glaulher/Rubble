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

  // Helper para submenus da sidebar (hover no mouse, click no desktop e toque touch no celular)
  function setupSubmenu(containerId, toggleId, submenuId) {
    const container = document.getElementById(containerId);
    const toggle = document.getElementById(toggleId);
    const submenu = document.getElementById(submenuId);
    if (!container || !toggle || !submenu) return;

    let touchHandled = false;
    let touchMoved = false;

    function handleToggle(e) {
      if (e.type === 'touchend') {
        touchHandled = true;
        setTimeout(() => {
          touchHandled = false;
        }, 600);
      } else if (e.type === 'click') {
        if (touchHandled) {
          e.preventDefault();
          return;
        }
      }
      e.preventDefault();
      e.stopPropagation();

      const willOpen = submenu.classList.contains('hidden');

      // Fecha outros submenus para evitar sobreposição
      document
        .querySelectorAll(
          '#dashboardSubmenu, #equipSubmenu, #plannedSubmenu, #toolsSubmenu'
        )
        .forEach((sm) => {
          if (sm !== submenu) {
            sm.classList.add('hidden');
          }
        });

      if (willOpen) {
        submenu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        submenu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }

    // Touch no celular (evita disparo acidental durante scroll)
    toggle.addEventListener(
      'touchstart',
      function () {
        touchMoved = false;
      },
      { passive: true }
    );
    toggle.addEventListener(
      'touchmove',
      function () {
        touchMoved = true;
      },
      { passive: true }
    );
    toggle.addEventListener('touchend', function (e) {
      if (touchMoved) return;
      handleToggle(e);
    });

    // Click com mouse no desktop
    toggle.addEventListener('click', handleToggle);

    // Hover do mouse no desktop (dispositivos com suporte a hover contínuo)
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      container.addEventListener('mouseenter', function () {
        submenu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
      });
      container.addEventListener('mouseleave', function () {
        submenu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  setupSubmenu('dashboardMenuContainer', 'dashboardMenuToggle', 'dashboardSubmenu');
  setupSubmenu('equipMenuContainer', 'equipMenuToggle', 'equipSubmenu');
  setupSubmenu('plannedMenuContainer', 'plannedMenuToggle', 'plannedSubmenu');
  setupSubmenu('toolsMenuContainer', 'toolsMenuToggle', 'toolsSubmenu');

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

    // Inicializa imediatamente no carregamento da sidebar
    prepareTfHref();

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
        return;
      }

      const url = '/tempo-fechado/sso?token=' + encodeURIComponent(token);
      tfLink.href = url;
      tfLink.target = '_blank';
      tfLink.rel = 'noopener';

      // Em dispositivos mobile/touch, garante que a navegação ocorra mesmo com bloqueador de abas:
      if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) || ('ontouchstart' in window)) {
        try {
          const w = window.open(url, '_blank');
          if (!w || w.closed || typeof w.closed === 'undefined') {
            window.location.href = url;
          }
        } catch (_) {
          window.location.href = url;
        }
        e.preventDefault();
      }
    });
  }

  // Controle de Combustivel link (nova aba com SSO seguro efêmero via localStorage, sem expor token na URL)
  const combustivelLink = document.getElementById('combustivelLink');
  if (combustivelLink) {
    function prepareCombustivelHref() {
      const token = sessionStorage.getItem('rubble_token');
      if (token) {
        combustivelLink.href = '/combustivel/';
        combustivelLink.target = '_blank';
        combustivelLink.rel = 'noopener';
      } else {
        combustivelLink.href = '#/login';
        combustivelLink.removeAttribute('target');
      }
    }

    prepareCombustivelHref();
    combustivelLink.addEventListener('mouseenter', prepareCombustivelHref);
    combustivelLink.addEventListener('focus', prepareCombustivelHref);

    combustivelLink.addEventListener('click', function (e) {
      const token = sessionStorage.getItem('rubble_token');
      if (!token) {
        e.preventDefault();
        window.location.hash = '#/login';
        return;
      }

      // Ponte efêmera: grava no localStorage no momento do clique
      try {
        localStorage.setItem('rubble_sso_token', token);
        // Timeout de segurança: se a aba não consumir em 30s, limpa automaticamente
        setTimeout(function () {
          try {
            localStorage.removeItem('rubble_sso_token');
          } catch (_) {}
        }, 30000);
      } catch (_) {}

      combustivelLink.href = '/combustivel/';
      combustivelLink.target = '_blank';
      combustivelLink.rel = 'noopener';

      if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) || ('ontouchstart' in window)) {
        try {
          const w = window.open('/combustivel/', '_blank');
          if (!w || w.closed || typeof w.closed === 'undefined') {
            window.location.href = '/combustivel/';
          }
        } catch (_) {
          window.location.href = '/combustivel/';
        }
        e.preventDefault();
      }
    });
  }

  // Fechar submenus ao clicar ou tocar fora
  function closeSubmenusOutside(e) {
    const containers = [
      document.getElementById('dashboardMenuContainer'),
      document.getElementById('equipMenuContainer'),
      document.getElementById('plannedMenuContainer'),
      document.getElementById('toolsMenuContainer'),
    ];

    const clickedInsideAny = containers.some((c) => c && c.contains(e.target));
    if (!clickedInsideAny) {
      document
        .querySelectorAll(
          '#dashboardSubmenu, #equipSubmenu, #plannedSubmenu, #toolsSubmenu'
        )
        .forEach((sm) => sm.classList.add('hidden'));
      document
        .querySelectorAll(
          '#dashboardMenuToggle, #equipMenuToggle, #plannedMenuToggle, #toolsMenuToggle'
        )
        .forEach((tg) => tg.setAttribute('aria-expanded', 'false'));
    }
  }

  document.addEventListener('click', closeSubmenusOutside);
  document.addEventListener('touchend', closeSubmenusOutside);
}

initSidebar();
