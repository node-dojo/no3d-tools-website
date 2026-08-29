import { approveBlenderConnection, createBillingPortal, createMembershipBillingPortal, getAccountState, getMembershipCheckout, getOrder, requestRecovery, sendDesktopSetupLink, signOut } from './api.js?v=scoped-membership-20260828b';
import { accountFileFolders, accountFileView, filterAccountFiles, mergeEffectiveAccountLibrary, projectScopedMembershipCatalog, readableHandle } from './account-library.js?v=scoped-membership-20260828b';
import { preloadProductPreviews, PRODUCT_PREVIEW_FALLBACK, setProductPreview } from './product-preview.js?v=preview-20260823';
import { trackOnce } from './analytics.js?v=privacy-funnel-20260827';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const params = new URLSearchParams(location.search);
const pathOrder = location.pathname.match(/^\/v3\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1];
const orderId = params.get('commerce_order') || pathOrder || '';
const requestedStateParam = ['install', 'connect', 'complete'].includes(params.get('state')) ? params.get('state') : 'ready';
const requestedState = requestedStateParam === 'connect' && !params.get('code') ? 'ready' : requestedStateParam;
const state = { products: [], files: [], catalog: new Map(), authenticated: false, member: false, membership: null, accountKey: 'anonymous', setup: requestedState, activeFolder: '', inspectedHandle: '' };
const folderIcon = PRODUCT_PREVIEW_FALLBACK;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const pathSegment = value => String(value || 'unsorted').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
const displayDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).format(date);
};
const accountStorageKey = (kind, value = '') => `no3d_${kind}_${state.accountKey}_${value}`;

function updateCount() {
  const label = `${String(state.products.length).padStart(2, '0')} tool${state.products.length === 1 ? '' : 's'}`;
  $$('[data-library-count]').forEach(node => { node.textContent = label; });
  $('[data-completion-count]').textContent = state.products.length
    ? `${label} in your collection`
    : 'Your free collection';
}

function inspectFolder(folder) {
  const files = state.files.filter(file => file.folder === folder);
  const latest = files.map(file => file.downloadedAt).filter(Boolean).sort().at(-1);
  setProductPreview($('[data-account-inspector-image]'));
  $('[data-account-inspector-kind]').textContent = 'Library folder';
  $('[data-account-inspector-title]').textContent = folder || 'My Folder';
  $('[data-account-inspector-path]').textContent = `/my_file/${pathSegment(folder)}/`;
  $('[data-account-inspector-date]').textContent = displayDate(latest, 'Not downloaded');
  $('[data-account-inspector-type]').textContent = 'Entitled assets';
  $('[data-account-inspector-items]').textContent = String(files.length).padStart(2, '0');
  $('[data-account-inspector-access]').textContent = 'This account';
  $('[data-account-inspector-sync]').textContent = state.member ? 'Automatic' : 'Manual';
  $('[data-account-inspector-note]').textContent = state.member
    ? 'This folder mirrors your effective account library and stays current automatically in connected Blender installations.'
    : 'This folder mirrors the assets available to your account. Downloads use the existing permanent entitlement record.';
  $('[data-account-inspector-action]').hidden = true;
}

function inspectFile(file, { commit = true } = {}) {
  if (commit) {
    state.inspectedHandle = file.handle;
    $$('[data-account-file]').forEach(row => row.classList.toggle('active', row.dataset.accountFile === file.handle));
  }
  setProductPreview($('[data-account-inspector-image]'), file);
  $('[data-account-inspector-kind]').textContent = 'NO3D account file';
  $('[data-account-inspector-title]').textContent = file.filename;
  $('[data-account-inspector-path]').textContent = `/my_file/${pathSegment(file.folder)}/${file.filename}`;
  $('[data-account-inspector-date]').textContent = displayDate(file.downloadedAt, 'Not downloaded');
  $('[data-account-inspector-type]').textContent = file.kind;
  $('[data-account-inspector-items]').textContent = '01';
  $('[data-account-inspector-access]').textContent = file.access;
  $('[data-account-inspector-sync]').textContent = file.sync;
  $('[data-account-inspector-note]').textContent = file.summary;
  const action = $('[data-account-inspector-action]');
  action.hidden = false;
  action.href = file.action.href;
  action.textContent = file.action.label;
  bindDownloadAction(action, file);
}

