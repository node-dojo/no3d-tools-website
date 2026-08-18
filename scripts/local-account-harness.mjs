import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authCallback from '../api/auth/callback.js';
import authClaim from '../api/auth/claim.js';
import authLogout from '../api/auth/logout.js';
import authRequestLink from '../api/auth/request-link.js';
import authRecoveryLink from '../api/auth/recovery-link.js';
import authSession from '../api/auth/session.js';
import approveDevice from '../api/addon/connect/approve.js';
import exchangeDevice from '../api/addon/connect/exchange.js';
import refreshDevice from '../api/addon/connect/refresh.js';
import startDevice from '../api/addon/connect/start.js';
import commerceAccount from '../api/commerce/account.js';
import commerceCheckout from '../api/commerce/checkout.js';
import downloadProduct from '../api/download/[handle].js';
import manifest from '../api/manifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3004);
const routes = new Map([
  ['/api/auth/callback', authCallback],
  ['/api/auth/claim', authClaim],
  ['/api/auth/logout', authLogout],
  ['/api/auth/request-link', authRequestLink],
  ['/api/auth/recovery-link', authRecoveryLink],
  ['/api/auth/session', authSession],
  ['/api/addon/connect/approve', approveDevice],
  ['/api/addon/connect/exchange', exchangeDevice],
  ['/api/addon/connect/refresh', refreshDevice],
  ['/api/addon/connect/start', startDevice],
  ['/api/commerce/account', commerceAccount],
  ['/api/commerce/checkout', commerceCheckout],
  ['/api/manifest', manifest],
]);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.woff2', 'font/woff2'],
]);

function decorateResponse(response) {
  response.status = (status) => { response.statusCode = status; return response; };
  response.json = (body) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body));
  };
  response.send = (body) => {
    response.end(body);
  };
  response.redirect = (status, location) => {
    response.statusCode = status;
    response.setHeader('Location', location);
    response.end();
  };
}

async function readBody(request) {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method || '')) return;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  request.body = raw ? JSON.parse(raw) : {};
}

async function serveFile(response, pathname) {
  const requested = pathname === '/account' || pathname === '/' || /^\/account\/orders\/[0-9a-f-]{36}\/?$/i.test(pathname)
    ? '/account.html'
    : pathname;
  const resolved = path.resolve(root, `.${requested}`);
  if (!resolved.startsWith(`${root}${path.sep}`)) return false;
  try {
    const data = await fs.readFile(resolved);
    response.setHeader('Content-Type', contentTypes.get(path.extname(resolved)) || 'application/octet-stream');
    response.end(data);
    return true;
  } catch {
    return false;
  }
}

http.createServer(async (request, response) => {
  decorateResponse(response);
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  request.query = Object.fromEntries(url.searchParams.entries());
  const downloadMatch = url.pathname.match(/^\/api\/download\/([a-z0-9][a-z0-9-]{1,100})$/);
  if (downloadMatch) request.query.handle = downloadMatch[1];
  const handler = downloadMatch ? downloadProduct : routes.get(url.pathname);
  try {
    if (handler) {
      await readBody(request);
      await handler(request, response);
      return;
    }
    if (await serveFile(response, url.pathname)) return;
    response.statusCode = 404;
    response.end('Not found');
  } catch (error) {
    console.error('Website account harness route failed', error);
    if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'internal_error' }));
  }
}).listen(port, '127.0.0.1', () => console.log(`Website account harness listening on ${port}`));
