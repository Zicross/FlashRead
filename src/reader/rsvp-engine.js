// src/reader/rsvp-engine.js

export class RsvpEngine {
  constructor() {
    this.words = [];
    this.segments = [];
    this.currentIndex = 0;
    this._intervalId = null;
    this._wordCallback = null;
    this._completeCallback = null;
  }

  /**
   * Load document data and reset to index 0.
   * @param {string[]} words
   * @param {Array<{sentence: string, startIndex: number, wordCount: number}>} segments
   */
  load(words, segments) {
    this.words = words;
    this.segments = segments;
    this.currentIndex = 0;
    this._intervalId = null;
  }

  /**
   * Start advancing words at 60000/wpm ms interval.
   * @param {number} wpm - Words per minute
   */
  play(wpm) {
    this.pause(); // clear any existing interval
    const ms = 60000 / wpm;
    this._intervalId = setInterval(() => this._tick(), ms);
  }

  /**
   * Stop advancing words.
   */
  pause() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Internal tick: advance index, fire callbacks.
   */
  _tick() {
    this.currentIndex += 1;

    if (this.currentIndex >= this.words.length) {
      this.pause();
      if (this._completeCallback) {
        this._completeCallback();
      }
      return;
    }

    if (this._wordCallback) {
      this._wordCallback(this.words[this.currentIndex], this.currentIndex);
    }
  }

  /**
   * Jump to a specific word index and fire the word callback.
   * @param {number} index
   */
  jumpTo(index) {
    this.currentIndex = index;
    if (this._wordCallback) {
      this._wordCallback(this.words[this.currentIndex], this.currentIndex);
    }
  }

  /**
   * Jump to the start of the next segment.
   */
  nextSentence() {
    const segment = this.getCurrentSegment();
    if (!segment) return;

    const segIndex = this.segments.indexOf(segment);
    const next = this.segments[segIndex + 1];
    if (next) {
      this.jumpTo(next.startIndex);
    }
  }

  /**
   * Navigate to previous sentence.
   * Go to the previous segment's start index.
   */
  prevSentence() {
    const segment = this.getCurrentSegment();
    if (!segment) return;

    const segIndex = this.segments.indexOf(segment);
    const prev = this.segments[segIndex - 1];
    if (prev) {
      this.jumpTo(prev.startIndex);
    }
  }

  /**
   * Returns the word at currentIndex.
   * @returns {string}
   */
  getCurrentWord() {
    return this.words[this.currentIndex];
  }

  /**
   * Returns the last segment whose startIndex <= currentIndex.
   * @returns {object|undefined}
   */
  getCurrentSegment() {
    let result;
    for (const seg of this.segments) {
      if (seg.startIndex <= this.currentIndex) {
        result = seg;
      } else {
        break;
      }
    }
    return result;
  }

  /**
   * Returns progress as a fraction: currentIndex / words.length
   * @returns {number}
   */
  getProgress() {
    return this.currentIndex / this.words.length;
  }

  /**
   * Register word-change listener. Called with (word, index).
   * @param {function} callback
   */
  onWord(callback) {
    this._wordCallback = callback;
  }

  /**
   * Register end-of-document listener.
   * @param {function} callback
   */
  onComplete(callback) {
    this._completeCallback = callback;
  }

  /**
   * Format a word with optional half-bold styling.
   * For odd-length words, bold Math.ceil(length / 2) characters.
   * @param {string} word
   * @param {boolean} halfBold
   * @returns {string}
   */
  formatWord(word, halfBold) {
    if (!halfBold) return word;
    const boldLen = Math.floor(word.length / 2);
    const bold = word.slice(0, boldLen);
    const rest = word.slice(boldLen);
    return `<b>${bold}</b>${rest}`;
  }
}
