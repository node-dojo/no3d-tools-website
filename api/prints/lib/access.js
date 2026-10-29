import { authenticatedSession } from '../../auth/lib/session.js';
import { commerceFetch } from '../../commerce/lib/client.js';
import { computeAccessState } from '../../lib/subscriptionAccess.js';
import { getSupabaseServiceClient } from '../../lib/supabaseAdmin.js';
import { isR2Configured, presignGetObject } from '../../lib/r2.js';

// These printable downloads are separate products from the similarly named
// Blender tools. Only these exact catalog handles can be served by this route.
export const PRINT_CHECKOUTS = Object.freeze({
  'mace-and-chain': 'https://nodedojo.gumroad.com/l/jvbin?wanted=true',
  'spike-planter-01': 'https://nodedojo.gumroad.com/l/spike-planter-01?wanted=true',
});
const FULL_LIBRARY = 'no3dtools.membership.full-library';

const services = {
  authenticate: authenticatedSession,
  async subscription(email) {
    const client = getSupabaseServiceClient();
    if (!client) throw new Error('access_unavailable');
    const { data, error } = await client.from('subscriptions')
      .select('status, expires_at, grace_until, tier')
      .eq('email', email).neq('tier', 'free')
      .order('expires_at', { ascending: false }).limit(1);
    if (error) throw new Error('access_unavailable');
    return data?.[0] || null;
  },
  async account(req, res) {
    const { response, payload } = await commerceFetch(req, res, '/api/account');
    if (!response.ok || !Array.isArray(payload.entitlements) || !Array.isArray(payload.products)) throw new Error('access_unavailable');
    return payload;
  },
  async product(handle) {
    const client = getSupabaseServiceClient();
    if (!client) throw new Error('delivery_unavailable');
    const { data, error } = await client.from('products')
      .select('handle, file_url, checksum, status').eq('handle', handle).maybeSingle();
    if (error) throw new Error('delivery_unavailable');
    return data;
  },
  deliveryReady: isR2Configured,
  sign: presignGetObject,
  now: () => new Date(),
};

function activeAt(entitlement, now) {
  return entitlement.status === 'active'
    && (!entitlement.startsAt || Date.parse(entitlement.startsAt) <= now.getTime())
    && (!entitlement.endsAt || Date.parse(entitlement.endsAt) > now.getTime());
}

async function resolveAccess(req, res, handle, service) {
  const auth = await service.authenticate(req, res);
  const authenticated = Boolean(auth?.user?.id && auth.user.email && auth.user.email_confirmed_at);
  const purchase = { handle, authenticated, mode: 'purchase', checkoutUrl: PRINT_CHECKOUTS[handle] };
  if (!authenticated) return { access: purchase };

  const subscription = await service.subscription(auth.user.email.trim().toLowerCase());
  let entitlement = computeAccessState(subscription, service.now()).allowed ? 'member' : null;
  if (!entitlement) {
    // Scoped memberships such as Chrome do not grant the entire Prints catalog.
    const account = await service.account(req, res);
    if (account.entitlements.some(item => item.key === FULL_LIBRARY
      && item.scopeType === 'solvet_collection' && item.scopeId === FULL_LIBRARY
      && activeAt(item, service.now()))) entitlement = 'member';
    else if (account.products.some(item => item.handle === handle && item.owned === true
      && item.permanent === true && item.entitlementStatus === 'active'
      && item.fulfillmentStatus === 'fulfilled'
      && ['paid', 'partially_refunded'].includes(item.paymentStatus))) entitlement = 'owned';
  }
  if (!entitlement) return { access: purchase };

  const product = await service.product(handle);
  const ready = product?.handle === handle && product.status === 'active'
    && typeof product.file_url === 'string' && product.file_url.trim() && service.deliveryReady();
  return {
    access: { handle, authenticated: true, entitlement, mode: ready ? 'download' : 'unavailable' },
    product: ready ? product : null,
  };
}

// Injection is for isolated tests only; no request parameter or cookie can
// choose a fixture identity, grant entitlement, or override an asset key.
export function createPrintHandler({ download = false, dependencies = {} } = {}) {
  const service = { ...services, ...dependencies };
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
    const handle = req.query?.handle;
    if (typeof handle !== 'string' || !Object.hasOwn(PRINT_CHECKOUTS, handle)) return res.status(404).json({ error: 'print_not_found' });
    try {
      const { access, product } = await resolveAccess(req, res, handle, service);
      if (!download) return res.status(200).json(access);
      // Always resolve fresh server authority, even after an earlier access GET.
      if (access.mode !== 'download') return res.status(access.mode === 'unavailable' ? 503 : 403).json({ error: access.mode === 'unavailable' ? 'delivery_unavailable' : 'access_required' });
      const url = await service.sign(product.file_url.trim(), 900);
      return res.status(200).json({ url, expiresIn: 900, handle, checksum: product.checksum ?? null });
    } catch {
      // Avoid leaking upstream details or routing a member to a paid checkout
      // when an entitlement service is temporarily unavailable.
      return res.status(503).json({ error: 'print_access_unavailable' });
    }
  };
}
