// Shared public contract. No credentials or customer identifiers belong here.
export const ANALYTICS_VERSION = 2;
export const CLIENT_EVENTS = new Set(['page_view', 'product_view', 'collection_view',
  'account_start', 'account_submit', 'account_confirmation_requested', 'account_authenticated',
  'account_confirmation_completed', 'account_submit_failed', 'sign_in_link_requested', 'sign_in_link_failed',
  'product_checkout_start', 'product_checkout_redirect', 'product_checkout_failed',
  'membership_checkout_start', 'membership_checkout_redirect', 'membership_checkout_failed',
  'collection_checkout_start', 'collection_checkout_redirect', 'collection_checkout_failed',
  'membership_checkout_returned', 'product_fulfillment_observed', 'membership_fulfillment_observed']);
export function publicHandle(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(value) ? value : null;
}
export function publicPage(value) {
  try {
    const u = new URL(value, 'https://no3dtools.com');
    const p = u.pathname;
    if (/^\/v3\/account(?:\/|$)/.test(p)) return '/v3/account/';
    if (/^\/v3\/auth(?:\/|$)/.test(p)) return '/v3/auth/';
    if (/^\/v3\/product\/?$/.test(p)) {
      const handle = publicHandle(u.searchParams.get('handle'));
      return '/v3/product/' + (handle ? `?handle=${handle}` : '');
    }
    if (/^\/v3\/collections\/[a-z0-9-]+\/?$/.test(p)) return p;
    if (/^\/v3\/(?:onboarding\/(?:create-account|install|connect)\/|membership\/|workbench\/|access\/)?$/.test(p)) return p;
    if (p === '/' || p === '/index.html') return '/';
    return '/other';
  } catch { return '/other'; }
}
export function publicProperties(input) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const k of ['handle', 'source', 'destination', 'mode', 'schedule']) {
    const v = publicHandle(input[k]);
    if (v) out[k] = v;
  }
  return out;
}
export function publicReferrer(value) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.origin : null;
  } catch { return null; }
}
