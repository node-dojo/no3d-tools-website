import { getAccountState, getCatalog } from './api.js?v=workbench-20260822';
import { WORKBENCH_SAMPLE } from '../data/workbench-sample.js?v=workbench-20260822';
import './shell.js?v=workbench-20260822';

const folderIcon = '/v3/assets/shared-source-folder-black.png';
const storageKey = 'no3d_my_file_handles';
const selected = new Set();
const inFile = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
let entries = [];
let activeFolder = '';
let account = { session: { authenticated: false }, membership: null };

const foldersNode = document.querySelector('[data-folder-list]');
const filesNode = document.querySelector('[data-active-files]');
const search = document.querySelector('#site-search');
const move = document.querySelector('[data-move]');
const preview = document.querySelector('[data-selection-preview]');
const empty = document.querySelector('[data-directory-empty]');

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
  move.textContent = selected.size ? `Add ${selected.size} to My File →` : 'Add to My File →';
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
    button.innerHTML = `<img src="${folderIcon}" alt=""><span><strong>${folder}</strong><small>/shared/${folder.toLowerCase().replace(/\s+/g, '_')}/ · ${String(count).padStart(2, '0')}</small></span><span class="folder-arrow">›</span>`;
    button.addEventListener('click', () => {
      activeFolder = folder;
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
    li.className = `file-row${inFile.has(entry.handle) ? ' in-file' : ''}`;
    const label = document.createElement('label');
    label.className = 'file-label';
    label.innerHTML = `<input class="file-toggle" type="checkbox" ${selected.has(entry.handle) ? 'checked' : ''} aria-label="Select ${entry.workbench.filename}"><span class="file-name">${entry.workbench.filename}</span><span class="file-date">${displayDate(entry.workbench.modifiedAt)}</span><span class="file-state">${entry.workbench.maturity}</span><span class="file-arrow">›</span>`;
    label.addEventListener('click', () => inspectFile(entry));
    label.querySelector('input').addEventListener('change', event => {
      event.target.checked ? selected.add(entry.handle) : selected.delete(entry.handle);
      updateTray();
    });
    li.append(label);
    return li;
  }));
}

move.addEventListener('click', () => {
  if (!selected.size) return;
  for (const handle of selected) inFile.add(handle);
  const added = selected.size;
  selected.clear();
  localStorage.setItem(storageKey, JSON.stringify([...inFile]));
  renderFiles();
  if (account.membership?.active) updateTray(`${added} added · your linked library receives ongoing updates automatically.`);
  else if (account.session?.authenticated) updateTray(`${added} added · membership links the whole folder and keeps it current automatically.`);
  else updateTray(`${added} added on this device · create an account when you are ready to keep My File.`);
});

search?.addEventListener('input', renderFiles);

const [catalog, accountResult] = await Promise.all([getCatalog(), getAccountState().catch(() => account)]);
account = accountResult || account;
const liveWorkbench = catalog.products.filter(product => product.presentationMode === 'workbench' && product.releaseStatus !== 'archived');
entries = liveWorkbench.length ? liveWorkbench : WORKBENCH_SAMPLE;
const requestedFolder = new URLSearchParams(location.search).get('folder');
activeFolder = folders().find(folder => folder.toLowerCase() === requestedFolder?.toLowerCase()) || folders()[0] || 'Shared';
document.querySelector('[data-workbench-count]').textContent = String(entries.length).padStart(2, '0');
document.querySelector('[data-source-status]').textContent = `${liveWorkbench.length ? 'Connected' : 'Preview'} · NO3D://SHARED`;
document.querySelector('[data-data-status]').textContent = liveWorkbench.length ? 'Live shared catalog' : 'Preview inventory / publish workbench entries from SOLVET to replace';
renderFolders();
renderFiles();
inspectFolder(activeFolder);
updateTray();
