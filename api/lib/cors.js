/**
 * CORS helper for browser-facing endpoints.
 * Restricts Access-Control-Allow-Origin to known origins.
 */

const ALLOWED_ORIGINS = [
  'https://no3dtools.com',
  'https://www.no3dtools.com',
];

/**
 * Sets CORS headers on the response. For browser-facing endpoints, only
 * allows requests from known origins. Returns true if this was a preflight
 * OPTIONS request that has been handled (caller should return early).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ methods?: string }} [opts]
 * @returns {boolean} true if preflight was handled
 */
export function setCorsHeaders(req, res, opts = {}) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', opts.methods || 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return true;
  }
  return false;
}
