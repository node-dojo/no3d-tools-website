import { oauthAuthorizationUrl, safeAuthNext } from './lib/session.js';
import { configuredProviders } from './providers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const provider = typeof req.query?.provider === 'string' ? req.query.provider : '';
  const next = safeAuthNext(req.query?.next) || '/v3/account/?state=install';
  try {
    if (!configuredProviders()[provider]) throw new Error('OAuth provider not configured');
    return res.redirect(303, oauthAuthorizationUrl(req, res, provider, { next }));
  } catch (error) {
    console.error('OAuth start failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    return res.redirect(303, `/v3/onboarding/create-account/?auth=unavailable&next=${encodeURIComponent(next)}`);
  }
}
