import { controlBook } from './sketchbook/interaction.js';

const assets = '/v3/assets/sketchbook/';
const pageStops = [0,.099,.18,.261,.342,.423,.504,.585,.666,.747,.828,.909,.99];
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountPrintSketchbook() {
  const dialog = document.createElement('dialog');
  dialog.className = 'print-sketchbook';
  dialog.setAttribute('aria-label','Sketchbook');
  const stage = document.createElement('div');
  stage.className = 'book-stage';
  stage.tabIndex = 0;
  stage.setAttribute('aria-label','Sketchbook. Swipe sideways to turn pages. Pinch and drag with two fingers to inspect. Swipe down or press Escape to lower.');
  const sheet = document.createElement('div');
  sheet.className = 'book-sheet';
  let canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label','Animated 3D sketchbook');
  const poster = new Image();
  poster.alt = '';
  const status = document.createElement('div');
  status.className = 'book-status';
  status.setAttribute('role','status');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry';
  const accessibleClose = document.createElement('button');
  accessibleClose.type = 'button';
  accessibleClose.className = 'book-access';
  accessibleClose.textContent = 'Lower sketchbook';
  sheet.append(poster, canvas);
  stage.append(sheet);
  dialog.append(stage, status, accessibleClose);
  document.body.append(dialog);

  let renderer, loading, failed = false, returnFocus, contact, closeTimer, suppressClickUntil = 0;
  let attempt = 0;
  let travel = innerHeight, lastSheetWheel = -Infinity;
  const atEdge = y => y >= innerHeight-Math.min(130, innerHeight*.2);
  const threshold = () => Math.min(100, innerHeight*.12);
  const controls = controlBook(stage, {
    threshold, offset, dismiss, pageStops,
    wheelDismiss() { lastSheetWheel = performance.now(); dismiss(); },
    closing: () => dialog.dataset.phase === 'closing',
    settle: () => animateTo(0)
  });
  function offset(pixels) {
    sheet.classList.remove('book-animating');
    sheet.style.transform = 'translateY('+pixels+'px)';
  }
  function animateTo(pixels) {
    sheet.classList.add('book-animating');
    sheet.style.transform = 'translateY('+pixels+'px)';
  }
  function resize() {
    if (!renderer || !dialog.open) return;
    renderer.resize(stage.clientWidth,stage.clientHeight,Math.min(devicePixelRatio,2));
    controls.present();
  }
  new ResizeObserver(resize).observe(stage);
  function showFailure() {
    failed = true;
    dialog.dataset.ready = 'false';
    status.replaceChildren(document.createTextNode('Sketchbook could not load. '),retry);
  }
  async function prepare() {
    const version = attempt;
    if (!loading) {
      const surface = canvas;
      loading = (async () => {
        const {createThreeRenderer} = await import('./sketchbook/three-renderer.js');
        const book = await createThreeRenderer(surface, {three:{manifest:assets+'manifest.json.gz'}}, {
          onError: () => { if (version === attempt) showFailure(); }
        });
        if (version !== attempt) { book.destroy(); return; }
        renderer = book;
        controls.attach(renderer);
      })();
    }
    try {
      await loading;
      if (version !== attempt || !dialog.open || dialog.dataset.phase === 'closing') return;
      renderer.setActive(!document.hidden);
      resize();
      await renderer.ready;
      if (!failed) dialog.dataset.ready = 'true';
    } catch { if (version === attempt) showFailure(); }
  }
  retry.addEventListener('click', () => {
    attempt++;
    controls.attach(null);
    renderer?.destroy();
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
    renderer = loading = null;
    failed = false;
    status.replaceChildren();
    prepare();
  });
  function open(underFinger = false) {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    if (!poster.hasAttribute('src')) poster.src = assets+'open.webp';

    dialog.dataset.phase = 'open';
    dialog.showModal();
    const {clientWidth:width, clientHeight:height} = stage;
    // The first painted row of the flat opening pose is at 193 / 768.
    const top = renderer?.upperEdge(width,height) ?? height/2 + (193/768-.5)*Math.min(width,height);
    travel = Math.max(1,height-Math.max(0,top)+2);
    offset(travel);
    stage.focus({preventScroll:true});
    // Flush the offscreen starting position before the first compositor transition.
    sheet.getBoundingClientRect();
    if (!underFinger) animateTo(0);
    if (!failed) prepare();
  }
  function finishClose() {
    if (!dialog.open) return;
    clearTimeout(closeTimer);
    dialog.close();
    dialog.dataset.phase = 'closed';
    renderer?.setActive(false);
    controls.reset();
    returnFocus?.focus?.({preventScroll:true});
  }
  function dismiss() {
    if (!dialog.open || dialog.dataset.phase === 'closing') return;
    dialog.dataset.phase = 'closing';
    animateTo(stage.clientHeight);
    if (reduceMotion()) finishClose();
    else closeTimer = setTimeout(finishClose,310);
  }
  accessibleClose.addEventListener('click',dismiss);
  dialog.addEventListener('cancel',event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('wheel',event => event.preventDefault(),{passive:false});
  document.addEventListener('visibilitychange', () => {
    renderer?.setActive(!document.hidden && dialog.open && dialog.dataset.phase !== 'closing');
    if (document.hidden) controls.reset();
  });
  window.addEventListener('popstate',finishClose);

  function eligible(target) {
    if (dialog.open || target.closest('input, textarea, select, [contenteditable=true], .part-stage, .storefront-destinations')) return false;
    if (document.querySelector('dialog[open]:not(.print-sketchbook):not([data-print-details])')) return false;
    const modal = document.querySelector('dialog[open]:not(.print-sketchbook)');
    if (modal && (!modal.matches('[data-print-details]') || !modal.contains(target))) return false;
    return !document.querySelector('#prints-search:not([hidden])');
  }
  // Observe gestures on the product itself so the bottom row keeps its tap targets.
  window.addEventListener('touchstart',event => {
    if (event.touches.length !== 1) {
      if (contact?.pulling) dismiss();
      contact = null;
      return;
    }
    const finger = event.touches[0];
    contact = atEdge(finger.clientY) && eligible(event.target)
      ? {id:finger.identifier,x:finger.clientX,y:finger.clientY,lift:0,pulling:false} : null;
  }, {capture:true,passive:true});
  window.addEventListener('touchmove',event => {
    if (!contact) return;
    const finger = [...event.touches].find(t=>t.identifier===contact.id);
    if (!finger) return;
    const dx = Math.abs(finger.clientX-contact.x), lift = contact.y-finger.clientY;
    if (!contact.pulling) {
      if (dx>7 && dx>Math.abs(lift)*1.2 || lift < -7) { contact=null; return; }
      if (lift<=0 || lift<=dx*1.2) return;
      if (event.cancelable) event.preventDefault();
      if (lift<7) return;
      contact.pulling = true;
      open(true);
    }
    if (event.cancelable) event.preventDefault();
    contact.lift = Math.max(0,lift);
    offset(Math.max(0,travel-contact.lift));
  }, {capture:true,passive:false});
  function endTouch(event) {
    if (contact?.pulling) {
      suppressClickUntil = performance.now()+450;
      if (event.type==='touchend' && contact.lift >= threshold()) animateTo(0);
      else dismiss();
    }
    contact = null;
  }
  window.addEventListener('touchend',endTouch,{capture:true,passive:true});
  window.addEventListener('touchcancel',endTouch,{capture:true,passive:true});
  window.addEventListener('click',event => {
    if (performance.now()<suppressClickUntil && !dialog.contains(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  },true);

  let wheelAmount = 0, lastWheel = -Infinity;
  window.addEventListener('wheel',event => {
    if (event.ctrlKey || event.metaKey) return;
    const now = performance.now();
    if (now-lastSheetWheel < 170) {
      lastSheetWheel=now;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!eligible(event.target) || event.deltaY<=Math.abs(event.deltaX)*1.25) return;
    const catalogPhoto = event.target.closest('[data-print-carousel]');
    if (!catalogPhoto && !atEdge(event.clientY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (now-lastWheel>150) wheelAmount=0;
    lastWheel=now;
    const unit = event.deltaMode===1 ? 16 : event.deltaMode===2 ? innerHeight : 1;
    wheelAmount+=event.deltaY*unit;
    if (wheelAmount>=48) { wheelAmount=0; lastSheetWheel=now; open(); }
  },{capture:true,passive:false});

  const entries = [document.body, document.querySelector('.print-document-footer')].filter(Boolean);
  for (const container of entries) {
    const entry=document.createElement('button');
    entry.type='button';
    entry.className='book-access';
    entry.textContent='Open sketchbook';
    entry.addEventListener('click',()=>open());
    container.append(entry);
  }
}
