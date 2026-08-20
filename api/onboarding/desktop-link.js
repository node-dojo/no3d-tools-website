import { authenticatedSession } from '../auth/lib/session.js';
import { sendEmail } from '../lib/email.js';

function requestOrigin(req) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const host = /^(?:v3\.)?no3dtools\.com$|^[a-z0-9-]+\.vercel\.app$/i.test(forwardedHost)
    ? forwardedHost
    : 'no3dtools.com';
  return `https://${host}`;
}

export function desktopSetupUrl(req) {
  return `${requestOrigin(req)}/v3/account/?state=install`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const auth = await authenticatedSession(req, res);
    if (!auth?.user?.email || !auth.user.email_confirmed_at) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    const setupUrl = desktopSetupUrl(req);
    await sendEmail({
      to: auth.user.email,
      subject: 'Continue setting up NO3D Tools on your desktop',
      html: `<div style="background:#f1f0eb;color:#111;padding:32px;font-family:monospace"><p style="font-size:12px;text-transform:uppercase">NO3D Tools / Desktop setup</p><h1 style="font-size:32px;line-height:1;margin:28px 0">Your Blender setup is ready.</h1><p>Open this link at your Blender workstation to install NO3D Tools and connect your library.</p><p style="margin:30px 0"><a href="${setupUrl}" style="display:inline-block;border:1px solid #111;background:#f5ff00;color:#111;padding:16px 20px;text-decoration:none;text-transform:uppercase">Continue setup →</a></p><p style="font-size:12px">Your NO3D account and library remain available on mobile.</p></div>`,
      text: `Your Blender setup is ready.\n\nOpen this link at your Blender workstation to install NO3D Tools and connect your library:\n${setupUrl}\n\nYour NO3D account and library remain available on mobile.`,
    });

    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('Desktop setup email failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(503).json({ error: 'desktop_setup_email_unavailable' });
  }
}
