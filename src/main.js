// src/main.js
import { Store } from './storage/store.js';
import { ThemeManager } from './ui/theme.js';
import { AppShell } from './ui/app-shell.js';
import { UploadScreen } from './ui/upload-screen.js';
import { parseFile } from './parsers/index.js';
import { RsvpEngine } from './reader/rsvp-engine.js';
import { RsvpView } from './ui/rsvp-view.js';

const store = new Store();
const settings = store.getSettings();
const theme = new ThemeManager(settings.theme);
theme.apply();

const app = new AppShell(document.getElementById('app'), store, theme);
const upload = new UploadScreen(app.contentArea, handleFile);

let engine = null;
let rsvpView = null;

app.onUpload(() => upload.showFilePicker());
app.onThemeToggle(() => {
  const newTheme = theme.toggle();
  store.updateSettings({ theme: newTheme });
});

// Wire mode tab changes
app.onModeChange((mode) => {
  if (mode === 'rsvp') {
    if (rsvpView && rsvpView._el) {
      // View already in DOM, ensure it's visible
      app.contentArea.appendChild(rsvpView._el);
    }
  } else if (mode === 'browse') {
    console.log('Browse mode');
  }
});

async function handleFile(file) {
  try {
    const doc = await parseFile(file);
    console.log('Parsed:', doc.metadata.title, doc.words.length, 'words');

    // Create engine if not already created
    if (!engine) {
      engine = new RsvpEngine();
    }

    // Create RSVP view if not already created
    if (!rsvpView) {
      rsvpView = new RsvpView(app.contentArea, engine, store);
    }

    // Hide upload screen
    upload.hide();

    // Show RSVP view (also loads words/segments into engine)
    rsvpView.show(doc);

    // Set mode to 'rsvp' in app shell
    app.setMode('rsvp');
  } catch (err) {
    console.error('Parse error:', err);
  }
}
