import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { runAnalyticsMonitor } from '../api/lib/analytics-monitor.js';

if (!process.argv.includes('--send-test-alerts')) throw Error('Use --send-test-alerts to send four labeled source-failure/recovery notices to the configured operator topic.');
if (new URL(process.env.SUPABASE_URL).hostname !== 'eydsnjawjhahtlbzwvlo.supabase.co') throw Error('Dedicated staging database required; production health must not be changed by fault acceptance.');
const runtime = JSON.parse(fs.readFileSync(process.env.NO3D_MONITOR_ACCEPTANCE_RUNTIME || '.vercel/final-runtime.json'));
const env = { ...process.env, ...runtime };
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const started = new Date().toISOString();
const pending = await client.from('analytics_notifications').select('id', { count: 'exact', head: true }).in('status', ['pending', 'sending', 'failed', 'uncertain']);
assert.equal(pending.error, null);
assert.equal(pending.count, 0, 'Resolve pre-existing staging deliveries before controlled acceptance');
let fault = null;
const sent = [];
async function controlledFetch(input, init) {
  const url = new URL(input);
  if (url.origin === 'https://no3dtools.com' && url.pathname === '/api/track') {
    if (fault === 'collector') return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
    return fetch(`https://staging.no3dtools.com${url.pathname}`, init);
  }
  if (url.origin === 'https://api.vercel.com' && url.pathname === '/v1/query/web-analytics/visits/aggregate') {
    if (fault === 'vercel_reporting') return new Response('{}', { status: 403, headers: { 'content-type': 'application/json' } });
    return fetch(input, init);
  }
  const ntfyOrigin = new URL(env.BUSINESS_DASHBOARD_NTFY_BASE_URL || 'https://ntfy.sh').origin;
  if (url.origin === ntfyOrigin && init?.method === 'POST') {
    const payload = JSON.parse(init.body);
    assert.equal(payload.topic, env.BUSINESS_DASHBOARD_NTFY_TOPIC);
    assert.match(payload.message, /^(collector|vercel_reporting):/);
    const response = await fetch(input, { ...init, body: JSON.stringify({ ...payload, title: `TEST: ${payload.title}`, message: `Controlled staging acceptance. Production was not interrupted.\n${payload.message}` }) });
    const receipt = await response.clone().json();
    sent.push({ status: response.status, receipt: receipt.id, source: payload.message.split(':')[0], recovered: payload.title.includes('recovered') });
    return response;
  }
  throw Error('Unexpected acceptance dependency');
}
const baseline = await runAnalyticsMonitor(client, { env, fetcher: controlledFetch });
assert.ok(Object.values(baseline.sources).every(source => source.status === 'current'));
assert.equal(baseline.notifications, 0, 'Expected silent healthy baseline');
const runs = [baseline.id];
for (const source of ['collector', 'vercel_reporting']) {
  fault = source;
  const failed = await runAnalyticsMonitor(client, { env, fetcher: controlledFetch });
  assert.equal(failed.sources[source].status, 'unavailable');
  assert.equal(failed.sources[source === 'collector' ? 'vercel_reporting' : 'collector'].status, 'current');
  assert.equal(failed.notifications, 1);
  const repeated = await runAnalyticsMonitor(client, { env, fetcher: controlledFetch });
  assert.equal(repeated.notifications, 0, 'Repeated failure must not notify twice');
  fault = null;
  const recovered = await runAnalyticsMonitor(client, { env, fetcher: controlledFetch });
  assert.ok(Object.values(recovered.sources).every(value => value.status === 'current'));
  assert.equal(recovered.notifications, 1);
  runs.push(failed.id, repeated.id, recovered.id);
}
assert.equal(sent.length, 4);
assert.ok(sent.every(item => item.status === 200 && typeof item.receipt === 'string'));
const durable = await client.from('analytics_notifications').select('status,provider_receipt,attempts').gte('created_at', started);
assert.equal(durable.error, null);
assert.equal(durable.data.length, 4);
assert.ok(durable.data.every(row => row.status === 'sent' && row.attempts === 1));
assert.deepEqual(durable.data.map(row => row.provider_receipt).sort(), sent.map(row => row.receipt).sort());
console.log(JSON.stringify({ status: 'passed', database: 'dedicated staging', productionHealthUnchanged: true, runs, notifications: sent, duplicateFailureNotices: 0 }));
