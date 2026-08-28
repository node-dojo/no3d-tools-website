const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_CODE = /^[A-Za-z0-9_-]{6,200}$/;
const CHECKOUT_SESSION = /^cs_(?:test_|live_)?[A-Za-z0-9_]{6,200}$/;

function accountOrder(pathname) {
  return pathname.match(/^\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1];
}

export function legacyDestination(requestUrl) {
  const requested = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
  const { pathname, searchParams } = requested;
  const destination = new URL('/v3/account/', requested);
  const orderId = accountOrder(pathname) || searchParams.get('commerce_order');

  if (pathname === '/index.html') return new URL('/v3/', requested);
  if (pathname === '/subscribe' || pathname === '/subscribe.html') return new URL('/v3/membership/', requested);
  if (pathname === '/guide.html' || pathname === '/ai-help.html') {
    destination.searchParams.set('state', 'install');
    return destination;
  }
  if (pathname === '/connect-purchases.html') {
    destination.searchParams.set('state', 'connect');
    const code = searchParams.get('code') || '';
    if (DEVICE_CODE.test(code)) destination.searchParams.set('code', code);
    return destination;
  }
  if (pathname === '/success.html') {
    destination.searchParams.set('membership_checkout', 'success');
    const sessionId = searchParams.get('session_id') || '';
    if (CHECKOUT_SESSION.test(sessionId)) destination.searchParams.set('session_id', sessionId);
    return destination;
  }
  if (pathname === '/purchase.html' || pathname === '/library.html' || pathname === '/account' || pathname === '/account.html' || accountOrder(pathname)) {
    if (orderId && UUID.test(orderId)) return new URL(`/v3/account/orders/${orderId}`, requested);
    if (searchParams.get('blender') === 'connected') destination.searchParams.set('state', 'complete');
    if (searchParams.get('auth') === 'invalid') return new URL('/v3/onboarding/create-account/?auth=expired', requested);
    return destination;
  }
  return null;
}
