const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
const safeParameters = new Set(['access', 'auth', 'checkout', 'claim', 'handle', 'membership', 'purchase', 'state']);

function safePage(value) {
  try {
    const url = new URL(value, window.location.origin);
    const query = new URLSearchParams();
    for (const [key, item] of url.searchParams) {
      if (safeParameters.has(key)) query.append(key, item.slice(0, 160));
    }
    return `${url.pathname}${query.size ? `?${query}` : ''}`;
  } catch {
    return '/';
  }
}

function safeReferrer(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin === window.location.origin
      ? `${url.origin}${safePage(url.href)}`
      : `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function sessionId() {
  try {
    const key = 'no3d_visit_session';
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  }
}

export function track(event, properties = {}) {
  if (!browser || !event) return;
  const payload = {
    event,
    properties,
    page: safePage(window.location.href),
    referrer: safeReferrer(document.referrer),
    session_id: sessionId(),
  };
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export function trackOnce(event, properties = {}) {
  if (!browser) return;
  const key = `no3d_event_${event}_${safePage(window.location.href)}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Tracking still proceeds when storage is unavailable.
  }
  track(event, properties);
}

if (browser) {
  const recordVisit = () => track('page_view', { title: document.title });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordVisit, { once: true });
  } else {
    recordVisit();
  }
}
