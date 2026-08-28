import { createClient } from '@supabase/supabase-js';
import { buildSitemap } from './lib/sitemap.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  let products = [];
  let articles = [];
  let complete = false;
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const [productResult, articleResult] = await Promise.all([
      client.from('products').select('handle,updated_at').eq('status', 'active').order('handle'),
      client.from('articles').select('slug,published_at,updated_at').eq('status', 'published').order('slug'),
    ]);
    if (!productResult.error) products = productResult.data || [];
    if (!articleResult.error) articles = articleResult.data || [];
    complete = !productResult.error && !articleResult.error;
  }
  const xml = buildSitemap({ products, articles });
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-NO3D-Sitemap-Source', complete ? 'catalog-and-articles' : 'core-only');
  return res.status(200).send(req.method === 'HEAD' ? '' : xml);
}
