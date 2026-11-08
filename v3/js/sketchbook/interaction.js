import { isFitView, panLimits, viewLimits } from './view-navigation.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const limits = viewLimits('three');

export function controlBook(stage, sheet) {
  const state = { progress: .5050505, zoom: 1, panX: 0, panY: 0 };
  const fingers = new Map();
  let renderer, drag, pinch, multiTouch = false, lastTap, lastTouch = -Infinity;
  let playback = 0, wheelLift = 0, lastWheel = -Infinity;

  function pause() {
    cancelAnimationFrame(playback);
    playback = 0;
  }
  function togglePlayback() {
    if (playback) { pause(); return; }
    if (state.progress >= 1) state.progress = 0;
    let previous = performance.now();
    function advance(now) {
      state.progress = Math.min(1, state.progress + Math.min(50,now-previous)/8000);
      previous = now;
      present();
      playback = state.progress < 1 ? requestAnimationFrame(advance) : 0;
    }
    playback = requestAnimationFrame(advance);
  }

  function present() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    const bounds = panLimits({width: stage.clientWidth, height: stage.clientHeight}, state.zoom, 'three');
    state.panX = clamp(state.panX, -bounds.x, bounds.x);
    state.panY = clamp(state.panY, -bounds.y, bounds.y);
    renderer?.setState(state);
  }

  function point(event) { return { x: event.clientX, y: event.clientY }; }
  function captureView() { if (renderer) Object.assign(state, renderer.captureView()); }
  function centerPointer() { renderer?.setPointer(0, 0); }
  function pair() {
    const [a, b] = fingers.values();
    return { x: (a.x+b.x)/2/stage.clientWidth-.5, y: (a.y+b.y)/2/stage.clientHeight-.5,
      distance: Math.max(1, Math.hypot(a.x-b.x, a.y-b.y)) };
  }
  function zoomAt(zoom, x, y) {
    const next = clamp(zoom, limits.min, limits.max);
    const ratio = next/state.zoom;
    state.panX = x - (x-state.panX)*ratio;
    state.panY = y - (y-state.panY)*ratio;
    state.zoom = next;
    present();
    renderer?.reactToMotion({zoomDelta: Math.log(ratio), anchorX: x*2, anchorY: y*2});
  }
  function inspect(event) {
    if (isFitView(state)) zoomAt(2.5, event.clientX/stage.clientWidth-.5, event.clientY/stage.clientHeight-.5);
    else { Object.assign(state, {zoom:1, panX:0, panY:0}); present(); }
  }
  function reset() {
    pause();
    fingers.clear();
    drag = pinch = lastTap = null;
    multiTouch = false;
    centerPointer();
  }

  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || sheet.closing()) return;
    pause();
    fingers.set(event.pointerId, point(event));
    stage.setPointerCapture(event.pointerId);
    if (event.pointerType === 'touch') lastTouch = performance.now();
    if (fingers.size === 1 && !multiTouch) {
      const mouse = event.pointerType !== 'touch';
      if (mouse) captureView();
      else renderer?.setPointer(event.clientX/stage.clientWidth*2-1, event.clientY/stage.clientHeight*2-1);
      drag = { ...point(event), ...state,
        kind: mouse && (event.shiftKey || !isFitView(state)) ? 'pan' : 'pending', moved:false };
    } else {
      if (drag?.kind === 'lower') sheet.offset(0);
      multiTouch = true;
      lastTap = drag = null;
      centerPointer();
      if (fingers.size === 2) {
        captureView();
        const start = pair();
        pinch = {...state, start, last:start};
      } else pinch = null;
    }
  });
  stage.addEventListener('pointermove', event => {
    if (!fingers.has(event.pointerId)) {
      if (!fingers.size && event.pointerType === 'mouse')
        renderer?.setPointer(event.clientX/stage.clientWidth*2-1, event.clientY/stage.clientHeight*2-1);
      return;
    }
    fingers.set(event.pointerId, point(event));
    if (multiTouch) {
      if (fingers.size !== 2 || !pinch) return;
      const now = pair(), previousZoom = state.zoom;
      state.zoom = clamp(pinch.zoom * now.distance/pinch.start.distance, limits.min, limits.max);
      state.panX = now.x - (pinch.start.x-pinch.panX)*state.zoom/pinch.zoom;
      state.panY = now.y - (pinch.start.y-pinch.panY)*state.zoom/pinch.zoom;
      present();
      renderer?.reactToMotion({panX:now.x-pinch.last.x, panY:now.y-pinch.last.y,
        zoomDelta:Math.log(state.zoom/previousZoom), anchorX:now.x*2, anchorY:now.y*2});
      pinch.last = now;
      return;
    }
    if (!drag) return;
    const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
    if (Math.hypot(dx,dy) < 7 && !drag.moved) return;
    drag.moved = true;
    lastTap = null;
    if (drag.kind === 'pending') {
      if (Math.abs(dx) > Math.abs(dy)*1.2) drag.kind = 'turn';
      else if (dy > Math.abs(dx)*1.2) drag.kind = 'lower';
      else return;
    }
    if (drag.kind === 'lower') sheet.offset(clamp(dy, 0, stage.clientHeight));
    if (drag.kind === 'turn') state.progress = clamp(drag.progress-dx/stage.clientWidth*.25,0,1);
    if (drag.kind === 'pan') {
      const oldX = state.panX, oldY = state.panY;
      state.panX = drag.panX+dx/stage.clientWidth;
      state.panY = drag.panY+dy/stage.clientHeight;
      present();
      renderer?.reactToMotion({panX:state.panX-oldX,panY:state.panY-oldY});
    } else if (drag.kind === 'turn') present();
  });
  function end(event) {
    if (!fingers.delete(event.pointerId)) return;
    const released = event.type === 'pointerup';
    if (drag?.kind === 'lower') {
      if (released && event.clientY-drag.y >= sheet.threshold()) sheet.dismiss();
      else sheet.settle();
    } else if (released && !multiTouch && !drag?.moved && event.pointerType === 'touch') {
      const now = performance.now();
      if (lastTap && now-lastTap.at < 320 && Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<32) {
        inspect(event); lastTap = null;
      } else lastTap = {...point(event),at:now};
    }
    drag = pinch = null;
    if (!fingers.size) { multiTouch = false; centerPointer(); }
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,end);
  stage.addEventListener('pointerleave', () => { if (!fingers.size) centerPointer(); });
  stage.addEventListener('dblclick', event => { if (performance.now()-lastTouch>600) inspect(event); });
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomAt(state.zoom * Math.exp(-event.deltaY*.012),
        event.clientX/stage.clientWidth-.5, event.clientY/stage.clientHeight-.5);
    } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)*1.25) {
      state.progress = clamp(state.progress + event.deltaX/stage.clientWidth*.25,0,1);
      present();
    } else {
      const now = performance.now();
      if (now-lastWheel>150 || event.deltaY>=0) wheelLift=0;
      lastWheel=now;
      const unit = event.deltaMode===1 ? 16 : event.deltaMode===2 ? stage.clientHeight : 1;
      wheelLift+=Math.max(0,-event.deltaY)*unit;
      if (wheelLift>=48) { wheelLift=0; sheet.wheelDismiss(); }
    }
  }, {passive:false});
  stage.addEventListener('keydown', event => {
    if (event.key === ' ') {
      event.preventDefault();
      togglePlayback();
      return;
    }
    if (['ArrowDown','PageDown','Home','End'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      pause();
      event.preventDefault();
      const right = event.key === 'ArrowRight';
      const stops = sheet.pageStops;
      state.progress = right ? stops.find(p=>p>state.progress+.002)??1 : stops.findLast(p=>p<state.progress-.002)??0;
      present();
    } else if (['+','=','-'].includes(event.key)) {
      event.preventDefault(); zoomAt(state.zoom*(event.key==='-'?1/1.4:1.4),0,0);
    } else if (event.key === '0') {
      Object.assign(state,{zoom:1,panX:0,panY:0}); present();
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault(); sheet.dismiss();
    }
  });
  return {
    attach(value) { renderer=value; present(); }, present, reset,
    configure({pageStops, initialProgress}) {
      reset();
      sheet.pageStops = pageStops;
      Object.assign(state, {progress:initialProgress, zoom:1, panX:0, panY:0});
      present();
    }
  };
}
