const API = '/__solvet-site-editor';

function request(path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  }).then(async response => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.message || payload.error || 'Site Editor operation failed.'), { code: payload.error });
    return payload;
  });
}

function introFromText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function placeCaret(node) {
  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function overlay() {
  const root = document.createElement('section');
  root.className = 'solvet-site-editor is-minimized';
  root.dataset.siteEditor = '';
  root.setAttribute('aria-label', 'Solvet Site Editor');
  root.innerHTML = `
    <button class="solvet-editor-orb" type="button" data-editor-toggle aria-expanded="false" aria-label="Open Solvet Site Editor"><span>S</span><i data-editor-attention hidden></i></button>
    <div class="solvet-editor-window" data-editor-window hidden>
      <header><div><b>SOLVET</b><span>Site Editor</span></div><button type="button" data-editor-minimize aria-label="Minimize Site Editor">−</button></header>
      <div class="solvet-editor-context"><strong data-editor-product>Product</strong><span data-editor-source>Authored source</span></div>
      <p class="solvet-editor-state" data-editor-state aria-live="polite">Ready</p>
      <div class="solvet-editor-media" data-editor-media hidden><span>Thumbnail</span><div data-editor-media-list></div></div>
      <div class="solvet-editor-diff" data-editor-diff hidden></div>
      <div class="solvet-editor-actions">
        <button type="button" data-editor-review disabled>Review change</button>
        <button type="button" data-editor-apply disabled>Apply to source</button>
        <button type="button" data-editor-publish disabled>Publish</button>
      </div>
      <button class="solvet-editor-discard" type="button" data-editor-discard disabled>Discard draft</button>
    </div>`;
  document.body.append(root);
  return root;
}

function setExpanded(root, expanded) {
  root.classList.toggle('is-minimized', !expanded);
  root.querySelector('[data-editor-window]').hidden = !expanded;
  const toggle = root.querySelector('[data-editor-toggle]');
  toggle.hidden = expanded;
  toggle.setAttribute('aria-expanded', String(expanded));
}

function setRenderedIntro(value) {
  const lede = document.querySelector('[data-product-lede]');
  if (lede) lede.textContent = value;
  const description = document.querySelector('[data-description] p');
  if (description) description.textContent = value;
  const purpose = document.querySelector('[data-purpose]');
  if (purpose) purpose.textContent = value;
}

export async function startSiteEditor({ handle }) {
  const session = await request('/session');
  if (!session.available || session.mode !== 'content') return null;
  const inspected = await request(`/products/${encodeURIComponent(handle)}`);
  const ui = overlay();
  const lede = document.querySelector('[data-product-lede]');
  if (!lede) return null;

  const key = `solvet_site_editor_draft_${handle}`;
  const stored = JSON.parse(localStorage.getItem(key) || 'null');
  const draftIsCurrent = stored?.sourceRevision === inspected.source_revision && typeof stored?.descriptionIntro === 'string';
  const state = {
    sourceRevision: inspected.source_revision,
    original: inspected.description_intro,
    draft: draftIsCurrent ? stored.descriptionIntro : inspected.description_intro,
    plan: null,
    mediaRevision: inspected.media_revision,
    originalThumbnail: inspected.media.thumbnail_media_id,
    draftThumbnail: inspected.media.thumbnail_media_id,
    mediaPlan: null,
    applied: false,
    activeMode: 'description',
  };

  ui.querySelector('[data-editor-product]').textContent = inspected.title;
  ui.querySelector('[data-editor-source]').textContent = `${inspected.source.description} · Authored`;
  const stateNode = ui.querySelector('[data-editor-state]');
  const diffNode = ui.querySelector('[data-editor-diff]');
  const mediaNode = ui.querySelector('[data-editor-media]');
  const mediaList = ui.querySelector('[data-editor-media-list]');
  const review = ui.querySelector('[data-editor-review]');
  const apply = ui.querySelector('[data-editor-apply]');
  const publish = ui.querySelector('[data-editor-publish]');
  const discard = ui.querySelector('[data-editor-discard]');
  const attention = ui.querySelector('[data-editor-attention]');

  function descriptionChanged() { return state.draft !== state.original; }
  function mediaChanged() { return state.draftThumbnail !== state.originalThumbnail; }
  function changed() { return descriptionChanged() || mediaChanged(); }
  function activeChanged() { return state.activeMode === 'media' ? mediaChanged() : descriptionChanged(); }
  function saveDraft() {
    if (changed()) localStorage.setItem(key, JSON.stringify({ sourceRevision: state.sourceRevision, descriptionIntro: state.draft }));
    else localStorage.removeItem(key);
  }
  function renderState(message = '') {
    const dirty = changed();
    review.disabled = !activeChanged();
    const activePlan = state.activeMode === 'media' ? state.mediaPlan : state.plan;
    apply.disabled = !activePlan || activePlan.status !== 'ready';
    discard.disabled = !activeChanged();
    publish.disabled = !state.applied || !session.capabilities.publish;
    publish.title = session.capabilities.publish ? '' : 'Restart the local utility with publication enabled';
    attention.hidden = !dirty;
    stateNode.textContent = message || (dirty ? 'Draft change · not applied' : state.applied ? 'Source applied · ready to publish' : 'Source and page agree');
    if (!activePlan) diffNode.hidden = true;
  }

  setRenderedIntro(state.draft);
  const hero = document.querySelector('[data-product-hero]');
  for (const item of inspected.media.candidates) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mediaId = item.id;
    button.setAttribute('aria-label', `Use ${item.source} as thumbnail`);
    const image = document.createElement('img');
    image.src = item.url;
    image.alt = '';
    const label = document.createElement('span');
    label.textContent = item.source;
    button.append(image, label);
    button.classList.toggle('is-selected', item.id === state.draftThumbnail);
    button.addEventListener('click', () => {
      state.draftThumbnail = item.id;
      state.mediaPlan = null;
      state.applied = false;
      mediaList.querySelectorAll('button').forEach(node => node.classList.toggle('is-selected', node.dataset.mediaId === item.id));
      if (hero) hero.src = item.url;
      renderState('Thumbnail draft · not applied');
    });
    mediaList.append(button);
  }
  renderState(draftIsCurrent ? 'Recovered local draft · not applied' : 'Source and page agree');

  lede.addEventListener('pointerdown', () => {
    if (!lede.isContentEditable) {
      lede.setAttribute('contenteditable', 'plaintext-only');
      lede.setAttribute('spellcheck', 'true');
      lede.setAttribute('role', 'textbox');
      lede.setAttribute('aria-label', `${inspected.title} description`);
    }
  }, { capture: true });
  lede.addEventListener('click', () => {
    state.activeMode = 'description';
    mediaNode.hidden = true;
    setExpanded(ui, true);
    stateNode.textContent = changed() ? 'Editing recovered draft' : 'Editing description';
    if (getSelection()?.rangeCount === 0) placeCaret(lede);
  });
  lede.addEventListener('input', () => {
    state.draft = introFromText(lede.innerText);
    state.plan = null;
    state.applied = false;
    saveDraft();
    const description = document.querySelector('[data-description] p');
    if (description) description.textContent = state.draft;
    const purpose = document.querySelector('[data-purpose]');
    if (purpose) purpose.textContent = state.draft;
    renderState();
  });
  document.querySelector('.product-hero')?.addEventListener('click', () => {
    if (!inspected.media.candidates.length) return;
    state.activeMode = 'media';
    mediaNode.hidden = false;
    diffNode.hidden = true;
    setExpanded(ui, true);
    renderState(mediaChanged() ? 'Thumbnail draft · not applied' : 'Select the product thumbnail');
  });
  lede.addEventListener('blur', () => {
    lede.removeAttribute('contenteditable');
    lede.removeAttribute('role');
    lede.removeAttribute('aria-label');
    saveDraft();
    renderState();
  });

  ui.querySelector('[data-editor-toggle]').addEventListener('click', () => setExpanded(ui, true));
  ui.querySelector('[data-editor-minimize]').addEventListener('click', () => setExpanded(ui, false));
  discard.addEventListener('click', () => {
    if (state.activeMode === 'media') {
      state.draftThumbnail = state.originalThumbnail;
      state.mediaPlan = null;
      const original = inspected.media.candidates.find(item => item.id === state.originalThumbnail);
      mediaList.querySelectorAll('button').forEach(node => node.classList.toggle('is-selected', node.dataset.mediaId === state.originalThumbnail));
      if (hero && original) hero.src = original.url;
      renderState('Thumbnail draft discarded');
      return;
    }
    state.draft = state.original;
    state.plan = null;
    state.applied = false;
    localStorage.removeItem(key);
    setRenderedIntro(state.original);
    renderState('Draft discarded');
  });
  review.addEventListener('click', async () => {
    review.disabled = true;
    stateNode.textContent = 'Reviewing canonical source…';
    try {
      if (state.activeMode === 'media') {
        state.mediaPlan = await request('/media/plan', {
          method: 'POST',
          body: JSON.stringify({ handle, thumbnailMediaId: state.draftThumbnail, mediaRevision: state.mediaRevision }),
        });
        diffNode.replaceChildren();
        const change = state.mediaPlan.changes[0];
        const summary = document.createElement('p');
        const label = document.createElement('b');
        label.textContent = 'Thumbnail';
        summary.append(label, document.createTextNode(change?.source || 'No change'));
        diffNode.append(summary);
        diffNode.hidden = false;
        renderState(state.mediaPlan.status === 'ready' ? 'Reviewed · thumbnail selection' : 'No media change');
        return;
      }
      state.plan = await request('/operations/plan', {
        method: 'POST',
        body: JSON.stringify({ handle, descriptionIntro: state.draft, sourceRevision: state.sourceRevision }),
      });
      diffNode.replaceChildren();
      const before = document.createElement('p');
      before.innerHTML = '<b>Before</b>';
      before.append(document.createTextNode(state.plan.changes[0]?.before || ''));
      const after = document.createElement('p');
      after.innerHTML = '<b>After</b>';
      after.append(document.createTextNode(state.plan.changes[0]?.after || ''));
      diffNode.append(before, after);
      diffNode.hidden = false;
      renderState(state.plan.status === 'ready' ? 'Reviewed · one authored change' : 'No source change');
    } catch (error) {
      state.plan = null;
      renderState(error.code === 'stale_source_revision' ? 'Conflict · source changed elsewhere' : error.message);
    }
  });
  apply.addEventListener('click', async () => {
    const activePlan = state.activeMode === 'media' ? state.mediaPlan : state.plan;
    if (!activePlan) return;
    apply.disabled = true;
    stateNode.textContent = 'Applying through SOLVET…';
    try {
      if (state.activeMode === 'media') {
        const receipt = await request('/media/apply', { method: 'POST', body: JSON.stringify({ planId: state.mediaPlan.plan_id }) });
        state.mediaRevision = receipt.target_revision;
        state.originalThumbnail = state.draftThumbnail;
        state.mediaPlan = null;
        state.applied = receipt.status === 'applied';
        diffNode.hidden = true;
        renderState('Thumbnail applied and media ID verified');
        return;
      }
      const receipt = await request('/operations/apply', { method: 'POST', body: JSON.stringify({ planId: state.plan.plan_id }) });
      state.sourceRevision = receipt.target_revision;
      state.original = state.draft;
      state.plan = null;
      state.applied = receipt.status === 'applied';
      localStorage.removeItem(key);
      diffNode.hidden = true;
      renderState('Source applied and revision verified');
    } catch (error) {
      renderState(error.code === 'stale_source_revision' ? 'Conflict · source changed before apply' : error.message);
    }
  });
  publish.addEventListener('click', async () => {
    if (!state.applied || !session.capabilities.publish) return;
    publish.disabled = true;
    stateNode.textContent = 'Publishing and verifying read-back…';
    try {
      const receipt = await request('/publish', { method: 'POST', body: JSON.stringify({ handle }) });
      state.applied = false;
      renderState(receipt.status === 'verified' ? 'Published · public read-back verified' : receipt.status);
    } catch (error) {
      renderState(error.message);
    }
  });

  return { session, inspected, state, root: ui };
}
