import { getAccountState, getOrder, requestRecovery, requestSignIn, signOut } from './api.js';

const $ = selector => document.querySelector(selector);
const state = { products: [], catalog: new Map(), authenticated: false };
const params = new URLSearchParams(location.search);
const pathOrder = location.pathname.match(/^\/v3\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1];
const orderId = params.get('commerce_order') || pathOrder || '';

function readableHandle(handle = '') {
  return handle.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function accessLabel(item) {
  if (item.paymentStatus === 'refunded') return 'Refunded / access removed';
  if (item.entitlementStatus === 'revoked' || !item.owned) return 'Access revoked';
  return item.permanent ? 'Permanent access' : 'Membership access';
}

function render() {
  const term = $('[data-account-search]').value.trim().toLowerCase();
  const sort = $('[data-account-sort]').value;
  const products = state.products.filter(item => readableHandle(item.handle).toLowerCase().includes(term));
  products.sort((a, b) => {
    if (sort === 'name') return readableHandle(a.handle).localeCompare(readableHandle(b.handle));
    if (sort === 'access') return accessLabel(a).localeCompare(accessLabel(b));
    return new Date(b.purchasedAt || 0) - new Date(a.purchasedAt || 0);
  });
  const items = $('[data-account-items]');
  items.replaceChildren();
  for (const item of products) {
    const catalogProduct = state.catalog.get(item.handle);
    const row = document.createElement('article');
    row.className = 'account-item';
    const thumb = document.createElement('div');
    thumb.className = 'account-thumb';
    if (catalogProduct?.thumbnail) {
      const image = document.createElement('img');
      image.src = catalogProduct.thumbnail;
      image.alt = '';
      thumb.append(image);
    }
    const copy = document.createElement('div');
    copy.className = 'account-copy';
    const title = document.createElement('h3');
    title.textContent = catalogProduct?.title || readableHandle(item.handle);
    const detail = document.createElement('span');
    detail.textContent = `${accessLabel(item)}${item.purchasedAt ? ` / ${new Date(item.purchasedAt).toLocaleDateString()}` : ''}`;
    copy.append(title, detail);
    const action = document.createElement('a');
    action.className = 'account-action';
    action.href = item.orderId ? `/api/commerce/download/${encodeURIComponent(item.orderId)}` : `/v3/product/?handle=${encodeURIComponent(item.handle)}`;
    action.textContent = item.owned ? 'Download →' : 'Details →';
    row.append(thumb, copy, action);
    items.append(row);
  }
  $('[data-account-empty]').hidden = products.length > 0;
  $('[data-account-empty]').textContent = state.products.length ? 'No instruments match this search.' : 'No owned instruments yet.';
}

function renderOrder(order) {
  const panel = $('[data-latest-order]');
  panel.hidden = false;
  const product = state.catalog.get(order.resourceId);
  $('[data-order-title]').textContent = product?.title || readableHandle(order.resourceId || 'Latest purchase');
  const ready = order.paymentStatus === 'paid' && order.fulfillmentStatus === 'fulfilled' && order.recovery;
  if (ready) {
    $('[data-order-state]').textContent = 'Latest purchase / Ready';
    $('[data-order-detail]').textContent = 'Payment and durable fulfillment are confirmed. This instrument is retained in your library.';
    const action = $('[data-order-action]');
    action.hidden = false;
    action.href = `/api/commerce/download/${encodeURIComponent(order.orderId)}`;
    return true;
  }
  if (['refunded', 'disputed'].includes(order.paymentStatus)) {
    $('[data-order-state]').textContent = 'Purchase unavailable';
    $('[data-order-detail]').textContent = 'This order is not currently available for delivery.';
    return true;
  }
  $('[data-order-state]').textContent = order.paymentStatus === 'paid' ? 'Payment received / Preparing' : 'Confirming purchase';
  return false;
}

async function monitorOrder() {
  if (!orderId) return;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const order = await getOrder(orderId);
      if (renderOrder(order)) {
        if (!state.authenticated && !localStorage.getItem(`no3d_v3_recovery_${orderId}`)) {
          await requestRecovery(orderId).catch(() => null);
          localStorage.setItem(`no3d_v3_recovery_${orderId}`, '1');
        }
        return;
      }
    } catch {
      $('[data-latest-order]').hidden = false;
      $('[data-order-detail]').textContent = 'The purchase status could not be checked. Retrying securely.';
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  $('[data-order-state]').textContent = 'Payment received / Still preparing';
  $('[data-order-detail]').textContent = `Delivery continues securely. Order ${orderId}`;
}

const { session, catalog, summary } = await getAccountState();
state.authenticated = session.authenticated === true;
state.catalog = catalog;
state.products = summary?.products || [];
const email = session.email || summary?.account?.contactEmail || '';
$('[data-identity]').textContent = email || 'Guest library';
$('[data-identity-state]').textContent = state.authenticated ? 'Library saved' : state.products.length ? 'Temporary purchase access' : 'No saved library';
$('[data-account-state]').textContent = state.authenticated ? 'Authenticated account' : state.products.length ? 'Guest purchase state' : 'Guest account';
$('[data-account-message]').textContent = state.authenticated
  ? `${state.products.length} owned instrument${state.products.length === 1 ? '' : 's'} available to this account.`
  : state.products.length
    ? 'This browser has temporary purchase access. Sign in to retain it across devices.'
    : 'Sign in with a purchase email to restore permanent purchases and active membership access.';
$('[data-sign-in]').hidden = state.authenticated;
$('[data-session-action]').textContent = state.authenticated ? 'Sign out' : 'Sign in';
render();
void monitorOrder();

$('[data-account-search]').addEventListener('input', render);
$('[data-account-sort]').addEventListener('change', render);
$('[data-sign-in-form]').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const message = $('[data-sign-in-message]');
  button.disabled = true;
  message.textContent = 'Sending secure link…';
  try {
    await requestSignIn(form.elements.email.value.trim());
    message.textContent = 'Check your email. This page will remain available.';
  } catch {
    message.textContent = 'The link could not be sent. Check the address and try again.';
  } finally {
    button.disabled = false;
  }
});
$('[data-session-action]').addEventListener('click', async () => {
  if (state.authenticated) {
    await signOut().catch(() => null);
    location.reload();
  } else {
    $('[data-sign-in] input').focus();
    $('[data-sign-in]').scrollIntoView({ block: 'center' });
  }
});
