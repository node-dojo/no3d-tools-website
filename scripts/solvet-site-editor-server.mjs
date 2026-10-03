#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const websiteRoot = resolve(new URL('..', import.meta.url).pathname);
const solvetRoot = resolve(process.env.SOLVET_GLOBAL_ROOT || '/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global');
const catalogRoot = resolve(process.env.SOLVET_CATALOG_ROOT || join(solvetRoot, 'no3d-tools-library/library'));
const port = Number(process.env.SOLVET_SITE_EDITOR_PORT || 4317);
const host = process.env.SOLVET_SITE_EDITOR_HOST || '127.0.0.1';
const upstream = String(process.env.SOLVET_SITE_EDITOR_UPSTREAM || 'https://no3dtools.com').replace(/\/$/, '');
const readbackOrigin = String(process.env.SOLVET_SITE_EDITOR_READBACK_ORIGIN || upstream).replace(/\/$/, '');
const capability = randomBytes(32).toString('hex');
const plans = new Map();

const contentOperations = await import(pathToFileURL(join(solvetRoot, 'solvet/site-editor-content.js')).href);

function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(`${JSON.stringify(value)}\n`);
}

function errorJson(res, error) {
  const code = error?.code || 'site_editor_error';
  const status = code === 'stale_source_revision' || code === 'reviewed_plan_mismatch' ? 409
    : code === 'product_description_not_found' ? 404
      : code === 'publish_not_enabled' ? 409
        : 400;
  json(res, status, { error: code, message: error?.message || 'Site Editor operation failed.' });
}

function cookie(req, name) {
  return String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

function authorized(req) {
  const site = String(req.headers['sec-fetch-site'] || 'same-origin');
  return cookie(req, 'solvet_site_editor_capability') === capability && ['same-origin', 'none'].includes(site);
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw Object.assign(new Error('Request body is too large.'), { code: 'request_too_large' });
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('Request body must be JSON.'), { code: 'invalid_json' }); }
}

async function editorApi(req, res, url) {
  if (!authorized(req)) return json(res, 403, { error: 'site_editor_not_authorized' });
  const prefix = '/__solvet-site-editor';
  const path = url.pathname.slice(prefix.length) || '/';
  try {
    if (req.method === 'GET' && path === '/session') {
      return json(res, 200, {
        schema_version: 'solvet.site-editor-session/v0.1',
        available: true,
        mode: 'content',
        capabilities: {
          inspect: true,
          apply: true,
          publish: process.env.SOLVET_SITE_EDITOR_ALLOW_PUBLISH === '1',
        },
      });
    }
    const productMatch = path.match(/^\/products\/([a-z0-9][a-z0-9-]{0,127})$/i);
    if (req.method === 'GET' && productMatch) {
      return json(res, 200, await contentOperations.inspectSiteEditorProduct(catalogRoot, productMatch[1]));
    }
    if (req.method === 'POST' && path === '/operations/plan') {
      const input = await body(req);
      const plan = await contentOperations.planSiteEditorContent(catalogRoot, {
        handle: input.handle,
        descriptionIntro: input.descriptionIntro,
        sourceRevision: input.sourceRevision,
      });
      plans.set(plan.plan_id, plan);
      return json(res, 200, plan);
    }
    if (req.method === 'POST' && path === '/operations/apply') {
      const input = await body(req);
      const plan = plans.get(input.planId);
      if (!plan) throw Object.assign(new Error('The reviewed plan is unavailable or expired.'), { code: 'reviewed_plan_required' });
      const receipt = await contentOperations.applySiteEditorContent(catalogRoot, plan, { commit: true });
      plans.delete(input.planId);
      return json(res, 200, receipt);
    }
    if (req.method === 'POST' && path === '/media/plan') {
      const input = await body(req);
      const plan = await contentOperations.planSiteEditorThumbnail(catalogRoot, {
        handle: input.handle,
        thumbnailMediaId: input.thumbnailMediaId,
        mediaRevision: input.mediaRevision,
      });
      plans.set(plan.plan_id, plan);
      return json(res, 200, plan);
    }
    if (req.method === 'POST' && path === '/media/apply') {
      const input = await body(req);
      const plan = plans.get(input.planId);
      if (!plan) throw Object.assign(new Error('The reviewed media plan is unavailable or expired.'), { code: 'reviewed_plan_required' });
      const receipt = await contentOperations.applySiteEditorThumbnail(catalogRoot, plan, { commit: true });
      plans.delete(input.planId);
      return json(res, 200, receipt);
    }
    if (req.method === 'POST' && path === '/publish') {
      if (process.env.SOLVET_SITE_EDITOR_ALLOW_PUBLISH !== '1') throw Object.assign(new Error('Restart the local utility with publication explicitly enabled.'), { code: 'publish_not_enabled' });
      const input = await body(req);
      const inspected = await contentOperations.inspectSiteEditorProduct(catalogRoot, input.handle);
      const entry = join(catalogRoot, inspected.source.entry);
      const publishExecutable = process.env.SOLVET_SITE_EDITOR_PUBLISH_EXECUTABLE || 'doppler';
      const publishArguments = process.env.SOLVET_SITE_EDITOR_PUBLISH_ARGUMENTS
        ? JSON.parse(process.env.SOLVET_SITE_EDITOR_PUBLISH_ARGUMENTS)
        : ['run', '--', process.execPath, 'scripts/sync-product-to-supabase.js', entry];
      if (!Array.isArray(publishArguments) || publishArguments.some(value => typeof value !== 'string')) throw Object.assign(new Error('Publication arguments must be a JSON string array.'), { code: 'publisher_configuration_invalid' });
      const result = await exec(publishExecutable, publishArguments, { cwd: solvetRoot, maxBuffer: 2 * 1024 * 1024 });
      const response = await fetch(`${readbackOrigin}/api/products/${encodeURIComponent(input.handle)}?site_editor_revision=${encodeURIComponent(inspected.source_revision)}`, { headers: { 'Cache-Control': 'no-cache' } });
      const payload = await response.json().catch(() => ({}));
      const projectedIntro = String(payload?.product?.description || '')
        .replace(/^---[\s\S]*?---\s*/, '')
        .replace(/^#{1,6}\s+description\s*\n+/i, '')
        .trim()
        .split(/\n\s*\n/)[0]?.trim() || '';
      const projectedThumbnail = payload?.product?.thumbnail_media_id || null;
      if (!response.ok || projectedIntro !== inspected.description_intro || projectedThumbnail !== inspected.media.thumbnail_media_id) throw Object.assign(new Error('Published product read-back did not match canonical source.'), { code: 'publication_verification_failed' });
      return json(res, 200, {
        schema_version: 'solvet.site-editor-publication/v0.1',
        status: 'verified',
        handle: input.handle,
        source_revision: inspected.source_revision,
        verification: [
          { code: 'public_product_description_readback', status: 'passed' },
          { code: 'public_product_thumbnail_media_readback', status: 'passed' },
        ],
        publisher_exit: result.stderr ? 'completed_with_diagnostics' : 'completed',
      });
    }
    return json(res, 404, { error: 'site_editor_endpoint_not_found' });
  } catch (error) {
    return errorJson(res, error);
  }
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'], ['.woff2', 'font/woff2'], ['.woff', 'font/woff'], ['.ttf', 'font/ttf'], ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
]);

