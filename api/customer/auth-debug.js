/**
 * Debug version of auth endpoint - testing imports
 */

import { Polar } from '@polar-sh/sdk';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '../lib/email.js';

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

    // Test 3: Can we initialize Redis?
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const test3 = redis !== null;

    // Test 4: Can we use crypto?
    const token = crypto.randomUUID();
    const test4 = token !== null;

    // Test 5: Can we import email function?
    const test5 = typeof sendMagicLinkEmail === 'function';

    return res.status(200).json({
      success: true,
      tests: {
        basicResponse: test1,
        polarInit: test2,
        redisInit: test3,
        cryptoUUID: test4,
        emailImport: test5,
      },
      message: 'All imports working',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
