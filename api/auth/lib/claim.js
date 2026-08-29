import { identityAssertion, readCookie } from './session.js';
import { commerceSiteKey } from '../../lib/commerceSite.js';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function headers(guestToken, assertion) {
  return {
    Authorization: `Bearer ${requiredEnv('COMMERCE_SITE_BACKEND_SECRET')}`,
    'Content-Type': 'application/json',
    'X-NO3D-Guest-Token': guestToken,
    'X-NO3D-Identity': assertion,
    'X-NO3D-Site': commerceSiteKey(),
  };
}

function orderIdFromNext(next) {
  return typeof next === 'string'
    ? (next.match(/^\/v3\/account\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i)?.[1] || null)
    : null;
}

async function verifiedIdentityOwnsOrder(user, next) {
  const orderId = orderIdFromNext(next);
  if (!orderId) return false;
  const response = await fetch(`${requiredEnv('COMMERCE_API_URL').replace(/\/$/, '')}/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${requiredEnv('COMMERCE_SITE_BACKEND_SECRET')}`,
      'X-NO3D-Identity': identityAssertion(user),
      'X-NO3D-Site': commerceSiteKey(),
    },
  });
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`Could not verify authenticated order ownership: ${response.status}`);
}

export async function claimPurchasingGuest(req, user, { next } = {}) {
  if (await verifiedIdentityOwnsOrder(user, next)) return { status: 'already_claimed' };
  const guestToken = readCookie(req, 'no3d_commerce_guest');
  if (!guestToken || !/^[A-Za-z0-9_-]{32,200}$/.test(guestToken)) return { status: 'no_guest' };

  const baseUrl = requiredEnv('COMMERCE_API_URL').replace(/\/$/, '');
  const backendSecret = requiredEnv('COMMERCE_SITE_BACKEND_SECRET');
  const guestResponse = await fetch(`${baseUrl}/api/account`, {
    headers: {
      Authorization: `Bearer ${backendSecret}`,
      'X-NO3D-Guest-Token': guestToken,
      'X-NO3D-Site': commerceSiteKey(),
    },
  });
  const guest = await guestResponse.json().catch(() => null);
  if (!guestResponse.ok || typeof guest?.account?.id !== 'string') {
    throw new Error('Could not resolve purchasing guest account');
  }

  const assertion = identityAssertion(user);
  const claimResponse = await fetch(`${baseUrl}/api/claim`, {
    method: 'POST',
    headers: headers(guestToken, assertion),
    body: JSON.stringify({ accountId: guest.account.id }),
  });
  const result = await claimResponse.json().catch(() => ({ error: 'invalid_claim_response' }));
  if (claimResponse.status === 409) return { status: 'identity_collision' };
  if (!claimResponse.ok || result.claimed !== true) {
    throw new Error(`Commerce claim failed: ${result.error || claimResponse.status}`);
  }
  return { accountId: result.accountId, status: 'claimed' };
}
