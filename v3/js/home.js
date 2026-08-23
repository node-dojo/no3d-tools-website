import { getCatalog, selectWorkbenchInventory } from './api.js?v=perf-20260820';
import { renderCatalogNavigation, setDataStatus } from './shell.js?v=perf-20260820';
import { WORKBENCH_SAMPLE } from '../data/workbench-sample.js?v=workbench-20260822';

const grid = document.querySelector('[data-product-grid]');
const empty = document.querySelector('[data-empty]');
const count = document.querySelector('[data-product-count]');
const search = document.querySelector('#site-search');
let products = [];
let category = 'all';

function productCard(product, index) {
  const card = document.createElement('a');
  card.className = 'product-card';
  card.href = `/v3/product/?handle=${encodeURIComponent(product.handle)}`;
  card.dataset.category = product.tags[0] || product.productType;
  const media = document.createElement('div');
  media.className = 'product-media';
  if (product.thumbnail) {
    const image = document.createElement('img');
    image.src = product.thumbnail;
    image.alt = '';
    image.loading = index < 4 ? 'eager' : 'lazy';
    media.append(image);
  }
  const title = document.createElement('h3');
  title.textContent = product.title;
  const meta = document.createElement('div');
  meta.className = 'product-meta';
  meta.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><span>${product.accessPolicy === 'free' ? 'FREE' : product.releaseVersion || product.releaseStatus}</span>`;
  card.append(media, title, meta);
  return card;
}

function render() {
  const term = search?.value.trim().toLowerCase() || '';
  const visible = products.filter(product => {
    const categoryMatch = category === 'all' || product.tags[0] === category || product.productType === category;
    const textMatch = !term || `${product.title} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(term);
    return categoryMatch && textMatch;
  });
  grid.replaceChildren(...visible.map(productCard));
  empty.hidden = visible.length > 0;
  count.textContent = `${String(visible.length).padStart(2, '0')} instruments`;
}

function renderWorkbenchFolders(workbench) {
  const folderList = document.querySelector('[data-home-folder-list]');
  if (!folderList) return;
  const term = search?.value.trim().toLowerCase() || '';
  const folders = [...new Set(workbench.map(product => product.workbench.folder))]
    .filter(folder => !term || workbench.some(product => product.workbench.folder === folder && [folder, product.workbench.filename, product.workbench.maturity, product.workbench.kind, product.workbench.summary].join(' ').toLowerCase().includes(term)))
    .slice(0, 5);
  folderList.replaceChildren(...folders.map(folder => {
    const link = document.createElement('a');
    const folderCount = workbench.filter(product => product.workbench.folder === folder && (!term || [folder, product.workbench.filename, product.workbench.maturity, product.workbench.kind, product.workbench.summary].join(' ').toLowerCase().includes(term))).length;
    link.href = `/v3/workbench/?folder=${encodeURIComponent(folder)}${term ? `&q=${encodeURIComponent(term)}` : ''}`;
    link.innerHTML = `<img src="/v3/assets/shared-source-folder-black.png" alt=""><span><strong>${folder}</strong><small>${String(folderCount).padStart(2, '0')} files</small></span><span>›</span>`;
    return link;
  }));
}

const catalog = await getCatalog();
const workbenchInventory = selectWorkbenchInventory(catalog, WORKBENCH_SAMPLE);
const liveWorkbench = workbenchInventory.live;
const workbench = workbenchInventory.entries;
products = catalog.products.filter(product => product.releaseStatus !== 'archived' && product.presentationMode !== 'workbench');
setDataStatus(catalog.source);
renderCatalogNavigation(products, selected => {
  category = selected;
  render();
  document.querySelector('#catalog').scrollIntoView({ block: 'start' });
});
search?.addEventListener('input', () => {
  render();
  renderWorkbenchFolders(workbench);
});
render();

renderWorkbenchFolders(workbench);
document.querySelector('[data-home-workbench-count]').textContent = String(workbench.length).padStart(2, '0');
document.querySelector('[data-home-workbench-status]').textContent = `${workbenchInventory.state === 'live' ? 'Connected' : workbenchInventory.state === 'offline-preview' ? 'Offline preview' : 'Preview'} · NO3D://SHARED`;
