import { getObjectUtf8String, isR2Configured } from '../lib/r2.js';

const EXTENSION_INDEX_KEY = 'no3d-tools-library/extensions/index.json';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: 'Extension repository is not configured' });
  }

  try {
    const index = await getObjectUtf8String(EXTENSION_INDEX_KEY);
    JSON.parse(index);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.status(200).send(req.method === 'HEAD' ? '' : index);
  } catch (error) {
    console.error('Extension index fetch error:', error instanceof Error ? error.message : error);
    return res.status(404).json({ error: 'Extension repository has not been published' });
  }
}
