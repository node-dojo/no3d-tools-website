import { getCatalog, selectWorkbenchInventory, sortCatalogProducts } from './api.js?v=catalog-order-20260824';
import { renderCatalogNavigation, setDataStatus } from './shell.js?v=perf-20260820';
import { WORKBENCH_SAMPLE } from '../data/workbench-sample.js?v=workbench-20260822';
import { getCatalogCollections } from './collections.js?v=collections-20260827';

const grid = document.querySelector('[data-product-grid]');
const previousButton = document.querySelector('[data-grid-previous]');
const nextButton = document.querySelector('[data-grid-next]');
const empty = document.querySelector('[data-empty]');
const search = document.querySelector('#site-search');
let products = [];
let category = 'all';

function updateGridControls() {
  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  previousButton.disabled = grid.scrollLeft <= 1;
  nextButton.disabled = grid.scrollLeft >= maxScroll - 1;
}

function gridStep() {
  const card = grid.querySelector('.product-card');
  if (!card) return grid.clientWidth * .8;
  const styles = getComputedStyle(grid);
  return card.getBoundingClientRect().width + (Number.parseFloat(styles.columnGap) || 0);
}

function moveGrid(direction) {
  grid.scrollBy({ left: direction * gridStep(), behavior: 'smooth' });
}

previousButton?.addEventListener('click', () => moveGrid(-1));
nextButton?.addEventListener('click', () => moveGrid(1));
grid.addEventListener('scroll', updateGridControls, { passive: true });
window.addEventListener('resize', updateGridControls, { passive: true });

grid.addEventListener('wheel', event => {
  if (!window.matchMedia('(min-width: 651px) and (hover: hover)').matches) return;
  if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const movingForward = event.deltaY > 0;
  const canMove = movingForward ? grid.scrollLeft < maxScroll - 1 : grid.scrollLeft > 1;
  if (!canMove) return;

  event.preventDefault();
  grid.scrollLeft += event.deltaY;
}, { passive: false });

function productCard(product, index) {
  const card = document.createElement('a');
  const collection = product.kind === 'collection';
  card.className = `product-card${collection ? ' collection-card' : ''}`;
  card.href = collection ? product.catalogUrl : `/v3/product/?handle=${encodeURIComponent(product.handle)}`;
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
  meta.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><span>${collection ? `${product.productCount} tools` : product.accessPolicy === 'free' ? 'FREE' : product.releaseVersion || product.releaseStatus}</span>`;
  card.append(media, title, meta);
  if (collection) {
    const marker = document.createElement('img');
    marker.className = 'collection-card-marker';
    marker.src = '/v3/assets/shared-source-folder-black.png';
    marker.alt = 'Collection';
    marker.width = 512;
    marker.height = 512;
    card.append(marker);
  }
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
  grid.scrollLeft = 0;
  empty.hidden = visible.length > 0;
  requestAnimationFrame(updateGridControls);
}

const [catalog, collections] = await Promise.all([getCatalog(), getCatalogCollections()]);
const workbenchInventory = selectWorkbenchInventory(catalog, WORKBENCH_SAMPLE);
const liveWorkbench = workbenchInventory.live;
const workbench = workbenchInventory.entries;
products = [...collections, ...sortCatalogProducts(catalog.products.filter(product => product.releaseStatus !== 'archived' && product.presentationMode !== 'workbench'))];
setDataStatus(catalog.source);
renderCatalogNavigation(products, selected => {
  category = selected;
  render();
  document.querySelector('#catalog').scrollIntoView({ block: 'start' });
});
search?.addEventListener('input', () => {
  render();
});
render();
document.querySelector('[data-home-workbench-status]').textContent = `${workbenchInventory.state === 'live' ? 'Connected' : workbenchInventory.state === 'offline-preview' ? 'Offline preview' : 'Preview'} · NO3D://SHARED`;
