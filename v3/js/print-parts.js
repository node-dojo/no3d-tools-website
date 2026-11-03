// Display-only derivatives of the included STLs. Paid originals use Commerce.
const engine = () => import('../vendor/three/three-0.160.1.module.min.js');
const home = () => ({ yaw: -Math.PI / 4, elevation: .58, zoom: 1 });

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function decodePreview(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || view.getUint32(0, false) !== 0x4e334450) throw Error('Invalid preview');
  const vertices = view.getUint32(4, true), triangles = view.getUint32(8, true);
  if (!vertices || !triangles || vertices > 200000 || triangles > 100000 || buffer.byteLength !== 12 + vertices * 12 + triangles * 12) throw Error('Invalid preview size');
  const positions = new Float32Array(buffer, 12, vertices * 3);
  const indices = new Uint32Array(buffer, 12 + vertices * 12, triangles * 3);
  if (positions.some(value => !Number.isFinite(value) || Math.abs(value) > 1.01) || indices.some(index => index >= vertices)) throw Error('Invalid preview geometry');
  return { positions, indices };
}

async function createViewer(stage, part, expanded, signal, initialView) {
  const [THREE, response] = await Promise.all([engine(), fetch(part.src, { signal })]);
  if (!response.ok) throw Error('Preview unavailable');
  const data = decodePreview(await response.arrayBuffer());
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const canvas = element('canvas', 'part-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#a7a49c', roughness: .85, metalness: 0, flatShading: true });
  scene.add(new THREE.Mesh(geometry, material));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50504b, 2));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, -4, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .8);
  fill.position.set(4, 2, 1); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(36, 1, .01, 100);
  camera.up.set(0, 0, 1);
  let state = initialView ? { ...initialView } : home(), frame = 0, disposed = false;
  const pointers = new Map();
  let gesture, lastPinch = 0, suppressClick = false;

  function render() {
    frame = 0;
    if (disposed) return;
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const distance = 1.12 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect) / state.zoom;
    camera.position.set(Math.cos(state.yaw) * Math.cos(state.elevation), Math.sin(state.yaw) * Math.cos(state.elevation), Math.sin(state.elevation)).multiplyScalar(distance);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    // Useful for acceptance without exposing a renderer or source geometry globally.
    stage.dataset.view = [state.yaw, state.elevation, state.zoom].map(n => n.toFixed(3)).join(',');
  }
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(render); }
  function zoom(value) { state.zoom = Math.min(2.5, Math.max(.7, value)); schedule(); }
  function reset() { state = home(); schedule(); }
  const options = { signal };
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    suppressClick = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    gesture = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, touch: event.pointerType === 'touch', locked: false };
    if (pointers.size === 2) lastPinch = pinchDistance();
  }, options);
  function pinchDistance() { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; }
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (expanded && pointers.size === 2) {
      const distance = pinchDistance();
      if (lastPinch > 0) zoom(state.zoom * distance / lastPinch);
      lastPinch = distance; suppressClick = true; return;
    }
    const dx = event.clientX - gesture.lastX, dy = event.clientY - gesture.lastY;
    const totalX = event.clientX - gesture.x, totalY = event.clientY - gesture.y;
    if (!gesture.locked && Math.hypot(totalX, totalY) < 6) return;
    if (!expanded && gesture.touch && !gesture.locked && Math.abs(totalY) > Math.abs(totalX)) return;
    gesture.locked = true; suppressClick = true;
    state.yaw -= dx * .009;
    if (expanded || !gesture.touch) state.elevation = Math.min(1.48, Math.max(-1.48, state.elevation + dy * .009));
    gesture.lastX = event.clientX; gesture.lastY = event.clientY; schedule();
  }, options);
  function end(event) { pointers.delete(event.pointerId); lastPinch = 0; gesture = null; }
  stage.addEventListener('pointerup', end, options);
  stage.addEventListener('pointercancel', event => { suppressClick = true; end(event); }, options);
  stage.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, { ...options, capture: true });
  stage.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return reset();
    if (['+', '=', '-'].includes(event.key)) return zoom(state.zoom * (event.key === '-' ? .9 : 1.1));
    if (event.key === 'ArrowLeft') state.yaw += .15;
    if (event.key === 'ArrowRight') state.yaw -= .15;
    if (event.key === 'ArrowUp') state.elevation = Math.min(1.48, state.elevation + .15);
    if (event.key === 'ArrowDown') state.elevation = Math.max(-1.48, state.elevation - .15);
    schedule();
  }, options);
  if (expanded) stage.addEventListener('wheel', event => { event.preventDefault(); zoom(state.zoom * Math.exp(-event.deltaY * .001)); }, { ...options, passive: false });
  const resize = new ResizeObserver(schedule); resize.observe(stage);
  stage.replaceChildren(canvas); stage.dataset.state = 'ready'; schedule();
  const dispose = () => {
    disposed = true; cancelAnimationFrame(frame); resize.disconnect();
    geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove();
  };
  signal.addEventListener('abort', dispose, { once: true });
  canvas.addEventListener('webglcontextlost', event => {
    if (disposed) return;
    event.preventDefault(); stage.dataset.state = 'error';
    stage.replaceChildren(element('span', 'part-state', 'Preview interrupted. Tap to retry.'));
  }, options);
  return { reset, zoomIn: () => zoom(state.zoom * 1.2), zoomOut: () => zoom(state.zoom / 1.2) };
}

