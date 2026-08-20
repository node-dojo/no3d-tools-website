export function configuredProviders() {
  return {
    github: process.env.NO3D_AUTH_GITHUB_ENABLED === 'true',
    google: process.env.NO3D_AUTH_GOOGLE_ENABLED === 'true',
  };
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  return res.status(200).json(configuredProviders());
}