function restoreInspector() {
  const selected = state.files.find(file => file.handle === state.inspectedHandle && file.folder === state.activeFolder);
  if (selected) inspectFile(selected, { commit: false });
  else inspectFolder(state.activeFolder);
}

async function downloadAccountFile(event, file, action) {
  event.preventDefault();
  if (!file.action.href.startsWith('/api/commerce/download/')) return location.assign(file.action.href);
  const original = action.textContent;
  action.setAttribute('aria-disabled', 'true');
  action.textContent = 'Preparing download…';
  try {
    const response = await fetch(file.action.href, { credentials: 'same-origin' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.url !== 'string') throw new Error(payload.error || 'download_unavailable');
    const target = new URL(payload.url);
    if (target.protocol !== 'https:') throw new Error('invalid_download_url');
    const downloadedAt = new Date().toISOString();
    localStorage.setItem(accountStorageKey('downloaded', file.handle), downloadedAt);
    file.downloadedAt = downloadedAt;
    $$('[data-account-file]').filter(row => row.dataset.accountFile === file.handle).forEach(row => {
      const date = row.querySelector('.file-date');
      if (date) date.textContent = displayDate(downloadedAt);
    });
    if (state.inspectedHandle === file.handle) {
      $('[data-account-inspector-date]').textContent = displayDate(downloadedAt);
    }
    action.textContent = 'Download started ✓';
    window.setTimeout(() => {
      action.removeAttribute('aria-disabled');
      action.textContent = original;
    }, 4000);
    location.assign(target.href);
  } catch {
    action.removeAttribute('aria-disabled');
    action.textContent = 'Download unavailable / Retry →';
    window.setTimeout(() => { action.textContent = original; }, 4000);
  }
}

function bindDownloadAction(action, file) {
  // The inspector reuses one persistent anchor as the selected file changes.
  // Replace its handler so an old selection can never issue a second download.
  action.onclick = null;
  if (!file.action.href.startsWith('/api/commerce/download/')) return;
  action.onclick = event => void downloadAccountFile(event, file, action);
}

function renderAccountFolders() {
  const folders = accountFileFolders(state.files);
  if (!folders.some(folder => folder.name === state.activeFolder)) state.activeFolder = folders[0]?.name || '';
  $('[data-account-folder-count]').textContent = String(folders.length).padStart(2, '0');
  $('[data-account-folders]').replaceChildren(...folders.map(folder => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `folder-entry${folder.name === state.activeFolder ? ' active' : ''}`;
    button.setAttribute('aria-pressed', String(folder.name === state.activeFolder));
    button.innerHTML = `<img src="${folderIcon}" alt=""><span><strong>${escapeHtml(folder.name)}</strong><small>/my_file/${escapeHtml(pathSegment(folder.name))}/ · ${String(folder.count).padStart(2, '0')}</small></span><span class="folder-arrow">›</span>`;
    button.addEventListener('click', () => {
      state.activeFolder = folder.name;
      state.inspectedHandle = '';
      renderLibrary();
    });
    item.append(button);
    return item;
  }));
}

