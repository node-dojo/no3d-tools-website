import { getAccountState, getCatalog, selectWorkbenchInventory, sortCatalogProducts } from './api.js?v=catalog-order-20260824';
import { WORKBENCH_SAMPLE } from '../data/workbench-sample.js?v=workbench-20260822';
import { getCatalogCollections } from './collections.js?v=collections-20260827';
import './shell.js?v=workbench-20260822';

const folderIcon = '/v3/assets/shared-source-folder-black.png';
const guestStorageKey = 'no3d_my_file_handles';
const selected = new Set();
let inFile = new Set();
let storageKey = guestStorageKey;
let entries = [];
let activeFolder = '';
let account = { session: { authenticated: false }, membership: null };
const customerCategories = ['All', 'Hardware', 'Generators', 'Primitives', 'Utilities', 'Brushes', 'Ready Mades', 'Assemblies', 'Lessons'];
let mobileCategory = 'All';
let mobileLoopWidth = 0;
let collections = [];

const foldersNode = document.querySelector('[data-folder-list]');
const filesNode = document.querySelector('[data-active-files]');
const search = document.querySelector('#site-search');
const move = document.querySelector('[data-move]');
const preview = document.querySelector('[data-selection-preview]');
const empty = document.querySelector('[data-directory-empty]');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

function readStoredHandles(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(handle => typeof handle === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredHandles() {
  try { localStorage.setItem(storageKey, JSON.stringify([...inFile])); } catch {}
}

function accountStorageKey() {
  const email = account.session?.email || account.summary?.account?.contactEmail || '';
  return email ? `no3d_my_file_handles:${String(email).trim().toLowerCase()}` : guestStorageKey;
}

function restoreMyFile() {
  storageKey = accountStorageKey();
  const accountHandles = readStoredHandles(storageKey);
  const guestHandles = storageKey === guestStorageKey ? [] : readStoredHandles(guestStorageKey);
  inFile = new Set([...accountHandles, ...guestHandles]);
  writeStoredHandles();
  if (storageKey !== guestStorageKey && guestHandles.length) {
    try { localStorage.removeItem(guestStorageKey); } catch {}
  }
}

const displayDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).format(date);
};

function folders() {
  return [...new Set(entries.map(entry => entry.workbench.folder || 'Unsorted'))].sort((a, b) => a.localeCompare(b));
}

function folderEntries(folder = activeFolder) {
  const term = search?.value.trim().toLowerCase() || '';
  return entries.filter(entry => entry.workbench.folder === folder && (!term || [
    entry.workbench.filename,
    entry.workbench.maturity,
    entry.workbench.kind,
    entry.workbench.summary,
  ].join(' ').toLowerCase().includes(term)));
}

function inspectFolder(folder) {
  const items = entries.filter(entry => entry.workbench.folder === folder);
  const latest = items.map(item => item.workbench.modifiedAt).filter(Boolean).sort().at(-1);
  document.querySelector('[data-inspector-kind]').textContent = 'Folder';
  document.querySelector('[data-inspector-title]').textContent = folder;
  document.querySelector('[data-inspector-path]').textContent = `/shared/${folder.toLowerCase().replace(/\s+/g, '_')}/`;
  document.querySelector('[data-inspector-date]').textContent = displayDate(latest);
  document.querySelector('[data-inspector-type]').textContent = 'Parent folder';
  document.querySelector('[data-inspector-items]').textContent = String(items.length).padStart(2, '0');
  document.querySelector('[data-inspector-access]').textContent = 'Shared';
  document.querySelector('[data-inspector-sync]').textContent = account.membership?.active ? 'Automatic' : 'Available';
  document.querySelector('[data-inspector-note]').textContent = account.membership?.active
    ? 'Your membership links this folder to the managed Blender library and keeps it current automatically.'
    : 'Choose files in the middle column. Membership links the whole folder and keeps it current automatically.';
}

