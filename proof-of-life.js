/**
 * <proof-of-life> — In-place writing replay
 *
 * Two-surface UX:
 *   1. An inline PLAY button rendered below the article header, above the
 *      body. This is the primary affordance.
 *   2. A fixed footer with play button + scrubber that fades in once the
 *      inline button scrolls out of view, so controls stay reachable as the
 *      user moves through a long article.
 *
 * When playback starts, the target element's rendered HTML is replaced with
 * a monospace pane that reconstructs the raw markdown keystroke by keystroke.
 * Pause or end of playback restores the original HTML.
 *
 * Usage:
 *   <proof-of-life src="..." target="#article-content"></proof-of-life>
 *
 * The element itself renders nothing in its own box — it creates two sibling
 * DOM elements:
 *   - an inline button inserted BEFORE the target element
 *   - a position:fixed footer appended to document.body
 *
 * Attributes:
 *   src    — URL to the JSONL proof-of-life log (gzipped if .gz)
 *   target — CSS selector for the element whose innerHTML is swapped
 *            during playback. If omitted, defaults to "#article-content".
 */

class ProofOfLife extends HTMLElement {
  constructor() {
    super();

    this._sessions = [];
    this._flatEvents = [];
    this._snapshots = {};
    this._totalEvents = 0;
    this._currentIndex = 0;
    this._playing = false;
    this._loaded = false;
    this._pendingFrame = null;
    this._lastFrameTime = 0;
    this._accumulatedTime = 0;
    this._speed = 10;
    this._maxPause = 500;
    this._pauseThreshold = 5000;

    this._doc = "";
    this._cursor = 0;

    // Target swap state
    this._targetEl = null;
    this._originalHTML = null;
    this._replayEl = null;

    // Surfaces
    this._inlineEl = null;
    this._footerEl = null;
    this._footerVisible = false;
    this._inlineOutOfView = false;
    this._intersectionObserver = null;
  }

  connectedCallback() {
    this._injectBlinkStyle();
    this._resolveTarget();
    if (!this._targetEl) return;
    this._mountInline();
    this._mountFooter();
    this._wireScrollReveal();
  }

  disconnectedCallback() {
    this._pause();
    this._restoreTarget();
    if (this._inlineEl) this._inlineEl.remove();
    if (this._footerEl) this._footerEl.remove();
    if (this._intersectionObserver) this._intersectionObserver.disconnect();
  }

  _injectBlinkStyle() {
    if (document.getElementById("pol-global-style")) return;
    const style = document.createElement("style");
    style.id = "pol-global-style";
    style.textContent = `
      @keyframes pol-blink { 50% { background: transparent; } }
      .pol-replay-pane {
        margin: 0;
        padding: 0;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 13px;
        font-weight: 300;
        line-height: 1.6;
        color: #222222;
        white-space: pre-wrap;
        word-wrap: break-word;
        background: transparent;
        border: none;
      }
      .pol-cursor {
        display: inline-block;
        width: 2px;
        height: 1.1em;
        background: #000000;
        vertical-align: text-bottom;
        margin: 0 -1px;
        animation: pol-blink 1s step-end infinite;
      }

      /* --- Inline surface (below article header) --- */
      .pol-inline {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 0 20px 0;
        margin-bottom: 24px;
        border-bottom: 1px solid #E8E8E8;
      }
      .pol-inline-kicker {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 10px;
        font-weight: 300;
        color: #303030;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .pol-inline-meta {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 10px;
        font-weight: 300;
        color: #303030;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-left: auto;
        font-variant-numeric: tabular-nums;
      }
      .pol-btn {
        font-family: 'Visitor TT1 BRK', 'Visitor', 'Space Mono', monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 6px 16px;
        border: 1px solid #000000;
        background: transparent;
        color: #000000;
        cursor: pointer;
        border-radius: 0;
        min-width: 72px;
        text-align: center;
      }
      .pol-btn:hover {
        background: #000000;
        color: #f0ff00;
      }
      .pol-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .pol-btn:disabled:hover {
        background: transparent;
        color: #000000;
      }
      .pol-restore-btn {
        display: none;
      }
      .pol-restore-btn.is-visible {
        display: inline-block;
      }

      /* --- Fixed footer surface --- */
      .pol-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background: #FFFFFF;
        border-top: 1px solid #000000;
        box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
        transform: translateY(100%);
        transition: transform 240ms ease-out;
      }
      .pol-footer.is-visible {
        transform: translateY(0);
      }
      .pol-footer-bar {
        max-width: 820px;
        margin: 0 auto;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .pol-footer-kicker {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 10px;
        font-weight: 300;
        color: #303030;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        flex-shrink: 0;
      }
      .pol-scrubber {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 2px;
        background: #E8E8E8;
        outline: none;
        cursor: pointer;
        border-radius: 0;
        border-top: 1px solid #000000;
        border-bottom: 1px solid #000000;
        padding: 0;
        margin: 0;
      }
      .pol-scrubber::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 16px;
        border-radius: 0;
        background: #f0ff00;
        border: 1px solid #000000;
        cursor: pointer;
      }
      .pol-scrubber::-moz-range-thumb {
        width: 12px;
        height: 16px;
        border-radius: 0;
        background: #f0ff00;
        border: 1px solid #000000;
        cursor: pointer;
      }
      .pol-counter {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 10px;
        font-weight: 300;
        color: #303030;
        flex-shrink: 0;
        min-width: 80px;
        text-align: right;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 600px) {
        .pol-footer-bar { padding: 10px 16px; gap: 10px; }
        .pol-footer-kicker { display: none; }
        .pol-counter { min-width: 60px; font-size: 9px; }
      }
    `;
    document.head.appendChild(style);
  }

