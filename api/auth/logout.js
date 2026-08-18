import { authenticatedSession, clearAuthCookies } from './lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const auth = await authenticatedSession(req, res);
    if (auth) await auth.client.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.error('Logout failed', { error: error instanceof Error ? error.message : 'unknown_error' });
  }
  clearAuthCookies(res, { includeGuest: true });
  return res.status(200).json({ signedOut: true });
}