function renderLibrary() {
  state.files = state.products.map(item => {
    const file = accountFileView(item, state.catalog.get(item.handle));
    file.downloadedAt ||= localStorage.getItem(accountStorageKey('downloaded', file.handle)) || '';
    return file;
  });
  renderAccountFolders();
  const term = $('[data-account-search]').value;
  const sort = $('[data-account-sort]').value;
  const files = filterAccountFiles(state.files, { folder: state.activeFolder, term, sort });
  $('[data-account-active-path]').textContent = state.activeFolder ? `/my_file/${pathSegment(state.activeFolder)}/` : '/my_file/';
  $('[data-account-active-count]').textContent = `${String(files.length).padStart(2, '0')} items`;
  const rows = files.map(file => {
    const row = document.createElement('li');
    row.className = `library-card file-row account-file-row${state.inspectedHandle === file.handle ? ' active' : ''}`;
    row.dataset.accountFile = file.handle;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-file-label';
    button.setAttribute('aria-pressed', String(state.inspectedHandle === file.handle));
    button.innerHTML = `<span class="file-name">${escapeHtml(file.filename)}</span><span class="file-date">${escapeHtml(displayDate(file.downloadedAt, 'Not downloaded'))}</span><span class="file-state">${escapeHtml(file.access)}</span>`;
    button.addEventListener('click', () => inspectFile(file));
    const action = document.createElement('a');
    action.className = 'account-file-action';
    action.href = file.action.href;
    action.textContent = file.action.label;
    bindDownloadAction(action, file);
    row.addEventListener('pointerenter', () => inspectFile(file, { commit: false }));
    row.addEventListener('pointerleave', () => {
      if (!row.contains(document.activeElement)) restoreInspector();
    });
    row.addEventListener('focusin', () => inspectFile(file, { commit: false }));
    row.addEventListener('focusout', event => {
      if (!row.contains(event.relatedTarget)) restoreInspector();
    });
    row.append(button, action);
    return row;
  });
  $('[data-account-items]').replaceChildren(...rows);
  preloadProductPreviews(files);
  $('[data-account-empty]').hidden = files.length > 0;
  $('[data-account-empty]').textContent = state.products.length ? 'No files match this category and search.' : 'Your free collection will appear here as NO3D Tools are published.';
  $('[data-account-file-status]').textContent = `${state.member ? 'Automatic updates' : 'Manual updates'} · ${String(state.products.length).padStart(2, '0')} effective assets`;
  if (state.inspectedHandle) {
    const inspected = state.files.find(file => file.handle === state.inspectedHandle);
    if (inspected && inspected.folder === state.activeFolder) inspectFile(inspected);
    else inspectFolder(state.activeFolder);
  } else inspectFolder(state.activeFolder);
  updateCount();
}

