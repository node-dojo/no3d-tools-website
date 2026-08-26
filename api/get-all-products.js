/**
 * Get All Products API Endpoint
 * 
 * GET /api/get-all-products - Returns all active products as an array
 * 
 * This endpoint is used by the frontend to fetch all products at once.
 * Returns products in a format compatible with the existing website.
 */

import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from './lib/cors.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Feature flag for gradual rollout
const USE_SUPABASE = process.env.USE_SUPABASE === 'true'

// Production still has the original products schema. Keep the V3 enrichment
// fields in a best-effort select so the catalog remains readable there.
const PRODUCT_FIELDS = 'id, title, handle, description, vendor, product_type, status, asset_type, blender_version, price, sku, icon_url, preview_image_url, video_url, tags, metafields, metadata, version, cloudinary_icon_hash, cloudinary_video_hash, internal_product_code, release_status, release_version, access_policy, file_url, checksum, created_at, updated_at'
const LEGACY_PRODUCT_FIELDS = 'id, title, handle, description, vendor, product_type, status, asset_type, blender_version, price, sku, icon_url, preview_image_url, video_url, tags, metafields, metadata, version, cloudinary_icon_hash, cloudinary_video_hash, internal_product_code, release_status, release_version, created_at, updated_at'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')

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
    let { data, error } = await supabase
      .from('products')
      .select(PRODUCT_FIELDS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('⚠️ V3 product fields unavailable; retrying with legacy schema:', error.message || error)
      const fallback = await supabase
        .from('products')
        .select(LEGACY_PRODUCT_FIELDS)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
    }

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

    // Resolve URL from hosted_media entry (supports string or {url, checksum} format)
    const resolveHostedUrl = (entry) => {
      if (!entry) return null
      if (typeof entry === 'string') return entry
      if (typeof entry === 'object' && entry.url) return entry.url
      return null
    }

    // Fallback: find icon in hosted_media when icon_url is null
    const findIconInHostedMedia = (hostedMedia) => {
      if (!hostedMedia) return null
      const iconKey = Object.keys(hostedMedia).find(k => k.toLowerCase().startsWith('icon_'))
      return iconKey ? resolveHostedUrl(hostedMedia[iconKey]) : null
    }

    // Transform to match website format - return as array (not wrapped in object)
    const productsRaw = (data || []).map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      price: p.price,
      product_type: mapProductType(p.product_type), // Map to website productType
      image: p.icon_url || findIconInHostedMedia(p.metadata?.hosted_media),
      preview: p.preview_image_url,
      video: p.video_url,
      tags: p.tags || [],
      sku: p.sku,
      vendor: p.vendor,
      metafields: p.metafields || [],
      hosted_media: p.metadata?.hosted_media || {},
      animated_thumbnail: p.metadata?.animated_thumbnail || null,
      thumbnail_image: p.metadata?.thumbnail_image || null,
      carousel_media: p.metadata?.carousel_media || [],
      excluded_carousel_media: p.metadata?.excluded_carousel_media || [],
      main_image: p.metadata?.main_image || null,
      changelog: p.metadata?.changelog || [],
      presentation: p.metadata?.presentation || null,
      workbench: p.metadata?.workbench || null,
      catalog: p.metadata?.catalog || null,
      node_diagram: typeof p.metadata?.node_diagram === 'string' ? p.metadata.node_diagram : null,
      asset_type: p.asset_type || null,
      blender_version: p.blender_version || null,
      version: p.version || p.release_version || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      release_status: p.release_status || 'stable',
      release_version: p.release_version || null,
      access_policy: p.access_policy || 'catalog'
    }))

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
      error: 'Failed to fetch products'
    })
  }
}
