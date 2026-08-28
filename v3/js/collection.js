const productsNode = document.querySelector('[data-collection-products]');
const countNode = document.querySelector('[data-collection-count]');
const messageNode = document.querySelector('[data-collection-message]');
const acquireNodes = [...document.querySelectorAll('[data-collection-acquire]')];
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
  const collectionHandle = document.body.dataset.collectionHandle || 'no3d-chrome-tools';
  const response = await fetch(`/api/collections/${encodeURIComponent(collectionHandle)}`);
  if (!response.ok) throw new Error('collection_unavailable');
  const collection = await response.json();
  document.title = `${collection.title} — NO3D Tools`;
  countNode.textContent = `${collection.productCount} tools / Current collection`;
  if (collection.pricing?.payNow?.formatted) priceNode.textContent = `${collection.pricing.payNow.formatted} lifetime`;
  const payNowLabel = document.querySelector('[data-pay-now-price]');
  const payOverTimeLabel = document.querySelector('[data-pay-over-time-price]');
  if (payNowLabel) payNowLabel.textContent = `${collection.pricing.payNow.formatted} once`;
  if (payOverTimeLabel) payOverTimeLabel.textContent = `${collection.pricing.payOverTime.installments} × ${collection.pricing.payOverTime.formatted}`;
  const illustrated = collection.products.filter(product => product.image);
  const sourceProducts = collection.products.filter(product => !product.image);
  productsNode.replaceChildren(...illustrated.map(card));
  productsNode.hidden = illustrated.length === 0;
  sourceProductsNode.replaceChildren(...sourceProducts.map(sourceRow));
  sourceNode.hidden = sourceProducts.length === 0;
  for (const node of acquireNodes) {
    if (collection.acquisition?.enabled) node.removeAttribute('aria-disabled');
    else node.setAttribute('aria-disabled', 'true');
    node.addEventListener('click', async event => {
      event.preventDefault();
      if (!collection.acquisition?.enabled || node.dataset.busy === 'true') return;
      node.dataset.busy = 'true';
      messageNode.textContent = 'Opening secure checkout…';
      try {
        const checkout = await fetch('/api/commerce/collection-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: collectionHandle, schedule: node.dataset.schedule }),
        });
        const payload = await checkout.json();
        if (!checkout.ok || !payload.checkoutUrl) throw new Error('checkout_unavailable');
        window.location.assign(payload.checkoutUrl);
      } catch {
        messageNode.textContent = 'Checkout is temporarily unavailable. No payment has been started.';
        node.dataset.busy = 'false';
      }
    });
  }
} catch {
  productsNode.innerHTML = '<p class="empty-state">The current collection could not be loaded.</p>';
  productsNode.hidden = false;
  sourceNode.hidden = true;
  messageNode.textContent = 'Collection details are temporarily unavailable. No purchase has been started.';
  for (const node of acquireNodes) node.setAttribute('aria-disabled', 'true');
}
