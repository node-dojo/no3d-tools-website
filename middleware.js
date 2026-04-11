/**
 * Vercel Edge Middleware — OG meta tags for blog posts.
 *
 * When a crawler (iMessage, Slack, Twitter, Facebook, Discord, LinkedIn, etc.)
 * requests /blog/:slug, this returns a small HTML page with the correct
 * og:title, og:description, og:image pulled from Supabase.
 *
 * Regular browsers get the normal blog.html SPA as before.
 */

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Discordbot|Slackbot|WhatsApp|Telegram|iMessageBot|Applebot|Google-InspectionTool|Googlebot|bingbot|yandex|Pinterestbot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator|redditbot|Mediapartners|AhrefsBot|SemrushBot|MJ12bot/i;

export const config = {
  matcher: '/blog/:slug*',
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return;          // regular browser — pass through

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);  // ["blog", "slug"]
  if (parts.length < 2) return;           // /blog listing — pass through

  const slug = parts[1];

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const apiUrl = `${supabaseUrl}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,excerpt,featured_image,tags,published_at&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!res.ok) return;                  // fall through to normal page
    const rows = await res.json();
    if (!rows.length) return;

    const article = rows[0];
    const title = escapeHtml(article.title || 'NO3D Tools Blog');
    const description = escapeHtml(
      article.excerpt || 'Notes, research, and documentation from NO3D Tools.'
    );
    const image = article.featured_image || 'https://no3dtools.com/assets/og-default.png';
    const canonical = `https://no3dtools.com/blog/${slug}`;
    const siteName = 'NO3D TOOLS';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${siteName}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${siteName}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${canonical}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${canonical}">Read the full article</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return;                               // any error → fall through
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
