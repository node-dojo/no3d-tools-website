const ORIGIN = 'https://no3dtools.com';

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

function lastModified(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.valueOf()) ? date.toISOString().slice(0, 10) : null;
}

export function sitemapEntries({ products = [], articles = [] } = {}) {
  const entries = [
    { location: `${ORIGIN}/v3/` },
    { location: `${ORIGIN}/v3/membership/` },
    { location: `${ORIGIN}/v3/collections/no3d-chrome-tools/` },
    { location: `${ORIGIN}/v3/collections/full-library/` },
    { location: `${ORIGIN}/blog` },
  ];
  for (const product of products) {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(product?.handle || '')) continue;
    entries.push({ location: `${ORIGIN}/v3/product/?handle=${encodeURIComponent(product.handle)}`, modified: lastModified(product.updated_at) });
  }
  for (const article of articles) {
    if (!/^[a-z0-9][a-z0-9-]{0,159}$/.test(article?.slug || '')) continue;
    entries.push({ location: `${ORIGIN}/blog/${encodeURIComponent(article.slug)}`, modified: lastModified(article.updated_at || article.published_at) });
  }
  return entries;
}

export function buildSitemap(input) {
  const urls = sitemapEntries(input).map(entry => {
    const modified = entry.modified ? `<lastmod>${entry.modified}</lastmod>` : '';
    return `  <url><loc>${escapeXml(entry.location)}</loc>${modified}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
