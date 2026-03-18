# FlashRead v2 — Design Spec

## Overview

FlashRead is a browser-based speed reading app. Users upload documents (PDF, DOCX, TXT, EPUB), then read them word-by-word via RSVP (Rapid Serial Visual Presentation) with optional synchronized text-to-speech.

This spec covers a full rebuild as a modular Vite SPA, replacing the current single-file CDN approach.

## Build & Deployment

- **Build**: Vite (ES modules, WASM support, HMR)
- **Deploy**: Vercel (static SPA, already configured)
- **Framework**: None — vanilla JS with ES modules

## File Formats

All parsers return a common shape:

```js
{
  words: string[],        // Flat word array for RSVP
  sentences: string[],    // Sentence array for TTS chunking
  metadata: {
    title: string,        // From document metadata or filename
    pageCount: number|null
  },
  html: string            // Rendered HTML for browse mode
}
```

### PDF (primary)
- Parser: pdf.js
- Extracts text per page with position data
- **Header/footer deduplication**: Two-pass approach. First pass scans top/bottom 12% of each page, builds frequency map of recurring text across 3+ consecutive pages. Second pass extracts all text excluding matches from the filter set. Handles page numbers, running headers, and running footers.
- HTML output: page-by-page rendered content for browse mode

### DOCX
- Parser: mammoth
- Converts to HTML directly, extracts words/sentences from that
- HTML output: mammoth's HTML conversion

### TXT
- Split on whitespace for words, regex for sentences
- HTML output: `<p>`-wrapped paragraphs

### EPUB (low priority, basic)
- Parser: epubjs
- Extracts chapter HTML from spine items
- No chapter navigation — just concatenated text content

## TTS (Text-to-Speech)

### Provider Interface

```js
{
  init()              // Load model or validate API key
  speak(text)         // Promise — resolves when utterance complete
  stop()              // Cancel current speech
  getVoices()         // Available voice options
  setVoice(voiceId)   // Select a voice
  isReady()           // Boolean — model loaded / key valid
}
```

### Kokoro (default, free)
- 82M parameter model, runs in-browser via WASM (WebGPU where available)
- ~80MB model download on first load, browser-cached after
- ~200-500ms latency for first chunk, then streams
- Loading indicator required during model init

### OpenAI TTS (optional, paid)
- Calls `tts-1` endpoint, streams audio
- User provides API key in settings
- API key stored in localStorage (with local-storage-only warning)
- Lower latency, more voice options

## Sync Controller

Two operating modes:

### RSVP-only (voice off)
- RSVP engine drives timing based on WPM setting (default: 600)
- Words advance at fixed interval derived from WPM

### Voice-led (voice on)
- TTS speaks a sentence
- RSVP highlights words proportionally across estimated sentence duration
- TTS controls pace; WPM becomes a base speed reference
- Not perfect word-level sync, but proportional approximation

## UI Layout

### Sidebar (always visible, left)
- App logo/name at top
- Mode tabs: RSVP, Browse
- Upload button (replace current document)
- Settings gear icon (opens settings panel as slide-out overlay)
- Theme toggle at bottom

### RSVP Mode
- **Top 2/3**: Large centered word display, play/pause button, WPM control, progress bar
- **Bottom 1/3**: Document tracking panel — current paragraph context in scrollable view, current sentence highlighted. Parsed text (not PDF render), flowing naturally.

### Browse Mode
- Full rendered document view (parser's `html` output)
- Scrollable, readable
- Click any word/sentence to jump RSVP to that position

### Settings Panel (slide-out overlay)
- **Reading**: WPM slider (100-1400, default 600), font size, half-bold toggle (off by default)
- **Voice**: on/off toggle, provider dropdown (Kokoro/OpenAI), voice selection, API key input (visible only when OpenAI selected)
- **Display**: dark/light theme toggle

### Upload Screen (no document loaded)
- Centered drop zone with drag-and-drop
- "Drop a file or click to upload"
- Supported formats: PDF, DOCX, EPUB, TXT
- Brief one-liner: "Speed read any document with synchronized voice"

## Storage

### Settings
Key: `flashread:settings`
```js
{
  wpm: 600,
  fontSize: 32,
  halfBold: false,
  voiceEnabled: false,
  ttsProvider: "kokoro",
  openaiApiKey: null,
  voiceId: null,
  theme: "dark"
}
```
Saved on every change.

### Last Reading Position
Key: `flashread:lastRead`
```js
{
  fileName: "document.pdf",
  fileHash: "abc123",       // Hash of first+last 1KB + file size
  wordIndex: 1542,
  timestamp: 1710764400000
}
```
- Saved on pause and before page unload
- On load: if matching file detected, prompt "Continue reading from where you left off?"
- Designed for future expansion to multi-document library (array keyed by fileHash)

## Keyboard Shortcuts
- **Space**: Play/pause RSVP
- **Left/Right arrows**: Previous/next sentence

## Theme
- Dark and light modes
- CSS custom properties for theming
- Toggle in sidebar and settings panel
- Default: dark

## File Structure

```
src/
├── main.js                    # Entry point
├── parsers/
│   ├── index.js               # Format detection + dispatch
│   ├── pdf-parser.js          # pdf.js with header/footer dedup
│   ├── docx-parser.js         # mammoth
│   ├── epub-parser.js         # epubjs (basic)
│   └── txt-parser.js          # Plain text
├── tts/
│   ├── index.js               # TTSManager — provider switching
│   ├── kokoro-tts.js          # Kokoro 82M WASM/WebGPU
│   └── openai-tts.js          # OpenAI TTS API
├── reader/
│   ├── rsvp-engine.js         # Word display, timing, half-bold
│   ├── sync-controller.js     # RSVP ↔ TTS orchestration
│   └── text-chunker.js        # Sentence chunking for TTS
├── ui/
│   ├── app-shell.js           # Sidebar, mode switching, layout
│   ├── rsvp-view.js           # RSVP mode UI
│   ├── browse-view.js         # Browse mode UI
│   ├── settings-panel.js      # Settings UI
│   ├── upload-screen.js       # Drop zone + format info
│   └── theme.js               # Theme toggle + persistence
├── storage/
│   └── store.js               # localStorage wrapper
└── styles/
    └── main.css               # Styles, CSS custom properties
```

## Dependencies
- `pdfjs-dist` — PDF parsing
- `mammoth` — DOCX parsing
- `epubjs` — EPUB parsing
- `kokoro-js` — Kokoro TTS (WASM/WebGPU)
- No UI framework
