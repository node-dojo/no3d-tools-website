import { createClient } from '@supabase/supabase-js';
import { legacyDestination } from '../api/lib/legacy-routes.js';

const daysArgument = process.argv.find(argument => argument.startsWith('--days='));
const days = Math.max(1, Math.min(365, Number(daysArgument?.split('=')[1]) || 30));
const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase reporting source is not configured');

const client = createClient(url, key, { auth: { persistSession: false } });
const events = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await client
    .from('site_events')
    .select('event,properties,page,created_at')
    .eq('event', 'document_request')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .range(offset, offset + 999);
  if (error) throw error;
  events.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const rows = new Map();
for (const event of events) {
  const page = typeof event.page === 'string' ? event.page : '(missing)';
  let pathname = page;
  try { pathname = new URL(page, 'https://no3dtools.com').pathname; } catch {}
  const migrated = page !== '(missing)' ? legacyDestination(new URL(page, 'https://no3dtools.com')) : null;
  const kind = migrated ? 'redirected_legacy' : event.properties?.route_kind || 'unknown';
  const keyValue = `${kind}\u0000${pathname}`;
  const current = rows.get(keyValue) || { kind, path: pathname, requests: 0, latest: event.created_at };
  current.requests += 1;
  if (event.created_at > current.latest) current.latest = event.created_at;
  rows.set(keyValue, current);
}

const routes = [...rows.values()].sort((left, right) => right.requests - left.requests || left.path.localeCompare(right.path));
const summary = routes.reduce((result, route) => {
  result[route.kind] = (result[route.kind] || 0) + route.requests;
  return result;
}, {});
console.log(JSON.stringify({ status: 'ok', generatedAt: new Date().toISOString(), cutoff, days, totalRequests: events.length, summary, routes }, null, 2));
