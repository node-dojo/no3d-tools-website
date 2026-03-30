import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).send(buildPage('Missing Token', 'No unsubscribe token was provided.'));
  }

  // Validate token and opt out
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ newsletter_opted_out: true, updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('email')
    .single();

  if (error || !data) {
    return res.status(404).send(buildPage('Invalid Token', 'This unsubscribe link is invalid or has already been used.'));
  }

  return res.status(200).send(buildPage(
    'Unsubscribed',
    `You've been unsubscribed from the NO3D Tools newsletter. You'll still have full access to your subscription, tools, and downloads.`
  ));
}

function buildPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - NO3D Tools</title>
  <link rel="preload" href="/fonts/visitor.woff2" as="font" type="font/woff2" crossorigin="anonymous">
  <style>
    @font-face { font-family: 'Visitor'; src: url('/fonts/visitor.woff2') format('woff2'); font-weight: 400; font-style: normal; }
    body { font-family: 'JetBrains Mono', monospace; background: #e8e8e8; color: #222; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: #f5f5f5; border: 2px solid #222; padding: 40px; max-width: 480px; text-align: center; }
    h1 { font-family: 'Visitor', monospace; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px; }
    p { font-size: 13px; line-height: 1.6; color: #444; margin: 0 0 24px; }
    a { font-family: 'Visitor', monospace; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #222; text-decoration: none; border: 1.5px solid #222; padding: 10px 20px 8px; display: inline-block; }
    a:hover { background: #222; color: #f0ff00; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Back to NO3D Tools</a>
  </div>
</body>
</html>`;
}
