import { approveBlenderConnection, createBillingPortal, getAccountState, getOrder, requestRecovery, signOut } from './api.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const params = new URLSearchParams(location.search);
const pathOrder = location.pathname.match(/^\/v3\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1];
const orderId = params.get('commerce_order') || pathOrder || '';
const requestedState = ['install', 'connect', 'complete'].includes(params.get('state')) ? params.get('state') : 'ready';
const state = { products: [], catalog: new Map(), authenticated: false, setup: requestedState };

function readableHandle(handle = '') {
  return handle.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function accessLabel(item) {
  if (item.free) return 'Free tool';
  if (item.paymentStatus === 'refunded') return 'Refunded / access removed';
  if (item.entitlementStatus === 'revoked' || !item.owned) return 'Access revoked';
  return item.permanent ? 'Permanent access' : 'Membership access';
}

function updateCount() {
  const label = `${String(state.products.length).padStart(2, '0')} tool${state.products.length === 1 ? '' : 's'}`;
  $$('[data-library-count]').forEach(node => { node.textContent = label; });
  $('[data-completion-count]').textContent = state.products.length
    ? `${label} in your collection`
    : 'Your free collection';
}

function renderLibrary() {
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
  for (const [index, item] of products.entries()) {
    const product = state.catalog.get(item.handle);
    const row = document.createElement('article');
    row.className = 'library-card';
    row.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div class="library-card-media"></div><div class="library-card-copy"><h3></h3><span></span></div><a class="library-card-action"></a>`;
    if (product?.thumbnail) {
      const image = document.createElement('img');
      image.src = product.thumbnail;
      image.alt = '';
      row.querySelector('.library-card-media').append(image);
    }
    row.querySelector('h3').textContent = product?.title || readableHandle(item.handle);
    row.querySelector('.library-card-copy span').textContent = `${accessLabel(item)}${item.purchasedAt ? ` / Added ${new Date(item.purchasedAt).toLocaleDateString()}` : ' / Ready to install'}`;
    const action = row.querySelector('a');
    action.href = item.orderId ? `/api/commerce/download/${encodeURIComponent(item.orderId)}` : `/v3/product/?handle=${encodeURIComponent(item.handle)}`;
    action.textContent = item.lastInstalledAt ? 'Check for update →' : item.owned ? 'Install →' : 'Details →';
    items.append(row);
  }
  $('[data-account-empty]').hidden = products.length > 0;
  $('[data-account-empty]').textContent = state.products.length ? 'No instruments match this search.' : 'Your free collection will appear here as instruments are published.';
  updateCount();
}

function setBlenderRecord(mode) {
  const selected = localStorage.getItem('no3d_blender_version') || '—';
  const values = mode === 'install'
    ? ['Awaiting installation', selected, '—', 'Not connected']
    : mode === 'connect'
      ? ['This installation', selected, 'Installed', 'Connecting…']
      : mode === 'ready'
        ? ['This installation', selected, 'Installed', 'Today']
        : ['Not connected', '—', '—', '—'];
  const selectors = ['[data-blender-installation]', '[data-blender-version]', '[data-addon-version]', '[data-blender-contact]'];
  selectors.forEach((selector, index) => { $(selector).textContent = values[index]; });
  $('[data-identity-blender]').textContent = mode === 'ready' ? '01 installation connected' : mode === 'connect' ? 'Connection in progress' : 'Not connected';
  $('[data-summary-blender]').textContent = mode === 'ready' ? 'Connected ●' : 'Not connected';
}

function setSetup(nextState, { replace = false } = {}) {
  state.setup = nextState;
  document.documentElement.dataset.accountState = nextState;
  document.documentElement.classList.toggle('setup-active', nextState !== 'ready');
  $$('[data-setup-panel]').forEach(panel => { panel.hidden = panel.dataset.setupPanel !== nextState; });
  setBlenderRecord(nextState);
  if (replace) {
    const url = new URL(location.href);
    if (nextState === 'ready') url.searchParams.delete('state');
    else url.searchParams.set('state', nextState);
    url.searchParams.delete('code');
    history.replaceState({}, '', url);
  }
}

async function completeConnection(deviceCode) {
  const title = $('[data-connect-title]');
  const message = $('[data-connect-message]');
  title.textContent = 'Connecting Your Library';
  message.textContent = 'Authenticating this Blender…';
  try {
    await approveBlenderConnection(deviceCode);
    $('[data-connect-register]').className = 'complete';
    $('[data-connect-register] span').textContent = 'Complete ●';
    $('[data-connect-library]').className = 'working';
    $('[data-connect-library] span').textContent = 'Loading ●';
    window.setTimeout(() => setSetup('complete', { replace: true }), 520);
  } catch {
    title.textContent = 'Connection Not Found';
    message.textContent = 'Use the recovery option and check the short code shown in Blender.';
    $('[data-connect-register]').className = 'working';
    $('[data-connect-register] span').textContent = 'Needs attention';
  }
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

function renderAccountNotice() {
  if (params.get('claim') !== 'review') return;
  const panel = $('[data-latest-order]');
  panel.hidden = false;
  $('[data-order-state]').textContent = 'Account review / Library protected';
  $('[data-order-title]').textContent = 'We found two existing account records';
  $('[data-order-detail]').textContent = 'Your purchase remains safe. Support must verify the records before combining this library; the site will not merge accounts by email alone.';
  $('[data-order-action]').hidden = true;
}

async function monitorOrder() {
  if (!orderId) return;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const order = await getOrder(orderId);
      if (renderOrder(order)) {
        if (!localStorage.getItem(`no3d_v3_recovery_${orderId}`)) {
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
}

const { session, catalog, summary } = await getAccountState();
state.authenticated = session.authenticated === true;
if (!state.authenticated) {
  const next = `${location.pathname}${location.search}`;
  location.replace(`/v3/onboarding/create-account/?next=${encodeURIComponent(next)}`);
} else {
  state.catalog = catalog;
  state.products = summary?.products || [];
  const email = session.email || summary?.account?.contactEmail || 'Your NO3D account';
  $$('[data-account-email]').forEach(node => { node.textContent = email; });
  const member = Boolean(summary?.memberships?.some(item => ['active', 'trialing'].includes(item.status)));
  $('[data-account-tier]').textContent = member ? 'Member' : 'Free';
  $('[data-account-membership]').textContent = member ? 'Member / Automatic updates' : 'Free / Manual updates';
  $('[data-update-mode]').textContent = member ? 'Automatic' : 'Manual';
  const billing = $('[data-manage-billing]');
  billing.hidden = !member && state.products.length === 0;
  billing.addEventListener('click', async () => {
    billing.disabled = true;
    billing.textContent = 'Opening secure billing…';
    try {
      const portal = await createBillingPortal();
      location.assign(portal.url);
    } catch {
      billing.disabled = false;
      billing.textContent = 'Billing unavailable / Try again →';
    }
  });
  renderLibrary();
  renderAccountNotice();
  setSetup(requestedState);
  void monitorOrder();

  $$('[data-session-action]').forEach(button => button.addEventListener('click', async () => {
    await signOut().catch(() => null);
    location.assign('/v3/');
  }));
  $('[data-account-search]').addEventListener('input', renderLibrary);
  $('[data-account-sort]').addEventListener('change', renderLibrary);
  $$('.version-choices input').forEach(input => input.addEventListener('change', () => {
    const version = input.value;
    localStorage.setItem('no3d_blender_version', version);
    $('[data-selected-version]').textContent = version === 'Before 4.2' ? version : `Blender ${version}`;
    const primary = $('[data-install-primary]');
    if (version === 'Before 4.2') {
      primary.textContent = 'Download Legacy .zip ↓';
      primary.href = '/api/download-addon';
    } else {
      primary.textContent = 'Open In Blender ↗';
      primary.href = 'blender://extensions/add-repo?url=https%3A%2F%2Fno3dtools.com%2Fextensions%2Findex.json';
    }
    $('[data-wizard-slide="version"]').hidden = true;
    $('[data-wizard-slide="install-action"]').hidden = false;
    setBlenderRecord('install');
  }));
  $('[data-wizard-back]').addEventListener('click', () => {
    $$('.version-choices input').forEach(input => { input.checked = false; });
    $('[data-wizard-slide="install-action"]').hidden = true;
    $('[data-wizard-slide="version"]').hidden = false;
  });
  $('[data-show-recovery]').addEventListener('click', () => { $('.connect-slide').hidden = true; $('[data-recovery-slide]').hidden = false; });
  $('[data-hide-recovery]').addEventListener('click', () => { $('[data-recovery-slide]').hidden = true; $('.connect-slide').hidden = false; });
  $('[data-recovery-form]').addEventListener('submit', event => {
    event.preventDefault();
    const code = event.currentTarget.elements.deviceCode.value.trim();
    if (code) void completeConnection(code);
  });
  $('[data-enter-library]').addEventListener('click', () => {
    document.documentElement.classList.add('setup-resolving');
    window.setTimeout(() => {
      document.documentElement.classList.remove('setup-resolving');
      setSetup('ready', { replace: true });
      $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 420);
  });
  $$('[data-skip-setup]').forEach(button => button.addEventListener('click', () => {
    setSetup('ready', { replace: true });
    $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  const deviceCode = params.get('code');
  if (requestedState === 'connect' && deviceCode) void completeConnection(deviceCode);
}
