import crypto from 'crypto';
import { authenticatedIdentityAssertion } from '../../auth/lib/session.js';

const GUEST_COOKIE = 'no3d_commerce_guest';
const PRODUCT_HANDLE = /^[a-z0-9][a-z0-9-]{1,100}$/;

function cookieValue(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function guestToken(req, res) {
  const existing = cookieValue(req, GUEST_COOKIE);
  if (existing && /^[A-Za-z0-9_-]{32,200}$/.test(existing)) return existing;

  const token = crypto.randomBytes(32).toString('base64url');
  const secure = process.env.NO3D_AUTH_COOKIE_SECURE === 'false' ? '' : '; Secure';
  res.setHeader('Set-Cookie', `${GUEST_COOKIE}=${token}; Path=/; Max-Age=31536000; HttpOnly${secure}; SameSite=Lax`);
  return token;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function individualProductsEnabled() {
  return process.env.COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED === 'true' ||
    process.env.COMMERCE_CHROME_CRAYON_ENABLED === 'true';
}

export function offerKeyForHandle(handle) {
  if (typeof handle !== 'string' || !PRODUCT_HANDLE.test(handle)) return null;
  return `no3dtools.product.${handle}`;
}

export async function commerceIdentityHeaders(req, res) {
  // A verified identity assertion may only be added here by trusted server-side
  // session middleware. Browser request headers are deliberately ignored.
  const verifiedAssertion = req.commerceIdentityAssertion;
  if (typeof verifiedAssertion === 'string' && verifiedAssertion.length > 20) {
    return { 'X-NO3D-Identity': verifiedAssertion };
  }
  const sessionAssertion = await authenticatedIdentityAssertion(req, res);
  if (sessionAssertion) return { 'X-NO3D-Identity': sessionAssertion };
  return { 'X-NO3D-Guest-Token': guestToken(req, res) };
}

export async function commerceFetch(req, res, path, options = {}) {
  const baseUrl = requiredEnv('COMMERCE_API_URL').replace(/\/$/, '');
  const backendSecret = requiredEnv('COMMERCE_SITE_BACKEND_SECRET');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${backendSecret}`,
      'X-NO3D-Site': 'no3dtools',
      ...(await commerceIdentityHeaders(req, res)),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({ error: 'invalid_commerce_response' }));
  return { response, payload };
}

export function validProductRecovery(order) {
  const recovery = order?.recovery;
  const handle = order?.resourceId;
  const offerKey = offerKeyForHandle(handle);
  return Boolean(
    offerKey &&
      order?.offerKey === offerKey &&
      order?.resourceType === 'no3dtools_product' &&
      ['paid', 'partially_refunded'].includes(order?.paymentStatus) &&
      order?.fulfillmentStatus === 'fulfilled' &&
      recovery?.kind === 'no3dtools_product_download' &&
      recovery?.product_handle === handle,
  );
}

export function commerceError(res, error) {
  console.error('Commerce adapter error:', error instanceof Error ? error.message : error);
  return res.status(503).json({ error: 'commerce_unavailable' });
}
