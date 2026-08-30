import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectionDefinitions } from '../lib/collection-definitions.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCollectionPage(handle, definition) {
  const title = escapeHtml(definition.title);
  const technicalLabel = escapeHtml(definition.technicalLabel);
  const description = escapeHtml(definition.description);
  const thumbnail = escapeHtml(definition.thumbnail);
  const animatedThumbnail = escapeHtml(definition.animatedThumbnail || definition.thumbnail);
  const payNow = escapeHtml(definition.pricing.payNow.formatted);
  const monthly = escapeHtml(definition.pricing.payOverTime.formatted);
  const installments = Number(definition.pricing.payOverTime.installments);
  const installmentWord = installments === 1 ? 'installment' : 'installments';
  const installmentCopy = numberWords[installments] || String(installments);
  const mediaSize = Number(definition.mediaSize) || 1024;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f1f0eb"><title>${title} — NO3D Tools</title><link rel="canonical" href="https://no3dtools.com/v3/collections/${handle}/"><link rel="stylesheet" href="/v3/styles/v3.css?v=collection-purchase-20260830"></head>
<body data-collection-handle="${handle}"><div class="v3-page membership-v3">
  <header class="v3-mast"><a class="v3-wordmark" href="/v3/" aria-label="NO3D Tools home"><img src="/assets/light/no3d-tools.png" alt="NO3D Tools"></a><a class="v3-search" href="/v3/">Catalog</a><div class="v3-status"><a href="/v3/account/">Account ●</a></div></header>
  <main>
    <section class="membership-hero"><div class="membership-intro collection-hero-intro"><span class="technical">${technicalLabel}</span><h1>${title}</h1><div class="collection-hero-media" aria-hidden="true"><img data-collection-hero src="${thumbnail}" data-static-src="${thumbnail}" data-animated-src="${animatedThumbnail}" alt="" width="${mediaSize}" height="${mediaSize}" decoding="async" fetchpriority="high"></div><p>${description}</p></div><div class="membership-purchase collection-purchase-simplified"><div class="collection-purchase-copy"><p>Full collection available to you immediately, with all new releases and updates added to your workspace automatically via the free <a href="/v3/onboarding/install/">NO3D Tools app</a>.</p><p>Your choice. Pay for the full collection now. Or pay for it as you go.</p></div><div class="collection-payment-options"><div class="collection-payment-option"><a class="collection-acquire" data-collection-acquire data-schedule="pay_now" aria-disabled="true"><span class="collection-action-copy"><span>Pay now</span><span class="collection-action-price" data-pay-now-price>${payNow} once</span></span><span>→</span></a></div><div class="collection-payment-option"><a class="collection-acquire" data-collection-acquire data-schedule="pay_over_time" aria-disabled="true"><span class="collection-action-copy"><span>Pay monthly</span><span class="collection-action-price" data-pay-over-time-price data-price-format="monthly-duration">${monthly} / month for ${installments} months</span></span><span>→</span></a></div></div><details class="collection-purchase-details"><summary>Purchase details</summary><div><p>Both options include the same current tools, future collection additions, maintenance, and revisions.</p><p>Monthly payments end after ${installmentCopy} successful ${installmentWord}. You’ll receive an email when your payments are complete.</p><p>At that point, you’ll have the option to continue membership payments to support the further development and growth of NO3D Tools. Continuing is optional, and your access to the tools you’ve paid for will not be affected.</p></div></details><p class="collection-status" data-collection-message aria-live="polite"></p></div></section>
    <section class="catalog-section collection-products" aria-labelledby="collection-heading"><header class="catalog-head"><span class="technical" data-collection-count>Current collection</span><h2 id="collection-heading">Included tools</h2></header><div class="product-grid" data-collection-products aria-live="polite"></div><section class="collection-source-list" data-collection-source hidden aria-label="Included tools without thumbnails"><img class="collection-source-folder" src="/v3/assets/shared-source-folder-black.png" alt="" width="512" height="512"><div data-collection-source-products aria-live="polite"></div></section></section>
  </main><img class="stone-mark" src="/assets/light/stone-logo.png" alt="Stone W mark">
</div><script type="module" src="/v3/js/collection.js?v=collection-purchase-20260830"></script></body></html>
`;
}

export function renderAllCollectionPages() {
  for (const [handle, definition] of Object.entries(collectionDefinitions)) {
    const outputPath = resolve(projectRoot, 'v3', 'collections', handle, 'index.html');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderCollectionPage(handle, definition));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderAllCollectionPages();
}
