import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAttentionQueue, buildDashboard, containsPrivateIdentity, detectAttention, summarizeEvents, summarizeSubscriptions, upsertDailyJsonl } from '../scripts/lib/business-dashboard.mjs';

const NOW = new Date('2026-08-27T18:00:00.000Z');
let sequence = 0;
const event = (overrides = {}) => ({ id: overrides.id || `event-${sequence++}`, event: 'page_view', properties: {}, page: '/v3/', session_id: 'raw-session-secret', created_at: '2026-08-27T17:00:00.000Z', ...overrides });

test('current V3 event vocabulary produces rolling funnel summaries', () => {
  const events = [event(), event({ event: 'page_view', page: '/v3/product?handle=dojo-calipers' }), event({ event: 'account_submit' }), event({ event: 'account_confirmation_requested' }), event({ event: 'account_confirmation_completed' }), event({ event: 'product_checkout_start' }), event({ event: 'product_checkout_redirect' }), event({ event: 'product_fulfillment_completed' }), event({ event: 'addon_downloaded' })];
  const summary = summarizeEvents(events, NOW);
  assert.deepEqual({ visits: summary['24h'].visits, products: summary['24h'].productViews, starts: summary['24h'].checkoutStarts, fulfilled: summary['24h'].fulfillments, downloads: summary['24h'].downloadsIssued }, { visits: 2, products: 1, starts: 1, fulfilled: 1, downloads: 1 });
  assert.deepEqual(summary.topProducts, [['dojo-calipers', 1]]);
});

test('attention detects failures and stalls but labels redirected outcomes as unobserved', () => {
  const attention = detectAttention([
    event({ id: 'a', event: 'product_checkout_start', created_at: '2026-08-27T15:00:00.000Z', session_id: 'stalled' }),
    event({ id: 'b', event: 'membership_checkout_redirect', created_at: '2026-08-27T14:00:00.000Z', session_id: 'redirected' }),
    event({ id: 'c', event: 'account_confirmation_requested', created_at: '2026-08-27T16:00:00.000Z', session_id: 'confirmation' }),
    event({ id: 'd', event: 'sign_in_link_failed', session_id: 'failed' }),
    event({ id: 'e', event: 'document_request', properties: { route_kind: 'unknown' }, page: '/subscribe.html', session_id: 'route' }),
    event({ id: 'f', event: 'document_request', properties: { route_kind: 'unknown' }, page: '/wp-admin/install.php', session_id: 'probe' }),
  ], NOW);
  for (const kind of ['checkout_stalled_before_redirect', 'checkout_outcome_unobserved', 'account_confirmation_stalled', 'sign_in_link_failed', 'unknown_route']) assert.ok(attention.some((issue) => issue.kind === kind));
  assert.equal(attention.find((issue) => issue.kind === 'checkout_outcome_unobserved').actionable, false);
  assert.equal(attention.some((issue) => issue.summary.includes('wp-admin')), false);
  assert.ok(attention.every((issue) => !issue.journey.includes('stalled') && !issue.journey.includes('redirected')));
});

test('generated Markdown excludes raw identities and reports unavailable sources', () => {
  const model = { generatedAt: NOW.toISOString(), events: summarizeEvents([], NOW), subscriptions: summarizeSubscriptions([{ status: 'active', tier: 'subscriber', source: 'stripe' }]), stripe: { status: 'unavailable' }, gumroad: { status: 'unavailable' }, health: [{ name: 'Stripe account', status: 'unavailable', detail: 'request_failed' }], attention: detectAttention([event({ event: 'sign_in_link_failed' })], NOW) };
  const output = `${buildDashboard(model)}\n${buildAttentionQueue(model)}`;
  assert.match(output, /Stripe net: \*\*unavailable/);
  assert.doesNotMatch(output, /raw-session-secret/);
  assert.equal(containsPrivateIdentity(output), false);
});

test('daily JSONL replaces the current date instead of appending duplicates', () => {
  const updated = upsertDailyJsonl('{"date":"2026-08-26","value":1}\n{"date":"2026-08-27","value":2}\n', { date: '2026-08-27', value: 3 });
  assert.deepEqual(updated.trim().split('\n').map(JSON.parse), [{ date: '2026-08-26', value: 1 }, { date: '2026-08-27', value: 3 }]);
});
