import { printProducts } from '../data/prints/catalog.js?v=landing-20261030a';

export function landingHandle(value) {
  const url = new URL(value, 'https://no3dtools.com');
  const handle = url.pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{0,127})\/?$/)?.[1]
    || (url.pathname.startsWith('/v3/product/landing/') ? url.searchParams.get('handle') : null);
  return /^[a-z0-9][a-z0-9-]{0,127}$/.test(handle || '') ? handle : null;
}

export function printLandingProduct(handle) {
  const product = printProducts.find(item => item.slug === handle);
  if (!product) return null;
  const split = product.paragraphs.findIndex(text => text.includes('Included in the Download:'));
  return {
    handle, kind: 'print', title: product.name.replace(/^3D printable /i, ''),
    type: 'NO3D Prints / Digital print files', format: 'STL + Bambu Studio 3MF',
    paragraphs: product.paragraphs.slice(0, split < 0 ? undefined : split + 1).map(text => text.replace(/\n*Included in the Download:$/, '').trim()).filter(Boolean),
    notes: split < 0 ? [] : product.paragraphs.slice(split + 1), included: product.included,
    media: product.landingHero ? [product.landingHero, ...product.media] : product.media,
  };
}

export function toolLandingProduct(product) {
  const source = String(product.description || '').replace(/^---[\s\S]*?---\s*/, '');
  const description = source.match(/(?:^|\n)## Description\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] || source;
  return {
    handle: product.handle, kind: 'tool', title: product.title,
    type: 'NO3D Tools / Blender download', format: product.productType || 'Blender asset',
    paragraphs: description.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean),
    included: [], notes: [],
    media: [{ type: 'image', src: product.thumbnail || product.image || '/v3/assets/shared-source-folder-black.png', alt: product.title }],
    product,
  };
}
