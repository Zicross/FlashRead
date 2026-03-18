export class OpenAIProvider {
  constructor() {
    this.apiKey = null;
    this.voiceId = 'alloy';
    this.audioContext = null;
  }

  async init(onProgress, audioContext) {
    this.audioContext = audioContext;
    if (onProgress) onProgress(1);
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async generate(text) {
    if (!this.apiKey) throw new Error('OpenAI API key not set');

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: this.voiceId,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  stop() {}

  getVoices() {
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
    this.voiceId = voiceId;
  }

  isReady() {
    return this.apiKey !== null;
  }
}
