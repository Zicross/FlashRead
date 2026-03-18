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
  segments: [             // Sentences with word index mapping
    {
      sentence: string,          // Full sentence text
      startIndex: number,        // Index into words[] where this sentence begins
      wordCount: number          // Number of words in this sentence
    }
  ],
  metadata: {
    title: string,        // From document metadata or filename
    pageCount: number|null
  },
  html: string            // Rendered HTML for browse mode
}
```

The `segments` array provides the word-to-sentence mapping needed for TTS sync, document tracking highlighting, and sentence-level navigation (arrow keys). Given word index N, the current segment is the last segment where `startIndex <= N`.

### PDF (primary)
- Parser: pdf.js
- Extracts text per page with position data
- **Header/footer deduplication**: Two-pass approach:
  1. First pass: scan text items in the top/bottom 12% of each page by Y-position. Build a frequency map of exact-match strings across all pages. Texts appearing on >40% of pages are marked as headers/footers. Even/odd page sets are checked independently to handle alternating left/right headers.
  2. Page numbers: detected by position (bottom 5% of page, centered or right-aligned) and numeric content. Stripped regardless of frequency since they change every page.
  3. Second pass: extract all text excluding matches from the filter set.
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
  init(onProgress)            // Load model or validate API key. onProgress(0-1) for download.
  speak(text): Promise<void>  // Generate audio, play it, resolve when playback finishes
  stop()                      // Cancel current generation + playback
  getDuration(text): number   // Estimated duration in ms (from audio buffer after generation)
  getVoices(): [{id, name}]   // Available voice options
  setVoice(voiceId)           // Select a voice
  isReady(): boolean          // Model loaded / key valid
}
```

`speak()` is a high-level method. Internally each provider generates audio (streaming or batch), plays it via the Web Audio API (`AudioContext` + `AudioBufferSourceNode`), and resolves the promise when the `ended` event fires. `stop()` disconnects the source node and rejects the pending promise.

### Audio Playback
- All providers play audio through the Web Audio API (not `<audio>` elements)
- Each provider creates an `AudioBufferSourceNode`, starts playback, and tracks the `ended` event
- `stop()` calls `sourceNode.stop()` and cleans up
- This gives us precise playback duration from `audioBuffer.duration` for sync

### Kokoro (default, free)
- 82M parameter model, runs in-browser via WASM (WebGPU where available)
- ~80MB model download on first load
- Cached automatically by Transformers.js via the browser Cache API — no custom caching needed
- `init(onProgress)` wires into Transformers.js `from_pretrained` progress callback for download indicator
- Internally uses `kokoro-js` streaming API (`tts.stream(splitter)`), collects audio chunks into a single `AudioBuffer`, then plays via Web Audio API
- Loading indicator required during model init (shows download progress on first load)

### OpenAI TTS (optional, paid)
- Calls `tts-1` endpoint, receives audio response
- User provides API key in settings
- API key stored in localStorage (with local-storage-only warning displayed in settings)
- Decodes response into `AudioBuffer`, plays via Web Audio API
- Lower latency, more voice options

## Sync Controller

Two operating modes:

### RSVP-only (voice off)
- RSVP engine drives timing based on WPM setting (default: 600)
- Words advance at fixed interval derived from WPM

### Voice-led (voice on)

Sync algorithm:
1. Send the current segment's sentence text to the TTS provider
2. Once audio is generated (before playback starts), get the actual audio buffer duration via `audioBuffer.duration`
3. Calculate per-word interval: `duration / segment.wordCount`, weighted by character length (longer words get proportionally more time)
4. Start audio playback and RSVP word advancement simultaneously
5. At sentence boundary: wait for audio `ended` event, then advance to next segment. This re-syncs any drift every sentence.
6. If the user adjusts WPM mid-sentence while voice is on: the change takes effect at the next sentence boundary (current sentence completes at voice pace)
7. If audio finishes before all words are shown: snap remaining words immediately. If words finish before audio: hold on last word until audio ends.

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
- `browse-view.js` post-processes parser HTML to wrap each word in `<span data-word-index="N">` for click targeting
- Scrollable, readable
- Click any word to jump RSVP to that word's position
- Current sentence highlighted during RSVP playback

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
  fileHash: "abc123",       // SHA-256 via crypto.subtle.digest of first+last 1KB + file size
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
│   └── sync-controller.js     # RSVP ↔ TTS orchestration
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

## Build Configuration

**npm scripts:**
- `dev` — Vite dev server with HMR
- `build` — Production build to `dist/`
- `preview` — Preview production build locally

**Vercel:** Use Vite framework preset (auto-detects `vite.config.js`, builds to `dist/`). Remove current manual `vercel.json` static config.

**Fonts:** `'Inter', 'Segoe UI', system-ui, sans-serif` for RSVP display and UI. `'Georgia', serif` for document tracking and browse mode.

**Scope:** Desktop-focused for v2. No mobile-specific layout work.

## Error Handling

- **Encrypted/image-only PDFs**: Detect when pdf.js returns zero text items. Show message: "This PDF has no extractable text (it may be scanned or encrypted)."
- **Kokoro model download failure**: Show retry button with error message. Don't block the app — user can still read without voice.
- **Browser compatibility**: Kokoro requires WASM. If WebGPU unavailable, fall back to WASM-only (slower but functional). If WASM unavailable, disable Kokoro option and show "Your browser doesn't support local TTS. Use OpenAI or read without voice."
- **DRM EPUB**: epubjs will fail to extract. Show "This EPUB appears to be DRM-protected and cannot be opened."
- **Parse failures**: Generic fallback for any parser: "Could not read this file. Try a different format."

## Dependencies
- `pdfjs-dist` — PDF parsing
- `mammoth` — DOCX parsing
- `epubjs` — EPUB parsing
- `kokoro-js` — Kokoro TTS (WASM/WebGPU, uses Transformers.js internally)
- No UI framework
