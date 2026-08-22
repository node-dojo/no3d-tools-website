import { getCatalog } from './api.js?v=perf-20260820';
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

const catalog = await getCatalog();
const liveWorkbench = catalog.products.filter(product => product.releaseStatus !== 'archived' && product.presentationMode === 'workbench');
const workbench = liveWorkbench.length ? liveWorkbench : WORKBENCH_SAMPLE;
products = catalog.products.filter(product => product.releaseStatus !== 'archived' && product.presentationMode !== 'workbench');
setDataStatus(catalog.source);
renderCatalogNavigation(products, selected => {
  category = selected;
  render();
  document.querySelector('#catalog').scrollIntoView({ block: 'start' });
});
search?.addEventListener('input', render);
render();

const folderList = document.querySelector('[data-home-folder-list]');
const workbenchFolders = [...new Set(workbench.map(product => product.workbench.folder))].slice(0, 5);
folderList?.replaceChildren(...workbenchFolders.map(folder => {
  const link = document.createElement('a');
  const folderCount = workbench.filter(product => product.workbench.folder === folder).length;
  link.href = `/v3/workbench/?folder=${encodeURIComponent(folder)}`;
  link.innerHTML = `<img src="/v3/assets/shared-source-folder-black.png" alt=""><span><strong>${folder}</strong><small>${String(folderCount).padStart(2, '0')} files</small></span><span>›</span>`;
  return link;
}));
document.querySelector('[data-home-workbench-count]').textContent = String(workbench.length).padStart(2, '0');
document.querySelector('[data-home-workbench-status]').textContent = `${liveWorkbench.length ? 'Connected' : 'Preview'} · NO3D://SHARED`;
