import { beginProductCheckout } from './api.js?v=prints-20261028b';
import { getPrintAccess } from './print-price.js?v=prints-member-price-20261029';

// Both catalog and product document recheck authority at the action boundary.
export async function downloadPrint(handle, { signal, onAccess = () => {}, onStatus = () => {} } = {}) {
  onStatus('Checking download access…');
  const access = await getPrintAccess(handle, signal);
  onAccess(access);
  if (access.mode === 'purchase') {
    onStatus('Opening checkout…');
    const url = new URL(await beginProductCheckout(handle));
    if (signal?.aborted) return;
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('invalid_checkout');
    location.assign(url.href);
  } else if (access.mode === 'download') {
    onStatus('Preparing your download…');
    const response = await fetch(`/api/prints/download?handle=${encodeURIComponent(handle)}`, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!response.ok) throw new Error('download_unavailable');
    const result = await response.json();
    const url = new URL(result.url);
    if (url.protocol !== 'https:') throw new Error('invalid_download');
    location.assign(url.href);
    onStatus('Your download is ready.');
  } else {
    onStatus('Your download is not available yet. Please try again later.');
  }
  return access;
}
