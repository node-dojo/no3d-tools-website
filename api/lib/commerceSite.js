export function commerceSiteKey() {
  return process.env.COMMERCE_SITE_KEY?.trim() || 'no3dtools';
}
