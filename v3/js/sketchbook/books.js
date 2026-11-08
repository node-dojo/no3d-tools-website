import { printProducts } from '../../data/prints/catalog.js?v=product-books-1';

// The original export remains the fallback; products opt into authored books.
export const defaultBook = Object.freeze({
  id: 'default',
  manifest: '/v3/assets/sketchbook/manifest.json.gz',
  poster: '/v3/assets/sketchbook/open.webp',
  initialProgress: .5050505,
  pageStops: [0,.099,.18,.261,.342,.423,.504,.585,.666,.747,.828,.909,.99],
});
const books = {
  'spike-planter': {
    id: 'spike-planter',
    manifest: '/v3/assets/sketchbook/books/spike-planter/v1/manifest.json.gz',
    poster: '/v3/assets/sketchbook/books/spike-planter/v1/open.webp',
  },
};

export function bookForProduct(handle) {
  const key = printProducts.find(product => product.slug === handle)?.sketchbook;
  return Object.hasOwn(books,key) ? books[key] : defaultBook;
}

export function bookNavigation(manifest, fallback = defaultBook) {
  const pageStops = manifest.pageStops ?? fallback.pageStops ?? defaultBook.pageStops;
  const initialProgress = manifest.initialProgress ?? fallback.initialProgress ?? defaultBook.initialProgress;
  if (!Array.isArray(pageStops) || pageStops.length < 2 ||
      pageStops.some((value, i) => !Number.isFinite(value) || value < 0 || value > 1 || (i && value <= pageStops[i-1])) ||
      !Number.isFinite(initialProgress) || initialProgress < 0 || initialProgress > 1) {
    throw new Error('Invalid sketchbook navigation.');
  }
  return { pageStops, initialProgress };
}
