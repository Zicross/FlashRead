// src/ui/rsvp-view.js

export class RsvpView {
  /**
   * @param {HTMLElement} container - The content area element
   * @param {import('../reader/rsvp-engine.js').RsvpEngine} engine
   * @param {import('../storage/store.js').Store} store
   */
  constructor(container, engine, store) {
    this._container = container;
    this._engine = engine;
    this._store = store;
    this._el = null;
    this._wordDisplay = null;
    this._progressFill = null;
    this._progressBar = null;
    this._trackingPanel = null;
    this._playBtn = null;
    this._wpmDisplay = null;
    this._isPlaying = false;
    this._doc = null;
  }

  /**
   * Render the view with parsed document data, load data into engine.
   * @param {object} doc - Parsed document with .words and .segments
   */
  show(doc) {
    this._doc = doc;
    this._engine.load(doc.words, doc.segments);

    if (this._el) {
      this._el.remove();
    }

    this._el = this._render();
    this._container.appendChild(this._el);

    // Show the first word immediately
    const firstWord = doc.words[0];
    if (firstWord) {
      this.updateWord(firstWord, 0, this._store.getSettings().halfBold);
    }
    this.updateTracking(0);
    this.updateProgress(0);
  }

  /**
   * Remove the view from DOM.
   */
  hide() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }

  /**
   * Update the word display.
   * @param {string} word
   * @param {number} index
   * @param {boolean} halfBold
   */
  updateWord(word, index, halfBold) {
    if (!this._wordDisplay) return;
    const formatted = this._engine.formatWord(word, halfBold);
    this._wordDisplay.innerHTML = formatted;
    this.updateProgress(this._engine.getProgress());
  }

  /**
   * Update the tracking panel, highlight current sentence.
   * @param {number} currentSegmentIndex
   */
  updateTracking(currentSegmentIndex) {
    if (!this._trackingPanel || !this._doc) return;

    const segments = this._doc.segments;
    const CONTEXT = 2;
    const start = Math.max(0, currentSegmentIndex - CONTEXT);
    const end = Math.min(segments.length - 1, currentSegmentIndex + CONTEXT);

    this._trackingPanel.innerHTML = '';

    for (let i = start; i <= end; i++) {
      const span = document.createElement('span');
      span.className = 'sentence' + (i === currentSegmentIndex ? ' current' : '');
      span.textContent = segments[i].sentence + ' ';
      this._trackingPanel.appendChild(span);

      if (i === currentSegmentIndex) {
        // Scroll the current sentence into view within the tracking panel
        requestAnimationFrame(() => {
          span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    }
  }

  /**
   * Update the progress bar width.
   * @param {number} fraction - 0 to 1
   */
  updateProgress(fraction) {
    if (!this._progressFill) return;
    this._progressFill.style.width = `${Math.min(1, Math.max(0, fraction)) * 100}%`;
  }

  // ----------------------------------------------------------------
  // Private rendering
  // ----------------------------------------------------------------

  _render() {
    const settings = this._store.getSettings();
    const wpm = settings.wpm;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; overflow:hidden;';

    // --- Top 2/3: RSVP area ---
    const rsvpArea = document.createElement('div');
    rsvpArea.className = 'rsvp-area';

    // Word display
    const wordDisplay = document.createElement('div');
    wordDisplay.className = 'rsvp-word-display';
    wordDisplay.style.fontSize = `${settings.fontSize}px`;
    this._wordDisplay = wordDisplay;

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'rsvp-controls';

    // Play/pause button
    const playBtn = document.createElement('button');
    playBtn.className = 'sidebar-btn';
    playBtn.setAttribute('aria-label', 'Play');
    playBtn.title = 'Play';
    playBtn.innerHTML = this._playIcon();
    this._playBtn = playBtn;

    playBtn.addEventListener('click', () => this._togglePlay());

    // WPM minus button
    const wpmMinus = document.createElement('button');
    wpmMinus.className = 'sidebar-btn';
    wpmMinus.setAttribute('aria-label', 'Decrease WPM');
    wpmMinus.title = 'Slower';
    wpmMinus.textContent = '−';
    wpmMinus.style.fontSize = '18px';

    // WPM display
    const wpmDisplay = document.createElement('span');
    wpmDisplay.style.cssText = 'min-width:60px; text-align:center; font-size:var(--text-sm); color:var(--color-text-secondary);';
    wpmDisplay.textContent = `${wpm} wpm`;
    this._wpmDisplay = wpmDisplay;

    // WPM plus button
    const wpmPlus = document.createElement('button');
    wpmPlus.className = 'sidebar-btn';
    wpmPlus.setAttribute('aria-label', 'Increase WPM');
    wpmPlus.title = 'Faster';
    wpmPlus.textContent = '+';
    wpmPlus.style.fontSize = '18px';

    wpmMinus.addEventListener('click', () => this._changeWpm(-25));
    wpmPlus.addEventListener('click', () => this._changeWpm(+25));

    controls.appendChild(playBtn);
    controls.appendChild(wpmMinus);
    controls.appendChild(wpmDisplay);
    controls.appendChild(wpmPlus);

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'rsvp-progress-bar';
    progressBar.style.cursor = 'pointer';
    this._progressBar = progressBar;

    const progressFill = document.createElement('div');
    progressFill.className = 'rsvp-progress-fill';
    progressFill.style.width = '0%';
    this._progressFill = progressFill;

    progressBar.appendChild(progressFill);

    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      const targetIndex = Math.floor(fraction * this._engine.words.length);
      this._engine.jumpTo(Math.max(0, Math.min(targetIndex, this._engine.words.length - 1)));
    });

    rsvpArea.appendChild(wordDisplay);
    rsvpArea.appendChild(controls);
    rsvpArea.appendChild(progressBar);

    // --- Bottom 1/3: Tracking panel ---
    const trackingPanel = document.createElement('div');
    trackingPanel.className = 'tracking-panel';
    this._trackingPanel = trackingPanel;

    wrapper.appendChild(rsvpArea);
    wrapper.appendChild(trackingPanel);

    // Register engine callbacks
    this._engine.onWord((word, index) => {
      const s = this._store.getSettings();
      this.updateWord(word, index, s.halfBold);

      // Find the segment index for the current word
      const segIdx = this._getCurrentSegmentIndex();
      this.updateTracking(segIdx);
    });

    this._engine.onComplete(() => {
      this._isPlaying = false;
      this._playBtn.innerHTML = this._playIcon();
      this._playBtn.setAttribute('aria-label', 'Play');
      this._playBtn.title = 'Play';
    });

    return wrapper;
  }

  _togglePlay() {
    if (this._isPlaying) {
      this._engine.pause();
      this._isPlaying = false;
      this._playBtn.innerHTML = this._playIcon();
      this._playBtn.setAttribute('aria-label', 'Play');
      this._playBtn.title = 'Play';
    } else {
      const wpm = this._store.getSettings().wpm;
      this._engine.play(wpm);
      this._isPlaying = true;
      this._playBtn.innerHTML = this._pauseIcon();
      this._playBtn.setAttribute('aria-label', 'Pause');
      this._playBtn.title = 'Pause';
    }
  }

  _changeWpm(delta) {
    const settings = this._store.getSettings();
    const newWpm = Math.max(50, Math.min(1500, settings.wpm + delta));
    this._store.updateSettings({ wpm: newWpm });
    if (this._wpmDisplay) {
      this._wpmDisplay.textContent = `${newWpm} wpm`;
    }
    // If playing, restart at new speed
    if (this._isPlaying) {
      this._engine.play(newWpm);
    }
  }

  _getCurrentSegmentIndex() {
    const seg = this._engine.getCurrentSegment();
    if (!seg || !this._doc) return 0;
    return this._doc.segments.indexOf(seg);
  }

  _playIcon() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polygon points="4,2 14,8 4,14" fill="currentColor"/>
    </svg>`;
  }

  _pauseIcon() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/>
      <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/>
    </svg>`;
  }
}
