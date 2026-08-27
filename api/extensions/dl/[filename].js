import { isR2Configured, presignGetObject } from '../../lib/r2.js';

const EXTENSION_PREFIX = 'no3d-tools-library/extensions/';
const FILENAME = /^no3d_tools-\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\.zip$/;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const filename = Array.isArray(req.query.filename) ? req.query.filename[0] : req.query.filename;
  if (typeof filename !== 'string' || !FILENAME.test(filename)) {
    return res.status(404).json({ error: 'Extension archive not found' });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: 'Extension repository is not configured' });
  }

  try {
    const url = await presignGetObject(`${EXTENSION_PREFIX}${filename}`, 300);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', url);
    return res.status(302).end();
  } catch (error) {
    console.error('Extension archive presign error:', error instanceof Error ? error.message : error);
    return res.status(404).json({ error: 'Extension archive not found' });
  }
}
