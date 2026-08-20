const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-bolt-object',
    handle: 'dojo-bolt-gen-v05-obj',
    title: 'Dojo Bolt Gen V05_Obj',
    description: 'The drag-and-drop object edition of the Dojo Bolt Generator, pre-configured with live parametric controls.',
    price: '7.77',
    product_type: 'Geometry Nodes',
    tags: ['Geometry', 'Object edition'],
    release_status: 'stable',
    release_version: '05.3',
    image: '/v3/assets/dojo-bolt-disassembly.webp?v=perf-20260820',
    video: '/v3/assets/dojo-bolt-disassembly.webm?v=perf-20260820',
    thumbnail_image: '/assets/product-images/icon_Dojo Bolt Gen v05_Obj.png',
    carousel_media: ['/v3/assets/dojo-bolt-disassembly.gif'],
  },
  {
    id: 'fallback-bolt',
    handle: 'dojo-bolt-gen-v05',
    title: 'Dojo Bolt Gen V05',
    description: 'A live Geometry Nodes instrument for generating printable bolts and fasteners.',
    price: '7.77',
    product_type: 'Geometry Nodes',
    tags: ['Geometry', 'Generator'],
    release_status: 'stable',
    release_version: '05.3',
    image: '/assets/product-images/Dojo Bolt Gen v05.gif',
    thumbnail_image: '/assets/product-images/icon_Dojo Bolt Gen v05.png',
  },
  {
    id: 'fallback-knob',
    handle: 'dojo-knob',
    title: 'Dojo Knob',
    description: 'A flexible parametric knob generator built for rapid physical iteration.',
    price: '7.77',
    product_type: 'Geometry Nodes',
    tags: ['Geometry', 'Object edition'],
    release_status: 'stable',
    image: '/assets/product-images/Dojo Knob.gif',
    thumbnail_image: '/assets/product-images/icon_Dojo Knob.png',
  },
  {
    id: 'fallback-chrome-crayon',
    handle: 'chrome-crayon',
    title: 'Chain Generator',
    description: 'A linked-form generator for fast procedural chain studies and production-ready paths.',
    price: '',
    product_type: 'Geometry Nodes',
    tags: ['Geometry', 'Generator'],
    release_status: 'stable',
    image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png',
    thumbnail_image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png',
  },
];

export function resolveMedia(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.secure_url || value.url || value.src || '';
}

function hosted(product, name) {
  return resolveMedia(product.hosted_media?.[name]);
}

