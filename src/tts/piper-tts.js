/**
 * Piper TTS provider - runs entirely in-browser via WebAssembly.
 * High quality neural TTS, free, private, works offline after first voice download.
 */

let PiperEngine = null;

async function loadPiperModule() {
  if (PiperEngine) return PiperEngine;
  try {
    const mod = await import('piper-tts-web');
    PiperEngine = mod;
    return mod;
  } catch (e) {
    console.warn('piper-tts-web not available:', e.message);
    return null;
  }
}

export class PiperTTS {
  constructor() {
    this._engine = null;
    this._worker = null;
    this._voiceId = 'en_US-lessac-medium';
    this._rate = 1.0;
    this._audioEl = null;
    this._wordTimers = [];
    this._paused = false;
    this._ready = false;
    this.onLoadProgress = null; // (progress: 0-1) => void
  }

  get available() {
    return typeof WebAssembly !== 'undefined';
  }

  get name() {
    return 'Piper (High Quality, Free)';
  }

  async initialize() {
    const mod = await loadPiperModule();
    if (!mod) throw new Error('Piper TTS module not available');

    this._engine = new mod.PiperTTSEngine({
      onProgress: (progress) => {
        this.onLoadProgress?.(progress);
      },
    });

    await this._engine.init();
    this._ready = true;
  }

  async getVoices() {
    // Curated list of good English voices
    return [
      { id: 'en_US-lessac-medium', name: 'Lessac (US, Medium)' },
      { id: 'en_US-lessac-high', name: 'Lessac (US, High)' },
      { id: 'en_US-libritts_r-medium', name: 'LibriTTS (US, Medium)' },
      { id: 'en_US-amy-medium', name: 'Amy (US, Medium)' },
      { id: 'en_US-arctic-medium', name: 'Arctic (US, Medium)' },
      { id: 'en_GB-alan-medium', name: 'Alan (GB, Medium)' },
      { id: 'en_GB-cori-medium', name: 'Cori (GB, Medium)' },
    ];
  }

  setVoice(voiceId) {
    this._voiceId = voiceId;
  }

  setRate(rate) {
    this._rate = rate;
  }

  async speak(text, { rate, onBoundary, onWord, onEnd }) {
    this.stop();

    if (!this._ready) {
      await this.initialize();
    }

    const effectiveRate = rate || this._rate;

    try {
      // Generate audio with Piper WASM
      const result = await this._engine.speak(text, {
        voice: this._voiceId,
        speed: effectiveRate,
      });

      const audioBlob = new Blob([result.audio], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this._audioEl = audio;

      return new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          const duration = audio.duration;
          const words = text.split(/\s+/).filter(w => w.length > 0);

          // Estimate word timing (same approach as OpenAI)
          const totalChars = words.reduce((sum, w) => sum + w.length, 0);
          let elapsed = 0;
          this._wordTimers = [];

          words.forEach((word, i) => {
            const wordDuration = (word.length / totalChars) * duration * 1000;
            const timer = setTimeout(() => {
              if (!this._paused) {
                onWord?.(i);
              }
            }, elapsed);
            this._wordTimers.push(timer);
            elapsed += wordDuration;
          });

          audio.onended = () => {
            this._cleanup();
            onEnd?.();
            resolve();
          };

          audio.play();
        };

        audio.onerror = () => {
          this._cleanup();
          resolve();
        };
      });
    } catch (err) {
      console.error('Piper TTS error:', err);
      throw err;
    }
  }

  pause() {
    if (this._audioEl && !this._paused) {
      this._audioEl.pause();
      this._paused = true;
      this._wordTimers.forEach(t => clearTimeout(t));
      this._wordTimers = [];
    }
  }

  resume() {
    if (this._audioEl && this._paused) {
      this._paused = false;
      this._audioEl.play();
    }
  }

  stop() {
    if (this._audioEl) {
      this._audioEl.pause();
      this._audioEl.src = '';
      this._audioEl = null;
    }
    this._wordTimers.forEach(t => clearTimeout(t));
    this._wordTimers = [];
    this._paused = false;
  }

  _cleanup() {
    if (this._audioEl) {
      URL.revokeObjectURL(this._audioEl.src);
    }
    this._audioEl = null;
    this._wordTimers.forEach(t => clearTimeout(t));
    this._wordTimers = [];
    this._paused = false;
  }
}
