// src/reader/sync-controller.js

export function calculateWordTimings(words, durationMs) {
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  return words.map((w) => (w.length / totalChars) * durationMs);
}

export class SyncController {
  constructor(rsvpEngine, ttsManager) {
    this.engine = rsvpEngine;
    this.tts = ttsManager;
    this.voiceEnabled = false;
    this.playing = false;
    this._cancelled = false;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  async play(wpm) {
    this.playing = true;
    this._cancelled = false;

    if (!this.voiceEnabled) {
      this.engine.play(wpm);
      return;
    }

    // Voice-led mode: sentence-by-sentence
    while (this.playing && !this._cancelled) {
      const segment = this.engine.getCurrentSegment();
      if (!segment) break;

      const startIdx = segment.startIndex;
      const words = [];
      for (let i = 0; i < segment.wordCount; i++) {
        words.push(this.engine.words[startIdx + i]);
      }

      // Generate audio, get duration
      const buffer = await this.tts.generate(segment.sentence);
      if (this._cancelled) break;

      const durationMs = buffer.duration * 1000;

      // Calculate per-word timings
      const timings = calculateWordTimings(words, durationMs);

      // Play audio and advance words simultaneously
      const playPromise = this.tts.play(buffer);

      for (let i = 0; i < words.length && !this._cancelled; i++) {
        this.engine.jumpTo(startIdx + i);
        if (i < words.length - 1) {
          await this._delay(timings[i]);
        }
      }

      // Wait for audio to finish (re-sync at sentence boundary)
      if (!this._cancelled) {
        await playPromise;
      }

      // Advance to next segment
      if (!this._cancelled) {
        this.engine.nextSentence();
        if (this.engine.currentIndex >= this.engine.words.length) {
          this.playing = false;
          break;
        }
      }
    }
  }

  pause() {
    this.playing = false;
    this._cancelled = true;
    if (this._timer) clearTimeout(this._timer);
    this.engine.pause();
    this.tts.stop();
  }

  _delay(ms) {
    return new Promise((resolve) => {
      this._timer = setTimeout(resolve, ms);
    });
  }
}
