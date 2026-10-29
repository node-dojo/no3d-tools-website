import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrintHandler } from '../api/prints/lib/access.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const catalog = JSON.parse(await readFile(join(root, 'v3/data/prints/tools-preview-catalog.json')));
const products = Array.isArray(catalog) ? catalog : catalog.products;
const collections = {
  'full-library': JSON.parse(await readFile(join(root, 'v3/data/prints/tools-full-library.json'))),
  'no3d-chrome-tools': JSON.parse(await readFile(join(root, 'v3/data/prints/tools-chrome-collection.json'))),
};
export function createPrintsPreviewServer({ printDependencies = {} } = {}) {
  // A local guest by default. Test-only dependencies are supplied by the test
  // process, never selected through HTTP input. No production credentials.
  const dependencies = { authenticate: async () => null, ...printDependencies };
  const access = createPrintHandler({ dependencies });
  const download = createPrintHandler({ download: true, dependencies });
  return createServer(async (request, response) => {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "connect-src 'self'; form-action 'none'; frame-src 'none'; object-src 'none'");
    const json = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
    if (!['GET', 'HEAD'].includes(request.method)) return json(405, { error: 'local_preview_read_only' });
    try {
      let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (path === '/') { response.writeHead(302, { Location: '/v3/prints/' }); return response.end(); }
      if (path === '/api/prints/access' || path === '/api/prints/download') {
        const url = new URL(request.url, 'http://127.0.0.1');
        request.query = { handle: url.searchParams.getAll('handle').length === 1 ? url.searchParams.get('handle') : null };
        response.status = value => { response.statusCode = value; return response; };
        response.json = value => json(response.statusCode, value);
        return await (path.endsWith('/access') ? access : download)(request, response);
      }
      if (path === '/api/products' || path === '/api/get-all-products') return json(200, path.endsWith('get-all-products') ? products : { products });
      if (path.startsWith('/api/products/')) {
        const product = products.find(item => item.handle === path.split('/').pop());
        return json(product ? 200 : 404, product ? { product } : { error: 'not_found' });
      }
      if (path.startsWith('/api/collections/')) {
        const value = collections[path.split('/').pop()]; return json(value ? 200 : 404, value || { error: 'not_found' });
      }
      if (path === '/api/auth/session') return json(200, { authenticated: false });
      if (path === '/api/membership/account') return json(200, { active: false });
      if (path === '/api/commerce/config') return json(200, { individualProductsEnabled: false });
      if (path.startsWith('/api/')) return json(404, { error: 'unavailable_in_local_layout_preview' });
      if (!/^\/(?:v3|assets|fonts)\//.test(path)) return json(404, { error: 'not_found' });
      if (path.endsWith('/')) path += 'index.html';
      const target = await realpath(join(root, path));
      const publicPath = relative(root, target);
      if (!/^(?:v3|assets|fonts)\//.test(publicPath) || publicPath.split('/').some(part => part.startsWith('.')) || !mime[extname(target)]) return json(404, { error: 'not_found' });
      const data = await readFile(target);
      response.writeHead(200, { 'Content-Type': mime[extname(target)] });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { json(404, { error: 'not_found' }); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createPrintsPreviewServer();
  server.listen(Number(process.env.PRINTS_PREVIEW_PORT || 4174), '127.0.0.1', () => {
    console.log(`Local Prints preview: http://127.0.0.1:${server.address().port}/v3/prints/`);
    console.log('Read-only local snapshots. No production APIs or credentials.');
  });
}
