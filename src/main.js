import './styles/main.css';
import { parseFile } from './parsers/index.js';
import { RSVPEngine } from './reader/rsvp-engine.js';
import { TextChunker } from './reader/text-chunker.js';
import { SyncController } from './reader/sync-controller.js';
import { TTSManager } from './tts/index.js';
import { DocumentViewer } from './ui/document-viewer.js';
import { Controls } from './ui/controls.js';
import { SettingsPanel } from './ui/settings-panel.js';

// Initialize core components
const displayEl = document.getElementById('display');
const rsvp = new RSVPEngine(displayEl);
const chunker = new TextChunker();
const ttsManager = new TTSManager();
const sync = new SyncController(rsvp, ttsManager, chunker);

// Initialize UI
const viewer = new DocumentViewer(
  document.getElementById('pdfViewer'),
  document.getElementById('textViewer')
);
const controls = new Controls(sync, ttsManager);
const settings = new SettingsPanel(ttsManager);

// Current document data
let currentParseResult = null;

// Wire up word change events for document highlighting
rsvp.onWordChange = (index, word) => {
  if (currentParseResult) {
    viewer.highlightWord(index, currentParseResult.wordPositions);
  }
};

rsvp.onFinish = () => {
  controls.setEnabled(true);
  controls.updatePlayState({ isPlaying: false, isPaused: false });
};

// Wire up document viewer click-to-jump
viewer.onWordClick = (index) => {
  sync.jumpToWordIndex(index);
};

// Handle file selection
controls.onFileSelected = async (file) => {
  controls.setEnabled(false);
  sync.stop();
  viewer.clear();
  displayEl.textContent = 'Loading...';

  try {
    currentParseResult = await parseFile(file);
    const { words, wordPositions, type } = currentParseResult;

    // Load content into RSVP engine
    rsvp.loadContent(words, wordPositions);

    // Build sentence chunks for TTS
    chunker.buildChunks(words);

    // Render document in viewer
    if (type === 'pdf') {
      await viewer.renderPDF(currentParseResult);
    } else {
      viewer.renderText(currentParseResult);
    }

    controls.setEnabled(true);
    displayEl.textContent = 'Ready to start';
  } catch (err) {
    console.error('Parse error:', err);
    displayEl.textContent = `Error: ${err.message}`;
  }
};
