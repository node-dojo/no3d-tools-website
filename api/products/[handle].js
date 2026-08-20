import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from '../lib/cors.js';

const PRODUCT_FIELDS = 'id, title, handle, description, vendor, product_type, price, sku, icon_url, preview_image_url, video_url, tags, metafields, metadata, release_status, release_version';

function mapProductType(value) {
  const type = String(value || '').toLowerCase();
  if (type.includes('tutorial')) return 'tutorials';
  if (type.includes('print')) return 'prints';
  if (type.includes('app')) return 'apps';
  if (type.includes('doc') || type.includes('blog')) return 'docs';
  return 'tools';
}

function resolveHostedUrl(entry) {
  if (typeof entry === 'string') return entry;
  return entry?.url || entry?.secure_url || null;
}

function serializeProduct(product) {
  const hostedMedia = product.metadata?.hosted_media || {};
  const iconKey = Object.keys(hostedMedia).find(key => key.toLowerCase().startsWith('icon_'));
  return {
    id: product.id, handle: product.handle, title: product.title,
    description: product.description, price: product.price,
    product_type: mapProductType(product.product_type),
    image: product.icon_url || resolveHostedUrl(hostedMedia[iconKey]),
    preview: product.preview_image_url, video: product.video_url,
    tags: product.tags || [], sku: product.sku, vendor: product.vendor,
    metafields: product.metafields || [],
    release_status: product.release_status || 'stable',
    release_version: product.release_version || null,
  };
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const handle = Array.isArray(req.query.handle) ? req.query.handle[0] : req.query.handle;
  if (!handle || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(handle)) return res.status(400).json({ error: 'invalid_product_handle' });
  if (process.env.USE_SUPABASE !== 'true') return res.status(404).json({ error: 'product_not_found' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Supabase configuration missing' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('products').select(PRODUCT_FIELDS).eq('status', 'active').eq('handle', handle).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'product_not_found' });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json({ product: serializeProduct(data) });
  } catch (error) {
    console.error('Failed to fetch product:', error?.message || error);
    return res.status(500).json({ error: 'failed_to_fetch_product' });
  }
}
