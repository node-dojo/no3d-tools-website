import { printProducts } from '../data/prints/catalog.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createPrintProductView(dialog) {
  const gallery = dialog.querySelector('[data-gallery]');
  const thumbnails = dialog.querySelector('[data-gallery-thumbnails]');
  const previous = dialog.querySelector('[data-gallery-previous]');
  const next = dialog.querySelector('[data-gallery-next]');
  const download = dialog.querySelector('[data-details-download]');
  const status = dialog.querySelector('[data-download-status]');
  const signin = dialog.querySelector('[data-member-signin]');
  let product;
  let photo = 0;
  let opener;
  let request;
  let scrollTimer;
  let closeTimer;
  let pointerStart;

  function syncGallery(index) {
    photo = Math.max(0, Math.min(index, product.media.length - 1));
    [...gallery.children].forEach((slide, i) => {
      slide.inert = i !== photo;
      if (i !== photo) slide.querySelector('video')?.pause();
    });
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-current', String(i === photo)));
    previous.disabled = photo === 0;
    next.disabled = photo === product.media.length - 1;
    dialog.querySelector('[data-gallery-position]').textContent = `${photo + 1} / ${product.media.length}`;
  }

  function goToPhoto(index, smooth = true) {
    syncGallery(index);
    gallery.scrollTo({ left: photo * gallery.clientWidth, behavior: smooth && !reducedMotion() ? 'smooth' : 'instant' });
  }

  gallery.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (dialog.open && gallery.clientWidth) syncGallery(Math.round(gallery.scrollLeft / gallery.clientWidth));
    }, 100);
  }, { passive: true });
  gallery.addEventListener('keydown', event => {
    if (event.target !== gallery) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      goToPhoto(event.key === 'Home' ? 0 : event.key === 'End' ? product.media.length - 1 : photo + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  previous.addEventListener('click', () => goToPhoto(photo - 1));
  next.addEventListener('click', () => goToPhoto(photo + 1));
  new ResizeObserver(() => { if (dialog.open) goToPhoto(photo, false); }).observe(gallery);

  function renderGallery() {
    gallery.replaceChildren();
    thumbnails.replaceChildren();
    product.media.forEach((media, i) => {
      const slide = document.createElement('figure');
      slide.className = 'print-gallery-slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${product.media.length}: ${media.alt}`);
      const image = document.createElement(media.type === 'video' ? 'video' : 'img');
      image.src = media.src;
      if (media.type === 'video') {
        image.controls = true;
        image.playsInline = true;
        image.muted = true;
        image.loop = true;
        image.preload = 'none';
        image.poster = media.poster;
        image.setAttribute('aria-label', media.alt);
      } else image.alt = media.alt;
      slide.append(image);
      gallery.append(slide);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show ${media.type === 'video' ? 'video' : 'photo'} ${i + 1}: ${media.alt}`);
      const thumbnail = document.createElement('img');
      thumbnail.src = media.poster || media.src;
      thumbnail.alt = '';
      button.append(thumbnail);
      button.addEventListener('click', () => goToPhoto(i));
      thumbnails.append(button);
    });
    goToPhoto(0, false);
  }

  function renderDescription() {
    const body = dialog.querySelector('[data-details-body]');
    body.replaceChildren();
    const addParagraph = text => { const p = document.createElement('p'); p.textContent = text; body.append(p); };
    // Preserve the listing's order: the Planter's size note follows the file list.
    const split = product.paragraphs.findIndex(text => text.includes('Included in the Download:'));
    for (const text of product.paragraphs.slice(0, split + 1)) {
      const paragraph = text.replace(/\n*Included in the Download:$/, '').trim();
      if (paragraph) addParagraph(paragraph);
    }
    addParagraph('Included in the Download:');
    const list = document.createElement('ul');
    product.included.forEach(text => { const item = document.createElement('li'); item.textContent = text; list.append(item); });
    body.append(list);
    product.paragraphs.slice(split + 1).forEach(addParagraph);
  }

  function showAccess(access) {
    download.disabled = access.mode === 'unavailable';
    download.dataset.unavailable = String(access.mode === 'unavailable');
    signin.hidden = access.authenticated === true;
    dialog.querySelector('[data-details-price]').textContent = access.entitlement ? 'Free' : product.price;
    dialog.querySelector('[data-details-price-label]').textContent = access.entitlement === 'member' ? 'Included with membership' : access.entitlement === 'owned' ? 'Already owned' : '3D print files';
    status.textContent = access.mode === 'unavailable' ? 'Your download is not available yet. Please try again later.' : '';
  }

  async function fetchAccess(signal) {
    const response = await fetch(`/api/prints/access?handle=${encodeURIComponent(product.slug)}`, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!response.ok) throw new Error('access_unavailable');
    return response.json();
  }

  async function inspectAccess() {
    request?.abort();
    request = new AbortController();
    download.disabled = true;
    download.dataset.unavailable = 'false';
    status.textContent = 'Checking download access…';
    try { showAccess(await fetchAccess(request.signal)); }
    catch (error) {
      if (error.name === 'AbortError') return;
      status.textContent = 'Download access could not be checked. Select Download to retry.';
      download.disabled = false;
    }
  }

  download.addEventListener('click', async () => {
    download.disabled = true;
    status.textContent = 'Checking download access…';
    request?.abort();
    request = new AbortController();
    try {
      // Recheck at the action boundary; an earlier display state is not authority.
      const access = await fetchAccess(request.signal);
      showAccess(access);
      if (access.mode === 'purchase') {
        const url = new URL(access.checkoutUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'nodedojo.gumroad.com' || !url.pathname.startsWith('/l/')) throw new Error('invalid_checkout');
        status.textContent = 'Opening checkout…';
        location.assign(url.href);
      } else if (access.mode === 'download') {
        download.disabled = true;
        status.textContent = 'Preparing your download…';
        const response = await fetch(`/api/prints/download?handle=${encodeURIComponent(product.slug)}`, { credentials: 'same-origin', cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('download_unavailable');
        const result = await response.json();
        const url = new URL(result.url);
        if (url.protocol !== 'https:') throw new Error('invalid_download');
        location.assign(url.href);
        status.textContent = 'Your download is ready.';
        download.disabled = false;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.textContent = 'Your download could not be opened. Select Download to try again.';
      download.disabled = false;
    }
  });

  function open(slug, trigger, pushHistory = true) {
    const selected = printProducts.find(item => item.slug === slug);
    if (!selected || (dialog.open && product?.slug === slug && !dialog.classList.contains('is-closing'))) return;
    clearTimeout(closeTimer);
    dialog.classList.remove('is-closing');
    product = selected;
    dialog.dataset.product = product.slug;
    opener = trigger || document.querySelector(`.print-hotspot[data-details="${slug}"]`);
    dialog.querySelector('#print-details-title').textContent = product.name;
    dialog.querySelector('[data-document-reference]').textContent = product.reference;
    dialog.querySelector('[data-document-index]').textContent = product.documentIndex;
    dialog.querySelector('[data-details-price]').textContent = product.price;
    dialog.querySelector('[data-details-price-label]').textContent = '3D print files';
    const url = new URL(location.href);
    url.searchParams.set('product', slug);
    url.searchParams.set('details', '1');
    signin.href = `/v3/onboarding/create-account/?mode=signin&next=${encodeURIComponent(url.pathname + url.search)}`;
    signin.hidden = false;
    if (pushHistory) history.pushState({ printDetails: true }, '', url);
    renderDescription();
    renderGallery();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('[autofocus]').focus({ preventScroll: true });
    inspectAccess();
  }

  function close() {
    if (!dialog.open) return;
    request?.abort();
    dialog.querySelectorAll('video').forEach(video => video.pause());
    dialog.classList.add('is-closing');
    const finish = () => {
      dialog.close();
      dialog.classList.remove('is-closing');
      opener?.focus({ preventScroll: true });
    };
    clearTimeout(closeTimer);
    if (reducedMotion()) finish();
    else closeTimer = setTimeout(finish, 220);
  }

  function requestClose() {
    if (history.state?.printDetails) history.back();
    else {
      const url = new URL(location.href);
      url.searchParams.delete('details');
      history.replaceState(null, '', url);
      close();
    }
  }
  dialog.querySelectorAll('[data-details-close]').forEach(button => button.addEventListener('click', requestClose));
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  document.querySelectorAll('[data-details]').forEach(button => {
    button.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
    button.addEventListener('click', event => {
      const dragged = event.detail > 0 && pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12;
      pointerStart = null;
      if (!dragged) open(button.dataset.details, button);
    });
  });
  return { restoreFromUrl() {
    const url = new URL(location.href);
    if (url.searchParams.get('details') === '1') open(url.searchParams.get('product'), null, false);
    else close();
  } };
}
