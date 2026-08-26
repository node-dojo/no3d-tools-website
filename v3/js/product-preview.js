export const PRODUCT_PREVIEW_FALLBACK = '/v3/assets/shared-source-folder-black.png';

let previewSequence = 0;

export function resolveProductPreview(product = {}) {
  const source = String(product.thumbnail || product.image || '').trim();
  const title = String(product.title || product.filename || '').trim();
  return {
    alt: source && title ? `${title} thumbnail` : '',
    fallback: !source,
    src: source || PRODUCT_PREVIEW_FALLBACK,
  };
}

export function setProductPreview(image, product = {}) {
  const preview = resolveProductPreview(product);
  const token = String(++previewSequence);
  image.dataset.previewToken = token;
  image.classList.toggle('product-preview-thumbnail', !preview.fallback);
  image.classList.toggle('product-preview-fallback', preview.fallback);
  image.alt = preview.alt;
  image.onerror = () => {
    if (image.dataset.previewToken !== token || image.classList.contains('product-preview-fallback')) return;
    image.classList.remove('product-preview-thumbnail');
    image.classList.add('product-preview-fallback');
    image.alt = '';
    image.src = PRODUCT_PREVIEW_FALLBACK;
  };
  image.src = preview.src;
  image.hidden = false;
  return preview;
}

export function preloadProductPreviews(products = []) {
  if (typeof Image === 'undefined') return;
  for (const source of new Set(products.map(product => resolveProductPreview(product)).filter(preview => !preview.fallback).map(preview => preview.src))) {
    const image = new Image();
    image.src = source;
  }
}