function inspectFile(entry) {
  const path = `/shared/${entry.workbench.folder.toLowerCase().replace(/\s+/g, '_')}/${entry.workbench.filename}`;
  document.querySelector('[data-inspector-kind]').textContent = 'NO3D file';
  document.querySelector('[data-inspector-title]').textContent = entry.workbench.filename;
  document.querySelector('[data-inspector-path]').textContent = path;
  document.querySelector('[data-inspector-date]').textContent = displayDate(entry.workbench.modifiedAt);
  document.querySelector('[data-inspector-type]').textContent = entry.workbench.kind;
  document.querySelector('[data-inspector-items]').textContent = entry.workbench.size || '01';
  document.querySelector('[data-inspector-access]').textContent = entry.accessPolicy === 'free' ? 'Free' : 'Shared';
  document.querySelector('[data-inspector-sync]').textContent = account.membership?.active ? 'Automatic' : 'Manual';
  document.querySelector('[data-inspector-note]').textContent = entry.workbench.summary || 'Filename-led workbench asset.';
}

function updateTray(message = '') {
  document.querySelectorAll('[data-selected-count]').forEach(node => { node.textContent = selected.size; });
  document.querySelectorAll('[data-file-count]').forEach(node => { node.textContent = inFile.size; });
  preview.textContent = message || (selected.size ? [...selected].map(handle => entries.find(entry => entry.handle === handle)?.workbench.filename || handle).join('  /  ') : 'Toggle files to begin a transfer');
  move.disabled = selected.size === 0;
  move.textContent = selected.size ? `Add ${selected.size} to My Folder →` : 'Add to My Folder →';
}

function renderFolders() {
  const names = folders();
  document.querySelector('[data-folder-count]').textContent = String(names.length).padStart(2, '0');
  foldersNode.replaceChildren(...names.map(folder => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    const count = entries.filter(entry => entry.workbench.folder === folder).length;
    button.type = 'button';
    button.className = `folder-entry${folder === activeFolder ? ' active' : ''}`;
    button.dataset.folder = folder;
    button.setAttribute('aria-pressed', String(folder === activeFolder));
    button.innerHTML = `<img src="${folderIcon}" alt=""><span><strong>${escapeHtml(folder)}</strong><small>/shared/${escapeHtml(folder.toLowerCase().replace(/\s+/g, '_'))}/ · ${String(count).padStart(2, '0')}</small></span><span class="folder-arrow">›</span>`;
    button.addEventListener('click', () => {
      activeFolder = folder;
      const url = new URL(location.href);
      url.searchParams.set('folder', folder);
      history.replaceState({}, '', url);
      renderFolders();
      renderFiles();
      inspectFolder(folder);
    });
    li.append(button);
    return li;
  }));
}

function renderFiles() {
  const list = folderEntries();
  const path = `/shared/${activeFolder.toLowerCase().replace(/\s+/g, '_')}/`;
  document.querySelector('[data-active-path]').textContent = path;
  document.querySelector('[data-active-count]').textContent = `${String(list.length).padStart(2, '0')} items`;
  empty.hidden = list.length > 0;
  filesNode.replaceChildren(...list.map(entry => {
    const li = document.createElement('li');
    li.className = 'file-row';
    const link = document.createElement('a');
    link.className = 'file-label direct-product-link';
    link.href = `/v3/product/?handle=${encodeURIComponent(entry.handle)}`;
    link.innerHTML = `<span class="file-name">${escapeHtml(entry.workbench.filename)}</span><span class="file-date">${escapeHtml(displayDate(entry.workbench.modifiedAt))}</span><span class="file-state">${escapeHtml(entry.workbench.maturity)}</span><span class="file-arrow">Open →</span>`;
    link.addEventListener('pointerenter', () => inspectFile(entry));
    link.addEventListener('focus', () => inspectFile(entry));
    li.append(link);
    return li;
  }));
}

