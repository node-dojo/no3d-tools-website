#!/usr/bin/env node

/**
 * Update Obsidian Dashboard Files
 *
 * Queries Supabase for subscriber counts and site analytics,
 * writes clean markdown files to the Obsidian vault for
 * at-a-glance reference (phone home screen widget).
 *
 * Usage:
 *   doppler run -- node scripts/update-obsidian-dashboard.mjs
 *
 * Designed to run on a schedule (cron/launchd) every few hours.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const VAULT_PATH = path.resolve(
  process.env.HOME,
  'Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault_001'
);

const DASHBOARD_FILE = path.join(VAULT_PATH, 'NO3D Dashboard.md');
const LOG_FILE = path.join(VAULT_PATH, 'DIGITAL PRODUCT', 'no3d-metrics-log.md');

const PRICE_MONTHLY = 17.00; // Target price after migration
const PRICE_CURRENT = 11.11; // Current Gumroad migration price
const GOAL_MONTHLY = 10000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getMetrics() {
  // Subscriber counts
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status, tier, created_at, source')
    .order('created_at', { ascending: false });

  const active = (subs || []).filter(s => s.status === 'active');
  const paying = active.filter(s => s.tier === 'subscriber');
  const free = active.filter(s => s.tier === 'free');

  // Site events from last 24h and 7d
  const now = new Date();
  const day_ago = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const week_ago = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events24h } = await supabase
    .from('site_events')
    .select('event')
    .gte('created_at', day_ago);

  const { data: events7d } = await supabase
    .from('site_events')
    .select('event')
    .gte('created_at', week_ago);

  const countEvents = (events, name) => (events || []).filter(e => e.event === name).length;

  // Product view counts (last 7d)
  const { data: productViews7d } = await supabase
    .from('site_events')
    .select('properties')
    .eq('event', 'product_view')
    .gte('created_at', week_ago);

  const productCounts = {};
  for (const ev of (productViews7d || [])) {
    const handle = ev.properties?.product_handle;
    if (handle) productCounts[handle] = (productCounts[handle] || 0) + 1;
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    paying: paying.length,
    free: free.length,
    total: active.length,
    allTime: (subs || []).length,
    latestSub: paying.length > 0 ? paying[0].created_at : null,
    mrr_current: paying.length * PRICE_CURRENT,
    mrr_target: paying.length * PRICE_MONTHLY,
    goal_pct_current: ((paying.length * PRICE_CURRENT) / GOAL_MONTHLY * 100).toFixed(1),
    goal_pct_target: ((paying.length * PRICE_MONTHLY) / GOAL_MONTHLY * 100).toFixed(1),
    subs_needed_current: Math.ceil((GOAL_MONTHLY - paying.length * PRICE_CURRENT) / PRICE_CURRENT),
    subs_needed_target: Math.ceil((GOAL_MONTHLY - paying.length * PRICE_MONTHLY) / PRICE_MONTHLY),
    events_24h: {
      page_views: countEvents(events24h, 'page_view'),
      product_views: countEvents(events24h, 'product_view'),
      checkout_starts: countEvents(events24h, 'checkout_start'),
      downloads: countEvents(events24h, 'download_modal_open'),
      signups: countEvents(events24h, 'free_account_created'),
      searches: countEvents(events24h, 'search'),
    },
    events_7d: {
      page_views: countEvents(events7d, 'page_view'),
      product_views: countEvents(events7d, 'product_view'),
      checkout_starts: countEvents(events7d, 'checkout_start'),
      downloads: countEvents(events7d, 'download_modal_open'),
      signups: countEvents(events7d, 'free_account_created'),
      searches: countEvents(events7d, 'search'),
    },
    topProducts,
  };
}

function buildDashboard(m) {
  const updated = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  // This is the phone home screen doc — big numbers, minimal noise
  return `# ${m.paying}

## paying subscribers

**$${m.mrr_current.toFixed(0)}**/mo → **$${m.mrr_target.toFixed(0)}**/mo at $17

${m.goal_pct_current}% to $10k goal

${m.subs_needed_target} more subs needed at $17/mo

---

${m.free} free tier · ${m.total} total active

---

Last 24h: ${m.events_24h.page_views} visits · ${m.events_24h.product_views} product views · ${m.events_24h.checkout_starts} checkout starts

Last 7d: ${m.events_7d.page_views} visits · ${m.events_7d.product_views} product views · ${m.events_7d.checkout_starts} checkout starts

---

*Updated ${updated}*
`;
}

function buildLogEntry(m) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return `| ${date} | ${time} | ${m.paying} | ${m.free} | $${m.mrr_current.toFixed(0)} | ${m.events_7d.page_views} | ${m.events_7d.product_views} | ${m.events_7d.checkout_starts} | ${m.events_7d.signups} |`;
}

function appendLog(m) {
  const header = `# NO3D Metrics Log

| Date | Time | Paying | Free | MRR | Visits (7d) | Product Views (7d) | Checkouts (7d) | Signups (7d) |
|------|------|--------|------|-----|-------------|-------------------|----------------|-------------|
`;

  const entry = buildLogEntry(m);

  if (!fs.existsSync(LOG_FILE)) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, header + entry + '\n');
    console.log(`[created] ${LOG_FILE}`);
    return;
  }

  const existing = fs.readFileSync(LOG_FILE, 'utf-8');
  // Append new row
  fs.writeFileSync(LOG_FILE, existing.trimEnd() + '\n' + entry + '\n');
  console.log(`[appended] ${LOG_FILE}`);
}

async function main() {
  console.log('Querying Supabase...');
  const metrics = await getMetrics();

  // Write phone dashboard
  fs.writeFileSync(DASHBOARD_FILE, buildDashboard(metrics));
  console.log(`[ok] Dashboard: ${DASHBOARD_FILE}`);
  console.log(`     ${metrics.paying} paying · $${metrics.mrr_current.toFixed(0)}/mo · ${metrics.goal_pct_current}% to goal`);

  // Append to metrics log
  appendLog(metrics);

  // Top products this week
  if (metrics.topProducts.length > 0) {
    console.log('     Top products (7d):');
    for (const [handle, count] of metrics.topProducts) {
      console.log(`       ${handle}: ${count} views`);
    }
  }
}

main().catch(err => {
  console.error('Dashboard update failed:', err.message);
  process.exit(1);
});
