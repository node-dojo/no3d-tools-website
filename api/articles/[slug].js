/**
 * GET /api/articles/:slug
 *
 * Returns full article including content (markdown with Cloudinary URLs).
 * RLS ensures only published articles are visible via anon key.
 */
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from '../lib/cors.js';

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Slug required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: 'Supabase configuration missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, content, excerpt, tags, featured_image, published_at, updated_at, metadata')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Article not found' });
    res.status(200).json(data);
  } catch (err) {
    console.error('Article fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