function matchesCategory(product, category) {
  if (category === 'All') return true;
  const values = [product.productType, product.workbench?.folder, ...(product.tags || [])]
    .filter(Boolean)
    .map(value => String(value).toLowerCase().replace(/[_-]+/g, ' ').trim());
  const aliases = {
    Hardware: ['hardware', 'object', 'objects'],
    Generators: ['generator', 'generators', 'geometry nodes', 'geometry node'],
    Primitives: ['primitive', 'primitives'],
    Utilities: ['utility', 'utilities', 'tool', 'tools'],
    Brushes: ['brush', 'brushes'],
    'Ready Mades': ['ready made', 'ready mades', 'readymade', 'scene', 'scenes'],
    Assemblies: ['assembly', 'assemblies'],
    Lessons: ['lesson', 'lessons', 'tutorial', 'tutorials'],
  };
  return (aliases[category] || [category.toLowerCase()]).some(alias => values.some(value => value === alias || value.includes(alias)));
}

function mobileProductCard(product, index) {
  const link = document.createElement('a');
  const collection = product.kind === 'collection';
  link.className = `mobile-featured-card${collection ? ' collection-card' : ''}`;
  link.href = collection ? product.catalogUrl : `/v3/product/?handle=${encodeURIComponent(product.handle)}`;
  link.innerHTML = `${product.thumbnail ? `<img src="${escapeHtml(product.thumbnail)}" alt="" loading="${index < 2 ? 'eager' : 'lazy'}">` : ''}<h3>${escapeHtml(product.title)}</h3><div><span>${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(collection ? `${product.productCount} tools` : product.accessPolicy === 'free' ? 'FREE' : product.releaseVersion || product.releaseStatus)}</span></div>${collection ? `<img class="collection-card-marker" src="${folderIcon}" alt="Collection" width="512" height="512">` : ''}`;
  link.querySelector('img')?.addEventListener('error', event => event.currentTarget.remove(), { once: true });
  return link;
}

function mobileWorkingLink(entry) {
  const link = document.createElement('a');
  link.className = 'mobile-working-link';
  link.href = `/v3/product/?handle=${encodeURIComponent(entry.handle)}`;
  link.innerHTML = `<span>${escapeHtml(entry.workbench.filename.replace(/\.no3d$/i, '.blend'))}</span><span>${escapeHtml(entry.workbench.kind || entry.workbench.maturity || 'Tool')}</span>`;
  return link;
}

function rotateCategories(active) {
  const index = customerCategories.indexOf(active);
  return index < 0 ? customerCategories : [...customerCategories.slice(index), ...customerCategories.slice(0, index)];
}

function renderMobileCategoryLoop() {
  const loop = document.querySelector('[data-mobile-category-loop]');
  const overview = document.querySelector('[data-mobile-category-overview]');
  if (!loop || !overview) return;
  const cycle = rotateCategories(mobileCategory);
  const repeated = [...cycle, ...cycle, ...cycle];
  loop.replaceChildren(...repeated.map(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.className = category === mobileCategory ? 'active' : '';
    button.addEventListener('click', () => setMobileCategory(category));
    return button;
  }));
  overview.replaceChildren(...customerCategories.map(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.className = category === mobileCategory ? 'active' : '';
    button.addEventListener('click', () => {
      setMobileCategory(category);
      overview.hidden = true;
      document.querySelector('[data-mobile-category-menu]').setAttribute('aria-expanded', 'false');
      document.querySelector('[data-mobile-category-menu]').textContent = '≡';
    });
    return button;
  }));
  requestAnimationFrame(() => {
    mobileLoopWidth = loop.scrollWidth / 3;
    loop.scrollLeft = mobileLoopWidth;
  });
}

function renderMobileDirectory() {
  const term = search?.value.trim().toLowerCase() || '';
  const catalogProducts = sortCatalogProducts((catalog.products || []).filter(product => product.releaseStatus !== 'archived'));
  const collectionProducts = collections.filter(product => matchesCategory(product, mobileCategory) && (!term || `${product.title} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(term)));
  const featured = [...collectionProducts, ...catalogProducts.filter(product => product.presentationMode !== 'workbench' && matchesCategory(product, mobileCategory) && (!term || `${product.title} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(term)))];
  const working = entries.filter(entry => matchesCategory(entry, mobileCategory) && (!term || `${entry.workbench.filename} ${entry.workbench.kind} ${entry.workbench.summary}`.toLowerCase().includes(term)));
  document.querySelector('[data-mobile-featured-tools]')?.replaceChildren(...featured.map(mobileProductCard));
  document.querySelector('[data-mobile-working-files]')?.replaceChildren(...working.map(mobileWorkingLink));
  document.querySelector('[data-mobile-featured-empty]').hidden = featured.length > 0;
  document.querySelector('[data-mobile-files-empty]').hidden = working.length > 0;
  document.querySelector('[data-mobile-featured-cue]').hidden = featured.length < 2;
  document.querySelector('[data-mobile-files-cue]').hidden = working.length === 0;
}

