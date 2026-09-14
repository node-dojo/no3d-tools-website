const ORIGIN = 'https://no3dtools.com';
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const plainText = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

export async function productPreviewResponse(request, { fetcher = fetch } = {}) {
  const url = new URL(request.url);
  if (!/^\/v3\/product\/?$/.test(url.pathname)) return null;
  const handle = url.searchParams.get('handle');
  if (!handle || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(handle)) return null;
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', Vary: 'User-Agent' };
  try {
    const response = await fetcher(new URL(`/api/products/${encodeURIComponent(handle)}`, url), { signal: AbortSignal.timeout(5000) });
    if (response.status === 404) return new Response('<!doctype html><html lang="en"><head><title>Tool not found — NO3D Tools</title><meta name="robots" content="noindex"></head><body><h1>Tool not found</h1><a href="/v3/">Browse Tools</a></body></html>', { status: 404, headers });
    if (!response.ok) throw Error('product_source_unavailable');
    const { product } = await response.json();
    if (product?.handle !== handle || typeof product.title !== 'string' || !product.title.trim()) throw Error('invalid_product_source');
    const title = escape(product.title);
    const description = escape(plainText(product.description).slice(0, 400) || `${product.title} — a NO3D Tool for Blender.`);
    const canonical = `${ORIGIN}/v3/product/?handle=${encodeURIComponent(handle)}`;
    let image = `${ORIGIN}/assets/og-default.png`;
    for (const candidate of [product.preview, product.image]) {
      if (typeof candidate !== 'string' || !candidate.trim()) continue;
      try { const resolved = new URL(candidate, ORIGIN); if (resolved.protocol === 'https:' && !resolved.username && !resolved.password) { image = resolved.href; break; } } catch {}
    }
    return new Response(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>${title} — NO3D Tools</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:type" content="website"><meta property="og:site_name" content="NO3D Tools">
<meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${escape(image)}">
</head><body><h1>${title}</h1><p>${description}</p><a href="${escape(canonical)}">View ${title}</a></body></html>`, { status: 200, headers });
  } catch {
    return new Response('<!doctype html><html lang="en"><head><title>NO3D Tools temporarily unavailable</title><meta name="robots" content="noindex"></head><body><p>Tool details are temporarily unavailable.</p><a href="/v3/">Browse Tools</a></body></html>', { status: 503, headers: { ...headers, 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
