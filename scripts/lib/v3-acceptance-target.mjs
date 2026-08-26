const PUBLIC_HOSTS = new Set(['no3dtools.com', 'www.no3dtools.com', 'v3.no3dtools.com']);

export function acceptanceBaseUrl(source = process.env) {
  const configured = source.NO3D_V3_ACCEPTANCE_URL?.trim();
  if (!configured) {
    throw new Error('NO3D_V3_ACCEPTANCE_URL is required; acceptance scripts must target an explicit staging host.');
  }

  const url = new URL(configured);
  if (PUBLIC_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`Refusing to run mutable acceptance against public host ${url.hostname}.`);
  }
  return url.toString().replace(/\/$/, '');
}
