/**
 * RSVP (Rapid Serial Visual Presentation) Engine
 * Manages word-by-word display with configurable speed.
 */
export class RSVPEngine {
  constructor(displayEl) {
    this.displayEl = displayEl;
    this.words = [];
    this.wordPositions = [];
    this.currentWordIndex = 0;
    this.intervalId = null;
    this.isPaused = false;
    this.wpm = 300;
    this.boldFirstHalf = false;
    this.fontSize = 48;

    // Callbacks
    this.onWordChange = null;  // (index, word) => void
    this.onFinish = null;      // () => void
    this.onPauseChange = null; // (isPaused) => void
  }

  get delay() {
    return 60000 / this.wpm;
  }

  get isRunning() {
    return this.intervalId !== null && !this.isPaused;
  }

  get hasContent() {
    return this.words.length > 0;
  }

  loadContent(words, wordPositions = []) {
    this.stop();
    this.words = words;
    this.wordPositions = wordPositions;
    this.currentWordIndex = 0;
    this.updateDisplay('Ready to start');
  }

  setWPM(wpm) {
    this.wpm = wpm;
    if (this.isRunning) {
      clearInterval(this.intervalId);
      this._startInterval();
    }
  }

  setFontSize(size) {
    this.fontSize = size;
    this.displayEl.style.fontSize = `${size}px`;
  }

  setBoldFirstHalf(enabled) {
    this.boldFirstHalf = enabled;
    if (this.hasContent && this.currentWordIndex < this.words.length) {
      this._renderWord(this.words[this.currentWordIndex]);
    }
  }

  start(fromBeginning = true) {
    if (!this.hasContent) return;
    if (this.isRunning) return;

    if (fromBeginning) {
      this.currentWordIndex = 0;
      this.isPaused = false;
    }

    this._startInterval();
    this.onPauseChange?.(false);
  }

  pause() {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isPaused = true;
    this.onPauseChange?.(true);
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this._startInterval();
    this.onPauseChange?.(false);
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else if (this.intervalId) {
      this.pause();
    } else {
      this.start(false);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPaused = false;
    this.currentWordIndex = 0;
  }

  jumpTo(index) {
    if (index < 0 || index >= this.words.length) return;
    this.currentWordIndex = index;
    this._renderWord(this.words[index]);
    this.onWordChange?.(index, this.words[index]);
  }

  /** Advance to next word (used by sync controller in voice-led mode) */
  advanceWord() {
    if (this.currentWordIndex < this.words.length) {
      this._renderWord(this.words[this.currentWordIndex]);
      this.onWordChange?.(this.currentWordIndex, this.words[this.currentWordIndex]);
      this.currentWordIndex++;
    }
    if (this.currentWordIndex >= this.words.length) {
      this.onFinish?.();
    }
  }

  updateDisplay(text) {
    this.displayEl.textContent = text;
  }

  _startInterval() {
    this.intervalId = setInterval(() => {
      if (this.currentWordIndex < this.words.length) {
        this._renderWord(this.words[this.currentWordIndex]);
        this.onWordChange?.(this.currentWordIndex, this.words[this.currentWordIndex]);
        this.currentWordIndex++;
      } else {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isPaused = false;
        this.updateDisplay('Finished');
        this.onFinish?.();
      }
    }, this.delay);
  }

  _renderWord(word) {
    if (this.boldFirstHalf && word.length > 1) {
      const mid = Math.ceil(word.length / 2);
      this.displayEl.innerHTML = `<b>${word.slice(0, mid)}</b>${word.slice(mid)}`;
    } else {
      this.displayEl.textContent = word;
    }
  }
}
