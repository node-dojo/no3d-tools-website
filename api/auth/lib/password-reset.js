import { authFetch, clearCookie, generateAuthLink, openPayload, readCookie, safeAuthNext, sealPayload, setCookie } from './session.js';
import { sendAuthEmail } from './auth-email.js';
import { v3OwnerAllowed } from './v3-access.js';

const COOKIE = 'no3d_password_reset';
const LIFETIME = 15 * 60;

export function resetNext(value) {
  const next = safeAuthNext(value);
  return next && (next === '/v3/' || next.startsWith('/v3/account/') || next.startsWith('/v3/prints/') || next.startsWith('/v3/product/') || next.startsWith('/v3/membership/'))
    ? next : '/v3/account/';
}

export async function sendPasswordReset(email, next, recoveryToken = '') {
  const generated = await generateAuthLink({ email, type: 'recovery' });
  if (generated.verificationType !== 'recovery' || !generated.user?.id) throw new Error('invalid_recovery_response');
  const grant = sealPayload({
    kind: 'password-reset', exp: Date.now() + LIFETIME * 1000,
    tokenHash: generated.tokenHash, userId: generated.user.id,
    next: resetNext(next), recoveryToken,
  });
  const base = process.env.NO3D_SITE_URL?.trim();
  if (!base) throw new Error('missing_site_url');
  // The proof stays in a URL fragment: it is never a request URL or referrer.
  await sendAuthEmail({ email, kind: 'password-reset', continueUrl: `${base.replace(/\/$/, '')}/v3/auth/reset-password/#grant=${encodeURIComponent(grant)}` });
}

export function openPasswordResetGrant(value) {
  if (typeof value !== 'string' || value.length > 4096) return null;
  const grant = openPayload(value);
  if (grant?.kind !== 'password-reset' || !Number.isFinite(grant.exp) || grant.exp <= Date.now()) return null;
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(grant.tokenHash) || typeof grant.userId !== 'string') return null;
  if (grant.next !== resetNext(grant.next)) return null;
  if (grant.recoveryToken && !/^[A-Za-z0-9_-]{43}$/.test(grant.recoveryToken)) return null;
  return grant;
}

function storeReset(res, state) {
  setCookie(res, COOKIE, sealPayload(state), Math.max(0, Math.floor((state.exp - Date.now()) / 1000)));
}

export function readPasswordReset(req) {
  const value = openPayload(readCookie(req, COOKIE));
  return value?.kind === 'password-reset-session' && Number.isFinite(value.exp) && value.exp > Date.now()
    && typeof value.refreshToken === 'string' && typeof value.userId === 'string'
    && value.next === resetNext(value.next) ? value : null;
}

export function clearPasswordReset(res) { clearCookie(res, COOKIE); }

export async function verifyPasswordReset(res, grant) {
  const payload = await authFetch('/verify', { body: { token_hash: grant.tokenHash, type: 'recovery' } });
  const session = payload.session || payload;
  const user = payload.user || session.user;
  if (!session.refresh_token || !user?.email_confirmed_at || user.id !== grant.userId || !v3OwnerAllowed(user.email)) throw new Error('invalid_recovery_identity');
  // Recovery proves only permission to set a password. It does not create a
  // normal account session or expose access/refresh tokens to browser JS.
  storeReset(res, { kind: 'password-reset-session', exp: grant.exp, userId: user.id, refreshToken: session.refresh_token, next: grant.next, recoveryToken: grant.recoveryToken });
}

export async function updateRecoveredPassword(res, state, password) {
  // Refresh validates the recovery session with Auth, including revocation.
  // An old normal sign-in cookie is never accepted as recovery proof.
  const session = await authFetch('/token?grant_type=refresh_token', { body: { refresh_token: state.refreshToken } });
  if (!session.access_token || !session.refresh_token || session.user?.id !== state.userId || !session.user.email_confirmed_at || !v3OwnerAllowed(session.user.email)) throw new Error('invalid_recovery_identity');
  storeReset(res, { ...state, refreshToken: session.refresh_token });
  const user = await authFetch('/user', { method: 'PUT', accessToken: session.access_token, body: { password } });
  clearPasswordReset(res);
  // Revoke the recovery session and other refresh sessions after the change.
  // Existing short-lived access tokens retain the provider's normal expiry.
  let sessionsRevoked = false;
  try {
    await authFetch('/logout?scope=global', { accessToken: session.access_token });
    sessionsRevoked = true;
  } catch { /* The password is already changed; never misreport it as unchanged. */ }
  return { user, sessionsRevoked };
}
