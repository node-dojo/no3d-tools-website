#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { WINDOWS, buildAttentionQueue, buildDailySnapshot, buildDashboard, containsPrivateIdentity, detectAttention, summarizeEvents, summarizeSubscriptions, upsertDailyJsonl } from './lib/business-dashboard.mjs';

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const notificationsDisabled = args.has('--no-notify');
const now = new Date();
const repoRoot = path.resolve(import.meta.dirname, '..');
const vaultPath = path.resolve(process.env.HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault_001');
const operationsPath = path.join(vaultPath, 'PROJECTS', 'NO3D SITE', 'Operations');
const paths = {
  dashboard: path.join(vaultPath, 'Business Dashboard.md'),
  legacyPointer: path.join(vaultPath, 'NO3D Dashboard.md'),
  attention: path.join(operationsPath, 'Business Dashboard — Attention Queue.md'),
  snapshots: path.join(operationsPath, 'snapshots', 'business-dashboard-daily.jsonl'),
  alertState: path.join(operationsPath, '.business-dashboard-alert-state.json'),
};

function health(name, status, detail) { return { name, status, detail, checkedAt: now.toISOString() }; }
function safeError(error) {
  const code = error?.code || error?.name || 'request_failed';
  return String(code).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'request_failed';
}
function atomicWrite(filename, content) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, { mode: 0o600 });
  fs.renameSync(temporary, filename);
}

async function fetchSiteData() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Supabase is not configured'), { code: 'not_configured' });
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const cutoff = new Date(now.getTime() - WINDOWS.at(-1).milliseconds).toISOString();
  const { data: subscriptions, error: subscriptionError } = await client.from('subscriptions').select('status,tier,created_at,source').order('created_at', { ascending: false });
  if (subscriptionError) throw subscriptionError;
  const events = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('site_events').select('id,event,properties,page,session_id,created_at').gte('created_at', cutoff).order('created_at', { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    events.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { subscriptions: subscriptions || [], events };
}

function aggregateStripeRows(rows, windowMs) {
  const revenueCategories = new Set(['charge', 'refund', 'dispute', 'dispute_reversal']);
  const selected = rows.filter((row) => row.created >= Math.floor((now.getTime() - windowMs) / 1000) && revenueCategories.has(row.reporting_category));
  return {
    grossCents: selected.filter((row) => row.reporting_category === 'charge').reduce((sum, row) => sum + Math.max(0, row.amount), 0),
    refundedCents: Math.abs(selected.filter((row) => row.reporting_category === 'refund').reduce((sum, row) => sum + row.amount, 0)),
    netCents: selected.reduce((sum, row) => sum + row.net, 0),
    units: selected.filter((row) => row.reporting_category === 'charge').length,
  };
}

async function fetchStripeRevenue() {
  if (!process.env.STRIPE_SECRET_KEY) return { status: 'not_configured' };
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rows = [];
    for await (const transaction of stripe.balanceTransactions.list({ created: { gte: Math.floor((now.getTime() - WINDOWS.at(-1).milliseconds) / 1000) }, limit: 100 })) rows.push(transaction);
    const currencies = [...new Set(rows.map((row) => row.currency).filter(Boolean))];
    if (currencies.length > 1) throw Object.assign(new Error('Multiple Stripe currencies require separate reporting'), { code: 'multiple_currencies' });
    return { status: 'current', currency: (currencies[0] || 'usd').toUpperCase(), windows: Object.fromEntries(WINDOWS.map((window) => [window.key, aggregateStripeRows(rows, window.milliseconds)])) };
  } catch (error) {
    return { status: 'unavailable', error: safeError(error) };
  }
}

async function gumroadSummary(window) {
  const from = new Date(now.getTime() - window.milliseconds).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const gumroadCli = process.env.GUMROAD_CLI_PATH || path.join(process.env.HOME, '.local', 'bin', 'gumroad');
  const { stdout } = await execFileAsync(gumroadCli, ['sales', 'summary', '--from', from, '--to', to, '--json', '--no-input', '--quiet'], { cwd: repoRoot, timeout: 30_000, maxBuffer: 1024 * 1024 });
  const value = JSON.parse(stdout);
  const data = value.data || value;
  if (data.success === false) throw Object.assign(new Error('Gumroad summary failed'), { code: 'gumroad_unsuccessful' });
  return { grossCents: Number(data.gross_cents), refundedCents: Number(data.refunded_cents || 0), netCents: Number(data.net_cents), units: Number(data.units || 0) };
}

async function fetchGumroadRevenue() {
  try {
    const values = await Promise.all(WINDOWS.map((window) => gumroadSummary(window)));
    return { status: 'current', currency: 'USD', windows: Object.fromEntries(WINDOWS.map((window, index) => [window.key, values[index]])) };
  } catch (error) {
    return { status: error?.code === 'ENOENT' ? 'not_configured' : 'unavailable', error: safeError(error) };
  }
}

async function checkHttpSource(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: 'follow' });
    return health(name, response.ok ? 'current' : 'unavailable', `HTTP ${response.status}`);
  } catch (error) {
    return health(name, 'unavailable', safeError(error));
  }
}

function loadAlertState() {
  try {
    const value = JSON.parse(fs.readFileSync(paths.alertState, 'utf8'));
    return { initialized: true, notified: Array.isArray(value.notified) ? value.notified : [] };
  } catch {
    return { initialized: false, notified: [] };
  }
}

