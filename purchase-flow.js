export function productTitle(handle) {
  return String(handle || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function purchaseView(order, authenticated) {
  if (!order || !order.orderId) return { state: 'loading' };
  if (['refunded', 'disputed'].includes(order.paymentStatus)) return { state: 'unavailable' };
  if (order.paymentStatus !== 'paid' || order.fulfillmentStatus !== 'fulfilled') {
    return { state: 'processing' };
  }
  return authenticated
    ? { state: 'existing', title: productTitle(order.resourceId) }
    : { state: 'new', title: productTitle(order.resourceId) };
}
