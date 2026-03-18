import { WebSpeechTTS } from './web-speech-tts.js';
import { OpenAITTS } from './openai-tts.js';
import { PiperTTS } from './piper-tts.js';

/**
 * TTS Manager - handles provider switching and forwards calls to active provider.
 */
export class TTSManager {
  constructor() {
    this.providers = {
      browser: new WebSpeechTTS(),
      piper: new PiperTTS(),
      openai: new OpenAITTS(),
    };
    this._activeId = 'browser';
    this._loadSettings();
  }

  get active() {
    return this.providers[this._activeId];
  }

  get activeId() {
    return this._activeId;
  }

  setProvider(id) {
    if (!this.providers[id]) return;
    this.stop(); // Stop current provider before switching
    this._activeId = id;
    localStorage.setItem('flashread_tts_provider', id);
  }

  async getVoices() {
    return this.active.getVoices();
  }

  setVoice(voiceId) {
    this.active.setVoice(voiceId);
    localStorage.setItem(`flashread_voice_${this._activeId}`, voiceId);
  }

  setRate(rate) {
    this.active.setRate(rate);
  }

  async speak(text, callbacks) {
    return this.active.speak(text, callbacks);
  }

  pause() {
    this.active.pause();
  }

  resume() {
    this.active.resume();
  }

  stop() {
    // Stop all providers to be safe
    Object.values(this.providers).forEach(p => p.stop());
  }

  _loadSettings() {
    const saved = localStorage.getItem('flashread_tts_provider');
    if (saved && this.providers[saved]) {
      this._activeId = saved;
    }
    // Load OpenAI key
    this.providers.openai.loadApiKey();
  }
}
