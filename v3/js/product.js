import { beginMembershipCheckout, beginProductCheckout, getCommerceConfig, getProduct } from './api.js?v=perf-20260820';
import { track } from './analytics.js?v=privacy-funnel-20260827';
import { setProductPreview } from './product-preview.js?v=preview-20260823';
import './shell.js?v=perf-20260820';

const $ = selector => document.querySelector(selector);
const handle = new URLSearchParams(location.search).get('handle') || 'chrome-crayon';

function metafield(product, key) {
  return product.metafields.find(field => field.key === key)?.value || '';
}

function descriptionContent(text) {
  const source = String(text || '').replace(/^---[\s\S]*?---\s*/, '').trim();
  const lines = source.split('\n');
  const descriptionHeading = lines.findIndex(line => /^#{1,6}\s+description\s*$/i.test(line.trim()));
  if (descriptionHeading < 0) return source;
  const nextHeading = lines.findIndex((line, index) => index > descriptionHeading && /^#{1,6}\s+/.test(line.trim()));
  return lines.slice(descriptionHeading + 1, nextHeading < 0 ? lines.length : nextHeading).join('\n').trim();
}

function descriptionSummary(text) {
  return descriptionContent(text).split(/\n\s*\n/).find(block => block.trim())?.replace(/[*_`]/g, '').replace(/\n/g, ' ').trim() || '';
}

function descriptionParagraphs(text) {
  const fragment = document.createDocumentFragment();
  const cleaned = descriptionContent(text);
  for (const block of cleaned.split(/\n\s*\n/).filter(Boolean).slice(0, 8)) {
    const paragraph = document.createElement('p');
    paragraph.textContent = block.replace(/[*_`]/g, '').replace(/\n/g, ' ');
    fragment.append(paragraph);
  }
  if (!fragment.childNodes.length) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Documentation is being prepared for this NO3D Tool.';
    fragment.append(paragraph);
  }
  return fragment;
}

function displayPrice(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : String(value);
}

function setButtonState(button, busy, idle) {
  button.disabled = busy;
  button.querySelector('span').textContent = busy ? 'Opening…' : idle;
}

const commercePromise = getCommerceConfig();
const { product, purchasable, pricingSource, source } = await getProduct(handle);

if (!product) {
  $('[data-product-title]').textContent = 'NO3D Tool unavailable';
  $('[data-product-lede]').textContent = 'The catalog did not return a product record.';
} else {
  const summary = descriptionSummary(product.description) || 'Current NO3D Tool.';
  document.title = `${product.title} — NO3D Tools V3`;
  $('[data-product-title]').textContent = product.title;
  $('[data-product-lede]').textContent = summary;
  $('[data-product-code]').textContent = `NO3D–${product.handle.toUpperCase().replace(/[^A-Z0-9]+/g, '–')}`;
  $('[data-product-class]').textContent = `Tool / ${product.productType} / ${product.tags[1] || 'Blender edition'}`;
  $('[data-spec-system]').textContent = product.productType;
  $('[data-spec-revision]').textContent = product.releaseVersion || product.releaseStatus;
  $('[data-spec-control]').textContent = metafield(product, 'control') || (product.title.toLowerCase().includes('obj') ? 'Gizmos' : 'Parameters');
  $('[data-doc-edition]').textContent = product.tags[1] || 'Blender edition';
  $('[data-doc-version]').textContent = product.releaseVersion || product.releaseStatus;
  $('[data-changelog]').textContent = product.releaseVersion ? `Release ${product.releaseVersion}` : 'Current catalog release';
  $('[data-purpose]').textContent = summary;
  const hero = $('[data-product-hero]');
  setProductPreview(hero, product);
  const description = $('[data-description]');
  description.replaceChildren(descriptionParagraphs(product.description));

  // The exposed-parameter panel is per-product or absent. Never fall back to
  // another product's diagram — a wrong parameter map is worse than none.
  // Assigned as textContent: this is drawn characters, never markup.
  const asciiPanel = $('[data-ascii-panel]');
  if (product.nodeDiagram) {
    $('[data-ascii-plate]').textContent = product.nodeDiagram;
    asciiPanel.hidden = false;
  } else {
    asciiPanel.remove();
  }

  const price = displayPrice(product.price);
  const purchaseRow = $('[data-purchase-row]');
  const priceBlock = $('[data-price-block]');
  const download = $('[data-download]');
  const free = product.accessPolicy === 'free';
  if (!price) {
    priceBlock.remove();
    purchaseRow.classList.add('action-only');
  } else {
    $('[data-product-price]').textContent = price;
  }
  download.disabled = true;
  download.title = 'Loading purchase options';
  download.addEventListener('click', async () => {
    if (download.disabled) return;
    if (free) {
      track('account_start', { source: 'free_product', handle: product.handle });
      location.href = `/v3/onboarding/create-account/?next=${encodeURIComponent('/v3/account/?state=install')}`;
      return;
    }
    setButtonState(download, true, 'Download');
    track('product_checkout_start', { handle: product.handle });
    try {
      const checkoutUrl = await beginProductCheckout(product.handle);
      track('product_checkout_redirect', { handle: product.handle });
      location.href = checkoutUrl;
    } catch {
      track('product_checkout_failed', { handle: product.handle });
      setButtonState(download, false, 'Try again');
    }
  });
  const catalogButton = $('[data-catalog-checkout]');
  catalogButton.disabled = true;
  catalogButton.title = 'Loading purchase options';
  catalogButton.addEventListener('click', async () => {
    if (catalogButton.disabled) return;
    setButtonState(catalogButton, true, 'Entire catalog');
    track('membership_checkout_start', { source: 'product' });
    try {
      const checkoutUrl = await beginMembershipCheckout();
      track('membership_checkout_redirect', { source: 'product' });
      location.href = checkoutUrl;
    } catch {
      track('membership_checkout_failed', { source: 'product' });
      setButtonState(catalogButton, false, 'Try again');
    }
  });
  commercePromise.then(commerce => {
    if (free) {
      download.disabled = false;
      download.title = 'Create or open your account to add this free tool';
      download.querySelector('span').textContent = 'Add to Library';
    } else {
      download.disabled = !commerce.individualProductsEnabled || !purchasable;
      download.title = !purchasable
      ? 'This design study is not yet published for individual checkout'
      : download.disabled ? 'Individual checkout is not currently enabled' : '';
    }
    $('[data-membership-price]').textContent = commerce.membershipPrice ? `${commerce.membershipPrice} / month →` : '→';
    const requiresTestPrice = location.hostname === 'v3.no3dtools.com';
    const membershipCheckoutIsSafe = !requiresTestPrice || commerce.membershipEnvironment === 'test';
    catalogButton.disabled = !membershipCheckoutIsSafe;
    catalogButton.title = membershipCheckoutIsSafe ? '' : 'Membership checkout is paused while the staging payment connection is verified';
  });
}

document.body.dataset.catalogSource = source;
document.body.dataset.pricingSource = pricingSource;
document.body.dataset.purchaseAvailability = product?.accessPolicy === 'free' ? 'free' : purchasable ? 'available' : 'design-study';
