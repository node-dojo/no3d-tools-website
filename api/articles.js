/**
 * GET /api/articles
 *
 * Query params:
 *   ?tag=blender     — filter by tag
 *   ?limit=10        — items per page (default 20, max 50)
 *   ?page=1          — page number (default 1)
 *   ?search=keyword  — search title/excerpt
 *
 * Returns: flat JSON array of articles (no content field, for performance).
 * RLS on articles table ensures only published articles are returned via anon key.
 */
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from './lib/cors.js';

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: 'Supabase configuration missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { tag, limit = '20', page = '1', search } = req.query;
  const pageSize = Math.min(parseInt(limit) || 20, 50);
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .from('articles')
      .select('id, slug, title, excerpt, tags, featured_image, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to);

    if (tag) query = query.contains('tags', [tag]);
    if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('Articles query error:', error);
      return res.status(500).json({ error: 'Failed to fetch articles' });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('Articles endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
