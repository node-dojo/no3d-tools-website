/**
 * Debug endpoint to check which env vars are available
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const envVars = {
    POLAR_API_TOKEN: !!process.env.POLAR_API_TOKEN,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    FROM_EMAIL: !!process.env.FROM_EMAIL,
    SITE_URL: !!process.env.SITE_URL,
  };

  // Also include first 4 chars of each value to verify they're not empty
  const envVarsPrefix = {
    POLAR_API_TOKEN: process.env.POLAR_API_TOKEN?.substring(0, 4) || 'N/A',
    RESEND_API_KEY: process.env.RESEND_API_KEY?.substring(0, 4) || 'N/A',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 4) || 'N/A',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN?.substring(0, 4) || 'N/A',
    FROM_EMAIL: process.env.FROM_EMAIL?.substring(0, 4) || 'N/A',
    SITE_URL: process.env.SITE_URL?.substring(0, 4) || 'N/A',
  };

  return res.status(200).json({
    success: true,
    envVarsPresent: envVars,
    envVarsPrefix: envVarsPrefix,
  });
}
