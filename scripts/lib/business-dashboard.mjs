import { createHash } from 'node:crypto';

export const WINDOWS = [
  { key: '24h', label: '24 hours', milliseconds: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7 days', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30 days', milliseconds: 30 * 24 * 60 * 60 * 1000 },
];

const EVENT_ALIASES = {
  visits: new Set(['page_view']),
  accountStarts: new Set(['account_start', 'account_submit']),
  confirmationsRequested: new Set(['account_confirmation_requested']),
  accountsCompleted: new Set(['account_authenticated', 'account_confirmation_completed']),
  checkoutStarts: new Set(['product_checkout_start', 'membership_checkout_start', 'checkout_start']),
  checkoutRedirects: new Set(['product_checkout_redirect', 'membership_checkout_redirect']),
  checkoutFailures: new Set(['product_checkout_failed', 'membership_checkout_failed']),
  fulfillments: new Set(['product_fulfillment_completed', 'membership_fulfillment_completed', 'checkout_complete']),
  downloads: new Set(['addon_downloaded']),
};

const FAILURE_EVENTS = new Set(['account_submit_failed', 'sign_in_link_failed', 'product_checkout_failed', 'membership_checkout_failed']);
const MODERN_CHECKOUT_START_EVENTS = new Set(['product_checkout_start', 'membership_checkout_start']);

function at(event) { return new Date(event.created_at).getTime(); }
function inWindow(event, nowMs, milliseconds) {
  const value = at(event);
  return Number.isFinite(value) && value >= nowMs - milliseconds && value <= nowMs + 60_000;
}
function count(events, names) { return events.reduce((total, event) => total + (names.has(event.event) ? 1 : 0), 0); }
function pageIsProduct(page = '') { return /^\/v3\/product(?:\/|\?|$)/.test(page) || /^\/product(?:\/|\?|$)/.test(page); }
function productHandle(event) {
  if (typeof event.properties?.handle === 'string') return event.properties.handle;
  if (typeof event.properties?.product_handle === 'string') return event.properties.product_handle;
  try { return new URL(event.page || '/', 'https://no3dtools.com').searchParams.get('handle'); } catch { return null; }
}

export function summarizeEvents(events, now = new Date()) {
  const nowMs = now.getTime();
  const result = {};
  for (const window of WINDOWS) {
    const rows = events.filter((event) => inWindow(event, nowMs, window.milliseconds));
    result[window.key] = {
      visits: count(rows, EVENT_ALIASES.visits),
      visitors: new Set(rows.map((event) => event.session_id).filter(Boolean)).size,
      productViews: rows.filter((event) => event.event === 'product_view' || (event.event === 'page_view' && pageIsProduct(event.page))).length,
      accountStarts: count(rows, EVENT_ALIASES.accountStarts),
      confirmationsRequested: count(rows, EVENT_ALIASES.confirmationsRequested),
      accountsCompleted: count(rows, EVENT_ALIASES.accountsCompleted),
      checkoutStarts: count(rows, EVENT_ALIASES.checkoutStarts),
      checkoutRedirects: count(rows, EVENT_ALIASES.checkoutRedirects),
      checkoutFailures: count(rows, EVENT_ALIASES.checkoutFailures),
      fulfillments: count(rows, EVENT_ALIASES.fulfillments),
      downloadsIssued: count(rows, EVENT_ALIASES.downloads),
    };
  }
  const productCounts = new Map();
  for (const event of events.filter((row) => inWindow(row, nowMs, WINDOWS[1].milliseconds))) {
    if (event.event !== 'product_view' && !(event.event === 'page_view' && pageIsProduct(event.page))) continue;
    const handle = productHandle(event);
    if (handle) productCounts.set(handle, (productCounts.get(handle) || 0) + 1);
  }
  result.topProducts = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return result;
}

function journeyLabel(sessionId) {
  if (!sessionId) return 'unknown journey';
  return `journey ${createHash('sha256').update(sessionId).digest('hex').slice(0, 8)}`;
}
function issueId(kind, event) {
  return createHash('sha256').update([kind, event.id || '', event.session_id || '', event.created_at || ''].join(':')).digest('hex').slice(0, 20);
}
function hasAfter(rows, eventNames, timestamp) { return rows.some((row) => eventNames.has(row.event) && at(row) >= timestamp); }
function ignoredUnknownRoute(page = '') {
  return /^\/(?:wp-admin|wp-login|\.env|\.git|xmlrpc\.php|_analytics-route-verification-)/i.test(page);
}

