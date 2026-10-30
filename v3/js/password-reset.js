let grant = '';
const message = document.querySelector('[data-reset-message]');
const verify = document.querySelector('[data-reset-verify]');
const form = document.querySelector('[data-reset-form]');
const resend = document.querySelector('[data-reset-resend]');
const done = document.querySelector('[data-reset-done]');

function receiveGrant() {
  const value = new URLSearchParams(location.hash.slice(1)).get('grant');
  // Keep the one-time proof out of history, referrers and persisted web storage.
  history.replaceState(null, '', location.pathname);
  if (!value) return false;
  grant = value;
  form.reset();
  form.hidden = true;
  done.hidden = true;
  resend.hidden = true;
  verify.hidden = false;
  message.textContent = 'Continue to choose a new password.';
  return true;
}
addEventListener('hashchange', receiveGrant);

async function api(body) {
  const response = await fetch('/api/auth/reset-password', {
    credentials: 'same-origin', cache: 'no-store',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'recovery_unavailable');
  return result;
}
function destination(next) {
  return typeof next === 'string' && next.startsWith('/v3/') && !next.includes('\\') ? next : '/v3/account/';
}
function ready(result) {
  grant = '';
  verify.hidden = true;
  form.hidden = false;
  message.textContent = 'Choose a new password with at least 10 characters.';
  resend.href = `/v3/onboarding/create-account/?mode=recovery&next=${encodeURIComponent(destination(result.next))}`;
  form.elements.password.focus();
}
function expired() {
  grant = '';
  verify.hidden = true;
  form.hidden = true;
  resend.hidden = false;
  message.textContent = 'This reset link has expired or was already used. Request a new link to continue.';
}
verify.addEventListener('click', async () => {
  verify.disabled = true;
  message.textContent = 'Checking your reset link…';
  try { ready(await api({ action: 'verify', grant })); }
  catch (error) {
    if (error.message === 'invalid_or_expired_link') expired();
    else message.textContent = error.message === 'try_again_later' ? 'Too many attempts. Wait ten minutes, then request a new link.' : 'The link could not be checked. Please try again.';
  } finally { verify.disabled = false; }
});
form.elements.confirmation.addEventListener('input', () => form.elements.confirmation.setCustomValidity(''));
form.elements.password.addEventListener('input', () => form.elements.confirmation.setCustomValidity(''));
form.addEventListener('submit', async event => {
  event.preventDefault();
  form.elements.confirmation.setCustomValidity(form.elements.password.value === form.elements.confirmation.value ? '' : 'Passwords do not match.');
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  message.textContent = 'Saving your new password…';
  try {
    const result = await api({ action: 'update', password: form.elements.password.value });
    form.reset();
    form.hidden = true;
    message.textContent = 'Your password has been updated.';
    done.href = destination(result.next);
    done.textContent = result.authenticated ? 'Continue →' : 'Sign in with your new password →';
    done.hidden = false;
    done.focus();
  } catch (error) {
    if (error.message === 'invalid_or_expired_link') expired();
    else message.textContent = ({
      same_password: 'Choose a password you have not used for this account before.',
      weak_password: 'This password is too easy to guess or has appeared in a data breach. Choose a stronger password.',
      invalid_password: 'Use a password between 10 and 200 characters.',
      try_again_later: 'Too many attempts. Wait ten minutes, then try again.',
    })[error.message] || 'Your password could not be saved. Please try again.';
  } finally { button.disabled = false; }
});
if (!receiveGrant()) {
  try { const result = await api(); if (result.ready) ready(result); else expired(); }
  catch { expired(); }
}
