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
import { computeFileHash } from './storage/file-hash.js';

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

// Current file metadata (used for reading position persistence)
let currentFileName = null;
let currentFileHash = null;

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

    // Compute file hash for persistence
    const fileHash = await computeFileHash(file);
    currentFileName = file.name;
    currentFileHash = fileHash;

    // Create engine and controllers if not already created
    if (!engine) {
      engine = new RsvpEngine();

      // Wrap engine.pause so every pause auto-saves reading position
      const originalPause = engine.pause.bind(engine);
      engine.pause = function (...args) {
        originalPause(...args);
        saveReadingPosition();
      };

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

    // Check for saved reading position and offer resume
    showResumeBanner(fileHash, file.name);
  } catch (err) {
    console.error('Parse error:', err);
  }
}

// ================================================================
// Resume banner
// ================================================================

function showResumeBanner(fileHash, fileName) {
  const lastRead = store.getLastRead();
  if (!lastRead || lastRead.fileHash !== fileHash || lastRead.wordIndex <= 0) return;

  // Remove any stale banner
  const existing = document.getElementById('resume-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'resume-banner';
  banner.style.cssText = [
    'position:absolute',
    'top:var(--space-4)',
    'left:50%',
    'transform:translateX(-50%)',
    'background-color:var(--color-surface)',
    'border:1px solid var(--color-border)',
    'border-radius:var(--radius-lg)',
    'padding:var(--space-3) var(--space-5)',
    'display:flex',
    'align-items:center',
    'gap:var(--space-4)',
    'box-shadow:var(--shadow-md)',
    'z-index:50',
    'white-space:nowrap',
    'font-size:var(--text-sm)',
    'color:var(--color-text-primary)',
  ].join(';');

  const msg = document.createElement('span');
  msg.textContent = `Continue reading "${fileName}" from where you left off?`;

  const yesBtn = document.createElement('button');
  yesBtn.className = 'btn btn-primary';
  yesBtn.textContent = 'Yes';
  yesBtn.addEventListener('click', () => {
    engine.jumpTo(lastRead.wordIndex);
    banner.remove();
  });

  const noBtn = document.createElement('button');
  noBtn.className = 'btn btn-ghost';
  noBtn.textContent = 'No';
  noBtn.addEventListener('click', () => {
    store.clearLastRead();
    banner.remove();
  });

  banner.appendChild(msg);
  banner.appendChild(yesBtn);
  banner.appendChild(noBtn);

  // Content area needs position:relative for absolute child positioning
  app.contentArea.style.position = 'relative';
  app.contentArea.appendChild(banner);
}

// ================================================================
// Reading position persistence
// ================================================================

function saveReadingPosition() {
  if (!engine || engine.words.length === 0 || !currentFileHash) return;
  store.saveLastRead({
    fileName: currentFileName,
    fileHash: currentFileHash,
    wordIndex: engine.currentIndex,
    timestamp: Date.now(),
  });
}

// Save on page unload (localStorage.setItem is synchronous — safe in beforeunload)
window.addEventListener('beforeunload', () => {
  saveReadingPosition();
});
