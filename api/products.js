/**
 * Vercel Serverless Function: Get Products from Supabase
 *
 * Endpoint: /api/products
 * Method: GET
 *
 * Query Parameters:
 *   - limit: Number of products per page (default: 50, max: 100)
 *   - offset: Number of products to skip (default: 0)
 *   - type: Filter by product_type (optional)
 *   - search: Search in title (optional)
 *
 * Returns: { products: [...], total: number, limit: number, offset: number }
 * Falls back to empty array if Supabase is not configured
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json')

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true })
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      products: []
    })
  }

  try {
    // Parse pagination params
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)
    const productType = req.query.type || null
    const search = req.query.search || null

    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured, returning empty array')
      return res.status(200).json({ products: [], total: 0, limit, offset })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Build query with filters
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    // Apply optional filters
    if (productType) {
      query = query.eq('product_type', productType)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({
        error: error.message,
        products: [],
        total: 0,
        limit,
        offset
      })
    }

    // Transform to website format
    const products = (data || []).map(p => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      price: p.price ? `$${parseFloat(p.price).toFixed(2)}` : '$0.00',
      image: p.icon_url,
      video: p.video_url,
      type: p.product_type,
      tags: p.tags || [],
      polar_product_id: p.polar_product_id,
      polar_price_id: p.polar_price_id,
      // Include metadata for backward compatibility
      changelog: p.metadata?.changelog || [],
      hosted_media: p.metadata?.hosted_media || {},
      // Additional fields from metadata
      thumbnail_image: p.metadata?.thumbnail_image,
      metafields: p.metafields || [],
      variants: [{
        price: p.price ? parseFloat(p.price).toFixed(2) : '0.00',
        sku: p.sku || ''
      }],
      polar: p.polar_product_id ? {
        product_id: p.polar_product_id,
        price_id: p.polar_price_id
      } : null
    }))

    console.log(`✅ Fetched ${products.length} of ${count} products from Supabase (offset: ${offset}, limit: ${limit})`)

    return res.status(200).json({
      products,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return res.status(500).json({
      error: error.message || 'Failed to fetch products',
      products: [],
      total: 0,
      limit: 50,
      offset: 0
    })
  }
}

