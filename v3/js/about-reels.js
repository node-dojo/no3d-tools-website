const video = document.querySelector('[data-reel-video]');
const toggle = document.querySelector('[data-reel-toggle]');
if (video && toggle) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  let pausedByUser = false;
  let explicitPlay = false;
  let loaded = false;
  let sequence = 0;
  toggle.hidden = false;
  const updateLabel = () => {
    const playing = !video.paused;
    toggle.textContent = playing ? 'Pause animation' : 'Play animation';
  };
  const sync = () => {
    const request = ++sequence;
    const shouldPlay = inView && !document.hidden && !pausedByUser && (!preference.matches || explicitPlay);
    if (!shouldPlay) { video.pause(); updateLabel(); return; }
    if (!loaded) {
      video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
      video.load();
      loaded = true;
    }
    video.muted = true;
    video.play().then(() => {
      if (request !== sequence && (!inView || document.hidden || pausedByUser || (preference.matches && !explicitPlay))) video.pause();
      updateLabel();
    }).catch(updateLabel);
  };
  toggle.addEventListener('click', () => {
    if (!video.paused) { pausedByUser = true; }
    else { pausedByUser = false; explicitPlay = true; }
    sync();
  });
  video.addEventListener('play', updateLabel);
  video.addEventListener('pause', updateLabel);
  preference.addEventListener('change', () => { explicitPlay = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(video);
  } else { inView = true; sync(); }
  updateLabel();
}
