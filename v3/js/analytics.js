import { CLIENT_EVENTS, publicPage, publicProperties, publicReferrer } from './analytics-contract.js';
const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
const state = browser ? (window.__no3dAnalytics ||= { initialized: false, once: new Set(), pending: new Set(), failures: 0 }) : {};
function context() {
  const production = ['no3dtools.com', 'www.no3dtools.com', 'v3.no3dtools.com'].includes(location.hostname);
  let synthetic = false;
  let internal = false;
  try {
    synthetic = sessionStorage.getItem('no3d_analytics_synthetic') === '1';
    internal = localStorage.getItem('no3d_analytics_internal') === '1';
  } catch { /* Storage can be unavailable. */ }
  return { enabled: window.self === window.top && !internal && (production || synthetic), synthetic, production };
}
function sessionId() {
  if (state.session) return state.session;
  try {
    const key = 'no3d_visit_session';
    const saved = sessionStorage.getItem(key);
    state.session = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved || '') ? saved : crypto.randomUUID();
    sessionStorage.setItem(key, state.session);
  } catch { state.session = crypto.randomUUID(); }
  return state.session;
}
function observedEvent(event) {
  return event.replace(/^(product|membership)_fulfillment_completed$/, '$1_fulfillment_observed');
}
export async function track(name, properties = {}) {
  if (!browser) return false;
  const event = observedEvent(name);
  const ctx = context();
  if (!ctx.enabled || !CLIENT_EVENTS.has(event)) return false;
  const clean = publicProperties(properties);
  if (event !== 'page_view' && ctx.production && !ctx.synthetic && window.va) {
    // Standard Pro supports two properties per custom event.
    const providerProperties = Object.fromEntries(Object.entries(clean).slice(0, 2));
    try { window.va('event', { name: event, data: providerProperties }); } catch { /* Best effort. */ }
  }
  const payload = { event, event_id: crypto.randomUUID(), properties: clean,
    page: publicPage(location.href), referrer: publicReferrer(document.referrer),
    session_id: sessionId(), synthetic: ctx.synthetic };
  try {
    const response = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
    if (!response.ok) throw new Error(`http_${response.status}`);
    state.lastAcceptedAt = new Date().toISOString();
    state.lastError = null;
    return true;
  } catch (error) {
    state.failures += 1;
    state.lastError = /^http_\d+$/.test(error.message) ? error.message : 'transport_failed';
    // Developer-visible health only; never interfere with customer actions.
    window.dispatchEvent(new CustomEvent('no3d:analytics-error', { detail: { reason: state.lastError } }));
    return false;
  }
}
export async function trackOnce(event, properties = {}) {
  if (!browser) return false;
  const key = `${event}:${publicPage(location.href)}`;
  if (state.once.has(key) || state.pending.has(key)) return false;
  try { if (sessionStorage.getItem(`no3d_once_v2:${key}`)) return false; } catch {}
  state.pending.add(key);
  try {
    const accepted = await track(event, properties);
    if (accepted) {
      state.once.add(key);
      try { sessionStorage.setItem(`no3d_once_v2:${key}`, '1'); } catch {}
    }
    return accepted;
  } finally { state.pending.delete(key); }
}
export function initializeAnalytics() {
  if (!browser || state.initialized) return;
  state.initialized = true;
  const ctx = context();
  if (!ctx.enabled || document.querySelector('meta[http-equiv="refresh"]')) return;
  if (ctx.production && !ctx.synthetic) {
    window.va ||= function () { (window.vaq ||= []).push(arguments); };
    window.va('beforeSend', event => ({ ...event, url: `${location.origin}${publicPage(event.url)}` }));
    const script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    script.dataset.no3dAnalytics = 'vercel';
    script.onerror = () => { state.providerError = 'script_unavailable'; };
    document.head.append(script);
  }
  // Explicit bootstrap, independent of catalog/API module success.
  void track('page_view');
}
