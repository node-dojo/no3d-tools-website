import { beginMembershipCheckout, beginProductCheckout, getCatalog, getCommerceConfig } from './api.js';
import './shell.js';

const $ = selector => document.querySelector(selector);
const handle = new URLSearchParams(location.search).get('handle') || 'dojo-bolt-gen-v05-obj';

function metafield(product, key) {
  return product.metafields.find(field => field.key === key)?.value || '';
}

function descriptionParagraphs(text) {
  const fragment = document.createDocumentFragment();
  const cleaned = String(text || '').replace(/^---[\s\S]*?---\s*/, '').replace(/^#+\s*/gm, '').trim();
  for (const block of cleaned.split(/\n\s*\n/).filter(Boolean).slice(0, 8)) {
    const paragraph = document.createElement('p');
    paragraph.textContent = block.replace(/[*_`]/g, '').replace(/\n/g, ' ');
    fragment.append(paragraph);
  }
  if (!fragment.childNodes.length) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Documentation is being prepared for this instrument.';
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

const [{ products, source }, commerce] = await Promise.all([getCatalog(), getCommerceConfig()]);
const product = products.find(item => item.handle === handle) || products[0];

if (!product) {
  $('[data-product-title]').textContent = 'Instrument unavailable';
  $('[data-product-lede]').textContent = 'The catalog did not return a product record.';
} else {
  document.title = `${product.title} — NO3D Tools V3`;
  $('[data-product-title]').textContent = product.title;
  $('[data-product-lede]').textContent = product.description.split(/\n\s*\n/)[0] || 'Current NO3D instrument.';
  $('[data-product-code]').textContent = `NO3D–${product.handle.toUpperCase().replace(/[^A-Z0-9]+/g, '–')}`;
  $('[data-product-class]').textContent = `Tool / ${product.productType} / ${product.tags[1] || 'Instrument edition'}`;
  $('[data-spec-system]').textContent = product.productType;
  $('[data-spec-revision]').textContent = product.releaseVersion || product.releaseStatus;
  $('[data-spec-control]').textContent = metafield(product, 'control') || (product.title.toLowerCase().includes('obj') ? 'Gizmos' : 'Parameters');
  $('[data-doc-edition]').textContent = product.tags[1] || 'Instrument edition';
  $('[data-doc-version]').textContent = product.releaseVersion || product.releaseStatus;
  $('[data-changelog]').textContent = product.releaseVersion ? `Release ${product.releaseVersion}` : 'Current catalog release';
  $('[data-purpose]').textContent = product.description.split(/\n\s*\n/)[0] || 'A ready-to-use instrument for adjustable production geometry.';
  const hero = $('[data-product-hero]');
  if (product.image || product.thumbnail) hero.src = product.image || product.thumbnail;
  hero.alt = `${product.title} product animation`;
  const description = $('[data-description]');
  description.replaceChildren(descriptionParagraphs(product.description));

  const price = displayPrice(product.price);
  const purchaseRow = $('[data-purchase-row]');
  const priceBlock = $('[data-price-block]');
  const download = $('[data-download]');
  if (!price) {
    priceBlock.remove();
    purchaseRow.classList.add('action-only');
  } else {
    $('[data-product-price]').textContent = price;
  }
  if (!commerce.individualProductsEnabled) {
    download.disabled = true;
    download.title = 'Individual checkout is not currently enabled';
  }
  download.addEventListener('click', async () => {
    if (download.disabled) return;
    setButtonState(download, true, 'Download');
    try { location.href = await beginProductCheckout(product.handle); }
    catch { setButtonState(download, false, 'Try again'); }
  });
  const catalogButton = $('[data-catalog-checkout]');
  $('[data-membership-price]').textContent = commerce.membershipPrice ? `${commerce.membershipPrice} / month →` : '→';
  const stagingRequiresTestPrice = location.hostname === 'v3.no3dtools.com';
  const membershipCheckoutIsSafe = !stagingRequiresTestPrice || commerce.membershipEnvironment === 'test';
  if (!membershipCheckoutIsSafe) {
    catalogButton.disabled = true;
    catalogButton.title = 'Membership checkout is paused while the staging payment connection is verified';
  }
  catalogButton.addEventListener('click', async () => {
    if (catalogButton.disabled) return;
    setButtonState(catalogButton, true, 'Entire catalog');
    try { location.href = await beginMembershipCheckout(); }
    catch { setButtonState(catalogButton, false, 'Try again'); }
  });
}

document.body.dataset.catalogSource = source;
