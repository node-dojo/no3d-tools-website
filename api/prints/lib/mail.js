import { timingSafeEqual } from 'node:crypto';
import { getPrintDelivery } from './catalog.js';

export function createPrintMailHandler({ send = fetch, product = getPrintDelivery } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const secret = process.env.COMMERCE_SITE_BACKEND_SECRET;
    const actual = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { id, email, handle, kind, content = {}, downloadUrl, preferencesUrl } = req.body || {};
      const print = product(handle);
      if (!print || print.status !== 'active' || !/^[0-9a-f-]{36}$/i.test(id) || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('invalid_mail');
      if (!['delivery','recovery','update','promotion'].includes(kind)) throw Error('invalid_mail');
      const base = new URL(process.env.SITE_URL || 'https://no3dtools.com');
      for (const [value, key] of [[downloadUrl, 'grant'], [preferencesUrl, 'preferences']]) {
        const url = new URL(value);
        if (url.origin !== base.origin || url.pathname !== '/v3/prints/download/' || url.search || !url.hash.startsWith(`#${key}=`) || url.username || url.password) throw Error('invalid_mail_link');
      }
      let subject = `Your NO3D Prints download: ${print.title}`;
      let text = `${print.title}\n\nDownload your files:\n${downloadUrl}\n\nYou can open this link on another device. No account is needed.`;
      if (kind === 'update' || kind === 'promotion') {
        if (typeof content.subject !== 'string' || !content.subject.trim() || content.subject.length > 200 || /[\r\n]/.test(content.subject) || typeof content.text !== 'string' || !content.text.trim() || content.text.length > 20000) throw Error('invalid_mail_content');
        subject = content.subject;
        text = content.text;
        if (kind === 'update') text += `\n\nDownload your updated files:\n${downloadUrl}`;
      }
      text += `\n\nEmail preferences and unsubscribe:\n${preferencesUrl}`;
      if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) throw Error('mail_unavailable');
      const response = await send('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(6000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `print-mail/${id}` },
        body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [email], subject, text }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.id !== 'string') throw Error('mail_unavailable');
      return res.status(200).json({ id: payload.id });
    } catch { return res.status(503).json({ error: 'print_mail_unavailable' }); }
  };
}
