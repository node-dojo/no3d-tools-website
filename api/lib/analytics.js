const SAFE_QUERY_PARAMETERS = new Set([
  'access',
  'auth',
  'checkout',
  'claim',
  'handle',
  'membership',
  'purchase',
  'state',
]);

const SENSITIVE_PROPERTY_KEY = /(?:auth|code|email|key|order|password|secret|session|token|verifier)/i;

export function sanitizeAnalyticsPage(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, 'https://no3dtools.com');
    const safe = new URLSearchParams();
    for (const [key, item] of url.searchParams) {
      if (SAFE_QUERY_PARAMETERS.has(key)) safe.append(key, item.slice(0, 160));
    }
    const query = safe.toString();
    return `${url.pathname}${query ? `?${query}` : ''}`.slice(0, 1000);
  } catch {
    return null;
  }
}

export function sanitizeAnalyticsReferrer(value, siteOrigin = 'https://no3dtools.com') {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    const ownOrigin = new URL(siteOrigin).origin;
    if (url.origin === ownOrigin) return `${url.origin}${sanitizeAnalyticsPage(url.href)}`.slice(0, 1000);
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return null;
  }
}

export function sanitizeAnalyticsProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
  return Object.fromEntries(Object.entries(properties).flatMap(([key, value]) => {
    if (SENSITIVE_PROPERTY_KEY.test(key)) return [];
    if (!['string', 'number', 'boolean'].includes(typeof value)) return [];
    return [[key.slice(0, 80), typeof value === 'string' ? value.slice(0, 240) : value]];
  }));
}
