import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import { createAnalyticsHandler } from './lib/analytics-ingestion.js';
export default createAnalyticsHandler({ client: getSupabaseServiceClient(),
  environment: process.env.VERCEL_ENV || 'development', secret: process.env.COMMERCE_SITE_BACKEND_SECRET || '' });
