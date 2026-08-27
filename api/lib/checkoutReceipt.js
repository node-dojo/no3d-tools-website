import crypto from 'node:crypto';

const COOKIE = 'no3d_checkout_receipt';
const TTL_SECONDS = 2 * 60 * 60;

function signingSecret() {
  const value = process.env.CHECKOUT_RECEIPT_SECRET || process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error('Checkout receipt signing is not configured');
  return value;
}

function signature(value) {
  return crypto.createHmac('sha256', signingSecret()).update(value).digest('base64url');
}

function cookieValue(req) {
  const raw = String(req.headers?.cookie || '');
  const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(COOKIE.length + 1));
  } catch {
    return null;
  }
}

function appendCookie(res, value) {
  const current = res.getHeader('Set-Cookie');
  const values = current ? (Array.isArray(current) ? current : [String(current)]) : [];
  res.setHeader('Set-Cookie', [...values, value]);
}

export function setCheckoutReceipt(res, sessionId, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + TTL_SECONDS;
  const payload = `${sessionId}.${expiresAt}`;
  const secure = process.env.NO3D_AUTH_COOKIE_SECURE === 'false' ? '' : '; Secure';
  appendCookie(
    res,
    `${COOKIE}=${encodeURIComponent(`${payload}.${signature(payload)}`)}; Path=/; Max-Age=${TTL_SECONDS}; HttpOnly${secure}; SameSite=Lax`,
  );
}

export function hasCheckoutReceipt(req, sessionId, now = Date.now()) {
  if (typeof sessionId !== 'string' || !/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const value = cookieValue(req);
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [receiptSessionId, expiresAt, supplied] = parts;
  if (receiptSessionId !== sessionId || !/^\d{10}$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(now / 1000)) return false;
  const expected = Buffer.from(signature(`${receiptSessionId}.${expiresAt}`));
  const actual = Buffer.from(supplied || '');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function checkoutSessionOwnedByRequest(req, res, session) {
  if (hasCheckoutReceipt(req, session?.id)) return true;
  const { authenticatedSession } = await import('../auth/lib/session.js');
  const auth = await authenticatedSession(req, res);
  const accountEmail = auth?.user?.email_confirmed_at ? auth.user.email?.trim().toLowerCase() : '';
  const checkoutEmail = (session?.customer_details?.email || session?.customer_email || '').trim().toLowerCase();
  return Boolean(accountEmail && checkoutEmail && accountEmail === checkoutEmail);
}
