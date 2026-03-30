/**
 * Newsletter Draft Generation Endpoint
 *
 * GET /api/newsletter/generate-draft
 *
 * Vercel Cron handler — generates a newsletter draft summarising recent
 * product activity. Does NOT send any email. Protected by CRON_SECRET.
 *
 * Schedule: 0 16 1,15 * * (1st & 15th of each month, 4pm UTC / 9am Mountain)
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get products updated in the last 15 days
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentProducts } = await supabase
      .from('products')
      .select('handle, title, status, updated_at')
      .gte('updated_at', fifteenDaysAgo)
      .order('updated_at', { ascending: false })

    // Get subscriber count
    const { count: subscriberCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get articles published in the last 15 days
    const { data: recentArticles } = await supabase
      .from('articles')
      .select('slug, title, published_at')
      .eq('status', 'published')
      .gte('published_at', fifteenDaysAgo)
      .order('published_at', { ascending: false })

    // Get total product count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Build draft
    const now = new Date()
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const newProducts = recentProducts?.filter(p => {
      const created = new Date(p.updated_at)
      return (now - created) < 15 * 24 * 60 * 60 * 1000
    }) || []

    let draft = `---\ndate: ${now.toISOString()}\nstatus: draft\nsubscribers: ${subscriberCount || 0}\nproducts: ${productCount || 0}\n---\n\n`
    draft += `# No3d Tools Library Update — ${monthYear}\n\n`
    draft += `Hi there,\n\nHere's what's new in the No3d Tools library:\n\n`

    if (newProducts.length > 0) {
      draft += `## Updated Products\n\n`
      for (const p of newProducts) {
        draft += `- **${p.title}** — ${p.handle}\n`
      }
      draft += `\n`
    } else {
      draft += `No product updates this period.\n\n`
    }

    if (recentArticles && recentArticles.length > 0) {
      draft += `## Recent Blog Posts\n\n`
      for (const a of recentArticles) {
        draft += `- **[${a.title}](https://no3dtools.com/blog/${a.slug})**\n`
      }
      draft += `\n`
    }

    draft += `## Library Stats\n\n`
    draft += `- ${productCount || 0} total products available\n`
    draft += `- ${subscriberCount || 0} active subscribers\n\n`
    draft += `Open Blender and sync your library to get the latest!\n\n`
    draft += `---\n\n`
    draft += `*Edit this draft before sending. Remove this line when ready.*\n`

    // Return the draft — the sync agent or admin dashboard will persist it
    return res.status(200).json({
      draft,
      metadata: {
        date: now.toISOString(),
        subscriberCount,
        productCount,
        updatedProducts: newProducts?.length || 0,
      }
    })
  } catch (err) {
    console.error('Newsletter draft generation failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