function localPath(pathname) {
  const route = pathname === '/v3/product' || pathname === '/v3/product/' ? '/v3/product/index.html'
    : pathname === '/v3' || pathname === '/v3/' ? '/v3/index.html'
      : pathname;
  const decoded = decodeURIComponent(route);
  const target = resolve(websiteRoot, `.${normalize(decoded)}`);
  const rel = relative(websiteRoot, target);
  if (rel.startsWith(`..${sep}`) || rel === '..') return null;
  return target;
}

async function serveLocal(req, res, url) {
  const target = localPath(url.pathname);
  if (!target) return json(res, 400, { error: 'unsafe_path' });
  const info = await lstat(target).catch(() => null);
  if (!info?.isFile()) return false;
  const headers = {
    'Content-Type': mime.get(extname(target).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Set-Cookie': `solvet_site_editor_capability=${capability}; HttpOnly; SameSite=Strict; Path=/`,
  };
  res.writeHead(200, headers);
  createReadStream(target).pipe(res);
  return true;
}

async function proxy(req, res, url) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (!['host', 'cookie', 'content-length', 'connection'].includes(name) && value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const requestBody = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(await Array.fromAsync(req));
  const response = await fetch(`${upstream}${url.pathname}${url.search}`, { method: req.method, headers, body: requestBody, redirect: 'manual' });
  const responseHeaders = Object.fromEntries(response.headers.entries());
  delete responseHeaders['content-encoding'];
  delete responseHeaders['content-length'];
  responseHeaders['cache-control'] = 'no-store';
  res.writeHead(response.status, responseHeaders);
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
  try {
    if (url.pathname.startsWith('/__solvet-site-editor')) return await editorApi(req, res, url);
    if (req.method === 'GET' && await serveLocal(req, res, url)) return;
    return await proxy(req, res, url);
  } catch (error) {
    return errorJson(res, error);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Solvet Site Editor: http://${host}:${port}/v3/product/?handle=chrome-crayon&edit=1\n`);
});
