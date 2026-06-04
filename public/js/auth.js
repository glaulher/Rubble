const AUTH_TOKEN_KEY = 'rubble_token';
const AUTH_USER_KEY = 'rubble_user';
var TURNSTILE_SITE_KEY = '';
var turnstileWidgetId = null;

function isApiUrl(url) {
  return typeof url === 'string' &&
    url.includes('/app/api/index.php') &&
    (url.startsWith(window.location.origin + '/') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../'));
}

(function patchFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (url, options = {}) {
    const token = getToken();
    if (token && isApiUrl(url)) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    const response = await originalFetch.call(globalThis, url, options);
    if (response.status === 401 && isApiUrl(url)) {
      const clone = response.clone();
      const body = await clone.json().catch(() => ({}));
      console.warn('[auth] 401 interceptado:', url, body);
      if (body.message !== 'Usuário ou senha inválidos') {
        clearAuth();
        if (window.location.hash !== '#/login') {
          window.location.hash = '#/login';
        }
      }
    }
    return response;
  };
})();

function getToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function setUser(user) {
  if (user) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AUTH_USER_KEY);
  }
}

function getUser() {
  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    clearAuth();
    return false;
  }
  return true;
}

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function storeAuth(token, user) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

async function login(username, password, turnstileToken) {
  var body = { username: username, password: password };
  if (turnstileToken) {
    body.turnstile_token = turnstileToken;
  }
  const response = await fetch('/app/api/index.php?route=auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Erro ao fazer login');
  }

  storeAuth(result.data.token, result.data.user);
  return result.data.user;
}

function logout() {
  clearAuth();

  fetch('/app/api/index.php?route=auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  }).catch(() => {});

  window.location.hash = '#/login';
}

function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  return fetch(url, { ...options, headers });
}

function authGuard() {
  const hash = window.location.hash;
  const publicRoutes = ['#/login'];

  if (!isAuthenticated() && !publicRoutes.includes(hash)) {
    window.location.hash = '#/login';
    return false;
  }

  if (isAuthenticated() && hash === '#/login') {
    window.location.hash = '#/';
    return false;
  }

  return true;
}

function applyRoleVisibility() {
  const user = getUser();
  if (!user) return;

  const role = user.role;

  document.querySelectorAll('[data-role]').forEach(el => {
    const requiredRole = el.dataset.role;
    const roles = requiredRole.split(' ');

    if (roles.includes(role) || role === 'admin') {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

function toggleSidebar(visible) {
  const sidebar = document.getElementById('sidebar');
  const app = document.getElementById('app');
  if (sidebar) {
    sidebar.style.display = visible ? '' : 'none';
  }
  if (app) {
    app.style.marginLeft = visible ? (sidebar ? sidebar.style.width || '56px' : '56px') : '0';
  }
}

function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY || typeof turnstile !== 'undefined') return;
  var s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

function initTurnstileWidget() {
  if (!TURNSTILE_SITE_KEY || typeof turnstile === 'undefined') return;
  var container = document.getElementById('turnstile-widget');
  if (!container || container.dataset.turnstileRendered) return;
  turnstileWidgetId = turnstile.render(container, {
    sitekey: TURNSTILE_SITE_KEY,
    theme: 'light',
  });
  container.dataset.turnstileRendered = '1';
}

function getTurnstileToken() {
  if (!TURNSTILE_SITE_KEY || turnstileWidgetId === null) return '';
  return turnstile.getResponse(turnstileWidgetId);
}

async function fetchSiteKey() {
  try {
    var r = await fetch('/app/api/index.php?route=config');
    var d = await r.json();
    return d.data?.turnstile_site_key || '';
  } catch (e) {
    return '';
  }
}

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  fetchSiteKey().then(function (key) {
    TURNSTILE_SITE_KEY = key;

    if (TURNSTILE_SITE_KEY) {
      loadTurnstile();
      var checkTurnstile = setInterval(function () {
        if (typeof turnstile !== 'undefined') {
          initTurnstileWidget();
          clearInterval(checkTurnstile);
        }
      }, 200);
    }
  });

  var toggleBtn = document.getElementById('togglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var pwd = document.getElementById('loginPassword');
      var eyeOpen = document.getElementById('eyeOpen');
      var eyeClosed = document.getElementById('eyeClosed');
      if (pwd.type === 'password') {
        pwd.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
      } else {
        pwd.type = 'password';
        eyeClosed.classList.add('hidden');
        eyeOpen.classList.remove('hidden');
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (errorEl) errorEl.classList.add('hidden');

    var turnstileToken = getTurnstileToken();
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      if (errorEl) {
        errorEl.textContent = 'Aguardando verificação de segurança...';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
      await login(username, password, turnstileToken);
      window.location.hash = '#/';
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Erro ao fazer login';
        errorEl.classList.remove('hidden');
      }
      if (turnstileWidgetId !== null) {
        turnstile.reset(turnstileWidgetId);
      }
      var pwd = document.getElementById('loginPassword');
      var eyeOpen = document.getElementById('eyeOpen');
      var eyeClosed = document.getElementById('eyeClosed');
      if (pwd && pwd.type === 'text') {
        pwd.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });
}

function updateUserDisplay() {
  const user = getUser();
  const displayEl = document.getElementById('userDisplay');
  const isLoginPage = window.location.hash === '#/login';

  toggleSidebar(!!user && !isLoginPage);

  if (!isLoginPage && localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  if (displayEl) {
    if (user) {
      const roleLabels = {
        admin: 'Admin',
        supervisor: 'Supervisor',
        coordenador: 'Coordenador',
        cliente: 'Cliente',
      };
      displayEl.innerHTML =
        '<span class="text-white font-medium">' +
        escapeHtml(user.nome) +
        '</span>' +
        '<span class="text-xs text-slate-400 ml-2">(' +
        (roleLabels[user.role] || user.role) +
        ')</span>' +
        '<button id="logoutBtn" class="ml-4 text-sm text-red-400 hover:text-red-300 transition">Sair</button>';

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
          e.preventDefault();
          logout();
        });
      }
    } else if (!isLoginPage) {
      displayEl.innerHTML =
        '<a href="#/login" class="text-blue-400 hover:text-blue-300 text-sm font-medium">Entrar</a>';
    } else {
      displayEl.innerHTML = '';
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.getToken = getToken;
  globalThis.setToken = setToken;
  globalThis.setUser = setUser;
  globalThis.getUser = getUser;
  globalThis.isAuthenticated = isAuthenticated;
  globalThis.parseJwtPayload = parseJwtPayload;
  globalThis.storeAuth = storeAuth;
  globalThis.clearAuth = clearAuth;
  globalThis.login = login;
  globalThis.logout = logout;
  globalThis.apiFetch = apiFetch;
  globalThis.authGuard = authGuard;
  globalThis.applyRoleVisibility = applyRoleVisibility;
  globalThis.toggleSidebar = toggleSidebar;
  globalThis.updateUserDisplay = updateUserDisplay;
  globalThis.initLogin = initLogin;
}
