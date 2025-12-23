/**
 * Debug version of auth endpoint - minimal test
 */

import { Polar } from '@polar-sh/sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    // Test 1: Can we even return a response?
    const test1 = true;

    // Test 2: Can we initialize Polar?
    const polar = new Polar({
      accessToken: process.env.POLAR_API_TOKEN || 'test',
    });
    const test2 = polar !== null;

    // Test 3: Can we access env vars?
    const test3 = process.env.POLAR_API_TOKEN !== undefined;

    return res.status(200).json({
      success: true,
      tests: {
        basicResponse: test1,
        polarInit: test2,
        envVars: test3,
      },
      message: 'Debug endpoint working',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