async function sendNewAttentionAlerts(attention) {
  const topic = process.env.BUSINESS_DASHBOARD_NTFY_TOPIC;
  if (!topic) return { source: health('ntfy exceptions', 'not_configured', 'BUSINESS_DASHBOARD_NTFY_TOPIC is absent'), state: null, sent: 0 };
  if (notificationsDisabled) return { source: health('ntfy exceptions', 'current', 'configured; delivery skipped by --no-notify'), state: null, sent: 0 };
  const state = loadAlertState();
  const actionable = attention.filter((issue) => issue.actionable);
  const known = new Set(state.notified);
  const next = actionable.filter((issue) => !known.has(issue.id));
  const updated = [...new Set([...state.notified, ...actionable.map((issue) => issue.id)])].slice(-500);
  if (!state.initialized) return { source: health('ntfy exceptions', 'current', `configured; baselined ${actionable.length} existing finding(s)`), state: { notified: updated }, sent: 0 };
  if (!next.length) return { source: health('ntfy exceptions', 'current', 'configured; no new actionable findings'), state: { notified: updated }, sent: 0 };
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.BUSINESS_DASHBOARD_NTFY_TOKEN) headers.authorization = `Bearer ${process.env.BUSINESS_DASHBOARD_NTFY_TOKEN}`;
    const response = await fetch(process.env.BUSINESS_DASHBOARD_NTFY_BASE_URL || 'https://ntfy.sh', {
      method: 'POST', headers,
      body: JSON.stringify({ topic, title: `Business Dashboard · ${next.length} new exception${next.length === 1 ? '' : 's'}`, message: next.slice(0, 4).map((issue) => issue.summary).join('\n'), tags: ['warning'], click: 'obsidian://open?vault=Vault_001&file=PROJECTS%2FNO3D%20SITE%2FOperations%2FBusiness%20Dashboard%20%E2%80%94%20Attention%20Queue' }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw Object.assign(new Error('ntfy rejected alert'), { code: `http_${response.status}` });
    return { source: health('ntfy exceptions', 'current', `sent ${next.length} new finding(s)`), state: { notified: updated }, sent: next.length };
  } catch (error) {
    return { source: health('ntfy exceptions', 'unavailable', safeError(error)), state: null, sent: 0 };
  }
}

async function main() {
  const sourceHealth = [];
  let siteData = { subscriptions: [], events: [] };
  try {
    siteData = await fetchSiteData();
    sourceHealth.push(health('website Supabase', 'current', `${siteData.events.length} events in the 30-day window`));
  } catch (error) {
    sourceHealth.push(health('website Supabase', error?.code === 'not_configured' ? 'not_configured' : 'unavailable', safeError(error)));
  }
  const [stripe, gumroad, commerceHealth, siteHealth] = await Promise.all([fetchStripeRevenue(), fetchGumroadRevenue(), checkHttpSource('Commerce service', 'https://no3d-commerce.vercel.app/api/health'), checkHttpSource('public website', 'https://no3dtools.com/v3/')]);
  sourceHealth.push(health('Stripe account', stripe.status, stripe.status === 'current' ? 'balance activity read successfully' : stripe.error || 'configuration absent'));
  sourceHealth.push(health('Gumroad', gumroad.status, gumroad.status === 'current' ? 'sales summaries read successfully' : gumroad.error || 'configuration absent'));
  sourceHealth.push(commerceHealth, siteHealth);
  const eventSummary = summarizeEvents(siteData.events, now);
  const subscriptionSummary = summarizeSubscriptions(siteData.subscriptions);
  const attention = detectAttention(siteData.events, now);
  const alertResult = await sendNewAttentionAlerts(attention);
  sourceHealth.push(alertResult.source);
  const model = { generatedAt: now.toISOString(), events: eventSummary, subscriptions: subscriptionSummary, stripe, gumroad, health: sourceHealth, attention };
  const dashboard = buildDashboard(model);
  const attentionQueue = buildAttentionQueue(model);
  if (containsPrivateIdentity(dashboard) || containsPrivateIdentity(attentionQueue)) throw new Error('Generated Markdown failed the private-identity guard');
  if (!dryRun) {
    atomicWrite(paths.dashboard, dashboard);
    atomicWrite(paths.legacyPointer, '# Moved\n\nThe operator dashboard is now [[Business Dashboard]].\n');
    atomicWrite(paths.attention, attentionQueue);
    const snapshot = buildDailySnapshot(model);
    const existing = fs.existsSync(paths.snapshots) ? fs.readFileSync(paths.snapshots, 'utf8') : '';
    atomicWrite(paths.snapshots, upsertDailyJsonl(existing, snapshot));
    if (alertResult.state) atomicWrite(paths.alertState, `${JSON.stringify(alertResult.state, null, 2)}\n`);
  }
  console.log(JSON.stringify({ ok: true, dryRun, generatedAt: model.generatedAt, subscriptions: { paying: subscriptionSummary.paying, free: subscriptionSummary.free, active: subscriptionSummary.active }, attention: { total: attention.length, actionable: attention.filter((issue) => issue.actionable).length }, sources: Object.fromEntries(sourceHealth.map((source) => [source.name, source.status])), notificationsSent: alertResult.sent }, null, 2));
}

main().catch((error) => {
  console.error(`Business Dashboard update failed: ${safeError(error)}`);
  process.exitCode = 1;
});