  _resolveTarget() {
    const selector = this.getAttribute("target") || "#article-content";
    this._targetEl = document.querySelector(selector);
  }

  _mountInline() {
    const wrap = document.createElement("div");
    wrap.className = "pol-inline";
    wrap.innerHTML = `
      <span class="pol-inline-kicker">Proof of Life</span>
      <button type="button" class="pol-btn pol-inline-btn">PLAY</button>
      <button type="button" class="pol-btn pol-restore-btn pol-inline-restore-btn">RESTORE</button>
      <span class="pol-inline-meta pol-inline-counter">0 / 0</span>
    `;
    this._targetEl.parentNode.insertBefore(wrap, this._targetEl);
    this._inlineEl = wrap;
    this._inlineBtn = wrap.querySelector(".pol-inline-btn");
    this._inlineRestoreBtn = wrap.querySelector(".pol-inline-restore-btn");
    this._inlineCounter = wrap.querySelector(".pol-inline-counter");
    this._inlineBtn.addEventListener("click", () => this._togglePlay());
    this._inlineRestoreBtn.addEventListener("click", () => this._restore());
  }

  _mountFooter() {
    const footer = document.createElement("div");
    footer.className = "pol-footer";
    footer.innerHTML = `
      <div class="pol-footer-bar">
        <span class="pol-footer-kicker">Proof of Life</span>
        <button type="button" class="pol-btn pol-footer-btn">PLAY</button>
        <button type="button" class="pol-btn pol-restore-btn pol-footer-restore-btn">RESTORE</button>
        <input type="range" class="pol-scrubber" min="0" max="0" value="0">
        <span class="pol-counter">0 / 0</span>
      </div>
    `;
    document.body.appendChild(footer);
    this._footerEl = footer;
    this._footerBtn = footer.querySelector(".pol-footer-btn");
    this._footerRestoreBtn = footer.querySelector(".pol-footer-restore-btn");
    this._scrubberEl = footer.querySelector(".pol-scrubber");
    this._counterEl = footer.querySelector(".pol-counter");

    this._footerBtn.addEventListener("click", () => this._togglePlay());
    this._footerRestoreBtn.addEventListener("click", () => this._restore());
    this._scrubberEl.addEventListener("input", () => {
      if (!this._loaded) return;
      const idx = parseInt(this._scrubberEl.value, 10);
      this._ensureSwapped();
      this._seekTo(idx);
    });
  }

  _setRestoreVisible(visible) {
    if (this._inlineRestoreBtn) this._inlineRestoreBtn.classList.toggle("is-visible", visible);
    if (this._footerRestoreBtn) this._footerRestoreBtn.classList.toggle("is-visible", visible);
  }

  _restore() {
    this._pause();
    this._restoreTarget();
    this._currentIndex = 0;
    if (this._scrubberEl) this._scrubberEl.value = "0";
    this._updateCounter();
    this._setRestoreVisible(false);
  }

