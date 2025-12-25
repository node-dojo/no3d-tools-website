/**
 * Products API Endpoint
 *
 * GET /api/products - List all active products
 *
 * Query Parameters:
 *   - type: Filter by product_type
 *   - search: Full-text search on title/description
 *   - limit: Number of results (default: 50, max: 100)
 *   - page: Page number (default: 1)
 *
 * Returns products in a format compatible with the existing website.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Feature flag for gradual rollout
const USE_SUPABASE = process.env.USE_SUPABASE === 'true'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // If Supabase not enabled, fall back to legacy behavior
  if (!USE_SUPABASE) {
    return res.status(200).json({
      message: 'Supabase integration not enabled. Set USE_SUPABASE=true',
      products: []
    })
  }

  // Validate environment
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Supabase configuration missing',
      details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set'
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Parse query parameters
    const {
      type,
      search,
      limit = '50',
      page = '1'
    } = req.query

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const from = (pageNum - 1) * limitNum
    const to = from + limitNum - 1

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    // Filter by product type
    if (type) {
      query = query.eq('product_type', type)
    }

    // Full-text search
    if (search) {
      query = query.textSearch('title', search, {
        type: 'websearch',
        config: 'english'
      })
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    // Transform to match existing website format
    const products = (data || []).map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      price: p.price,
      image: p.icon_url,
      preview: p.preview_image_url,
      video: p.video_url,
      type: p.product_type,
      tags: p.tags,
      polarProductId: p.polar_product_id,
      sku: p.sku,
      vendor: p.vendor
    }))

    res.status(200).json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    })
  }
}
