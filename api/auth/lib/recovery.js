import { identityAssertion } from './session.js';
import { commerceSiteKey } from '../../lib/commerceSite.js';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function commerceHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${requiredEnv('COMMERCE_SITE_BACKEND_SECRET')}`,
    'Content-Type': 'application/json',
    'X-NO3D-Site': commerceSiteKey(),
    ...extra,
  };
}

export async function issuePurchaseRecovery(req, orderId) {
  const guestToken = String(req.headers.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('no3d_commerce_guest='));
  const encodedToken = guestToken?.slice('no3d_commerce_guest='.length);
  let token;
  try {
    token = encodedToken ? decodeURIComponent(encodedToken) : '';
  } catch {
    token = '';
  }
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(token)) throw new Error('Missing guest purchase proof');

  const response = await fetch(`${requiredEnv('COMMERCE_API_URL').replace(/\/$/, '')}/api/recovery/issue`, {
    method: 'POST',
    headers: commerceHeaders({ 'X-NO3D-Guest-Token': token }),
    body: JSON.stringify({ orderId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !/^[A-Za-z0-9_-]{43}$/.test(result.token) || typeof result.contactEmail !== 'string') {
    throw new Error(`Commerce recovery issue failed: ${result.error || response.status}`);
  }
  return result;
}

export async function redeemPurchaseRecovery(user, token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: 'invalid_recovery' };
  const response = await fetch(`${requiredEnv('COMMERCE_API_URL').replace(/\/$/, '')}/api/recovery/redeem`, {
    method: 'POST',
    headers: commerceHeaders({ 'X-NO3D-Identity': identityAssertion(user) }),
    body: JSON.stringify({ token }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409) return { status: 'identity_collision' };
  if (response.status === 404) return { status: 'invalid_recovery' };
  if (!response.ok || result.claimed !== true) {
    throw new Error(`Commerce recovery redemption failed: ${result.error || response.status}`);
  }
  return { accountId: result.accountId, status: 'claimed' };
}