export function mountPrintParts(host, product) {
  const scope = new AbortController();
  const loads = new Map();
  let expanded;
  const section = element('section', 'print-parts');
  section.setAttribute('aria-label', 'Included in Download');
  section.append(element('h3', 'print-parts-heading', 'Included in Download:'));
  const hint = element('p', 'print-parts-hint', 'Drag to rotate · Tap to enlarge');
  section.append(hint);
  const grid = element('div', 'print-parts-grid'); section.append(grid);
  host.append(section);

  function closeExpanded() { if (expanded?.open) expanded.close(); }
  function enlarge(part, opener) {
    if (expanded) return;
    const modal = element('dialog', 'parts-expanded'); expanded = modal;
    const title = element('h3', 'parts-expanded-title', part.name); title.id = 'parts-expanded-title';
    modal.setAttribute('aria-labelledby', title.id);
    const close = element('button', 'part-control', 'Close ×'); close.type = 'button'; close.autofocus = true;
    const top = element('header', 'parts-expanded-header'); top.append(title, close);
    const stage = element('div', 'part-stage part-stage-expanded'); stage.tabIndex = 0;
    stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', `${part.name}. Drag to rotate. Pinch to zoom. Arrow keys rotate; plus and minus zoom; Home resets.`);
    const footer = element('footer', 'parts-expanded-footer');
    const minus = element('button', 'part-control', 'Zoom −'), plus = element('button', 'part-control', 'Zoom +'), reset = element('button', 'part-control', 'Reset view');
    for (const button of [minus, plus, reset]) button.type = 'button';
    footer.append(minus, plus, reset);
    modal.append(top, stage, element('p', 'print-parts-hint', 'Drag to rotate · Pinch to zoom'), footer);
    document.body.append(modal); modal.showModal();
    const [yaw, elevation, zoom] = (opener.dataset.view || '').split(',').map(Number);
    const initialView = [yaw, elevation, zoom].every(Number.isFinite) ? { yaw, elevation, zoom } : undefined;
    async function reload() {
      for (const button of [minus, plus, reset]) button.disabled = true;
      const view = await load(stage, part, true, initialView);
      if (!view) return;
      for (const button of [minus, plus, reset]) button.disabled = false;
      minus.onclick = view.zoomOut; plus.onclick = view.zoomIn; reset.onclick = view.reset;
    }
    stage.onclick = () => { if (stage.dataset.state === 'error') void reload(); };
    stage.addEventListener('keydown', event => {
      if (stage.dataset.state === 'error' && ['Enter', ' '].includes(event.key)) { event.preventDefault(); void reload(); }
    });
    void reload();
    close.onclick = closeExpanded;
    modal.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); closeExpanded(); });
    modal.addEventListener('close', () => {
      loads.get(stage)?.abort(); loads.delete(stage);
      modal.remove(); expanded = null;
      if (opener.isConnected) opener.focus({ preventScroll: true });
    }, { once: true });
  }

  async function load(stage, part, full = false, initialView) {
    if (scope.signal.aborted) return;
    loads.get(stage)?.abort();
    const controller = new AbortController(); loads.set(stage, controller);
    stage.dataset.state = 'loading';
    stage.replaceChildren(element('span', 'part-state', 'Loading 3D preview…'));
    try {
      return await createViewer(stage, part, full, controller.signal, initialView);
    } catch (error) {
      if (controller.signal.aborted) return;
      stage.dataset.state = 'error';
      stage.replaceChildren(element('span', 'part-state', '3D preview unavailable. Tap to retry.'));
    }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer.unobserve(entry.target);
      void load(entry.target, product.previewParts[Number(entry.target.dataset.partIndex)]);
    }
  }, { rootMargin: '150px' });
  product.previewParts.forEach((part, index) => {
    const figure = element('figure', 'print-part');
    const stage = element('button', 'part-stage'); stage.type = 'button'; stage.dataset.partIndex = index;
    stage.setAttribute('aria-label', `${part.name}: drag to rotate or activate to enlarge. Arrow keys rotate; Home resets.`);
    stage.append(element('span', 'part-state', '3D preview'));
    const caption = element('figcaption', 'part-caption');
    caption.append(element('span', '', part.name), element('span', 'part-format', 'STL'));
    figure.append(stage, caption); grid.append(figure); observer.observe(stage);
    stage.addEventListener('click', () => {
      if (stage.dataset.state === 'error') void load(stage, part);
      else enlarge(part, stage);
    }, { signal: scope.signal });
  });
  for (const text of product.previewNotes || []) section.append(element('p', 'print-parts-note', text));
  if (product.dimensions?.length) {
    const table = element('table', 'print-dimensions');
    table.append(element('caption', '', 'Approx. assembled dimensions (mm)'));
    const head = table.createTHead().insertRow();
    for (const label of ['Version', 'Width', 'Depth', 'Height']) {
      const cell = element('th', '', label); cell.scope = 'col'; head.append(cell);
    }
    const body = table.createTBody();
    for (const part of product.dimensions) {
      const row = body.insertRow();
      const name = element('th', '', part.name); name.scope = 'row';
      row.append(name, ...part.sizeMm.map(n => element('td', '', n.toFixed(0))));
    }
    section.append(table);
  }
  return () => {
    scope.abort(); observer.disconnect(); closeExpanded();
    for (const controller of loads.values()) controller.abort();
    loads.clear(); section.remove();
  };
}