export function detectAttention(events, now = new Date()) {
  const nowMs = now.getTime();
  const recent = events.filter((event) => inWindow(event, nowMs, 7 * 24 * 60 * 60 * 1000));
  const bySession = new Map();
  for (const event of recent) {
    if (!event.session_id) continue;
    const rows = bySession.get(event.session_id) || [];
    rows.push(event);
    bySession.set(event.session_id, rows);
  }
  for (const rows of bySession.values()) rows.sort((a, b) => at(a) - at(b));
  const issues = [];
  for (const event of recent) {
    if (FAILURE_EVENTS.has(event.event)) issues.push({ id: issueId(event.event, event), severity: 'warning', kind: event.event, occurredAt: event.created_at, journey: journeyLabel(event.session_id), summary: event.event.replaceAll('_', ' '), actionable: true });
    if (event.event === 'document_request' && event.properties?.route_kind === 'unknown' && !ignoredUnknownRoute(event.page)) issues.push({ id: issueId('unknown_route', event), severity: 'warning', kind: 'unknown_route', occurredAt: event.created_at, journey: journeyLabel(event.session_id), summary: `unknown route requested: ${event.page || '(path unavailable)'}`, actionable: true });
  }
  for (const [sessionId, rows] of bySession) {
    for (const event of rows) {
      const eventTime = at(event);
      if (MODERN_CHECKOUT_START_EVENTS.has(event.event) && nowMs - eventTime >= 10 * 60 * 1000 && !hasAfter(rows, new Set([...EVENT_ALIASES.checkoutRedirects, ...EVENT_ALIASES.checkoutFailures]), eventTime)) {
        issues.push({ id: issueId('checkout_stalled_before_redirect', event), severity: 'warning', kind: 'checkout_stalled_before_redirect', occurredAt: event.created_at, journey: journeyLabel(sessionId), summary: 'checkout started but no redirect or failure was observed within 10 minutes', actionable: true });
      }
      if (EVENT_ALIASES.checkoutRedirects.has(event.event) && nowMs - eventTime >= 2 * 60 * 60 * 1000 && !hasAfter(rows, EVENT_ALIASES.fulfillments, eventTime)) {
        issues.push({ id: issueId('checkout_outcome_unobserved', event), severity: 'info', kind: 'checkout_outcome_unobserved', occurredAt: event.created_at, journey: journeyLabel(sessionId), summary: 'checkout redirected, but this journey has no observed fulfillment return', actionable: false });
      }
      if (event.event === 'account_confirmation_requested' && nowMs - eventTime >= 60 * 60 * 1000 && !hasAfter(rows, EVENT_ALIASES.accountsCompleted, eventTime)) {
        issues.push({ id: issueId('account_confirmation_stalled', event), severity: 'warning', kind: 'account_confirmation_stalled', occurredAt: event.created_at, journey: journeyLabel(sessionId), summary: 'confirmation requested, but no authenticated completion was observed within one hour', actionable: true });
      }
    }
  }
  return [...new Map(issues.map((issue) => [issue.id, issue])).values()].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
}

