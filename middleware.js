import { next, waitUntil } from '@vercel/functions';
import {
  v3OwnerAllowed,
  v3OwnerGateEnabled,
  v3ProductionLaunchEnabled,
} from './api/auth/lib/v3-access.js';
import { sanitizeAnalyticsPage, sanitizeAnalyticsReferrer } from './api/lib/analytics.js';

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Discordbot|Slackbot|WhatsApp|Telegram|iMessageBot|Applebot|Google-InspectionTool|Googlebot|bingbot|yandex|Pinterestbot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator|redditbot|Mediapartners|AhrefsBot|SemrushBot|MJ12bot/i;

const PUBLIC_V3_PREFIXES = [
  '/v3/access',
  '/v3/assets/',
  '/v3/js/',
  '/v3/styles/',
];

const LEGACY_DOCUMENTS = new Set([
  '/account.html', '/blog.html', '/guide.html', '/index.html', '/library.html',
  '/subscribe', '/subscribe.html', '/success.html',
]);

function routeKind(pathname) {
  if (pathname === '/' || pathname === '/v3' || pathname.startsWith('/v3/')) return 'v3';
  if (pathname === '/blog' || pathname.startsWith('/blog/')) return 'blog';
  if (LEGACY_DOCUMENTS.has(pathname) || pathname.endsWith('.html')) return 'legacy';
  return 'unknown';
}

async function recordInfrastructureRequest(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return;
  const destination = request.headers.get('sec-fetch-dest');
  const accept = request.headers.get('accept') || '';
  if (destination !== 'document' && !accept.includes('text/html')) return;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;
  const url = new URL(request.url);
  await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/site_events`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      event: 'document_request',
      page: sanitizeAnalyticsPage(url.href),
      referrer: sanitizeAnalyticsReferrer(request.headers.get('referer')),
      properties: { source: 'middleware', route_kind: routeKind(url.pathname) },
      session_id: null,
    }),
  });
}

function isPublicV3Path(pathname) {
  return PUBLIC_V3_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix));
}

function accessRedirect(request, reason) {
  const requested = new URL(request.url);
  const access = new URL('/v3/access/', requested);
  access.searchParams.set('next', `${requested.pathname}${requested.search}`);
  access.searchParams.set('access', reason);
  return Response.redirect(access, 307);
}

async function v3AccessMiddleware(request) {
  if (!v3OwnerGateEnabled()) return next();
  const url = new URL(request.url);
  if (isPublicV3Path(url.pathname)) return next();

  try {
    const sessionResponse = await fetch(new URL('/api/auth/session', request.url), {
      cache: 'no-store',
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const session = await sessionResponse.json();
    if (session.authenticated && v3OwnerAllowed(session.email)) return next();
    return accessRedirect(request, session.authenticated ? 'denied' : 'required');
  } catch {
    return accessRedirect(request, 'required');
  }
}

async function blogPreviewMiddleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return next();

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return next();

  const slug = parts[1];
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return next();

    const apiUrl = `${supabaseUrl}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,excerpt,featured_image,tags,published_at&limit=1`;
    const response = await fetch(apiUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!response.ok) return next();

    const rows = await response.json();
    if (!rows.length) return next();

    const article = rows[0];
    const title = escapeHtml(article.title || 'NO3D Tools Blog');
    const description = escapeHtml(article.excerpt || 'Notes, research, and documentation from NO3D Tools.');
    const image = article.featured_image || 'https://no3dtools.com/assets/og-default.png';
    const canonical = `https://no3dtools.com/blog/${slug}`;
    const siteName = 'NO3D TOOLS';

    return new Response(`<!DOCTYPE html>
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
</html>`, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return next();
  }
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  waitUntil(recordInfrastructureRequest(request).catch(() => {}));
  if (pathname === '/' && (v3ProductionLaunchEnabled() || v3OwnerGateEnabled())) {
    return Response.redirect(new URL('/v3/', request.url), 307);
  }
  if (pathname === '/v3' || pathname.startsWith('/v3/')) return v3AccessMiddleware(request);
  return blogPreviewMiddleware(request);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const config = {
  matcher: ['/((?!api(?:/|$)|assets(?:/|$)|extensions(?:/|$)|v3/(?:assets|js|styles)(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$).*)'],
};
