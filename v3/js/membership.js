import { beginMembershipCheckout, getCommerceConfig } from './api.js';

const config = await getCommerceConfig();
document.querySelector('[data-membership-price]').textContent = config.membershipPrice
  ? `${config.membershipPrice} / month`
  : 'Monthly membership';

const cancelled = new URLSearchParams(location.search).get('checkout') === 'cancelled';
const message = document.querySelector('[data-membership-message]');
if (cancelled) message.textContent = 'Checkout cancelled. Your account and library were not changed.';

const stagingRequiresTestPrice = location.hostname === 'v3.no3dtools.com';
const checkoutIsSafe = !stagingRequiresTestPrice || config.membershipEnvironment === 'test';
if (!checkoutIsSafe) {
  message.textContent = 'Membership checkout is paused while the staging payment connection is verified.';
  document.querySelectorAll('[data-membership-checkout]').forEach(button => { button.disabled = true; });
}

document.querySelectorAll('[data-membership-checkout]').forEach(button => button.addEventListener('click', async () => {
  if (!checkoutIsSafe) return;
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
