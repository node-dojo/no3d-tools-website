const video = document.querySelector('[data-reel-video]');
if (video) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  let loaded = false;
  let sequence = 0;
  const canPlay = () => inView && !document.hidden && !preference.matches;
  const sync = () => {
    const request = ++sequence;
    if (!canPlay()) { video.pause(); return; }
    if (!loaded) {
      video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
      video.load();
      loaded = true;
    }
    video.muted = true;
    video.play().then(() => {
      if (request !== sequence && !canPlay()) video.pause();
    }).catch(() => {});
  };
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.15;
      sync();
    }, { threshold: 0.15 }).observe(video);
  } else { inView = true; sync(); }
}
