import { waitUntil } from '@vercel/functions';
import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import { createAnalyticsHandler } from './lib/analytics-ingestion.js';
import { deliverNotifications } from './lib/visit-notifications.js';
const client = getSupabaseServiceClient();
export default createAnalyticsHandler({ client,
  environment: process.env.VERCEL_ENV || 'development', secret: process.env.COMMERCE_SITE_BACKEND_SECRET || '',
  afterAccepted: id => waitUntil(deliverNotifications(client, { id }).catch(() => console.error('analytics_notification_dispatch_failed'))) });
