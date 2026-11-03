// Keep GIFs out of the initial download and animate only the selected slide.
// Small source-frame posters also keep the thumbnail strip still.
export function configureCarouselImage(image, media) {
  image.alt = media.alt;
  image.decoding = 'async';
  if (media.animated && media.poster) {
    image.dataset.animationSrc = media.src;
    image.dataset.animationPoster = media.poster;
    image.src = media.poster;
  } else image.src = media.src;
}

export function syncCarouselImages(gallery, activeIndex, enabled = true) {
  [...gallery.children].forEach((slide, index) => {
    const image = slide.querySelector('img[data-animation-src]');
    if (!image) return;
    const src = enabled && !document.hidden && index === activeIndex
      ? image.dataset.animationSrc : image.dataset.animationPoster;
    if (image.getAttribute('src') !== src) image.src = src;
  });
}
