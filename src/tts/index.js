export class TTSManager {
  constructor() {
    this.providers = {};
    this.activeProvider = null;
    this.audioContext = null;
  }

  registerProvider(name, provider) {
    this.providers[name] = provider;
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  async setProvider(name, onProgress) {
    const provider = this.providers[name];
    if (!provider) throw new Error(`Unknown TTS provider: ${name}`);
    if (!provider.isReady()) {
      await provider.init(onProgress, this.getAudioContext());
    }
    this.activeProvider = provider;
  }

  async generate(text) {
    if (!this.activeProvider) throw new Error('No TTS provider active');
    return this.activeProvider.generate(text);
  }

  async play(buffer) {
    const ctx = this.getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this._currentSource = source;
    return new Promise((resolve) => {
      source.onended = resolve;
      source.start();
    });
  }

  stop() {
    if (this._currentSource) {
      try { this._currentSource.stop(); } catch {}
      this._currentSource = null;
    }
    if (this.activeProvider) {
      this.activeProvider.stop();
    }
  }

  getVoices() {
    if (!this.activeProvider) return [];
    return this.activeProvider.getVoices();
  }

  setVoice(voiceId) {
    if (this.activeProvider) this.activeProvider.setVoice(voiceId);
  }
}
