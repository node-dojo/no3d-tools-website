/**
 * Vercel Serverless Function: Get Public Configuration
 * 
 * Returns public configuration values that are safe to expose to the frontend.
 * This includes Supabase URL and anon key (which are designed to be public).
 */

export default async function handler(req, res) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json')
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Return public Supabase config (anon key is safe to expose)
    const config = {
      supabase: {
        url: process.env.SUPABASE_URL || null,
        anonKey: process.env.SUPABASE_ANON_KEY || null
      }
    }

    // Only return config if Supabase is configured
    if (!config.supabase.url || !config.supabase.anonKey) {
      return res.status(200).json({
        supabase: null,
        message: 'Supabase not configured'
      })
    }

    return res.status(200).json(config)
  } catch (error) {
    console.error('Error fetching config:', error)
    return res.status(500).json({
      error: 'Failed to fetch configuration',
      supabase: null
    })
  }
}

