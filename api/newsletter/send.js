import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SITE_URL = process.env.SITE_URL || 'https://no3dtools.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'NO3D Tools <onboarding@resend.dev>';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: requires CRON_SECRET
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.body || {};
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug in request body' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch the newsletter article
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (articleError || !article) {
    return res.status(404).json({ error: 'Newsletter article not found', slug });
  }

  // Fetch opted-in subscribers
  const { data: subscribers, error: subError } = await supabase
    .from('subscriptions')
    .select('email, unsubscribe_token')
    .eq('status', 'active')
    .or('newsletter_opted_out.is.null,newsletter_opted_out.eq.false');

  if (subError) {
    return res.status(500).json({ error: 'Failed to fetch subscribers', details: subError.message });
  }

  const recipientList = (subscribers || []).filter(s => s.email);
  if (recipientList.length === 0) {
    return res.status(200).json({ message: 'No active subscribers to send to', sent: 0 });
  }

  // Build email HTML (simple wrapper)
  const subject = `[no3d tools] ${article.title}`;
  const bodyHtml = article.content || '';
  const year = new Date().getFullYear();

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;
  const failures = [];

  for (const subscriber of recipientList) {
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #222; background: #f5f5f5; }
.header { text-align: center; padding: 20px 0; border-bottom: 2px solid #222; margin-bottom: 24px; }
.logo { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
a { color: #000; } h1 { font-size: 24px; } h2 { font-size: 20px; } h3 { font-size: 16px; }
.footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
</style></head><body>
<div class="header"><div class="logo">NO3D TOOLS</div></div>
${bodyHtml}
<div class="footer">
  <p><a href="${SITE_URL}/blog">Read more on the blog</a></p>
  <p>&copy; ${year} NO3D Tools. All rights reserved.</p>
  <p><a href="${unsubscribeUrl}" style="color:#999;font-size:11px;">Unsubscribe from this newsletter</a></p>
</div>
</body></html>`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      sent++;
    } catch (err) {
      failed++;
      failures.push({ email: subscriber.email, error: err.message });
    }
  }

  return res.status(200).json({
    message: `Newsletter sent: ${sent} delivered, ${failed} failed`,
    slug,
    sent,
    failed,
    failures: failures.length > 0 ? failures : undefined,
  });
}
