import { getToken } from '../core/auth.js';

function resolveToken() {
  try {
    if (typeof getToken === 'function') {
      const t = getToken();
      if (t) return t;
    }
  } catch (_) {}
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem) {
      return sessionStorage.getItem('rubble_token');
    }
  } catch (_) {}
  return null;
}

export function buildTempoFechadoUrl() {
  const token = resolveToken();
  if (!token) return null;
  return '/tempo-fechado/sso?token=' + encodeURIComponent(token);
}

export function openTempoFechado() {
  const url = buildTempoFechadoUrl();
  if (!url) {
    if (typeof window !== 'undefined' && window.location) {
      window.location.hash = '#/login';
    }
    return;
  }
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank', 'noopener');
  } else if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}
