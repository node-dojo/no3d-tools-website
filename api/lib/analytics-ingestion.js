import crypto from 'node:crypto';
import { notificationForVisit } from './visit-notifications.js';
import { CLIENT_EVENTS, publicPage, publicProperties, publicReferrer } from '../../v3/js/analytics-contract.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAnalyticsHandler({ client, environment = 'development', secret = '', logger = console, notificationEnv = process.env, afterAccepted = () => {} }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const input = req.body;
    if (Number(req.headers['content-length'] || 0) > 4096 || Buffer.byteLength(JSON.stringify(input || {})) > 4096) return res.status(413).json({ error: 'Payload too large' });
    if (!input || !CLIENT_EVENTS.has(input.event) || !UUID.test(input.event_id || '') || !UUID.test(input.session_id || '') || typeof input.page !== 'string') return res.status(400).json({ error: 'Invalid analytics event' });
    const origin = req.headers.origin;
    const hosts = new Set(['no3dtools.com', 'www.no3dtools.com', 'v3.no3dtools.com']);
    const host = String(req.headers.host || '').split(':')[0];
    if (environment === 'production' && !hosts.has(host) && input.synthetic !== true) return res.status(204).end();
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Invalid origin' }); }
      catch { return res.status(403).json({ error: 'Invalid origin' }); }
    }
    if (!client) return res.status(503).json({ error: 'Analytics unavailable' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const bucket = crypto.createHash('sha256').update(`analytics:${ip}:${secret}`).digest('hex');
    try {
      const { data: allowed, error: limitError } = await client.rpc('no3d_consume_analytics_rate_limit', { p_bucket_key: bucket });
      if (limitError) throw limitError;
      if (!allowed) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'Too many requests' }); }
      const row = { event: input.event,
        page: publicPage(input.page), referrer: publicReferrer(input.referrer), session_id: input.session_id,
        properties: { ...publicProperties(input.properties), schema_version: 2, source_kind: 'browser', environment,
          synthetic: input.synthetic === true, event_id: input.event_id } };
      const notification = notificationForVisit(req, row, { env: notificationEnv });
      const { data: inserted, error } = await client.rpc('no3d_record_browser_event', { p_event: row, p_notification: notification });
      if (error) throw error;
      if (inserted && notification) {
        try { afterAccepted(input.event_id); } catch { logger.error('analytics_notification_dispatch_failed'); }
      }
      return res.status(200).json({ ok: true, duplicate: !inserted });
    } catch (error) {
      logger.error('analytics_ingestion_failed', { code: String(error?.code || 'unavailable').slice(0, 20) });
      return res.status(503).json({ error: 'Analytics unavailable' });
    }
  };
}
