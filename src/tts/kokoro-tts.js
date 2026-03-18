import { KokoroTTS } from 'kokoro-js';

export class KokoroProvider {
  constructor() {
    this.model = null;
    this.voiceId = 'af_heart';
    this.audioContext = null;
  }

  async init(onProgress, audioContext) {
    this.audioContext = audioContext;
    this.model = await KokoroTTS.from_pretrained(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      { progress_callback: onProgress }
    );
  }

  async generate(text) {
    const audio = await this.model.generate(text, {
      voice: this.voiceId,
    });
    // Convert RawAudio to AudioBuffer
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, audio.audio.length, audio.sampling_rate);
    buffer.getChannelData(0).set(audio.audio);
    return buffer;
  }

  stop() {
    // Kokoro doesn't support mid-generation cancellation
  }

  getVoices() {
    return [
      { id: 'af_heart', name: 'Heart (Female)' },
      { id: 'af_bella', name: 'Bella (Female)' },
      { id: 'af_sarah', name: 'Sarah (Female)' },
      { id: 'am_adam', name: 'Adam (Male)' },
      { id: 'am_michael', name: 'Michael (Male)' },
    ];
  }

  setVoice(voiceId) {
    this.voiceId = voiceId;
  }

  isReady() {
    return this.model !== null;
  }

  static checkCompatibility() {
    if (typeof WebAssembly === 'undefined') {
      return { supported: false, message: "Your browser doesn't support local TTS. Use OpenAI or read without voice." };
    }
    return { supported: true };
  }
}