  _wireScrollReveal() {
    // Show the fixed footer once the inline button scrolls out of view.
    // Also force-show it while replay mode is active regardless of scroll.
    if (!("IntersectionObserver" in window)) {
      this._inlineOutOfView = true;
      this._updateFooterVisibility();
      return;
    }
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        const inlineVisible = entries[0]?.isIntersecting ?? false;
        this._inlineOutOfView = !inlineVisible;
        this._updateFooterVisibility();
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    this._intersectionObserver.observe(this._inlineEl);
  }

  _updateFooterVisibility() {
    // Visible if scrolled past the inline button OR replay mode is active.
    const shouldShow = this._inlineOutOfView || this._originalHTML !== null;
    if (this._footerVisible === shouldShow) return;
    this._footerVisible = shouldShow;
    if (shouldShow) {
      this._footerEl.classList.add("is-visible");
      document.body.style.paddingBottom = "72px";
    } else {
      this._footerEl.classList.remove("is-visible");
      document.body.style.paddingBottom = "";
    }
  }

  // --- Target swap ---

  _ensureSwapped() {
    if (!this._targetEl || this._originalHTML !== null) return;
    this._originalHTML = this._targetEl.innerHTML;
    const replay = document.createElement("pre");
    replay.className = "pol-replay-pane";
    this._targetEl.innerHTML = "";
    this._targetEl.appendChild(replay);
    this._replayEl = replay;
    this._setRestoreVisible(true);
    this._updateFooterVisibility();
  }

  _restoreTarget() {
    if (!this._targetEl || this._originalHTML === null) return;
    this._targetEl.innerHTML = this._originalHTML;
    this._originalHTML = null;
    this._replayEl = null;
    this._setRestoreVisible(false);
    this._updateFooterVisibility();
  }

  // --- Playback ---

  async _togglePlay() {
    if (!this._loaded) {
      this._setButtonsDisabled(true);
      this._setButtonsText("...");
      try {
        await this._loadLog();
      } catch (err) {
        this._setButtonsText("ERR");
        console.error("[proof-of-life] Load error:", err);
        return;
      } finally {
        this._setButtonsDisabled(false);
      }
    }

    if (this._playing) this._pause();
    else this._play();
  }

  _play() {
    if (this._totalEvents === 0) return;
    this._ensureSwapped();
    if (this._currentIndex >= this._totalEvents) this._seekTo(0);
    this._playing = true;
    this._setButtonsText("PAUSE");
    this._lastFrameTime = performance.now();
    this._accumulatedTime = 0;
    this._scheduleFrame();
  }

  _pause() {
    this._playing = false;
    this._setButtonsText("PLAY");
    if (this._pendingFrame !== null) {
      cancelAnimationFrame(this._pendingFrame);
      this._pendingFrame = null;
    }
  }

  _setButtonsText(text) {
    if (this._inlineBtn) this._inlineBtn.textContent = text;
    if (this._footerBtn) this._footerBtn.textContent = text;
  }

  _setButtonsDisabled(disabled) {
    if (this._inlineBtn) this._inlineBtn.disabled = disabled;
    if (this._footerBtn) this._footerBtn.disabled = disabled;
  }

  _scheduleFrame() {
    this._pendingFrame = requestAnimationFrame((now) => this._tick(now));
  }

  _tick(now) {
    if (!this._playing) return;
    if (this._currentIndex >= this._totalEvents) {
      this._finish();
      return;
    }

    const elapsed = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._accumulatedTime += elapsed * this._speed;

    let applied = false;
    while (this._currentIndex < this._totalEvents) {
      const event = this._flatEvents[this._currentIndex];
      let deltaMs = event[0];
      if (deltaMs > this._pauseThreshold) deltaMs = this._maxPause;

      if (this._accumulatedTime >= deltaMs) {
        this._accumulatedTime -= deltaMs;
        this._applyEvent(this._currentIndex);
        this._currentIndex++;
        applied = true;
      } else {
        break;
      }
    }

    if (applied) {
      this._renderDoc();
      this._scrubberEl.value = String(this._currentIndex);
      this._updateCounter();
    }

    if (this._currentIndex < this._totalEvents) {
      this._scheduleFrame();
    } else {
      this._finish();
    }
  }

  _finish() {
    this._pause();
    // Hold the final state briefly, then restore the rendered article.
    setTimeout(() => {
      if (!this._playing) this._restoreTarget();
    }, 1200);
  }

  // --- Seek ---

