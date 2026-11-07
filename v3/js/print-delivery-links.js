const links = document.querySelectorAll('[data-print-recovery-link]');
if (links.length) {
  try {
    const response = await fetch('/api/commerce/config', { cache: 'no-store' });
    if (response.ok && (await response.json()).printsAccountFreeEnabled) {
      for (const link of links) link.hidden = false;
    }
  } catch { /* Keep recovery links hidden until the server enables this rollout. */ }
}
