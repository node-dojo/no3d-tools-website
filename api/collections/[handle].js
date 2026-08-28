import { setCorsHeaders } from '../lib/cors.js';

const CATALOG_URL = 'https://no3dtools.com/api/products?limit=100';
const definitions = {
  'no3d-chrome-tools': {
    collectionId: 'no3d-chrome',
    scope: 'no3dtools.membership.no3d-chrome',
    title: 'No3D Chrome tools',
    description: 'A curated Blender collection for procedural drawing, pixel, pattern, chrome-form, and printable visual tools.',
    thumbnail: '/v3/assets/no3d-chrome-hero-static.webp',
    members: [
      'chrome-crayon',
      'dojo-spiro-curve',
      'flat-stickie-pack',
      'image-pixel-stippler',
      'no3d-pixel-markers',
      'periodic-brush',
      'spikey-chain-and-mace',
      'type-pixel-brush',
    ],
    pricing: {
      payNow: { amount: 6666, formatted: '$66.66' },
      payOverTime: { amount: 1111, formatted: '$11.11', installments: 6 },
    },
  },
  'full-library': {
    collectionId: 'full-library',
    scope: 'no3dtools.membership.full-library',
    title: 'Full NO3D Tools Library',
    description: 'The complete expanding NO3D Tools collection with managed Blender delivery, maintenance, revisions, and future additions.',
    thumbnail: '/v3/assets/shared-source-folder-black.png',
    memberCount: 54,
    pricing: {
      payNow: { amount: 17777, formatted: '$177.77' },
      payOverTime: { amount: 1555, formatted: '$15.55', installments: 12 },
    },
  },
};
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
  const definition = definitions[handle];
  if (!definition) return res.status(404).json({ error: 'collection_not_found' });

  try {
    const [source, catalogPayload] = await Promise.all([
      readCollectionSource(),
      readJson(CATALOG_URL).catch(() => ({ products: [] })),
    ]);
    const members = source?.collections?.[definition.scope];
    if (!Array.isArray(members)) throw new Error('SOLVET collection scope is unavailable');
    if (definition.members && JSON.stringify(members) !== JSON.stringify(definition.members)) {
      throw new Error('Published collection membership differs from the reviewed site contract');
    }
    if (definition.memberCount && members.length !== definition.memberCount) {
      throw new Error('Published collection membership count differs from the reviewed site contract');
    }
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
