const $ = selector => document.querySelector(selector);
let grant, preferenceGrant, orderId, timer;
let generation = 0;
const status = $('[data-print-status]');
const download = $('[data-print-download]');
const recovery = $('[data-print-recovery]');
const preferences = $('[data-print-preferences]');
const preferenceForm = $('[data-print-preferences-form]');
const preferenceStatus = $('[data-preference-status]');
async function request(body) {
  const response = await fetch('/api/prints/purchase', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const value = await response.json();
  if (!response.ok) throw Error(response.status === 429 ? 'Please wait a few minutes before requesting another email.' : 'We couldn’t open this download. Try again or request a new link below.');
  return value;
}
function showPreferences(value) {
  preferenceForm.elements.updates.checked = value.updates;
  preferenceForm.elements.promotions.checked = value.promotions;
  preferences.hidden = false;
}
async function load(attempt = 0, version = generation) {
  try {
    const value = await request(grant ? { action: 'access', grant } : { action: 'order', orderId });
    if (version !== generation) return;
    if (value.state === 'pending') {
      status.textContent = attempt < 30 ? 'Confirming your payment. Your files will appear here when it is confirmed.' : 'Your payment is still processing. We’ll email your download when it is confirmed.';
      if (attempt < 30) timer = setTimeout(() => load(attempt + 1, version), 2000);
      return;
    }
    if (value.state !== 'ready') throw Error('This purchase is not available for download.');
    grant = value.grant;
    preferenceGrant = value.preferenceGrant;
    $('#print-title').textContent = value.title;
    status.textContent = 'Your files are ready. A download link will also be sent to your purchase email.';
    download.hidden = false;
    $('[data-promotion-choice]').hidden = false;
    $('[data-promotion-optin]').checked = value.promotions;
    recovery.hidden = true;
    showPreferences(value);
  } catch (error) { status.textContent = error.message; recovery.hidden = false; }
}
download.addEventListener('click', async () => {
  download.disabled = true;
  try {
    const value = await request({ action: 'access', grant, download: true });
    const url = new URL(value.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('The download is temporarily unavailable. Please try again.');
    location.assign(url.href);
    status.textContent = 'Your download is ready. You can use your email link again later.';
  } catch (error) { status.textContent = error.message; }
  finally { download.disabled = false; }
});
recovery.addEventListener('submit', async event => {
  event.preventDefault();
  const button = recovery.querySelector('button'); button.disabled = true;
  try {
    await request({ action: 'recover', email: recovery.elements.email.value.trim() });
    status.textContent = 'If that address has an eligible purchase, we’ll send its download links. Please check your inbox and spam folder.';
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
preferenceForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = preferenceForm.querySelector('button'); button.disabled = true;
  try {
    await request({ action: 'preferences', grant: preferenceGrant, updates: preferenceForm.elements.updates.checked, promotions: preferenceForm.elements.promotions.checked });
    preferenceStatus.textContent = 'Preferences saved. Your purchased files remain available.';
    $('[data-promotion-optin]').checked = preferenceForm.elements.promotions.checked;
  } catch { preferenceStatus.textContent = 'We couldn’t save your preferences. Please try again.'; }
  finally { button.disabled = false; }
});
$('[data-promotion-optin]').addEventListener('change', async event => {
  const checkbox = event.target;
  checkbox.disabled = true;
  try {
    await request({ action: 'preferences', grant: preferenceGrant, promotions: checkbox.checked });
    preferenceForm.elements.promotions.checked = checkbox.checked;
    $('[data-promotion-status]').textContent = checkbox.checked ? 'You’re subscribed to promotional emails.' : 'You’re unsubscribed from promotional emails.';
  } catch {
    checkbox.checked = !checkbox.checked;
    $('[data-promotion-status]').textContent = 'We couldn’t save that choice. Please try again.';
  } finally { checkbox.disabled = false; }
});
async function openLink() {
  generation++;
  clearTimeout(timer);
  const version = generation;
  const fragment = new URLSearchParams(location.hash.slice(1));
  grant = fragment.get('grant');
  preferenceGrant = fragment.get('preferences');
  orderId = new URLSearchParams(location.search).get('order');
  // No analytics on this page; credentials stay in memory, never in storage.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  download.hidden = true; recovery.hidden = false; preferences.hidden = true;
  $('[data-promotion-choice]').hidden = true;
  $('[data-promotion-status]').textContent = '';
  preferences.open = false; preferenceStatus.textContent = '';
  $('#print-title').textContent = 'Your downloads';
  status.textContent = 'Open your purchase link, or request it below.';
  if (preferenceGrant) {
    $('#print-title').textContent = 'Email preferences';
    status.textContent = 'Choose which emails you receive. Your download access stays available.';
    recovery.hidden = true; preferences.open = true;
    try {
      const value = await request({ action: 'preferences', grant: preferenceGrant });
      if (version === generation) showPreferences(value);
    } catch {
      if (version !== generation) return;
      status.textContent = 'This preferences link is unavailable. Request a fresh purchase email below.'; recovery.hidden = false;
    }
  } else if (grant || orderId) { status.textContent = 'Opening your purchase…'; await load(0, version); }
}
window.addEventListener('hashchange', () => void openLink());
await openLink();