function setBlenderRecord(mode) {
  const selected = localStorage.getItem('no3d_blender_version') || '—';
  const connected = localStorage.getItem(accountStorageKey('blender_connected')) === 'true';
  const values = mode === 'install'
    ? ['Awaiting installation', selected, '—', 'Not connected']
    : mode === 'connect'
      ? ['This installation', selected, 'Installed', 'Connecting…']
      : mode === 'ready' && connected
        ? ['This installation', selected, 'Installed', 'Today']
        : ['Not connected', '—', '—', '—'];
  const selectors = ['[data-blender-installation]', '[data-blender-version]', '[data-addon-version]', '[data-blender-contact]'];
  selectors.forEach((selector, index) => { $(selector).textContent = values[index]; });
  $('[data-identity-blender]').textContent = mode === 'ready' && connected ? '01 installation connected' : mode === 'connect' ? 'Connection in progress' : 'Not connected';
  $('[data-summary-blender]').textContent = mode === 'ready' && connected ? 'Connected ●' : state.member ? 'Sync inactive' : 'Sync inactive · Join for automatic updates';
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

async function prepareMobileInstall(email) {
  if (requestedState !== 'install' || !window.matchMedia('(max-width: 650px)').matches) return;
  document.documentElement.classList.add('mobile-install-active');
  $$('[data-wizard-slide]').forEach(slide => { slide.hidden = slide.dataset.wizardSlide !== 'mobile-handoff'; });
  const message = $('[data-mobile-handoff-message]');
  const proceed = $('[data-proceed-mobile]');
  const deliveryKey = `no3d_desktop_setup_sent_${email.toLowerCase()}`;
  if (sessionStorage.getItem(deliveryKey)) {
    message.textContent = `A desktop setup link was emailed to ${email}. Open it when you are at your Blender workstation.`;
    return;
  }
  proceed.disabled = true;
  message.textContent = `Emailing the setup link to ${email}…`;
  try {
    await sendDesktopSetupLink();
    sessionStorage.setItem(deliveryKey, '1');
    message.textContent = `A desktop setup link was emailed to ${email}. Open it when you are at your Blender workstation.`;
  } catch {
    message.textContent = 'The setup email could not be sent. Proceed to your library; desktop setup remains available from your account.';
  } finally {
    proceed.disabled = false;
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
    localStorage.setItem(accountStorageKey('blender_connected'), 'true');
    window.setTimeout(() => setSetup('complete', { replace: true }), 520);
  } catch {
    title.textContent = 'Connection Not Found';
    message.textContent = 'Use the recovery option and check the short code shown in Blender.';
    $('[data-connect-register]').className = 'working';
    $('[data-connect-register] span').textContent = 'Needs attention';
  }
}

function renderOrder(order) {
  const ready = order.paymentStatus === 'paid' && order.fulfillmentStatus === 'fulfilled' && order.recovery;
  if (ready) {
    const panel = $('[data-account-notice]');
    panel.hidden = false;
    $('[data-order-state]').textContent = 'Purchase complete / Library active';
    $('[data-order-title]').textContent = 'Your purchase is ready';
    $('[data-order-detail]').textContent = 'This order is attached to your account and its tools are available in My Folder.';
    const action = $('[data-order-action]');
    action.hidden = false;
    action.href = '#library';
    action.textContent = 'View purchased tools →';
    return 'fulfilled';
  }
  if (['refunded', 'disputed'].includes(order.paymentStatus)) {
    const panel = $('[data-account-notice]');
    panel.hidden = false;
    $('[data-order-state]').textContent = 'Purchase unavailable';
    $('[data-order-detail]').textContent = 'This order is not currently available for delivery.';
    return 'terminal';
  }
  $('[data-order-state]').textContent = order.paymentStatus === 'paid' ? 'Payment received / Preparing' : 'Confirming purchase';
  return 'pending';
}

function renderAccountNotice() {
  if (params.get('claim') !== 'review') return;
  const panel = $('[data-account-notice]');
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
      const outcome = renderOrder(order);
      if (outcome === 'fulfilled') {
        trackOnce('product_fulfillment_completed', { source: 'account_order' });
        if (!localStorage.getItem(`no3d_v3_recovery_${orderId}`)) {
          await requestRecovery(orderId).catch(() => null);
          localStorage.setItem(`no3d_v3_recovery_${orderId}`, '1');
        }
        return;
      }
      if (outcome === 'terminal') {
        return;
      }
    } catch {
      // The directory remains the single visible source of account assets.
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

function showMembershipNotice({ active = false, mismatch = false } = {}) {
  const panel = $('[data-account-notice]');
  panel.hidden = false;
  $('[data-order-state]').textContent = 'Full catalog membership';
  $('[data-order-title]').textContent = mismatch
    ? 'Sign in with the checkout email'
    : active ? 'Your full catalog is active' : 'Activating your full catalog';
  $('[data-order-detail]').textContent = mismatch
    ? 'The signed-in account differs from the membership checkout. Your payment is safe; sign in with the email used at checkout to attach this library.'
    : active
      ? 'Automatic updates and the eligible catalog are now available through NO3D Tools in Blender.'
      : 'Stripe confirmed your return. Waiting for durable membership fulfillment.';
  const action = $('[data-order-action]');
  action.hidden = !active;
  if (active) {
    action.href = '/v3/account/?state=install';
    action.textContent = 'Install / Connect Blender →';
  }
}

async function monitorMembershipCheckout(email) {
  if (params.get('membership') === 'active') {
    trackOnce('membership_fulfillment_completed', { source: 'account' });
    showMembershipNotice({ active: true });
    return;
  }
  const sessionId = params.get('session_id');
  if (params.get('membership_checkout') !== 'success' || !sessionId) return;
  trackOnce('membership_checkout_returned', { source: 'stripe' });
  showMembershipNotice();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const result = await getMembershipCheckout(sessionId);
      if (result.status && ['active', 'grace'].includes(result.status)) {
        if (result.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
          showMembershipNotice({ mismatch: true });
          return;
        }
        location.replace('/v3/account/?membership=active');
        return;
      }
    } catch {
      // Durable fulfillment may still be catching up.
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  $('[data-order-detail]').textContent = 'Membership is still processing. It will appear here automatically after Stripe fulfillment completes.';
}

const localPreview = ['127.0.0.1', 'localhost'].includes(location.hostname) ? params.get('preview') : '';
const localDirectoryCatalog = new Map([
  ['preview-thumbnail', { handle: 'preview-thumbnail', title: 'Thumbnail Product', productType: 'Blender', thumbnail: '/assets/product-images/icon_Dojo Bolt Gen v05_Obj.png', releaseStatus: 'active', accessPolicy: 'paid', workbench: { filename: 'Thumbnail_Product.no3d', folder: 'Blender', kind: 'NO3D asset', summary: 'Catalog thumbnail preview.' } }],
  ['preview-image', { handle: 'preview-image', title: 'Alternate Image Product', productType: 'Blender', image: '/v3/assets/dojo-bolt-disassembly.webp?v=perf-20260820', releaseStatus: 'active', accessPolicy: 'paid', workbench: { filename: 'Alternate_Image_Product.no3d', folder: 'Blender', kind: 'NO3D asset', summary: 'Alternate product image preview.' } }],
  ['preview-fallback', { handle: 'preview-fallback', title: 'No Thumbnail Product', productType: 'Blender', releaseStatus: 'active', accessPolicy: 'free', workbench: { filename: 'No_Thumbnail_Product.no3d', folder: 'Blender', kind: 'NO3D asset', summary: 'Pixel folder fallback preview.' } }],
]);
const localPreviewState = localPreview === 'directory'
  ? {
      session: { authenticated: true, email: 'preview@no3dtools.local' },
      catalog: localDirectoryCatalog,
      summary: { account: { id: 'local-directory-preview', contactEmail: 'preview@no3dtools.local' }, products: [
        { handle: 'preview-thumbnail', owned: true, permanent: true, orderId: '11111111-1111-4111-8111-111111111111' },
        { handle: 'preview-image', owned: true, membership: true },
      ], memberships: [{ status: 'active' }] },
      membership: { active: true, status: 'active' },
    }
  : localPreview === 'setup'
  ? {
      session: { authenticated: true, email: 'preview@no3dtools.local' },
      catalog: new Map(),
      summary: { account: { id: 'local-setup-preview', contactEmail: 'preview@no3dtools.local' }, products: [], memberships: [] },
      membership: null
    }
  : null;
const { session, catalog, summary, membership, membershipCollections = [] } = localPreviewState || await getAccountState();
state.authenticated = session.authenticated === true;
if (!state.authenticated) {
  const next = `${location.pathname}${location.search}`;
  location.replace(`/v3/onboarding/create-account/?next=${encodeURIComponent(next)}`);
} else {
  if (params.get('auth') === 'signed-in') trackOnce('account_confirmation_completed', { destination: 'account' });
  if (params.get('purchase') === 'ready') trackOnce('product_fulfillment_completed', { source: 'account' });
  state.catalog = catalog;
  const effectiveCandidates = [...(summary?.products || [])];
  state.membership = membership;
  const email = session.email || summary?.account?.contactEmail || 'Your NO3D account';
  state.accountKey = summary?.account?.id || String(email).trim().toLowerCase();
  $$('[data-account-email]').forEach(node => { node.textContent = email; });
  const member = membership?.active === true || Boolean(summary?.memberships?.some(item => ['active', 'trialing'].includes(item.status)));
  state.member = member;
  for (const product of state.catalog.values()) {
    if (product.releaseStatus === 'archived' || product.accessPolicy !== 'free') continue;
    effectiveCandidates.push({ handle: product.handle, free: true, owned: true, permanent: false });
  }
  if (membershipCollections.length) {
    const scoped = projectScopedMembershipCatalog(state.catalog, membershipCollections);
    state.catalog = scoped.catalog;
    effectiveCandidates.push(...scoped.records);
  } else if (member) {
    for (const product of state.catalog.values()) {
      if (product.releaseStatus === 'archived') continue;
      effectiveCandidates.push({ handle: product.handle, membership: true, owned: true, permanent: false });
    }
  }
  state.products = mergeEffectiveAccountLibrary(effectiveCandidates);
  const permanentCustomer = state.products.some(product => product.permanent);
  $('[data-account-tier]').textContent = member ? 'Member' : permanentCustomer ? 'Customer' : 'Free';
  $('[data-account-membership]').textContent = member ? 'Member / Automatic updates' : 'Inactive / Manual updates';
  $('[data-update-mode]').textContent = member ? 'Automatic' : 'Manual';
  const billing = $('[data-manage-billing]');
  billing.hidden = !member && state.products.length === 0;
  billing.addEventListener('click', async () => {
    billing.disabled = true;
    billing.textContent = 'Opening secure billing…';
    try {
      const portal = membership?.status && membership.status !== 'invalid'
        ? await createMembershipBillingPortal()
        : await createBillingPortal();
      location.assign(portal.url);
    } catch {
      billing.disabled = false;
      billing.textContent = 'Billing unavailable / Try again →';
    }
  });
  renderLibrary();
  renderAccountNotice();
  setSetup(requestedState);
  void prepareMobileInstall(email);
  void monitorOrder();
  void monitorMembershipCheckout(email);

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
    const primaryHelp = $('[data-install-primary-help]');
    if (version === 'Before 4.2') {
      primary.textContent = 'Download Legacy .zip ↓';
      primary.href = '/api/download-addon';
      primary.dataset.installMode = 'download';
      primaryHelp.innerHTML = '<li>Download the legacy add-on .zip</li><li>Open Blender Preferences → Add-ons</li><li>Choose Install from Disk</li><li>Select the downloaded .zip</li>';
    } else {
      primary.textContent = 'Copy Repository Link ↗';
      primary.href = 'https://no3dtools.com/extensions/index.json';
      primary.dataset.installMode = 'repository';
      primaryHelp.innerHTML = '<li>Open Blender</li><li>Open Get Extensions</li><li>Repositories → Add Remote Repository</li><li>Paste the copied link</li>';
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
  $('[data-install-primary]').addEventListener('click', async event => {
    const link = event.currentTarget;
    if (link.dataset.installMode !== 'repository') return;
    event.preventDefault();
    const label = link.textContent;
    try {
      await navigator.clipboard.writeText(link.href);
      link.textContent = 'Repository Link Copied ✓';
      window.setTimeout(() => { link.textContent = label; }, 1800);
    } catch {
      link.textContent = 'Copy Failed / Open Link ↗';
      window.open(link.href, '_blank', 'noopener');
      window.setTimeout(() => { link.textContent = label; }, 1800);
    }
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
  $('[data-proceed-mobile]').addEventListener('click', () => {
    document.documentElement.classList.remove('mobile-install-active');
    setSetup('ready', { replace: true });
    $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const deviceCode = params.get('code');
  if (requestedState === 'connect' && deviceCode) void completeConnection(deviceCode);
}
