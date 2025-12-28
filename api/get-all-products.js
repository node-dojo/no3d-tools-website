/**
 * Get All Products API Endpoint
 * 
 * GET /api/get-all-products - Returns all active products as an array
 * 
 * This endpoint is used by the frontend to fetch all products at once.
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

  // If Supabase not enabled, return empty array
  if (!USE_SUPABASE) {
    console.warn('⚠️ Supabase integration not enabled. Set USE_SUPABASE=true')
    return res.status(200).json([])
  }

  // Validate environment
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing')
    return res.status(500).json({
      error: 'Supabase configuration missing',
      details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set'
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch all active products (no pagination for this endpoint)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase query error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No active products found in Supabase')
      return res.status(200).json([])
    }

    // Map Supabase product_type to website productType
    const mapProductType = (productType) => {
      if (!productType) return 'tools'
      const lower = productType.toLowerCase()
      if (lower === 'tools' || lower.includes('blender') || lower.includes('add-on') || lower.includes('geometry node')) {
        return 'tools'
      }
      if (lower.includes('tutorial')) return 'tutorials'
      if (lower.includes('print')) return 'prints'
      if (lower.includes('app')) return 'apps'
      if (lower.includes('doc') || lower.includes('blog')) return 'docs'
      return 'tools'
    }

    // Transform to match website format - return as array (not wrapped in object)
    const productsRaw = (data || []).map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      price: p.price,
      product_type: mapProductType(p.product_type), // Map to website productType
      image: p.icon_url,
      preview: p.preview_image_url,
      video: p.video_url,
      tags: p.tags || [],
      polar_product_id: p.polar_product_id,
      polar_price_id: p.polar_price_id,
      sku: p.sku,
      vendor: p.vendor,
      metafields: p.metafields || [],
      hosted_media: p.metadata?.hosted_media || {},
      thumbnail_image: p.metadata?.thumbnail_image || null,
      carousel_media: p.metadata?.carousel_media || [],
      excluded_carousel_media: p.metadata?.excluded_carousel_media || [],
      main_image: p.metadata?.main_image || null,
      changelog: p.metadata?.changelog || [],
      polar: p.polar_product_id ? {
        product_id: p.polar_product_id,
        price_id: p.polar_price_id
      } : null
    }))

    // Deduplicate by BOTH handle AND title (prioritize products with polar_product_id)
    // First, sort to prioritize products with polar_product_id
    productsRaw.sort((a, b) => {
      // Products with polar_product_id come first
      const aHasPolar = a.polar_product_id ? 1 : 0
      const bHasPolar = b.polar_product_id ? 1 : 0
      return bHasPolar - aHasPolar // descending - polar products first
    })

    const seenHandles = new Set()
    const seenTitles = new Set()
    const products = productsRaw.filter(p => {
      if (!p.handle) return false
      
      const normalizedHandle = p.handle.toLowerCase().trim()
      const normalizedTitle = (p.title || '').toLowerCase().trim()
      
      // Check for duplicate handle
      if (seenHandles.has(normalizedHandle)) {
        console.warn(`⚠️ Duplicate handle detected and filtered: "${p.handle}" (title: "${p.title}")`)
        return false
      }
      
      // Check for duplicate title (catches products with same name but different handles)
      if (seenTitles.has(normalizedTitle)) {
        console.warn(`⚠️ Duplicate title detected and filtered: "${p.title}" (handle: "${p.handle}")`)
        return false
      }
      
      seenHandles.add(normalizedHandle)
      seenTitles.add(normalizedTitle)
      return true
    })

    if (productsRaw.length !== products.length) {
      console.warn(`⚠️ Filtered out ${productsRaw.length - products.length} duplicate products`)
    }

    console.log(`✅ Returning ${products.length} products from /api/get-all-products`)
    res.status(200).json(products) // Return array directly, not wrapped

  } catch (error) {
    console.error('❌ Error fetching products:', error)
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    })
  }
}
