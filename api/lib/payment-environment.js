export function membershipExpectedEnvironment(env = process.env) {
  if (env.V3_ACCESS_MODE === 'owner') return 'test';
  if (env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) return 'live';
  if (env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) return 'test';
  return 'unknown';
}
