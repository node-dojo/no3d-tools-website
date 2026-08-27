import { authenticateWithPassword, getAuthProviders, oauthUrl, requestRecovery, requestSignIn } from './api.js?v=perf-20260820';
import { track } from './analytics.js?v=privacy-funnel-20260827';

const params = new URLSearchParams(location.search);
const requestedNext = params.get('next');
const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
  ? requestedNext
  : '/v3/';
const purchaseOrderId = next.match(/^\/v3\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1] || '';
const destination = purchaseOrderId ? 'order' : next.startsWith('/v3/account/') ? 'account' : 'catalog';

const form = document.querySelector('[data-account-entry-form]');
if (form) {
  let mode = 'signup';
  const modeButtons = [...document.querySelectorAll('[data-auth-mode]')];
  const submitLabel = document.querySelector('[data-auth-submit]');
	  const password = form.elements.password;
	  const message = document.querySelector('[data-auth-message]');
	  const signInRecovery = document.querySelector('[data-signin-recovery]');
	  const recovery = document.querySelector('[data-purchase-recovery]');

	  signInRecovery?.addEventListener('click', async () => {
	    const email = form.elements.email.value.trim();
	    if (!email || !form.elements.email.checkValidity()) {
	      message.textContent = 'Enter the email address for this account, then request a fresh link.';
	      form.elements.email.focus();
	      return;
	    }
	    signInRecovery.disabled = true;
	    message.textContent = 'Sending a fresh sign-in link for this browser…';
	    try {
	      await requestSignIn(email, next);
	      track('sign_in_link_requested', { source: 'expired_link', destination });
	      message.textContent = 'Check your email and open the newest link in this browser. Older links remain expired.';
	      signInRecovery.hidden = true;
	    } catch (error) {
	      track('sign_in_link_failed', { source: 'expired_link', destination });
	      message.textContent = error instanceof Error && error.message === 'try_again_later'
	        ? 'A sign-in link was requested recently. Wait ten minutes, then request one fresh link.'
	        : 'The fresh sign-in link could not be sent. Try again shortly.';
	      signInRecovery.disabled = false;
	    }
	  });

	  if (purchaseOrderId) recovery.hidden = false;
	  recovery?.addEventListener('click', async () => {
	    recovery.disabled = true;
	    message.textContent = 'Sending a one-time sign-in link…';
	    try {
	      await requestRecovery(purchaseOrderId);
	      track('sign_in_link_requested', { source: 'purchase_recovery', destination: 'order' });
	      message.textContent = 'Check the checkout email for your one-time sign-in link. Your purchase remains attached.';
	      recovery.hidden = true;
	    } catch (error) {
	      track('sign_in_link_failed', { source: 'purchase_recovery', destination: 'order' });
	      message.textContent = error instanceof Error && error.message === 'try_again_later'
	        ? 'A sign-in link was requested recently. Wait a minute, then try once more.'
	        : 'The sign-in link could not be sent. Your purchase remains safe; try again shortly.';
	      recovery.disabled = false;
	    }
	  });

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
  } else if (params.get('auth') === 'expired') {
    message.textContent = 'That one-time link expired or was already used. Enter your email and request a fresh link for this browser.';
    signInRecovery.hidden = false;
    setMode('signin');
  } else if (params.get('auth') === 'invalid') {
    message.textContent = 'That sign-in link could not be completed. Try again or use another method.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = mode === 'signup' ? 'Creating your account…' : 'Signing in…';
    track('account_submit', { mode, destination });
    try {
      const result = await authenticateWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        mode,
        next,
      });
      if (result.authenticated) {
        track('account_authenticated', { mode, destination });
        location.assign(result.next || next);
        return;
      }
      track('account_confirmation_requested', { destination });
      message.textContent = 'Check your email to confirm your account. This setup will continue when you return.';
    } catch (error) {
      track('account_submit_failed', { mode, destination });
      if (error instanceof Error && error.message === 'account_claim_failed') {
        message.textContent = 'Your sign-in worked, but the purchasing library could not be attached. Sign in again to retry before continuing.';
      } else if (error instanceof Error && error.message === 'try_again_later') {
        message.textContent = 'Too many account attempts from this connection. Wait ten minutes, then retry the same email once.';
      } else if (error instanceof Error && error.message === 'account_unverified') {
        message.textContent = 'This account already exists but still needs email confirmation. Open the newest verification email to continue.';
      } else if (error instanceof Error && error.message === 'account_password_mismatch') {
        message.textContent = 'This account already exists. Check the password and continue here—there is no need to switch forms.';
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
