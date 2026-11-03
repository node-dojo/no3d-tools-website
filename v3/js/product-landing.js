import { beginProductCheckout, getPrintOffer, getProduct } from './api.js?v=prints-20261028b';
import { renderPrintPrice } from './print-price.js?v=prints-member-price-20261029';
import { landingHandle, printLandingProduct, toolLandingProduct } from './product-landing-model.js?v=landing-20261030a';
import { landingAccess } from './product-landing-access.js?v=landing-20261030a';
import { createProductGallery } from './product-gallery.js?v=landing-20261030a';
import { initializeAnalytics, track } from './analytics.js?v=landing-20261030a';

const $ = selector => document.querySelector(selector);
const handle = landingHandle(location.href);
let product;
let busy = false;
const action = $('[data-acquire]');
const status = $('[data-status]');
const canonicalPath = handle ? `/p/${handle}` : '/v3/';
const signinPath = `/v3/onboarding/create-account/?mode=signin&next=${encodeURIComponent(canonicalPath)}`;
for (const element of document.querySelectorAll('[data-signin], [data-member-signin]')) element.href = signinPath;
initializeAnalytics();

function paragraphs(target, items) {
  target.replaceChildren(...items.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
}

function renderPrintLayout() {
  document.body.classList.add('landing-print');
  const brand = $('.landing-wordmark');
  brand.src = '/assets/dark/no3d-prints-dark.png';
  brand.alt = 'NO3D Prints';
  brand.parentElement.href = '/v3/prints/';
  brand.parentElement.setAttribute('aria-label', 'NO3D Prints home');
  $('[data-print-subheading]').hidden = false;
  const credit = $('.landing-footer > span');
  credit.className = 'landing-credit';
  credit.textContent = 'All No3D Prints are designs by Joe Bowers of The Well Tarot';
  $('.landing-footer img').src = '/assets/dark/stone-logo-dark.png';

  const hero = document.createElement('section');
  hero.className = 'landing-print-hero';
  hero.setAttribute('aria-label', product.title);
  const photo = document.createElement('img');
  photo.className = 'landing-print-backdrop';
  photo.src = product.media[0].src;
  photo.alt = product.media[0].alt;
  photo.fetchPriority = 'high';
  photo.width = 1254; photo.height = 1254;
  const acquisition = $('.landing-acquire');
  hero.append(photo, $('.landing-identity'), acquisition);
  const more = document.createElement('a');
  more.className = 'landing-print-more micro';
  more.href = '#product-details';
  more.textContent = 'Photos & details ↓';
  acquisition.append(more);

  const details = document.createElement('section');
  details.id = 'product-details';
  details.className = 'landing-print-details';
  details.setAttribute('aria-label', 'Product photos and details');
  details.append($('.landing-media'), $('[data-description]'), $('[data-files-section]'));
  $('#product').prepend(hero, details);
}

function renderProduct() {
  document.title = `${product.title} — NO3D`;
  document.querySelector('meta[name=description]').content = product.paragraphs[0] || product.title;
  const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = `https://no3dtools.com${canonicalPath}`; document.head.append(canonical);
  $('[data-product-title]').textContent = product.title;
  $('[data-product-type]').textContent = product.type;
  paragraphs($('[data-description]'), product.paragraphs);
  paragraphs($('[data-file-notes]'), product.notes);
  for (const text of product.included) { const li = document.createElement('li'); li.textContent = text; $('[data-files]').append(li); }
  $('.landing-media').hidden = false;
  $('[data-description]').hidden = !product.paragraphs.length;
  $('[data-files-section]').hidden = !product.included.length && !product.notes.length;
  $('.landing-acquire').hidden = false;
  if (product.kind === 'print') renderPrintLayout();
  createProductGallery($('.landing-media'), product.kind === 'print' && product.media.length > 1 ? product.media.slice(1) : product.media);
  track('product_view', { handle, source: 'product_landing' });
}

function showAccess(access, offer) {
  $('[data-member-signin]').hidden = access.authenticated === true;
  $('[data-signin]').textContent = access.authenticated ? 'My account ↗' : 'Sign in ↗';
  $('[data-signin]').href = access.authenticated ? '/v3/account/' : signinPath;
  const free = product.product?.accessPolicy === 'free' || offer?.unitAmount === 0;
  renderPrintPrice($('[data-price]'), access.entitlement === 'owned' || free ? 'Free' : offer?.formatted || '', access.entitlement === 'member');
  $('[data-price-label]').textContent = access.entitlement === 'owned' ? 'Already owned' : 'Digital download';
  $('[data-action-label]').textContent = access.mode === 'install' ? 'Open in My Folder' : access.mode === 'download' || free ? 'Download' : access.mode === 'purchase' ? 'Get download' : 'Try again';
  $('[data-delivery-note]').textContent = product.kind === 'print' ? 'Digital print files only. No physical product is shipped.' : 'For Blender. Delivered through your NO3D account.';
  if (access.mode === 'purchase' && !free) $('[data-delivery-note]').textContent += ' Enter your email at checkout.';
  status.textContent = access.mode === 'unavailable' ? 'Your download is temporarily unavailable. Please try again.' : access.mode === 'purchase' && !offer ? 'Checkout is temporarily unavailable. Please try again.' : '';
  if (access.mode === 'purchase' && !offer) $('[data-action-label]').textContent = 'Try again';
  action.disabled = busy;
}

async function inspect() {
  const [access, offer] = await Promise.all([landingAccess(product), getPrintOffer(handle)]);
  showAccess(access, offer);
  return { access, offer };
}

action.addEventListener('click', async () => {
  if (busy) return;
  busy = true; action.disabled = true; status.textContent = 'Checking access…';
  let leaving = false;
  try {
    // Re-read access at the action boundary, including after a tab was restored.
    const { access, offer } = await inspect();
    if (access.mode === 'download') {
      status.textContent = 'Preparing your download…';
      const response = await fetch(access.href, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('download_unavailable');
      const result = await response.json();
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error('invalid_download');
      location.assign(url.href); status.textContent = 'Your download is ready.';
    } else if (access.mode === 'install') { leaving = true; location.assign(access.href); }
    else if (access.mode === 'signin') { leaving = true; location.assign(`/v3/onboarding/create-account/?next=${encodeURIComponent(canonicalPath)}`); }
    else if (access.mode === 'purchase' && offer) {
      status.textContent = 'Opening checkout…';
      track('product_checkout_start', { handle, source: 'product_landing' });
      const url = new URL(await beginProductCheckout(handle));
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw Error('invalid_checkout');
      track('product_checkout_redirect', { handle, source: 'product_landing' });
      leaving = true;
      location.assign(url.href);
    }
  } catch {
    status.textContent = 'We couldn’t open your download or checkout. Please try again.';
    track('product_checkout_failed', { handle, source: 'product_landing' });
  } finally { busy = leaving; action.disabled = leaving; }
});

try {
  if (!handle) throw Error('product_not_found');
  product = printLandingProduct(handle);
  if (!product) {
    const result = await getProduct(handle);
    // Never substitute the catalog's fallback first product for an unknown link.
    if (result.source !== 'live' || result.product?.handle !== handle || result.product.releaseStatus === 'archived') throw Error('product_not_found');
    product = toolLandingProduct(result.product);
  }
  renderProduct();
  try { await inspect(); }
  catch { status.textContent = 'Access could not be checked. Please try again.'; $('[data-action-label]').textContent = 'Try again'; action.disabled = false; }
} catch {
  document.title = 'Product unavailable — NO3D';
  $('[data-product-title]').textContent = 'Product unavailable';
  $('[data-error]').textContent = 'This product link is unavailable. Please check the link or contact us using the help link below.';
  $('[data-error]').hidden = false;
  const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex'; document.head.append(robots);
} finally { $('#product').setAttribute('aria-busy', 'false'); }

window.addEventListener('pageshow', event => { if (event.persisted && product) { busy = false; void inspect().catch(() => { action.disabled = false; status.textContent = 'Please try again to check your access.'; }); } });
