const params = new URLSearchParams(location.search);
const grant = params.get('grant') || '';
const message = document.querySelector('[data-auth-continue-message]');
const button = document.querySelector('[data-auth-continue]');
let running = false;

async function complete() {
  if (running) return;
  running = true;
  button.hidden = true;
  message.textContent = 'Signing you in…';
  try {
    const response = await fetch('/api/auth/complete-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.next) throw new Error(payload.error || 'authentication_failed');
    location.replace(payload.next);
  } catch {
    message.textContent = 'That one-time link expired or was already used.';
    button.hidden = false;
    button.querySelector('span').textContent = 'Try again';
    running = false;
  }
}

button.addEventListener('click', () => location.assign('/v3/onboarding/create-account/'));
if (grant) complete();
else {
  message.textContent = 'That sign-in link could not be completed.';
  button.hidden = false;
}