export function normalizeProduct(product = {}) {
  const sourceTitle = product.title || product.name || product.handle || 'Untitled instrument';
  const handle = product.handle || String(sourceTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const title = handle === 'chrome-crayon' ? 'Chain Generator' : sourceTitle;
  const carousel = Array.isArray(product.carousel_media) ? product.carousel_media : [];
  const image = resolveMedia(product.image)
    || hosted(product, product.main_image)
    || hosted(product, product.animated_thumbnail)
    || hosted(product, carousel[0])
    || resolveMedia(product.preview)
    || '';
  const thumbnail = hosted(product, product.thumbnail_image)
    || resolveMedia(product.thumbnail_image)
    || hosted(product, product.animated_thumbnail)
    || image;
  return {
    ...product,
    id: product.id || handle,
    handle,
    title,
    displayTitle: title.toUpperCase(),
    description: typeof product.description === 'string' ? product.description : '',
    price: product.price ?? product.variants?.[0]?.price ?? '',
    productType: product.product_type || product.productType || 'Tools',
    tags: Array.isArray(product.tags) ? product.tags : [],
    releaseStatus: product.release_status || product.releaseStatus || 'stable',
    releaseVersion: product.release_version || product.releaseVersion || '',
    accessPolicy: product.access_policy || product.accessPolicy || 'catalog',
    image,
    video: resolveMedia(product.video),
    thumbnail,
    carousel,
    hostedMedia: product.hosted_media || {},
    metafields: Array.isArray(product.metafields) ? product.metafields : [],
  };
}

async function request(path, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `${response.status} ${response.statusText}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function getCatalog() {
  try {
    const payload = await request('/api/products?limit=100');
    const list = Array.isArray(payload) ? payload : payload.products;
    if (!Array.isArray(list) || list.length === 0) throw new Error('empty_catalog');
    return { products: list.map(normalizeProduct), source: 'live' };
  } catch (primaryError) {
    try {
      const payload = await request('/api/get-all-products');
      const list = Array.isArray(payload) ? payload : payload.products;
      if (!Array.isArray(list) || list.length === 0) throw primaryError;
      return { products: list.map(normalizeProduct), source: 'legacy' };
    } catch {
      return { products: FALLBACK_PRODUCTS.map(normalizeProduct), source: 'sample' };
    }
  }
}

export async function getProduct(handle) {
  try {
    const [payload, pricing] = await Promise.all([
      request(`/api/products/${encodeURIComponent(handle)}`),
      request(`/api/commerce/offer?handle=${encodeURIComponent(handle)}`).catch(() => null),
    ]);
    if (!payload.product) throw new Error('product_not_found');
    const product = normalizeProduct(payload.product);
    if (product.accessPolicy === 'free') {
      return {
        product: { ...product, price: '', priceCurrency: '', priceUnitAmount: 0 },
        purchasable: false,
        pricingSource: 'free',
        source: 'live',
      };
    }
    if (!pricing?.offer) {
      return {
        product: { ...product, price: '', priceCurrency: '', priceUnitAmount: null },
        purchasable: false,
        pricingSource: 'unavailable',
        source: 'live',
      };
    }
    return {
      product: {
        ...product,
        price: (pricing.offer.unitAmount / 100).toFixed(2),
        priceCurrency: pricing.offer.currency,
        priceUnitAmount: pricing.offer.unitAmount,
      },
      purchasable: true,
      pricingSource: 'commerce',
      source: 'live',
    };
  } catch {
    const catalog = await getCatalog();
    const catalogProduct = catalog.products.find(product => product.handle === handle);
    const designStudy = FALLBACK_PRODUCTS.map(normalizeProduct).find(product => product.handle === handle);
    const product = catalogProduct || designStudy || catalog.products[0] || null;
    return {
      product: product ? { ...product, price: '' } : null,
      purchasable: false,
      pricingSource: 'unavailable',
      source: catalog.source,
    };
  }
}

export async function getCommerceConfig() {
  const [config, membership] = await Promise.all([
    request('/api/commerce/config').catch(() => ({ individualProductsEnabled: false })),
    request('/api/get-subscription-price').catch(() => ({})),
  ]);
  return {
    individualProductsEnabled: config.individualProductsEnabled === true,
    membershipPrice: membership.formatted || membership.price || membership.display || '',
    membershipEnvironment: membership.environment || 'unknown',
  };
}

export function newAttemptToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export async function beginProductCheckout(handle) {
  const data = await request('/api/commerce/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptToken: newAttemptToken(), handle }),
  });
  const checkoutUrl = data.checkoutUrl || data.checkout_url || data.url;
  if (!checkoutUrl) throw new Error('checkout_url_missing');
  if (data.orderId) localStorage.setItem(`no3d_commerce_order_${handle}`, data.orderId);
  return checkoutUrl;
}

export async function beginMembershipCheckout() {
  const data = await request('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnTarget: 'v3' }),
  });
  const checkoutUrl = data.checkout_url || data.url;
  if (!checkoutUrl) throw new Error('checkout_url_missing');
  return checkoutUrl;
}

export async function getAccountState() {
  const [session, catalog, summary, membership] = await Promise.all([
    request('/api/auth/session').catch(() => ({ authenticated: false })),
    request('/api/products').catch(() => ({ products: [] })),
    request('/api/commerce/account').catch(() => null),
    request('/api/membership/account').catch(() => null),
  ]);
  const products = (catalog.products || []).map(normalizeProduct);
  return { session, catalog: new Map(products.map(product => [product.handle, product])), summary, membership };
}

export async function requestSignIn(email, next = '/v3/account/') {
  return request('/api/auth/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, next }),
  });
}

export async function authenticateWithPassword({ email, password, mode = 'signup', next = '/v3/account/?state=install' }) {
  return request('/api/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mode, next }),
  });
}

export function oauthUrl(provider, next = '/v3/account/?state=install') {
  const query = new URLSearchParams({ provider, next });
  return `/api/auth/oauth?${query}`;
}

export async function getAuthProviders() {
  return request('/api/auth/providers');
}

export async function approveBlenderConnection(deviceCode) {
  return request('/api/addon/connect/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  });
}

export async function sendDesktopSetupLink() {
  return request('/api/onboarding/desktop-link', { method: 'POST' });
}

export async function createBillingPortal() {
  return request('/api/commerce/portal', { method: 'POST' });
}

export async function createMembershipBillingPortal() {
  return request('/api/membership/portal', { method: 'POST' });
}

export async function getMembershipCheckout(sessionId) {
  return request(`/api/get-license-by-session?session_id=${encodeURIComponent(sessionId)}`);
}

export async function signOut() {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function getOrder(orderId) {
  return request(`/api/commerce/order/${encodeURIComponent(orderId)}`);
}

export async function requestRecovery(orderId) {
  return request('/api/auth/recovery-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
}

export { FALLBACK_PRODUCTS };
