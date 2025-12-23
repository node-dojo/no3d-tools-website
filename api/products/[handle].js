/**
 * Single Product API Endpoint
 *
 * GET /api/products/[handle] - Get a single product by handle
 *
 * Returns the product in a format compatible with the existing website.
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

  const { handle } = req.query

  if (!handle) {
    return res.status(400).json({ error: 'Handle is required' })
  }

  // If Supabase not enabled, fall back to legacy behavior
  if (!USE_SUPABASE) {
    return res.status(200).json({
      message: 'Supabase integration not enabled. Set USE_SUPABASE=true',
      product: null
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

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('handle', handle)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Product not found',
          handle
        })
      }
      throw error
    }

    // Transform to match existing website format
    const product = {
      id: data.id,
      handle: data.handle,
      title: data.title,
      description: data.description,
      body_html: data.description, // Legacy compatibility
      price: data.price,
      image: data.icon_url,
      preview: data.preview_image_url,
      video: data.video_url,
      type: data.product_type,
      tags: data.tags,
      polarProductId: data.polar_product_id,
      polarPriceId: data.polar_price_id,
      sku: data.sku,
      vendor: data.vendor,
      metafields: data.metafields,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    res.status(200).json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({
      error: 'Failed to fetch product',
      message: error.message
    })
  }
}
