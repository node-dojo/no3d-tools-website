export async function getPrintAccess(handle, signal) {
  const response = await fetch(`/api/prints/access?handle=${encodeURIComponent(handle)}`, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('access_unavailable');
  return response.json();
}

export function renderPrintPrice(element, price, member = false) {
  const value = document.createElement(member && price ? 's' : 'span');
  value.dataset.priceValue = '';
  value.textContent = price || '—';
  element.replaceChildren(value);
  if (member) {
    const note = document.createElement('small');
    note.className = 'print-member-price-note';
    note.textContent = 'free for members';
    element.append(note);
  }
}
