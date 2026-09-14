import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
export function isProductionObservation(row) {
  const p = row.properties || {};
  return p.schema_version === 2 && p.source_kind === 'browser' && p.environment === 'production' && p.synthetic === false;
}
export function collectionHealth(events, now = new Date()) {
  const views = events.filter(e => e.event === 'page_view' && isProductionObservation(e));
  const latest = views.map(e => e.created_at).sort().at(-1);
  return { name: 'browser collection freshness', status: latest && now - new Date(latest) < 86400000 ? 'current' : 'stale',
    detail: latest ? `Last production browser page view: ${latest}. Counts are observations; coverage before repair is incomplete.` : 'No production v2 page views observed. Historical browser coverage is incomplete; zero is not verified audience size.' };
}
export async function probeCollector(client, origin = 'https://no3dtools.com', fetcher = fetch) {
  const eventId = crypto.randomUUID();
  const started = new Date().toISOString();
  const health = { name: 'analytics ingestion/read-back', checkedAt: started };
  if (!client) return { ...health, status: 'not_configured', detail: 'Read-back credentials unavailable' };
  try {
    const response = await fetcher(`${origin}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view', event_id: eventId, session_id: crypto.randomUUID(), page: '/v3/', synthetic: true, properties: { source: 'health_probe' } }), signal: AbortSignal.timeout(12000) });
    if (!response.ok || response.status === 204) throw new Error(`http_${response.status}`);
    const { data, error } = await client.from('site_events').select('id').eq('properties->>event_id', eventId).eq('properties->>synthetic', 'true').gte('created_at', started).limit(2);
    if (error || data?.length !== 1) throw new Error('read_back_failed');
    return { ...health, status: 'current', detail: 'Synthetic HTTP ingestion and database read-back passed; excluded from business counts. Browser execution is verified separately.' };
  } catch (error) {
    return { ...health, status: 'unavailable', detail: /^http_\d+$/.test(error.message) ? error.message : 'ingestion_or_read_back_failed' };
  }
}
function readLocalVercelAuth() {
  try { return JSON.parse(fs.readFileSync(path.join(process.env.HOME, 'Library/Application Support/com.vercel.cli/auth.json'), 'utf8')); } catch { return {}; }
}
export async function localVercelToken({ env = process.env, readAuth = readLocalVercelAuth,
  refresh = async () => {
    const executable = fs.existsSync('/opt/homebrew/bin/vercel') ? '/opt/homebrew/bin/vercel' : 'vercel';
    // Let the owning CLI refresh and persist rotating OAuth credentials. Never implement
    // a second refresh-token writer, print credentials, or prompt during a scheduled job.
    await promisify(execFile)(executable, ['whoami'], { timeout: 15000, env: { ...process.env, CI: '1' }, maxBuffer: 65536 });
  }, now = Date.now() } = {}) {
  if (env.VERCEL_ANALYTICS_TOKEN || env.VERCEL_TOKEN) return env.VERCEL_ANALYTICS_TOKEN || env.VERCEL_TOKEN;
  let auth = readAuth();
  if (!auth.token) return null;
  if (Number.isFinite(auth.expiresAt) && auth.expiresAt * 1000 <= now) {
    if (!auth.refreshToken) return null;
    try { await refresh(); auth = readAuth(); } catch { return null; }
    if (!auth.token || (Number.isFinite(auth.expiresAt) && auth.expiresAt * 1000 <= Date.now())) return null;
  }
  return auth.token;
}
export async function fetchVercelAnalytics({ token, projectId, teamId, windows, now = new Date(), fetcher = fetch }) {
  if (!token || !projectId) return { status: 'not_configured', windows: {}, detail: 'Vercel reporting credentials/project absent' };
  try {
    const rows = await Promise.all(windows.map(async w => {
      const url = new URL('https://api.vercel.com/v1/query/web-analytics/visits/aggregate');
      url.search = new URLSearchParams({ projectId, teamId, since: new Date(now - w.milliseconds).toISOString(), until: now.toISOString(), by: 'environment', filter: "environment eq 'production'" });
      const r = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`http_${r.status}`);
      const body = await r.json();
      if (!Array.isArray(body.data) || body.query?.groupBy?.[0] !== 'environment' || body.query?.filter !== "environment eq 'production'") throw new Error('invalid_response');
      const result = body.data.find(x => x.environment === 'production');
      if (result && (!Number.isFinite(result.visitors) || !Number.isFinite(result.pageviews))) throw new Error('invalid_response');
      return [w.key, { visitors: result?.visitors || 0, pageviews: result?.pageviews || 0, since: body.query.since, until: body.query.until }];
    }));
    return { status: 'current', windows: Object.fromEntries(rows), detail: 'Production aggregates read through Vercel API. Historical V3 coverage is incomplete.' };
  } catch (error) { return { status: 'unavailable', windows: {}, detail: /^http_\d+$/.test(error.message) ? error.message : 'reporting_failed' }; }
}
