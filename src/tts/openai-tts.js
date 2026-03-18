/**
 * OpenAI TTS provider.
 * Uses the OpenAI Audio Speech API for high-quality voice synthesis.
 * Word sync is estimated from audio duration.
 */
export class OpenAITTS {
  constructor() {
    this._apiKey = '';
    this._model = 'tts-1';
    this._voice = 'alloy';
    this._rate = 1.0;
    this._audioEl = null;
    this._wordTimers = [];
    this._paused = false;
    this._pauseTime = 0;
    this._startTime = 0;
  }

  get available() {
    return !!this._apiKey;
  }

  get name() {
    return 'OpenAI (Premium)';
  }

  setApiKey(key) {
    this._apiKey = key;
    localStorage.setItem('flashread_openai_key', key);
  }

  loadApiKey() {
    this._apiKey = localStorage.getItem('flashread_openai_key') || '';
    return this._apiKey;
  }

  setModel(model) {
    this._model = model;
  }

  async getVoices() {
    return [
      { id: 'alloy', name: 'Alloy' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'nova', name: 'Nova' },
      { id: 'shimmer', name: 'Shimmer' },
    ];
  }

  setVoice(voiceId) {
    this._voice = voiceId;
  }

  setRate(rate) {
    this._rate = rate;
  }

  async speak(text, { rate, onBoundary, onWord, onEnd }) {
    this.stop();

    if (!this._apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const effectiveRate = rate || this._rate;

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this._model,
        input: text,
        voice: this._voice,
        speed: effectiveRate,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} ${err}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    this._audioEl = audio;

    return new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        const words = text.split(/\s+/).filter(w => w.length > 0);

        // Estimate word timing based on word length proportions
        const totalChars = words.reduce((sum, w) => sum + w.length, 0);
        let elapsed = 0;

        this._wordTimers = [];
        this._startTime = performance.now();

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
  }

  pause() {
    if (this._audioEl && !this._paused) {
      this._audioEl.pause();
      this._paused = true;
      this._pauseTime = performance.now();
      // Clear pending timers
      this._wordTimers.forEach(t => clearTimeout(t));
      this._wordTimers = [];
    }
  }

  resume() {
    if (this._audioEl && this._paused) {
      this._paused = false;
      this._audioEl.play();
      // Note: word timing after resume will be imprecise, but acceptable
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
