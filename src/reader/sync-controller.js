/**
 * SyncController - Orchestrates voice ↔ RSVP synchronization.
 *
 * Two modes:
 * 1. Voice-led: TTS reads sentences, boundary events advance RSVP word-by-word
 * 2. RSVP-only: Speed slider controls WPM directly (original behavior)
 */
export class SyncController {
  constructor(rsvpEngine, ttsManager, textChunker) {
    this.rsvp = rsvpEngine;
    this.tts = ttsManager;
    this.chunker = textChunker;
    this.voiceEnabled = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.speedRate = 1.0; // Speech rate multiplier for voice mode

    // Callback for UI updates
    this.onStateChange = null; // ({ isPlaying, isPaused, voiceEnabled }) => void
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
    if (!enabled && this.isPlaying) {
      this.tts.stop();
    }
    this._notifyStateChange();
  }

  setSpeedRate(rate) {
    this.speedRate = rate;
    if (this.voiceEnabled && this.isPlaying) {
      this.tts.setRate(rate);
    }
  }

  setWPM(wpm) {
    this.rsvp.setWPM(wpm);
  }

  async start(fromBeginning = true) {
    if (!this.rsvp.hasContent) return;

    this.isPlaying = true;
    this.isPaused = false;

    if (fromBeginning) {
      this.rsvp.currentWordIndex = 0;
      this.chunker.currentChunkIndex = 0;
    }

    if (this.voiceEnabled) {
      await this._startVoiceLed();
    } else {
      this.rsvp.start(fromBeginning);
    }
    this._notifyStateChange();
  }

  pause() {
    this.isPaused = true;
    if (this.voiceEnabled) {
      this.tts.pause();
    }
    this.rsvp.pause();
    this._notifyStateChange();
  }

  resume() {
    this.isPaused = false;
    if (this.voiceEnabled) {
      this.tts.resume();
      // In voice mode, TTS boundary events will resume advancing RSVP
    } else {
      this.rsvp.resume();
    }
    this._notifyStateChange();
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else if (this.isPlaying) {
      this.pause();
    } else {
      this.start(false);
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.tts.stop();
    this.rsvp.stop();
    this._notifyStateChange();
  }

  async jumpToWordIndex(index) {
    const wasPlaying = this.isPlaying && !this.isPaused;
    this.tts.stop();
    if (this.rsvp.intervalId) {
      clearInterval(this.rsvp.intervalId);
      this.rsvp.intervalId = null;
    }

    this.rsvp.jumpTo(index);
    this.chunker.jumpToWordIndex(index);

    if (wasPlaying) {
      if (this.voiceEnabled) {
        await this._startVoiceLed();
      } else {
        this.rsvp.start(false);
      }
    }
  }

  async nextSentence() {
    const chunk = this.chunker.nextChunk();
    if (chunk) {
      await this.jumpToWordIndex(chunk.startIndex);
    }
  }

  async previousSentence() {
    const chunk = this.chunker.previousChunk();
    if (chunk) {
      await this.jumpToWordIndex(chunk.startIndex);
    }
  }

  /** Voice-led reading: TTS speaks, boundary events drive RSVP */
  async _startVoiceLed() {
    // Stop any existing RSVP interval - voice controls pacing
    if (this.rsvp.intervalId) {
      clearInterval(this.rsvp.intervalId);
      this.rsvp.intervalId = null;
    }

    const chunk = this.chunker.getCurrentChunk();
    if (!chunk) {
      this.isPlaying = false;
      this.rsvp.updateDisplay('Finished');
      this.rsvp.onFinish?.();
      this._notifyStateChange();
      return;
    }

    // Show first word of chunk
    this.rsvp.jumpTo(chunk.startIndex);

    let wordOffset = 0;

    try {
      await this.tts.speak(chunk.text, {
        rate: this.speedRate,
        onBoundary: (charIndex) => {
          // Map character index to word offset within this chunk
          const newOffset = this._charIndexToWordOffset(chunk.text, charIndex);
          if (newOffset > wordOffset) {
            wordOffset = newOffset;
            const globalIndex = chunk.startIndex + wordOffset;
            if (globalIndex < this.rsvp.words.length) {
              this.rsvp.jumpTo(globalIndex);
            }
          }
        },
        onWord: (wordIndex) => {
          // Alternative: direct word index callback (used by estimated sync)
          const globalIndex = chunk.startIndex + wordIndex;
          if (globalIndex < this.rsvp.words.length) {
            this.rsvp.jumpTo(globalIndex);
          }
        },
        onEnd: () => {
          // Sentence done — advance to next chunk
          if (this.isPlaying && !this.isPaused && this.chunker.hasMore) {
            this.chunker.nextChunk();
            this._startVoiceLed();
          } else if (!this.chunker.hasMore) {
            this.isPlaying = false;
            this.rsvp.updateDisplay('Finished');
            this.rsvp.onFinish?.();
            this._notifyStateChange();
          }
        },
      });
    } catch (err) {
      console.error('TTS error:', err);
      // Fallback to RSVP-only mode on TTS failure
      this.voiceEnabled = false;
      this.rsvp.start(false);
      this._notifyStateChange();
    }
  }

  /**
   * Map a character index in text to a word offset.
   * Used by Web Speech API boundary events.
   */
  _charIndexToWordOffset(text, charIndex) {
    const prefix = text.substring(0, charIndex);
    return prefix.split(/\s+/).filter(w => w.length > 0).length;
  }

  _notifyStateChange() {
    this.onStateChange?.({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      voiceEnabled: this.voiceEnabled,
    });
  }
}
