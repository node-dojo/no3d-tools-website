function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendAuthEmail({ email, continueUrl, kind = 'signin' }) {
  const confirmation = kind === 'signup';
  const subject = confirmation ? 'Confirm your email address' : 'Your sign-in link';
  const heading = subject;
  const instruction = confirmation
    ? 'Follow the link below to confirm this email address and finish signing up.'
    : 'Follow the link below to sign in. This link expires shortly and can only be used once.';
  const action = confirmation ? 'Confirm email address' : 'Sign in';
  const safeUrl = escapeHtml(continueUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requiredEnv('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL?.trim() || 'NO3D Tools <onboarding@resend.dev>',
      to: [email],
      subject,
      html: `<h2>${heading}</h2><p>${instruction}</p><p><a href="${safeUrl}">${action}</a></p>`,
      text: `${heading}\n\n${instruction}\n\n${continueUrl}`,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('auth_email_delivery_failed');
    error.cause = payload.message || payload.error || `Resend ${response.status}`;
    throw error;
  }
  return payload;
}