  _seekTo(index) {
    this._currentIndex = index;
    this._accumulatedTime = 0;

    let targetSessionStart = 0;
    for (const session of this._sessions) {
      if (session._startIndex <= index) targetSessionStart = session._startIndex;
    }

    const nearest = Math.floor(index / 500) * 500;

    if (
      this._snapshots[nearest] !== undefined &&
      nearest >= targetSessionStart
    ) {
      this._doc = this._snapshots[nearest];
      this._cursor = 0;
      for (let i = nearest; i < index; i++) this._applyEventToDoc(i);
    } else {
      this._rebuildFromStart(index);
    }

    this._renderDoc();
    this._scrubberEl.value = String(index);
    this._updateCounter();
  }

  _rebuildFromStart(targetIndex) {
    let sessionDoc = this._sessions[0]?.doc ?? "";
    let sessionStart = 0;
    for (const session of this._sessions) {
      if (targetIndex >= session._startIndex) {
        sessionDoc = session.doc;
        sessionStart = session._startIndex;
      }
    }
    this._doc = sessionDoc;
    this._cursor = 0;
    for (let i = sessionStart; i < targetIndex; i++) this._applyEventToDoc(i);
  }

  _applyEvent(index) {
    this._maybeSnapSession(index);
    this._applyEventToDoc(index);
    if (index % 500 === 0) this._snapshots[index] = this._doc;
  }

  _applyEventToDoc(index) {
    const event = this._flatEvents[index];
    if (!event) return;
    const [, fromPos, inserted, deleted] = event;
    const toPos = fromPos + deleted.length;
    this._doc = this._doc.slice(0, fromPos) + inserted + this._doc.slice(toPos);
    this._cursor = fromPos + inserted.length;
  }

  _maybeSnapSession(index) {
    for (let i = 1; i < this._sessions.length; i++) {
      if (this._sessions[i]._startIndex === index) {
        this._doc = this._sessions[i].doc;
        this._cursor = 0;
        return;
      }
    }
  }

  // --- Render ---

  _renderDoc() {
    if (!this._replayEl) return;
    const before = this._escapeHtml(this._doc.slice(0, this._cursor));
    const after = this._escapeHtml(this._doc.slice(this._cursor));
    this._replayEl.innerHTML = before + '<span class="pol-cursor"></span>' + after;

    // Auto-scroll so the cursor stays visible as typing progresses
    const cursorEl = this._replayEl.querySelector(".pol-cursor");
    if (cursorEl) {
      const cursorRect = cursorEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const footerH = this._footerVisible
        ? this._footerEl.getBoundingClientRect().height
        : 0;
      const visibleBottom = viewportH - footerH - 40;
      const visibleTop = 80;
      if (cursorRect.bottom > visibleBottom || cursorRect.top < visibleTop) {
        cursorEl.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  }

  _updateCounter() {
    const text = `${this._currentIndex} / ${this._totalEvents}`;
    if (this._counterEl) this._counterEl.textContent = text;
    if (this._inlineCounter) this._inlineCounter.textContent = text;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // --- JSONL loading ---

  async _loadLog() {
    const src = this.getAttribute("src");
    if (!src) throw new Error("No src attribute");

    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let text;
    if (src.endsWith(".gz")) {
      const ds = new DecompressionStream("gzip");
      const decompressed = response.body.pipeThrough(ds);
      const reader = decompressed.getReader();
      const decoder = new TextDecoder();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(decoder.decode(value, { stream: true }));
      }
      text = chunks.join("");
    } else {
      text = await response.text();
    }

    this._parseLog(text);
    this._loaded = true;
  }

  _parseLog(text) {
    const lines = text.split("\n").filter((l) => l.trim());
    this._sessions = [];
    this._flatEvents = [];
    let currentSession = null;

    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      if (Array.isArray(parsed)) {
        if (currentSession) {
          currentSession.events.push(parsed);
          this._flatEvents.push(parsed);
        }
      } else if (parsed.v !== undefined) {
        currentSession = {
          doc: parsed.doc ?? "",
          sessionId: parsed.sid,
          timestamp: parsed.t,
          events: [],
          _startIndex: this._flatEvents.length,
        };
        this._sessions.push(currentSession);
      }
    }

    this._totalEvents = this._flatEvents.length;
    this._scrubberEl.max = String(this._totalEvents);
    this._scrubberEl.value = "0";

    this._doc = this._sessions[0]?.doc ?? "";
    this._cursor = 0;
    this._currentIndex = 0;
    this._snapshots = {};
    this._snapshots[0] = this._doc;

    this._updateCounter();
  }
}

customElements.define("proof-of-life", ProofOfLife);
