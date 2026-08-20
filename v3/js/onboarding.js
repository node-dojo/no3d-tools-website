import { authenticateWithPassword, getAuthProviders, oauthUrl } from './api.js';

const params = new URLSearchParams(location.search);
const requestedNext = params.get('next');
const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
  ? requestedNext
  : '/v3/account/?state=install';

const form = document.querySelector('[data-account-entry-form]');
if (form) {
  let mode = 'signup';
  const modeButtons = [...document.querySelectorAll('[data-auth-mode]')];
  const submitLabel = document.querySelector('[data-auth-submit]');
  const password = form.elements.password;
  const message = document.querySelector('[data-auth-message]');

  const setMode = value => {
    mode = value;
    modeButtons.forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
    submitLabel.textContent = mode === 'signup' ? 'Create free account' : 'Sign in';
    password.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  };

  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.authMode)));
  const providerLinks = [...document.querySelectorAll('[data-oauth]')];
  const providers = await getAuthProviders().catch(() => ({ google: false, github: false }));
  let providerCount = 0;
  providerLinks.forEach(link => {
    const enabled = providers[link.dataset.oauth] === true;
    link.hidden = !enabled;
    if (enabled) {
      link.href = oauthUrl(link.dataset.oauth, next);
      providerCount += 1;
    }
  });
  document.querySelector('[data-auth-providers]').hidden = providerCount === 0;
  document.querySelector('[data-email-rule]').textContent = providerCount ? 'Or continue with email' : 'Continue with email';

  if (params.get('access') === 'denied') {
    message.textContent = 'This account is not approved for the private V3 release candidate.';
    setMode('signin');
  } else if (params.get('access') === 'required') {
    setMode('signin');
  } else if (params.get('auth') === 'unavailable') {
    message.textContent = 'That sign-in method is not available. Use email or try another provider.';
  } else if (params.get('auth') === 'invalid') {
    message.textContent = 'That sign-in link could not be completed. Try again or use another method.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = mode === 'signup' ? 'Creating your account…' : 'Signing in…';
    try {
      const result = await authenticateWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        mode,
        next,
      });
      if (result.authenticated) {
        location.assign(result.next || next);
        return;
      }
      message.textContent = 'Check your email to confirm your account. This setup will continue when you return.';
    } catch (error) {
      if (error instanceof Error && error.message === 'account_claim_failed') {
        message.textContent = 'Your sign-in worked, but the purchasing library could not be attached. Sign in again to retry before continuing.';
      } else {
        message.textContent = mode === 'signup'
          ? 'The account could not be created. Try signing in if this email is already registered.'
          : 'The email or password was not recognized.';
      }
    } finally {
      button.disabled = false;
    }
  });
}
