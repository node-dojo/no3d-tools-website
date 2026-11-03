// Muted inline playback keeps product motion automatic without player chrome.
export function configureCarouselVideo(video, media) {
  video.controls = false;
  video.playsInline = true;
  video.defaultMuted = true;
  video.muted = true;
  video.loop = true;
  video.preload = 'none';
  video.poster = media.poster || '';
  video.setAttribute('aria-label', media.alt);
}

export function syncCarouselVideos(gallery, activeIndex, enabled = true) {
  [...gallery.children].forEach((slide, index) => {
    const video = slide.querySelector('video');
    if (!video) return;
    const play = enabled && !document.hidden && index === activeIndex;
    video.autoplay = play;
    if (!play) video.pause();
    else if (video.paused) void video.play().catch(() => {
      // A slide change can cancel play; browsers may also refuse autoplay.
      // Keep the poster visible and retry on the next activation.
    });
  });
}
