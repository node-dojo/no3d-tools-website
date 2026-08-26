const browser = typeof window !== 'undefined' && typeof document !== 'undefined';

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
    page: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    session_id: sessionId(),
  };
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

if (browser) {
  const recordVisit = () => track('page_view', { title: document.title });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordVisit, { once: true });
  } else {
    recordVisit();
  }
}
