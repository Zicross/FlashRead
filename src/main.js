// src/main.js
import { Store } from './storage/store.js';
import { ThemeManager } from './ui/theme.js';
import { AppShell } from './ui/app-shell.js';
import { UploadScreen } from './ui/upload-screen.js';
import { parseFile } from './parsers/index.js';

const store = new Store();
const settings = store.getSettings();
const theme = new ThemeManager(settings.theme);
theme.apply();

const app = new AppShell(document.getElementById('app'), store, theme);
const upload = new UploadScreen(app.contentArea, handleFile);

app.onUpload(() => upload.showFilePicker());
app.onThemeToggle(() => {
  const newTheme = theme.toggle();
  store.updateSettings({ theme: newTheme });
});

async function handleFile(file) {
  try {
    const doc = await parseFile(file);
    console.log('Parsed:', doc.metadata.title, doc.words.length, 'words');
    // Will be wired to RSVP/Browse views in later tasks
  } catch (err) {
    console.error('Parse error:', err);
  }
}
