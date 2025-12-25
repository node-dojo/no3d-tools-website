/**
 * Vercel Serverless Function: Get Single Product by Handle from Supabase
 *
 * Endpoint: /api/products/[handle]
 * Method: GET
 *
 * Returns: Single product object or 404 if not found
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
      error: 'Method not allowed'
    })
  }

  try {
    // Get handle from query parameter (Vercel dynamic routes)
    // The file is named [handle].js, so Vercel will pass it as req.query.handle
    const handle = req.query.handle

    if (!handle) {
      return res.status(400).json({
        error: 'Product handle is required'
      })
    }

    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(404).json({
        error: 'Supabase not configured'
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Fetch product by handle
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('handle', handle)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Product not found
        return res.status(404).json({
          error: 'Product not found'
        })
      }
      throw error
    }

    if (!data) {
      return res.status(404).json({
        error: 'Product not found'
      })
    }

    // Transform to website format
    const product = {
      id: data.id,
      handle: data.handle,
      title: data.title,
      description: data.description,
      price: data.price ? `$${parseFloat(data.price).toFixed(2)}` : '$0.00',
      image: data.icon_url,
      video: data.video_url,
      type: data.product_type,
      tags: data.tags || [],
      polar_product_id: data.polar_product_id,
      polar_price_id: data.polar_price_id,
      // Include metadata for backward compatibility
      changelog: data.metadata?.changelog || [],
      hosted_media: data.metadata?.hosted_media || {},
      // Additional fields from metadata
      thumbnail_image: data.metadata?.thumbnail_image,
      metafields: data.metafields || [],
      variants: [{
        price: data.price ? parseFloat(data.price).toFixed(2) : '0.00',
        sku: data.sku || ''
      }],
      polar: data.polar_product_id ? {
        product_id: data.polar_product_id,
        price_id: data.polar_price_id
      } : null
    }

    return res.status(200).json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return res.status(500).json({
      error: error.message || 'Failed to fetch product'
    })
  }
}

