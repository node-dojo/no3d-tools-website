import { configureCarouselVideo, syncCarouselVideos } from './carousel-video.js?v=autoplay-20261102';
import { configureCarouselImage, syncCarouselImages } from './carousel-image.js?v=gifs-20261103';

export function createProductGallery(root, media) {
  const gallery = root.querySelector('[data-gallery]');
  const thumbnails = root.querySelector('[data-thumbnails]');
  const previous = root.querySelector('[data-previous]');
  const next = root.querySelector('[data-next]');
  let index = 0;
  let timer;
  function sync(value) {
    index = Math.max(0, Math.min(media.length - 1, value));
    [...gallery.children].forEach((slide, i) => {
      slide.inert = i !== index;
    });
    syncCarouselVideos(gallery, index);
    syncCarouselImages(gallery, index);
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    previous.disabled = index === 0;
    next.disabled = index === media.length - 1;
    root.querySelector('[data-position]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(media.length).padStart(2, '0')}`;
  }
  function go(value, smooth = true) {
    sync(value);
    gallery.scrollTo({ left: index * gallery.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
  }
  for (const [i, item] of media.entries()) {
    const slide = document.createElement('figure');
    slide.className = 'landing-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${media.length}: ${item.alt}`);
    const visual = document.createElement(item.type === 'video' ? 'video' : 'img');
    if (item.type === 'video') {
      visual.src = item.src;
      configureCarouselVideo(visual, item);
    } else {
      configureCarouselImage(visual, item); visual.loading = i ? 'lazy' : 'eager';
      if (!i) visual.fetchPriority = 'high';
    }
    slide.append(visual); gallery.append(slide);
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show ${item.animated ? 'animation' : item.type === 'video' ? 'video' : 'photo'} ${i + 1}: ${item.alt}`);
    const thumb = document.createElement('img');
    thumb.src = item.poster || item.src; thumb.alt = ''; thumb.loading = 'lazy';
    button.append(thumb);
    if (item.type === 'video') { const marker = document.createElement('span'); marker.className = 'video-marker'; marker.textContent = '▶'; marker.setAttribute('aria-hidden', 'true'); button.append(marker); }
    button.addEventListener('click', () => go(i)); thumbnails.append(button);
  }
  previous.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  gallery.addEventListener('keydown', event => {
    if (event.target !== gallery || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); go(event.key === 'Home' ? 0 : event.key === 'End' ? media.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
  });
  gallery.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(() => { if (gallery.clientWidth) sync(Math.round(gallery.scrollLeft / gallery.clientWidth)); }, 120); }, { passive: true });
  new ResizeObserver(() => go(index, false)).observe(gallery);
  document.addEventListener('visibilitychange', () => { syncCarouselVideos(gallery, index); syncCarouselImages(gallery, index); });
  sync(0);
}
