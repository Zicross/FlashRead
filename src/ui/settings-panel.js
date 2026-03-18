/**
 * Settings Panel - TTS provider selection, API key input, voice selection.
 */
export class SettingsPanel {
  constructor(ttsManager) {
    this.tts = ttsManager;

    this.panel = document.getElementById('settingsPanel');
    this.toggleBtn = document.getElementById('settingsToggle');
    this.providerSelect = document.getElementById('ttsProvider');
    this.voiceSelect = document.getElementById('voiceSelect');
    this.openaiSettings = document.getElementById('openaiSettings');
    this.apiKeyInput = document.getElementById('openaiApiKey');
    this.modelSelect = document.getElementById('openaiModel');
    this.piperLoading = document.getElementById('piperVoiceLoading');
    this.piperProgress = document.getElementById('piperProgress');

    this._bindEvents();
    this._loadSettings();
  }

  _bindEvents() {
    this.toggleBtn.addEventListener('click', () => {
      this.panel.classList.toggle('hidden');
    });

    this.providerSelect.addEventListener('change', async (e) => {
      this.tts.setProvider(e.target.value);
      this._updateProviderUI(e.target.value);
      await this._populateVoices();
    });

    this.voiceSelect.addEventListener('change', (e) => {
      this.tts.setVoice(e.target.value);
    });

    this.apiKeyInput.addEventListener('input', (e) => {
      this.tts.providers.openai.setApiKey(e.target.value);
    });

    this.modelSelect.addEventListener('change', (e) => {
      this.tts.providers.openai.setModel(e.target.value);
      localStorage.setItem('flashread_openai_model', e.target.value);
    });
  }

  async _loadSettings() {
    // Restore provider
    this.providerSelect.value = this.tts.activeId;
    this._updateProviderUI(this.tts.activeId);

    // Restore OpenAI key
    const key = this.tts.providers.openai._apiKey;
    if (key) this.apiKeyInput.value = key;

    // Restore model
    const model = localStorage.getItem('flashread_openai_model');
    if (model) {
      this.modelSelect.value = model;
      this.tts.providers.openai.setModel(model);
    }

    // Populate voices
    await this._populateVoices();
  }

  async _populateVoices() {
    this.voiceSelect.innerHTML = '';
    try {
      const voices = await this.tts.getVoices();
      voices.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.name;
        this.voiceSelect.appendChild(option);
      });

      // Restore saved voice
      const savedVoice = localStorage.getItem(`flashread_voice_${this.tts.activeId}`);
      if (savedVoice) {
        this.voiceSelect.value = savedVoice;
        this.tts.setVoice(savedVoice);
      }
    } catch (e) {
      console.warn('Failed to load voices:', e);
    }
  }

  _updateProviderUI(providerId) {
    this.openaiSettings.classList.toggle('hidden', providerId !== 'openai');
    this.piperLoading.classList.add('hidden');

    // Set up Piper progress callback
    if (providerId === 'piper') {
      this.tts.providers.piper.onLoadProgress = (progress) => {
        this.piperLoading.classList.remove('hidden');
        this.piperProgress.style.width = `${progress * 100}%`;
        if (progress >= 1) {
          setTimeout(() => this.piperLoading.classList.add('hidden'), 1000);
        }
      };
    }
  }
}
