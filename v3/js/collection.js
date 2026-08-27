const productsNode = document.querySelector('[data-collection-products]');
const countNode = document.querySelector('[data-collection-count]');
const messageNode = document.querySelector('[data-collection-message]');
const acquireNode = document.querySelector('[data-collection-acquire]');
const priceNode = document.querySelector('.membership-price');
const heroNode = document.querySelector('[data-collection-hero]');
const sourceNode = document.querySelector('[data-collection-source]');
const sourceProductsNode = document.querySelector('[data-collection-source-products]');

if (heroNode) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncHeroMotion = () => {
    const source = motion.matches ? heroNode.dataset.staticSrc : heroNode.dataset.animatedSrc;
    if (source && heroNode.getAttribute('src') !== source) heroNode.src = source;
  };
  syncHeroMotion();
  motion.addEventListener?.('change', syncHeroMotion);
}

function card(product) {
  const node = document.createElement(product.productUrl ? 'a' : 'article');
  node.className = 'product-card';
  if (product.productUrl) node.href = product.productUrl;
  const media = document.createElement('div');
  media.className = 'product-media';
  if (product.image) {
    const image = document.createElement('img');
    image.src = product.image;
    image.alt = '';
    media.append(image);
  }
  const title = document.createElement('h3');
  title.textContent = product.title;
  const meta = document.createElement('div');
  meta.className = 'product-meta';
  const handle = document.createElement('span');
  handle.textContent = product.handle;
  const state = document.createElement('span');
  state.textContent = product.catalogAvailable ? 'Catalog' : 'Collection';
  meta.append(handle, state);
  node.append(media, title, meta);
  return node;
}

function sourceRow(product) {
  const node = document.createElement(product.productUrl ? 'a' : 'article');
  node.className = 'collection-source-row';
  if (product.productUrl) node.href = product.productUrl;
  const title = document.createElement('span');
  title.textContent = product.title;
  const state = document.createElement('span');
  state.textContent = product.productUrl ? 'Open →' : 'NO3D Tool';
  node.append(title, state);
  return node;
}

try {
  const response = await fetch('/api/collections/no3d-chrome-tools');
  if (!response.ok) throw new Error('collection_unavailable');
  const collection = await response.json();
  document.title = `${collection.title} — NO3D Tools`;
  countNode.textContent = `${collection.productCount} tools / Current collection`;
  if (collection.price?.formatted) priceNode.textContent = `${collection.price.formatted} / one time`;
  const illustrated = collection.products.filter(product => product.image);
  const sourceProducts = collection.products.filter(product => !product.image);
  productsNode.replaceChildren(...illustrated.map(card));
  productsNode.hidden = illustrated.length === 0;
  sourceProductsNode.replaceChildren(...sourceProducts.map(sourceRow));
  sourceNode.hidden = sourceProducts.length === 0;
  if (collection.acquisition?.url) {
    acquireNode.href = collection.acquisition.url;
    acquireNode.removeAttribute('aria-disabled');
  } else {
    acquireNode.removeAttribute('href');
    acquireNode.setAttribute('aria-disabled', 'true');
  }
} catch {
  productsNode.innerHTML = '<p class="empty-state">The current collection could not be loaded.</p>';
  productsNode.hidden = false;
  sourceNode.hidden = true;
  messageNode.textContent = 'Collection details are temporarily unavailable. No purchase has been started.';
  acquireNode.removeAttribute('href');
}
