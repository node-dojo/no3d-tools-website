/**
 * License key from addon/serverless requests.
 * Supported: X-License-Key header or Authorization: Bearer <key>.
 *
 * @param {{ headers?: Record<string, string | string[] | undefined>, query?: Record<string, string | string[]> }} req
 * @returns {string | null}
 */
export function getLicenseKeyFromRequest(req) {
  const h = req.headers;
  const x = h['x-license-key'] ?? h['X-License-Key'];
  if (typeof x === 'string' && x.trim()) return x.trim();

  const auth = h.authorization ?? h.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  return null;
}
