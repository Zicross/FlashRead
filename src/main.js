// src/main.js
import { Store } from './storage/store.js';
import { ThemeManager } from './ui/theme.js';
import { AppShell } from './ui/app-shell.js';
import { UploadScreen } from './ui/upload-screen.js';
import { parseFile } from './parsers/index.js';
import { RsvpEngine } from './reader/rsvp-engine.js';
import { RsvpView } from './ui/rsvp-view.js';
import { SettingsPanel } from './ui/settings-panel.js';
import { TTSManager } from './tts/index.js';
import { KokoroProvider } from './tts/kokoro-tts.js';
import { OpenAIProvider } from './tts/openai-tts.js';
import { SyncController } from './reader/sync-controller.js';

// ================================================================
// Initialization
// ================================================================

const store = new Store();
const settings = store.getSettings();
const theme = new ThemeManager(settings.theme);
theme.apply();

const app = new AppShell(document.getElementById('app'), store, theme);
const upload = new UploadScreen(app.contentArea, handleFile);

// TTS setup
const ttsManager = new TTSManager();
const kokoroProvider = new KokoroProvider();
const openaiProvider = new OpenAIProvider();
ttsManager.registerProvider('kokoro', kokoroProvider);
ttsManager.registerProvider('openai', openaiProvider);

// Restore persisted OpenAI API key
if (settings.openaiApiKey) {
  openaiProvider.setApiKey(settings.openaiApiKey);
}

let engine = null;
let rsvpView = null;
let syncController = null;

// ================================================================
// Settings Panel
// ================================================================

const settingsPanel = new SettingsPanel(store, {
  onWpmChange(wpm) {
    // If engine is playing without voice, restart interval at new speed
    if (engine && !store.getSettings().voiceEnabled && engine._intervalId !== null) {
      engine.play(wpm);
    }
  },

  onFontSizeChange(size) {
    if (rsvpView && rsvpView._wordDisplay) {
      rsvpView._wordDisplay.style.fontSize = `${size}px`;
    }
  },

  onHalfBoldChange(_enabled) {
    // halfBold is read from store on each word update — no immediate action needed
  },

  onVoiceToggle(enabled) {
    if (syncController) {
      syncController.setVoiceEnabled(enabled);
    }
    if (enabled) {
      const voices = ttsManager.getVoices();
      settingsPanel.updateVoices(voices);
    }
  },

  async onProviderChange(provider) {
    try {
      await ttsManager.setProvider(provider);
      const voices = ttsManager.getVoices();
      settingsPanel.updateVoices(voices);
      const savedVoice = store.getSettings().voiceId;
      if (savedVoice) {
        ttsManager.setVoice(savedVoice);
      }
    } catch (err) {
      console.error('Failed to switch TTS provider:', err);
    }
  },

  onVoiceChange(voiceId) {
    ttsManager.setVoice(voiceId);
  },

  onApiKeyChange(key) {
    openaiProvider.setApiKey(key);
  },

  onThemeChange(newTheme) {
    theme.set(newTheme);
  },
});

// Populate voice list immediately (Kokoro voices are synchronously available)
settingsPanel.updateVoices(kokoroProvider.getVoices());

// ================================================================
// App Shell wiring
// ================================================================

app.onUpload(() => upload.showFilePicker());

app.onThemeToggle(() => {
  const newTheme = theme.toggle();
  store.updateSettings({ theme: newTheme });
});

app.onSettingsOpen(() => settingsPanel.open());

app.onModeChange((mode) => {
  if (mode === 'rsvp') {
    if (rsvpView && rsvpView._el) {
      app.contentArea.appendChild(rsvpView._el);
    }
  } else if (mode === 'browse') {
    console.log('Browse mode');
  }
});

// ================================================================
// Keyboard shortcuts
// ================================================================

document.addEventListener('keydown', (e) => {
  // Guard: only active when a document is loaded
  if (!engine || engine.words.length === 0) return;

  // Do not intercept when user is typing in an input field
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (e.key === ' ') {
    e.preventDefault(); // prevent page scroll
    if (rsvpView) {
      rsvpView._togglePlay();
    }
  } else if (e.key === 'ArrowRight') {
    engine.nextSentence();
  } else if (e.key === 'ArrowLeft') {
    engine.prevSentence();
  }
});

// ================================================================
// File handling
// ================================================================

async function handleFile(file) {
  try {
    const doc = await parseFile(file);
    console.log('Parsed:', doc.metadata.title, doc.words.length, 'words');

    // Create engine and controllers if not already created
    if (!engine) {
      engine = new RsvpEngine();
      syncController = new SyncController(engine, ttsManager);
      syncController.setVoiceEnabled(store.getSettings().voiceEnabled);
    }

    // Create RSVP view if not already created
    if (!rsvpView) {
      rsvpView = new RsvpView(app.contentArea, engine, store);
    }

    // Hide upload screen, show RSVP view
    upload.hide();
    rsvpView.show(doc);
    app.setMode('rsvp');
  } catch (err) {
    console.error('Parse error:', err);
  }
}
