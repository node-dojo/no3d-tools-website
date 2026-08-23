import crypto from 'crypto';

const ACCESS_COOKIE = 'no3d_auth_access';
const REFRESH_COOKIE = 'no3d_auth_refresh';
const VERIFIER_COOKIE = 'no3d_auth_pkce';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const part = cookies.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return null;
  }
}

function appendCookie(res, value) {
  const current = res.getHeader('Set-Cookie');
  const values = current ? (Array.isArray(current) ? current : [String(current)]) : [];
  res.setHeader('Set-Cookie', [...values, value]);
}

function cookieSecurity() {
  return process.env.NO3D_AUTH_COOKIE_SECURE === 'false' ? '' : '; Secure';
}

function setCookie(res, name, value, maxAge) {
  appendCookie(
    res,
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly${cookieSecurity()}; SameSite=Lax`,
  );
}

function clearCookie(res, name) {
  appendCookie(
    res,
    `${name}=; Path=/; Max-Age=0; HttpOnly${cookieSecurity()}; SameSite=Lax`,
  );
}

async function authFetch(path, { accessToken, body, method = 'POST' } = {}) {
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  const response = await fetch(`${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/auth/v1${path}`, {
    method,
    headers: {
      apikey: anonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.error_description || payload.error || `Supabase Auth ${response.status}`);
  return payload;
}

function storeSession(res, session) {
  setCookie(res, ACCESS_COOKIE, session.access_token, 60 * 60 * 24 * 30);
  setCookie(res, REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30);
}

function pkceChallenge(res) {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  setCookie(res, VERIFIER_COOKIE, verifier, 60 * 10);
  return challenge;
}

function sessionPayload(payload) {
  const session = payload?.session || payload;
  return session?.access_token && session?.refresh_token ? session : null;
}

export function clearAuthCookies(res, { includeGuest = false } = {}) {
  clearCookie(res, ACCESS_COOKIE);
  clearCookie(res, REFRESH_COOKIE);
  clearCookie(res, VERIFIER_COOKIE);
  if (includeGuest) clearCookie(res, 'no3d_commerce_guest');
}

export function safeAuthNext(value) {
  return typeof value === 'string' && /^\/[A-Za-z0-9/_?.=&-]*$/.test(value) && !value.startsWith('//')
    ? value
    : undefined;
}

function callbackUrl(req, recoveryToken, next) {
  const configured = process.env.NO3D_SITE_URL?.trim();
  let value;
  if (configured) {
    value = `${configured.replace(/\/$/, '')}/api/auth/callback`;
  } else {
    if (process.env.VERCEL_ENV === 'production') throw new Error('Missing NO3D_SITE_URL');
    const host = req.headers.host;
    if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
      throw new Error('Untrusted local callback host');
    }
    value = `http://${host}/api/auth/callback`;
  }
  if (recoveryToken !== undefined) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(recoveryToken)) throw new Error('Invalid recovery token');
    const url = new URL(value);
    url.searchParams.set('recovery_token', recoveryToken);
    value = url.toString();
  }
  const safeNext = safeAuthNext(next);
  if (safeNext) {
    const url = new URL(value);
    url.searchParams.set('next', safeNext);
    value = url.toString();
  }
  return value;
}

export async function requestSignInLink(req, res, email, { recoveryToken, next } = {}) {
  const challenge = pkceChallenge(res);
  const redirectTo = encodeURIComponent(callbackUrl(req, recoveryToken, next));
  await authFetch(`/otp?redirect_to=${redirectTo}`, {
    body: {
      code_challenge: challenge,
      code_challenge_method: 's256',
      create_user: true,
      email,
    },
  });
}

