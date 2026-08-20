import { beginMembershipCheckout, getCommerceConfig } from './api.js';

const config = await getCommerceConfig();
document.querySelector('[data-membership-price]').textContent = config.membershipPrice
  ? `${config.membershipPrice} / month`
  : 'Monthly membership';

const cancelled = new URLSearchParams(location.search).get('checkout') === 'cancelled';
const message = document.querySelector('[data-membership-message]');
if (cancelled) message.textContent = 'Checkout cancelled. Your account and library were not changed.';

document.querySelectorAll('[data-membership-checkout]').forEach(button => button.addEventListener('click', async () => {
  const buttons = [...document.querySelectorAll('[data-membership-checkout]')];
  buttons.forEach(control => { control.disabled = true; });
  message.textContent = 'Opening secure membership checkout…';
  try {
    location.assign(await beginMembershipCheckout());
  } catch {
    buttons.forEach(control => { control.disabled = false; });
    message.textContent = 'Checkout is temporarily unavailable. Your account and library were not changed.';
  }
}));
