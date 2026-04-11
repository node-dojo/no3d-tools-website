/**
 * <proof-of-life> Web Component
 *
 * Replays a writing process captured as JSONL events.
 * Interface: editor pane + play/pause button + scrubber slider.
 *
 * Usage:
 *   <proof-of-life src="https://example.com/log.jsonl.gz"></proof-of-life>
 *
 * Attributes:
 *   src — URL to a gzipped JSONL proof-of-life log
 */

class ProofOfLife extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // State
    this._sessions = [];     // [{ doc: string, events: [...] }, ...]
    this._flatEvents = [];   // All events across sessions with absolute index
    this._snapshots = [];    // Document state at each event index (built lazily)
    this._totalEvents = 0;
    this._currentIndex = 0;
    this._playing = false;
    this._loaded = false;
    this._pendingFrame = null;
    this._lastFrameTime = 0;
    this._accumulatedTime = 0;
    this._speed = 10;
    this._maxPause = 500;    // Compress pauses > 5s to 500ms
    this._pauseThreshold = 5000;
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #333;
          background: #0a0a0a;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
          overflow: hidden;
        }
        .editor {
          height: 400px;
          overflow-y: auto;
          padding: 16px 20px;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 13px;
          line-height: 1.6;
          color: #e8e8e8;
          cursor: default;
          user-select: text;
        }
        .editor .cursor {
          display: inline;
          border-left: 2px solid #f0ff00;
          margin-left: -1px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { border-color: transparent; }
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-top: 1px solid #333;
          background: #111;
        }
        .play-btn {
          background: none;
          border: 1px solid #555;
          color: #e8e8e8;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .play-btn:hover {
          border-color: #f0ff00;
          color: #f0ff00;
        }
        .scrubber {
          flex: 1;
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #333;
          outline: none;
          cursor: pointer;
        }
        .scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f0ff00;
          cursor: pointer;
        }
        .scrubber::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f0ff00;
          border: none;
          cursor: pointer;
        }
        .loading {
          color: #555;
          padding: 40px 20px;
          text-align: center;
          font-size: 12px;
        }
      </style>
      <div class="editor" id="editor"></div>
      <div class="controls">
        <button class="play-btn" id="play-btn" title="Play / Pause">&#9654;</button>
        <input type="range" class="scrubber" id="scrubber" min="0" max="0" value="0">
      </div>
    `;

    this._editorEl = this.shadowRoot.getElementById("editor");
    this._playBtn = this.shadowRoot.getElementById("play-btn");
    this._scrubberEl = this.shadowRoot.getElementById("scrubber");

    this._editorEl.innerHTML = '<div class="loading">Click play to load</div>';

    this._playBtn.addEventListener("click", () => this._togglePlay());

    // Scrubber: drag to seek
    this._scrubbing = false;
    this._scrubberEl.addEventListener("input", () => {
      this._scrubbing = true;
      const idx = parseInt(this._scrubberEl.value, 10);
      this._seekTo(idx);
    });
    this._scrubberEl.addEventListener("change", () => {
      this._scrubbing = false;
      // If was playing before scrub, resume
    });
  }

  async _togglePlay() {
    if (!this._loaded) {
      this._editorEl.innerHTML = '<div class="loading">Loading...</div>';
      try {
        await this._loadLog();
      } catch (err) {
        this._editorEl.innerHTML = '<div class="loading">Failed to load log</div>';
        console.error("[proof-of-life] Load error:", err);
        return;
      }
    }

    if (this._playing) {
      this._pause();
    } else {
      this._play();
    }
  }

  _play() {
    if (this._totalEvents === 0) return;
    // If at the end, restart
    if (this._currentIndex >= this._totalEvents) {
      this._seekTo(0);
    }
    this._playing = true;
    this._playBtn.innerHTML = "&#9646;&#9646;"; // pause icon
    this._lastFrameTime = performance.now();
    this._accumulatedTime = 0;
    this._scheduleFrame();
  }

  _pause() {
    this._playing = false;
    this._playBtn.innerHTML = "&#9654;"; // play icon
    if (this._pendingFrame) {
      cancelAnimationFrame(this._pendingFrame);
      this._pendingFrame = null;
    }
  }

  _scheduleFrame() {
    this._pendingFrame = requestAnimationFrame((now) => this._tick(now));
  }

  _tick(now) {
    if (!this._playing) return;
    if (this._currentIndex >= this._totalEvents) {
      this._pause();
      return;
    }

    const elapsed = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._accumulatedTime += elapsed * this._speed;

    // Apply events whose deltaMs has been reached
    let applied = false;
    while (this._currentIndex < this._totalEvents) {
      const event = this._flatEvents[this._currentIndex];
      let deltaMs = event[0];

      // Compress long pauses
      if (deltaMs > this._pauseThreshold) {
        deltaMs = this._maxPause;
      }

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
      if (!this._scrubbing) {
        this._scrubberEl.value = this._currentIndex;
      }
    }

    if (this._currentIndex < this._totalEvents) {
      this._scheduleFrame();
    } else {
      this._pause();
    }
  }

  _seekTo(index) {
    // Rebuild document state at the target index
    this._currentIndex = index;
    this._accumulatedTime = 0;

    // Find the session that contains the target index
    let targetSessionStart = 0;
    for (const session of this._sessions) {
      if (session._startIndex <= index) {
        targetSessionStart = session._startIndex;
      }
    }

    // Use snapshots for efficiency — but only if snapshot is in the same session
    const snapshotInterval = 500;
    const nearestSnapshot = Math.floor(index / snapshotInterval) * snapshotInterval;

    if (
      this._snapshots[nearestSnapshot] !== undefined &&
      nearestSnapshot >= targetSessionStart
    ) {
      this._doc = this._snapshots[nearestSnapshot];
      this._cursor = 0;
      for (let i = nearestSnapshot; i < index; i++) {
        this._applyEventToDoc(i);
      }
    } else {
      // Rebuild from session start
      this._rebuildFromStart(index);
    }

    this._renderDoc();
    if (!this._scrubbing) {
      this._scrubberEl.value = index;
    }
  }

  _rebuildFromStart(targetIndex) {
    // Find which session this index belongs to using precomputed offsets
    let sessionDoc = this._sessions[0]?.doc ?? "";
    let sessionStart = 0;

    for (const session of this._sessions) {
      const sessionEnd = session._startIndex + session.events.length;
      if (targetIndex >= session._startIndex) {
        sessionDoc = session.doc;
        sessionStart = session._startIndex;
      }
      if (sessionEnd > targetIndex) break;
    }

    this._doc = sessionDoc;
    this._cursor = 0;
    for (let i = sessionStart; i < targetIndex; i++) {
      this._applyEventToDoc(i);
    }
  }

  _applyEvent(index) {
    // Check if we're crossing into a new session
    this._maybeSnapSession(index);
    this._applyEventToDoc(index);

    // Save snapshot every 500 events
    if (index % 500 === 0) {
      this._snapshots[index] = this._doc;
    }
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
    // If this index is the first event of a new session, snap doc to session's initialContent
    for (let i = 1; i < this._sessions.length; i++) {
      if (this._sessions[i]._startIndex === index) {
        this._doc = this._sessions[i].doc;
        this._cursor = 0;
        return;
      }
    }
  }

  _renderDoc() {
    const el = this._editorEl;
    // Split doc at cursor position and insert cursor element
    const before = this._escapeHtml(this._doc.slice(0, this._cursor));
    const after = this._escapeHtml(this._doc.slice(this._cursor));
    el.innerHTML = before + '<span class="cursor"></span>' + after;

    // Auto-scroll to keep cursor visible
    const cursorEl = el.querySelector(".cursor");
    if (cursorEl) {
      const elRect = el.getBoundingClientRect();
      const cursorRect = cursorEl.getBoundingClientRect();
      if (cursorRect.bottom > elRect.bottom - 20 || cursorRect.top < elRect.top + 20) {
        cursorEl.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // --- JSONL Loading ---

  async _loadLog() {
    const src = this.getAttribute("src");
    if (!src) throw new Error("No src attribute");

    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let text;

    // Try to decompress if gzipped
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
      const parsed = JSON.parse(line);

      if (Array.isArray(parsed)) {
        // It's an event tuple
        if (currentSession) {
          currentSession.events.push(parsed);
          this._flatEvents.push(parsed);
        }
      } else if (parsed.v !== undefined) {
        // It's a session header
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
    this._scrubberEl.max = this._totalEvents;
    this._scrubberEl.value = 0;

    // Initialize document state
    this._doc = this._sessions[0]?.doc ?? "";
    this._cursor = 0;
    this._currentIndex = 0;
    this._snapshots = [];
    this._snapshots[0] = this._doc;

    this._renderDoc();
  }
}

customElements.define("proof-of-life", ProofOfLife);