export async function passwordSignUp(req, res, email, password, { next } = {}) {
  const challenge = pkceChallenge(res);
  const redirectTo = encodeURIComponent(callbackUrl(req, undefined, next));
  const payload = await authFetch(`/signup?redirect_to=${redirectTo}`, {
    body: { email, password, code_challenge: challenge, code_challenge_method: 's256', data: {} },
  });
  const session = sessionPayload(payload);
  if (session) {
    storeSession(res, session);
    clearCookie(res, VERIFIER_COOKIE);
  }
  const user = payload.user || session?.user || null;
  const accountExists = Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
  return {
    authenticated: Boolean(session),
    verificationRequired: !session && !accountExists,
    accountExists,
    user,
  };
}

export async function passwordSignIn(res, email, password) {
  const payload = await authFetch('/token?grant_type=password', { body: { email, password } });
  const session = sessionPayload(payload);
  if (!session) throw new Error('Password sign-in returned no session');
  storeSession(res, session);
  clearCookie(res, VERIFIER_COOKIE);
  return { authenticated: true, user: payload.user || session.user || null };
}

export function oauthAuthorizationUrl(req, res, provider, { next } = {}) {
  if (!['google', 'github'].includes(provider)) throw new Error('Unsupported OAuth provider');
  const challenge = pkceChallenge(res);
  const redirectTo = callbackUrl(req, undefined, next);
  const query = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    code_challenge: challenge,
    code_challenge_method: 's256',
  });
  return `${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/auth/v1/authorize?${query}`;
}

export async function exchangeAuthCode(req, res, code) {
  const verifier = readCookie(req, VERIFIER_COOKIE);
  if (!verifier) throw new Error('Missing or expired sign-in verifier');
  const session = await authFetch('/token?grant_type=pkce', {
    body: { auth_code: code, code_verifier: verifier },
  });
  if (!session.access_token || !session.refresh_token || !session.user) throw new Error('Sign-in returned no session');
  storeSession(res, session);
  clearCookie(res, VERIFIER_COOKIE);
  return { session, user: session.user };
}

export async function authenticatedSession(req, res) {
  const accessToken = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  if (!accessToken || !refreshToken) return null;

  let session = { access_token: accessToken, refresh_token: refreshToken };
  let user;
  try {
    user = await authFetch('/user', { accessToken, method: 'GET' });
  } catch {
    try {
      session = await authFetch('/token?grant_type=refresh_token', {
        body: { refresh_token: refreshToken },
      });
      if (!session.access_token || !session.refresh_token) throw new Error('Refresh returned no session');
      user = session.user || await authFetch('/user', { accessToken: session.access_token, method: 'GET' });
    } catch {
      clearAuthCookies(res);
      return null;
    }
  }
  if (!user) {
    clearAuthCookies(res);
    return null;
  }
  storeSession(res, session);
  return {
    client: {
      auth: {
        signOut: async () => {
          try {
            await authFetch('/logout?scope=local', { accessToken: session.access_token });
          } catch {
            // Local cookies are still cleared even if remote session invalidation fails.
          }
        },
      },
    },
    session,
    user,
  };
}

export function identityAssertion(user, now = new Date()) {
  const secret = requiredEnv('COMMERCE_IDENTITY_ASSERTION_SECRET');
  const kid = requiredEnv('COMMERCE_IDENTITY_ASSERTION_KID');
  const issuer = (process.env.NO3D_AUTH_ISSUER || process.env.NO3D_SITE_URL || '').replace(/\/$/, '');
  if (!issuer) throw new Error('Missing NO3D_AUTH_ISSUER or NO3D_SITE_URL');
  if (!user?.id || !user?.email || !user?.email_confirmed_at) {
    throw new Error('Supabase identity is not email verified');
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid, typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    aud: 'no3d-commerce',
    email: user.email.toLowerCase(),
    email_verified: true,
    exp: issuedAt + 120,
    iat: issuedAt,
    iss: issuer,
    jti: crypto.randomUUID(),
    sub: user.id,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${signature}`;
}

export async function authenticatedIdentityAssertion(req, res) {
  const auth = await authenticatedSession(req, res);
  return auth ? identityAssertion(auth.user) : null;
}
