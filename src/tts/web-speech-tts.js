/**
 * Web Speech API TTS provider.
 * Uses browser's built-in speech synthesis with word boundary events.
 */
export class WebSpeechTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.currentCallbacks = null;
    this._rate = 1.0;
    this._selectedVoice = null;
  }

  get available() {
    return 'speechSynthesis' in window;
  }

  get name() {
    return 'Browser (Basic)';
  }

  async getVoices() {
    return new Promise((resolve) => {
      let voices = this.synth.getVoices();
      if (voices.length > 0) {
        resolve(voices.map(v => ({ id: v.voiceURI, name: `${v.name} (${v.lang})`, native: v })));
        return;
      }
      this.synth.onvoiceschanged = () => {
        voices = this.synth.getVoices();
        resolve(voices.map(v => ({ id: v.voiceURI, name: `${v.name} (${v.lang})`, native: v })));
      };
      // Timeout fallback
      setTimeout(() => resolve([]), 1000);
    });
  }

  setVoice(voiceId) {
    const voices = this.synth.getVoices();
    this._selectedVoice = voices.find(v => v.voiceURI === voiceId) || null;
  }

  setRate(rate) {
    this._rate = rate;
    // Can't change rate mid-utterance with Web Speech API
  }

  speak(text, { rate, onBoundary, onWord, onEnd }) {
    return new Promise((resolve, reject) => {
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate || this._rate;
      if (this._selectedVoice) {
        utterance.voice = this._selectedVoice;
      }

      this.currentUtterance = utterance;
      this.currentCallbacks = { onBoundary, onWord, onEnd };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          onBoundary?.(event.charIndex);
        }
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve(); // Normal cancellation
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      this.synth.speak(utterance);
    });
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }

  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
  }
}
