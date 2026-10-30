import { getAccountState } from './api.js?v=prints-20261028b';
import { getPrintAccess } from './print-price.js?v=prints-member-price-20261029';
import { accountFileAction, mergeEffectiveAccountLibrary, projectScopedMembershipCatalog } from './account-library.js?v=prints-20261028b';

export async function landingAccess(product) {
  if (product.kind === 'print') {
    const access = await getPrintAccess(product.handle, AbortSignal.timeout(10000));
    if (access.handle !== product.handle || !['purchase', 'download', 'unavailable'].includes(access.mode)) throw Error('access_unavailable');
    return { ...access, href: `/api/prints/download?handle=${encodeURIComponent(product.handle)}` };
  }
  // Resolve the same library projection as Account. A failed account lookup
  // must not turn a member or an existing owner into a new purchaser.
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('access_unavailable');
  const session = await response.json();
  if (!session.authenticated) return { authenticated: false, mode: product.product.accessPolicy === 'free' ? 'signin' : 'purchase' };
  const state = await getAccountState();
  if (!state.session.authenticated || !state.summary || !state.membership) throw Error('access_unavailable');
  const candidates = [...(state.summary.products || [])];
  if (state.membershipCollections.length) {
    candidates.push(...projectScopedMembershipCatalog(state.catalog, state.membershipCollections).records);
  } else if (state.membership.active || state.summary.memberships?.some(item => ['active', 'trialing'].includes(item.status))) {
    candidates.push({ handle: product.handle, membership: true, owned: true });
  }
  if (product.product.accessPolicy === 'free') candidates.push({ handle: product.handle, free: true, owned: true });
  const owned = mergeEffectiveAccountLibrary(candidates).find(item => item.handle === product.handle && item.owned);
  if (!owned) return { authenticated: true, mode: 'purchase' };
  const action = accountFileAction(owned, product.product);
  return { authenticated: true, mode: action.href.startsWith('/api/') ? 'download' : 'install',
    entitlement: owned.membership ? 'member' : owned.free ? 'free' : 'owned',
    href: action.href.startsWith('/api/') ? action.href : '/v3/account/?state=install' };
}
