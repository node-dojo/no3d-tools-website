import { authenticatedSession } from './lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const auth = await authenticatedSession(req, res);
    if (!auth) return res.status(200).json({ authenticated: false });
    return res.status(200).json({ authenticated: true, email: auth.user.email });
  } catch (error) {
    console.error('Session inspection failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(200).json({ authenticated: false });
  }
}