function setMobileCategory(category) {
  mobileCategory = customerCategories.includes(category) ? category : 'All';
  renderMobileCategoryLoop();
  renderMobileDirectory();
}

document.querySelector('[data-mobile-category-loop]')?.addEventListener('scroll', event => {
  if (!mobileLoopWidth) return;
  const loop = event.currentTarget;
  if (loop.scrollLeft < mobileLoopWidth * 0.45) loop.scrollLeft += mobileLoopWidth;
  else if (loop.scrollLeft > mobileLoopWidth * 1.55) loop.scrollLeft -= mobileLoopWidth;
});

document.querySelector('[data-mobile-category-menu]')?.addEventListener('click', event => {
  const overview = document.querySelector('[data-mobile-category-overview]');
  const open = overview.hidden;
  overview.hidden = !open;
  event.currentTarget.setAttribute('aria-expanded', String(open));
  event.currentTarget.textContent = open ? '×' : '≡';
});

move.addEventListener('click', () => {
  if (!selected.size) return;
  for (const handle of selected) inFile.add(handle);
  const added = selected.size;
  selected.clear();
  writeStoredHandles();
  renderFiles();
  if (account.membership?.active) updateTray(`${added} added · your linked library receives ongoing updates automatically.`);
  else if (account.session?.authenticated) updateTray(`${added} added · membership links the whole folder and keeps it current automatically.`);
  else updateTray(`${added} added on this device · create an account when you are ready to keep My Folder.`);
});

search?.addEventListener('input', () => {
  renderFiles();
  renderMobileDirectory();
});

const [catalog, collectionResult, accountResult] = await Promise.all([getCatalog(), getCatalogCollections(), getAccountState().catch(() => account)]);
collections = collectionResult;
account = accountResult || account;
restoreMyFile();
const inventory = selectWorkbenchInventory(catalog, WORKBENCH_SAMPLE);
const liveWorkbench = inventory.live;
entries = inventory.entries;
if (liveWorkbench.length) {
  const previewHandles = new Set(WORKBENCH_SAMPLE.map(entry => entry.handle));
  inFile = new Set([...inFile].filter(handle => !previewHandles.has(handle)));
  writeStoredHandles();
}
const requestedFolder = new URLSearchParams(location.search).get('folder');
activeFolder = folders().find(folder => folder.toLowerCase() === requestedFolder?.toLowerCase()) || folders()[0] || 'Shared';
mobileCategory = customerCategories.find(category => category.toLowerCase() === requestedFolder?.toLowerCase()) || 'All';
const workbenchCount = document.querySelector('[data-workbench-count]');
if (workbenchCount) workbenchCount.textContent = String(entries.length).padStart(2, '0');
const sourceState = inventory.state === 'live' ? 'Connected' : inventory.state === 'offline-preview' ? 'Offline preview' : 'Preview';
const sourceStatus = document.querySelector('[data-source-status], [data-home-workbench-status]');
if (sourceStatus) sourceStatus.textContent = `${sourceState} · NO3D://SHARED`;
const directoryStatus = document.querySelector('[data-directory-status]') || document.querySelector('[data-data-status]');
directoryStatus.textContent = liveWorkbench.length
  ? `Live shared catalog / ${liveWorkbench.length} published file${liveWorkbench.length === 1 ? '' : 's'}`
  : catalog.error
    ? 'Catalog unavailable / retained preview inventory / selections remain on this device'
    : 'Preview inventory / publish workbench entries from SOLVET to replace';
renderFolders();
renderFiles();
inspectFolder(activeFolder);
updateTray();
renderMobileCategoryLoop();
renderMobileDirectory();
