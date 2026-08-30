import { setCorsHeaders } from '../lib/cors.js';
import { collectionDefinitions } from '../../lib/collection-definitions.js';

const CATALOG_URL = 'https://no3dtools.com/api/products?limit=100';
const declaredTitles = {
  'chrome-crayon': 'Chrome Crayon',
  'no3d-pixel-markers': 'NO3D Pixel Markers',
  'dojo-spiro-curve': 'Dojo Spiro Curve',
  'flat-stickie-pack': 'Flat Stickie Pack',
  'image-pixel-stippler': 'Image Pixel Stippler',
  'periodic-brush': 'Periodic Brush',
  'type-pixel-brush': 'Type Pixel Brush',
  'spikey-chain-and-mace': 'Spikey Chain and Mace',
};

async function readJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'NO3D-collection-projection/1.0' } });
  if (!response.ok) throw new Error(`Collection source returned ${response.status}`);
  return response.json();
}

async function readCollectionSource() {
  if (typeof process.env.NO3D_MANIFEST_JSON === 'string' && process.env.NO3D_MANIFEST_JSON.trim()) {
    return JSON.parse(process.env.NO3D_MANIFEST_JSON);
  }
  const { getManifestObjectKey, getObjectUtf8String } = await import('../lib/r2.js');
  return JSON.parse(await getObjectUtf8String(getManifestObjectKey()));
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const handle = Array.isArray(req.query.handle) ? req.query.handle[0] : req.query.handle;
  const definition = collectionDefinitions[handle];
  if (!definition) return res.status(404).json({ error: 'collection_not_found' });

  try {
    const [source, catalogPayload] = await Promise.all([
      readCollectionSource(),
      readJson(CATALOG_URL).catch(() => ({ products: [] })),
    ]);
    const members = source?.collections?.[definition.scope];
    if (!Array.isArray(members)) throw new Error('SOLVET collection scope is unavailable');
    const catalog = Array.isArray(catalogPayload) ? catalogPayload : catalogPayload.products || [];
    const byHandle = new Map(catalog.map(product => [product.handle, product]));
    const products = members.map(productHandle => {
      const product = byHandle.get(productHandle);
      return {
        handle: productHandle,
        title: product?.title || declaredTitles[productHandle] || productHandle,
        image: product?.image || product?.preview || null,
        catalogAvailable: Boolean(product),
        productUrl: product ? `/v3/product/?handle=${encodeURIComponent(productHandle)}` : null,
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({
      schemaVersion: 'no3d.collection-projection/v0.1',
      handle,
      title: definition.title,
      description: definition.description,
      thumbnail: definition.thumbnail,
      productUrl: `/v3/collections/${encodeURIComponent(handle)}/`,
      scope: definition.scope,
      mode: 'expanding_lifetime_collection',
      pricing: {
        payNow: { ...definition.pricing.payNow, currency: 'usd', schedule: 'pay_now' },
        payOverTime: { ...definition.pricing.payOverTime, currency: 'usd', schedule: 'pay_over_time' },
      },
      source: 'published_customer_manifest',
      productCount: products.length,
      products,
      acquisition: {
        channel: 'no3d_commerce',
        enabled: process.env.COMMERCE_COLLECTIONS_ENABLED === 'true',
        status: process.env.COMMERCE_COLLECTIONS_ENABLED === 'true' ? 'available' : 'offer_pending',
      },
    });
  } catch (error) {
    console.error('Collection projection failed', { handle, error: error instanceof Error ? error.message : 'unknown_error' });
    return res.status(502).json({ error: 'collection_source_unavailable' });
  }
}
