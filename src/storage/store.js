// src/storage/store.js
const SETTINGS_KEY = 'flashread:settings';
const LAST_READ_KEY = 'flashread:lastRead';

const DEFAULTS = {
  wpm: 600,
  fontSize: 32,
  halfBold: false,
  voiceEnabled: false,
  ttsProvider: 'kokoro',
  openaiApiKey: null,
  voiceId: null,
  theme: 'dark',
};

export class Store {
  getSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  }

  updateSettings(partial) {
    const current = this.getSettings();
    const merged = { ...current, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  }

  getLastRead() {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  saveLastRead({ fileName, fileHash, wordIndex, timestamp }) {
    localStorage.setItem(
      LAST_READ_KEY,
      JSON.stringify({ fileName, fileHash, wordIndex, timestamp })
    );
  }

  clearLastRead() {
    localStorage.removeItem(LAST_READ_KEY);
  }
}