export function summarizeSubscriptions(rows = []) {
  const active = rows.filter((row) => row.status === 'active');
  return {
    active: active.length,
    paying: active.filter((row) => row.tier === 'subscriber').length,
    free: active.filter((row) => row.tier === 'free').length,
    allRecords: rows.length,
    bySource: Object.entries(active.reduce((acc, row) => { const source = row.source || 'unknown'; acc[source] = (acc[source] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]),
  };
}

export function formatMoney(cents, currency = 'USD') {
  if (!Number.isFinite(cents)) return 'unavailable';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}
function healthIcon(status) { return ({ current: 'OK', stale: 'STALE', unavailable: 'DOWN', not_configured: 'SETUP' })[status] || '?'; }
function ratio(numerator, denominator) { return denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—'; }
function revenueCell(source, key, field = 'netCents') { return source?.status === 'current' ? formatMoney(source.windows?.[key]?.[field], source.currency || 'USD') : 'unavailable'; }

export function buildDashboard({ generatedAt, events, subscriptions, stripe, gumroad, health, attention }) {
  const generated = new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const actionable = attention.filter((issue) => issue.actionable);
  const observations = attention.filter((issue) => !issue.actionable);
  const lines = [
    '# Business Dashboard', '',
    `> Last refreshed ${generated}. ${actionable.length ? `**${actionable.length} item${actionable.length === 1 ? '' : 's'} need attention.**` : 'No actionable journey exceptions are currently visible.'}`,
    '', '## Current business state', '',
    `- Website subscriptions: **${subscriptions.paying} paying** · ${subscriptions.free} free · ${subscriptions.active} active`,
    `- Stripe net: **${revenueCell(stripe, '30d')} / 30d** · ${revenueCell(stripe, '7d')} / 7d · ${revenueCell(stripe, '24h')} / 24h`,
    `- Gumroad net: **${revenueCell(gumroad, '30d')} / 30d** · ${revenueCell(gumroad, '7d')} / 7d · ${revenueCell(gumroad, '24h')} / 24h`,
    '', '> Revenue sources remain separate. Stripe is account-level balance activity; Gumroad is platform-level sales activity. Neither is silently attributed to a specific site or product.',
    '', '## Customer journey', '',
    '| Window | Visits | Visitors | Product views | Account starts | Accounts completed | Checkout starts | Redirected | Fulfilled | Downloads issued |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const window of WINDOWS) {
    const row = events[window.key];
    lines.push(`| ${window.label} | ${row.visits} | ${row.visitors} | ${row.productViews} | ${row.accountStarts} | ${row.accountsCompleted} | ${row.checkoutStarts} | ${row.checkoutRedirects} | ${row.fulfillments} | ${row.downloadsIssued} |`);
  }
  lines.push('', '## Conversion signals', '');
  for (const window of WINDOWS) {
    const row = events[window.key];
    lines.push(`- ${window.label}: visit → checkout ${ratio(row.checkoutStarts, row.visits)} · checkout → observed fulfillment ${ratio(row.fulfillments, row.checkoutStarts)} · confirmation requested → completed ${ratio(row.accountsCompleted, row.confirmationsRequested)}`);
  }
  if (events.topProducts.length) {
    lines.push('', '## Most viewed products · 7 days', '');
    for (const [handle, views] of events.topProducts) lines.push(`- ${handle}: ${views}`);
  }
  lines.push('', '## Attention', '');
  if (!actionable.length && !observations.length) lines.push('- No current findings.');
  if (actionable.length) lines.push(`- [[Business Dashboard — Attention Queue|Open ${actionable.length} actionable finding${actionable.length === 1 ? '' : 's'}]]`);
  if (observations.length) lines.push(`- ${observations.length} non-actionable observation${observations.length === 1 ? '' : 's'} remain visible; these are not counted as verified failures or intentional abandonment.`);
  lines.push('', '## Source health', '', '| Source | State | Detail |', '|---|---|---|');
  for (const source of health) lines.push(`| ${source.name} | ${healthIcon(source.status)} · ${source.status.replace('_', ' ')} | ${source.detail || '—'} |`);
  lines.push('', '## Operations', '', '- [[Business Dashboard — Attention Queue]]', '- [[PROJECTS/NO3D SITE/Operations/Business Dashboard — Build Plan|Build plan and acceptance]]', '- Daily aggregate history: `PROJECTS/NO3D SITE/Operations/snapshots/business-dashboard-daily.jsonl`', '- Manual refresh: `doppler run -- npm run dashboard:business`', '', '_Generated projection. Edit the build plan, not this file._', '');
  return lines.join('\n');
}

export function buildAttentionQueue({ generatedAt, attention }) {
  const lines = ['# Business Dashboard — Attention Queue', '', `Generated ${new Date(generatedAt).toISOString()}. Journey labels are one-way hashes; raw identifiers and customer identities are not written here.`, ''];
  if (!attention.length) return `${lines.join('\n')}No current findings.\n`;
  for (const issue of attention) lines.push(`## ${issue.severity.toUpperCase()} · ${issue.summary}`, '', `- Observed: ${issue.occurredAt}`, `- ${issue.journey}`, `- Classification: ${issue.actionable ? 'actionable exception' : 'outcome unobserved; not a verified failure'}`, '');
  lines.push('_Generated projection. Findings expire naturally as the seven-day observation window advances._', '');
  return lines.join('\n');
}

export function buildDailySnapshot({ generatedAt, events, subscriptions, stripe, gumroad, health, attention }) {
  return {
    date: new Date(generatedAt).toISOString().slice(0, 10), generated_at: new Date(generatedAt).toISOString(), subscriptions,
    journey: Object.fromEntries(WINDOWS.map((window) => [window.key, events[window.key]])),
    revenue: { stripe: stripe.status === 'current' ? { currency: stripe.currency, windows: stripe.windows } : { status: stripe.status }, gumroad: gumroad.status === 'current' ? { currency: gumroad.currency, windows: gumroad.windows } : { status: gumroad.status } },
    attention: { actionable: attention.filter((issue) => issue.actionable).length, outcome_unobserved: attention.filter((issue) => !issue.actionable).length, by_kind: Object.fromEntries(Object.entries(attention.reduce((acc, issue) => { acc[issue.kind] = (acc[issue.kind] || 0) + 1; return acc; }, {})).sort()) },
    source_health: Object.fromEntries(health.map((source) => [source.name, source.status])),
  };
}

export function upsertDailyJsonl(existing, snapshot) {
  const rows = existing.trim() ? existing.trim().split('\n').map((line) => JSON.parse(line)) : [];
  const next = rows.filter((row) => row.date !== snapshot.date);
  next.push(snapshot);
  next.sort((a, b) => a.date.localeCompare(b.date));
  return `${next.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

export function containsPrivateIdentity(text) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) || /session[_ -]?id/i.test(text);
}
