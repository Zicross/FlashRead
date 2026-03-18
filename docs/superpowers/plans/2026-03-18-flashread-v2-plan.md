# FlashRead v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild FlashRead as a modular Vite SPA with multi-format document parsing, Kokoro + OpenAI TTS, RSVP and Browse modes, and dark/light theming.

**Architecture:** Vanilla JS with ES modules, split into parsers/, tts/, reader/, ui/, and storage/ domains. Each domain has a clean interface. TTS uses generate/play split for sync. Parsers return a shared shape (words[], segments[], html). Vite builds to dist/ for Vercel static deploy.

**Tech Stack:** Vite, pdfjs-dist, mammoth, epubjs, kokoro-js, Web Audio API, Vitest (unit tests)

**Spec:** `docs/superpowers/specs/2026-03-18-flashread-v2-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`
- Create: `index.html` (replace existing with Vite entry point)
- Create: `src/main.js`
- Create: `src/styles/main.css`
- Remove: `vercel.json` (Vite preset handles this)

- [ ] **Step 1: Install Vite and dependencies**

Do NOT run `npm init -y` — the `package.json` already exists. Just install:

```bash
npm install --save-dev vite vitest
npm install pdfjs-dist mammoth epubjs kokoro-js
```

- [ ] **Step 2: Create vite.config.js**

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['kokoro-js'],
  },
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 3: Update package.json scripts**

Replace the scripts section in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Create minimal index.html as Vite entry point**

Replace the existing `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlashRead</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.js placeholder**

```js
// src/main.js
console.log('FlashRead v2 initializing');
```

- [ ] **Step 6: Create src/styles/main.css with CSS custom properties and base styles**

Set up the theming foundation with CSS custom properties for dark/light modes, base typography, and layout scaffolding. Include both theme definitions (`:root` for dark default, `[data-theme="light"]` override), the sidebar/content layout grid, and font-family declarations per the spec (`Inter` for UI/RSVP, `Georgia` for document content).

- [ ] **Step 7: Create/update .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 8: Delete vercel.json**

```bash
rm vercel.json
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, browser shows blank page with "FlashRead v2 initializing" in console.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.js src/styles/main.css .gitignore
git commit -m "feat: scaffold Vite project with dependencies and theming CSS"
```

---

## Task 2: Storage Module

**Files:**
- Create: `src/storage/store.js`
- Create: `tests/storage/store.test.js`

- [ ] **Step 1: Write failing tests for store module**

```js
// tests/storage/store.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../../src/storage/store.js';

describe('Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('settings', () => {
    it('returns defaults when nothing saved', () => {
      const store = new Store();
      const settings = store.getSettings();
      expect(settings.wpm).toBe(600);
      expect(settings.theme).toBe('dark');
      expect(settings.halfBold).toBe(false);
    });

    it('persists settings changes', () => {
      const store = new Store();
      store.updateSettings({ wpm: 800 });
      const settings = store.getSettings();
      expect(settings.wpm).toBe(800);
      expect(settings.theme).toBe('dark'); // unchanged
    });

    it('survives re-instantiation', () => {
      const store1 = new Store();
      store1.updateSettings({ wpm: 900 });
      const store2 = new Store();
      expect(store2.getSettings().wpm).toBe(900);
    });
  });

  describe('lastRead', () => {
    it('returns null when nothing saved', () => {
      const store = new Store();
      expect(store.getLastRead()).toBeNull();
    });

    it('saves and retrieves reading position', () => {
      const store = new Store();
      store.saveLastRead({
        fileName: 'test.pdf',
        fileHash: 'abc123',
        wordIndex: 42,
        timestamp: Date.now(),
      });
      const last = store.getLastRead();
      expect(last.fileName).toBe('test.pdf');
      expect(last.wordIndex).toBe(42);
    });

    it('clears reading position', () => {
      const store = new Store();
      store.saveLastRead({
        fileName: 'test.pdf',
        fileHash: 'abc',
        wordIndex: 10,
        timestamp: Date.now(),
      });
      store.clearLastRead();
      expect(store.getLastRead()).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/storage/store.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement store.js**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/storage/store.test.js
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/store.js tests/storage/store.test.js
git commit -m "feat: add localStorage store for settings and reading position"
```

---

## Task 3: File Hash Utility

**Files:**
- Create: `src/storage/file-hash.js`
- Create: `tests/storage/file-hash.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/storage/file-hash.test.js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { File } from 'buffer'; // Node.js built-in File for testing
import { computeFileHash } from '../../src/storage/file-hash.js';

describe('computeFileHash', () => {
  it('returns a hex string', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const hash = await computeFileHash(file);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('returns same hash for same content', async () => {
    const file1 = new File(['hello world'], 'a.txt');
    const file2 = new File(['hello world'], 'b.txt');
    const h1 = await computeFileHash(file1);
    const h2 = await computeFileHash(file2);
    expect(h1).toBe(h2);
  });

  it('returns different hash for different content', async () => {
    const file1 = new File(['hello'], 'a.txt');
    const file2 = new File(['world'], 'b.txt');
    const h1 = await computeFileHash(file1);
    const h2 = await computeFileHash(file2);
    expect(h1).not.toBe(h2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/storage/file-hash.test.js
```

- [ ] **Step 3: Implement file-hash.js**

```js
// src/storage/file-hash.js
export async function computeFileHash(file) {
  const size = file.size;
  const chunkSize = 1024;

  let buffer;
  if (size <= chunkSize * 2) {
    buffer = await file.arrayBuffer();
  } else {
    const first = await file.slice(0, chunkSize).arrayBuffer();
    const last = await file.slice(size - chunkSize).arrayBuffer();
    const combined = new Uint8Array(chunkSize * 2 + 8);
    combined.set(new Uint8Array(first), 0);
    combined.set(new Uint8Array(last), chunkSize);
    // Encode file size into last 8 bytes
    const view = new DataView(combined.buffer);
    view.setFloat64(chunkSize * 2, size);
    buffer = combined.buffer;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/storage/file-hash.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/storage/file-hash.js tests/storage/file-hash.test.js
git commit -m "feat: add SHA-256 file hash for reading position identification"
```

---

## Task 4: Sentence Splitter

**Files:**
- Create: `src/parsers/sentence-splitter.js`
- Create: `tests/parsers/sentence-splitter.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/parsers/sentence-splitter.test.js
import { describe, it, expect } from 'vitest';
import { splitSentences } from '../../src/parsers/sentence-splitter.js';

describe('splitSentences', () => {
  it('splits on period + space + uppercase', () => {
    expect(splitSentences('Hello world. This is a test.')).toEqual([
      'Hello world.',
      'This is a test.',
    ]);
  });

  it('splits on question marks', () => {
    expect(splitSentences('What is this? It is a test.')).toEqual([
      'What is this?',
      'It is a test.',
    ]);
  });

  it('splits on exclamation marks', () => {
    expect(splitSentences('Wow! That is great.')).toEqual([
      'Wow!',
      'That is great.',
    ]);
  });

  it('does not split after abbreviations', () => {
    expect(splitSentences('Dr. Smith went to the store.')).toEqual([
      'Dr. Smith went to the store.',
    ]);
  });

  it('handles Mr. Mrs. Ms. etc.', () => {
    expect(splitSentences('Mr. Jones met Mrs. Smith.')).toEqual([
      'Mr. Jones met Mrs. Smith.',
    ]);
  });

  it('handles e.g. and i.e.', () => {
    expect(splitSentences('Use a tool e.g. a hammer.')).toEqual([
      'Use a tool e.g. a hammer.',
    ]);
  });

  it('handles ellipses as sentence end', () => {
    expect(splitSentences('And then... The end came.')).toEqual([
      'And then...',
      'The end came.',
    ]);
  });

  it('handles single sentence', () => {
    expect(splitSentences('Just one sentence.')).toEqual([
      'Just one sentence.',
    ]);
  });

  it('handles empty string', () => {
    expect(splitSentences('')).toEqual([]);
  });

  it('handles text with no sentence-ending punctuation', () => {
    expect(splitSentences('no punctuation here')).toEqual([
      'no punctuation here',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parsers/sentence-splitter.test.js
```

- [ ] **Step 3: Implement sentence-splitter.js**

```js
// src/parsers/sentence-splitter.js
const ABBREVIATIONS = new Set([
  'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Jr', 'Sr', 'St',
  'Inc', 'Ltd', 'vs', 'etc', 'approx',
]);

// Match "e.g." and "i.e." as special cases
const ABBREV_PATTERNS = /\b(e\.g|i\.e)\./g;
const PLACEHOLDER = '\x00ABBR\x00';

export function splitSentences(text) {
  if (!text || !text.trim()) return [];

  // Protect abbreviations like e.g. and i.e.
  let working = text.replace(ABBREV_PATTERNS, (m) => m.replace(/\./g, PLACEHOLDER));

  // Protect known abbreviations (Dr. Mr. etc.)
  for (const abbr of ABBREVIATIONS) {
    const re = new RegExp(`\\b${abbr}\\.`, 'g');
    working = working.replace(re, (m) => m.replace('.', PLACEHOLDER));
  }

  // Split on sentence-ending punctuation followed by space + uppercase
  // Also handle ellipses
  const parts = [];
  let current = '';

  for (let i = 0; i < working.length; i++) {
    current += working[i];

    // Check for ellipsis
    if (working[i] === '.' && working[i + 1] === '.' && working[i + 2] === '.') {
      current += '..';
      i += 2;
      // Check if followed by space + uppercase (same rule as .!?)
      const afterIdx = i + 1;
      const afterAfterIdx = i + 2;
      if (
        afterIdx < working.length &&
        /\s/.test(working[afterIdx]) &&
        (afterAfterIdx >= working.length || /[A-Z]/.test(working[afterAfterIdx]))
      ) {
        parts.push(current.trim());
        current = '';
        // Skip the whitespace
        i++;
      }
      continue;
    }

    // Check for .!? followed by space + uppercase (or end of string)
    if (/[.!?]/.test(working[i])) {
      const next = working[i + 1];
      const afterNext = working[i + 2];
      if (next === undefined) {
        // End of string
        parts.push(current.trim());
        current = '';
      } else if (/\s/.test(next) && (afterNext === undefined || /[A-Z]/.test(afterNext))) {
        parts.push(current.trim());
        current = '';
        // Skip the whitespace
        if (/\s/.test(next)) i++;
      }
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  // Restore abbreviation dots
  return parts.map((s) => s.replaceAll(PLACEHOLDER, '.'));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parsers/sentence-splitter.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/parsers/sentence-splitter.js tests/parsers/sentence-splitter.test.js
git commit -m "feat: add sentence splitter with abbreviation handling"
```

---

## Task 5: Parser Infrastructure + TXT Parser

**Files:**
- Create: `src/parsers/index.js`
- Create: `src/parsers/txt-parser.js`
- Create: `tests/parsers/txt-parser.test.js`

- [ ] **Step 1: Write failing tests for TXT parser**

```js
// tests/parsers/txt-parser.test.js
import { describe, it, expect } from 'vitest';
import { parseTxt } from '../../src/parsers/txt-parser.js';

describe('parseTxt', () => {
  it('extracts words', () => {
    const result = parseTxt('Hello world.', 'test.txt');
    expect(result.words).toEqual(['Hello', 'world.']);
  });

  it('builds segments with correct indices', () => {
    const result = parseTxt('Hello world. Another sentence.', 'test.txt');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({
      sentence: 'Hello world.',
      startIndex: 0,
      wordCount: 2,
    });
    expect(result.segments[1]).toEqual({
      sentence: 'Another sentence.',
      startIndex: 2,
      wordCount: 2,
    });
  });

  it('generates HTML with paragraphs', () => {
    const result = parseTxt('Line one.\n\nLine two.', 'test.txt');
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('Line one.');
    expect(result.html).toContain('Line two.');
  });

  it('sets metadata', () => {
    const result = parseTxt('content', 'my-book.txt');
    expect(result.metadata.title).toBe('my-book.txt');
    expect(result.metadata.pageCount).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parsers/txt-parser.test.js
```

- [ ] **Step 3: Implement txt-parser.js**

```js
// src/parsers/txt-parser.js
import { splitSentences } from './sentence-splitter.js';

export function parseTxt(text, fileName) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = splitSentences(text);

  const segments = [];
  let wordIndex = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    segments.push({
      sentence,
      startIndex: wordIndex,
      wordCount: sentenceWords.length,
    });
    wordIndex += sentenceWords.length;
  }

  // Split into paragraphs on double newlines
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const html = paragraphs.map((p) => `<p>${p.trim()}</p>`).join('\n');

  return {
    words,
    segments,
    metadata: {
      title: fileName,
      pageCount: null,
    },
    html,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parsers/txt-parser.test.js
```

- [ ] **Step 5: Create parser dispatch (src/parsers/index.js)**

```js
// src/parsers/index.js
import { parseTxt } from './txt-parser.js';

const PARSERS = {
  'text/plain': (file) => file.text().then((t) => parseTxt(t, file.name)),
  'application/pdf': async (file) => {
    const { parsePdf } = await import('./pdf-parser.js');
    return parsePdf(file);
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    async (file) => {
      const { parseDocx } = await import('./docx-parser.js');
      return parseDocx(file);
    },
  'application/epub+zip': async (file) => {
    const { parseEpub } = await import('./epub-parser.js');
    return parseEpub(file);
  },
};

const EXT_MAP = {
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.epub': 'application/epub+zip',
};

export async function parseFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const mime = file.type || EXT_MAP[ext];
  const parser = PARSERS[mime] || PARSERS[EXT_MAP[ext]];

  if (!parser) {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  return parser(file);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/parsers/index.js src/parsers/txt-parser.js tests/parsers/txt-parser.test.js
git commit -m "feat: add TXT parser and parser dispatch"
```

---

## Task 6: PDF Parser with Header/Footer Dedup

**Files:**
- Create: `src/parsers/pdf-parser.js`
- Create: `tests/parsers/pdf-parser.test.js`

- [ ] **Step 1: Write failing tests for PDF header/footer dedup logic**

Extract the dedup logic as a pure function so it can be tested without pdf.js. Test the dedup algorithm with mock page data.

```js
// tests/parsers/pdf-parser.test.js
import { describe, it, expect } from 'vitest';
import { filterHeadersFooters } from '../../src/parsers/pdf-parser.js';

describe('filterHeadersFooters', () => {
  it('removes text appearing on >40% of pages in header zone', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      height: 1000,
      items: [
        { str: 'Chapter Title', y: 950 }, // top 12%: y > 880
        { str: `Page content ${i}`, y: 500 },
      ],
    }));
    const result = filterHeadersFooters(pages);
    // "Chapter Title" appears on 100% of pages in header zone — filtered
    expect(result.every((p) => p.items.every((it) => it.str !== 'Chapter Title'))).toBe(true);
    // Content items preserved
    expect(result.every((p) => p.items.some((it) => it.str.startsWith('Page content')))).toBe(true);
  });

  it('removes page numbers in bottom 5% regardless of frequency', () => {
    const pages = Array.from({ length: 5 }, (_, i) => ({
      height: 1000,
      items: [
        { str: `${i + 1}`, y: 30 }, // bottom 5%: y < 50
        { str: 'Content', y: 500 },
      ],
    }));
    const result = filterHeadersFooters(pages);
    expect(result.every((p) => p.items.every((it) => it.str !== `${pages.indexOf(p) + 1}`))).toBe(true);
  });

  it('handles alternating even/odd headers', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      height: 1000,
      items: [
        { str: i % 2 === 0 ? 'Even Header' : 'Odd Header', y: 960 },
        { str: 'Content', y: 500 },
      ],
    }));
    const result = filterHeadersFooters(pages);
    // Both headers appear on 50% of pages in header zone — filtered (>40%)
    expect(result.every((p) => p.items.length === 1)).toBe(true);
  });

  it('keeps text below 40% threshold', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      height: 1000,
      items: [
        ...(i < 2 ? [{ str: 'Rare Header', y: 960 }] : []),
        { str: 'Content', y: 500 },
      ],
    }));
    const result = filterHeadersFooters(pages);
    // "Rare Header" only on 2/10 pages (20%) — kept
    expect(result[0].items.some((it) => it.str === 'Rare Header')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parsers/pdf-parser.test.js
```

- [ ] **Step 3: Implement pdf-parser.js**

Implement `filterHeadersFooters` as an exported pure function, and `parsePdf` as the main entry using pdf.js. The `parsePdf` function:
1. Loads the PDF with `pdfjs-dist`
2. Iterates pages, collects text items with their Y-positions and page height
3. Passes through `filterHeadersFooters`
4. Concatenates remaining text, splits into words and segments via sentence-splitter
5. Generates HTML with page-break markers

Key details:
- pdf.js `getTextContent()` returns items with `transform[5]` as Y-position
- Page height from `page.getViewport({ scale: 1 }).height`
- Configure pdf.js worker for Vite at the top of the file:

```js
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
```

Note: The exact worker path depends on the `pdfjs-dist` version installed. After `npm install`, check `node_modules/pdfjs-dist/build/` for the correct worker filename (`.mjs` vs `.js`). Vite's `new URL(..., import.meta.url)` pattern ensures the worker is correctly resolved during both dev and production builds.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parsers/pdf-parser.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/parsers/pdf-parser.js tests/parsers/pdf-parser.test.js
git commit -m "feat: add PDF parser with header/footer deduplication"
```

---

## Task 7: DOCX Parser

**Files:**
- Create: `src/parsers/docx-parser.js`
- Create: `tests/parsers/docx-parser.test.js`

- [ ] **Step 1: Write failing test**

Since mammoth requires real DOCX binary data to test meaningfully, test the text-extraction-from-HTML logic as a pure function:

```js
// tests/parsers/docx-parser.test.js
import { describe, it, expect } from 'vitest';
import { extractFromHtml } from '../../src/parsers/docx-parser.js';

describe('extractFromHtml', () => {
  it('extracts words from HTML', () => {
    const result = extractFromHtml('<p>Hello world.</p>', 'test.docx');
    expect(result.words).toEqual(['Hello', 'world.']);
  });

  it('builds segments', () => {
    const result = extractFromHtml(
      '<p>First sentence. Second sentence.</p>',
      'test.docx'
    );
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].sentence).toBe('First sentence.');
  });

  it('preserves original HTML', () => {
    const html = '<p>Hello <strong>world</strong>.</p>';
    const result = extractFromHtml(html, 'test.docx');
    expect(result.html).toBe(html);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/parsers/docx-parser.test.js
```

- [ ] **Step 3: Implement docx-parser.js**

```js
// src/parsers/docx-parser.js
import mammoth from 'mammoth';
import { splitSentences } from './sentence-splitter.js';

export function extractFromHtml(html, fileName) {
  // Strip HTML tags to get plain text
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || '';

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = splitSentences(text);

  const segments = [];
  let wordIndex = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    segments.push({
      sentence,
      startIndex: wordIndex,
      wordCount: sentenceWords.length,
    });
    wordIndex += sentenceWords.length;
  }

  return {
    words,
    segments,
    metadata: { title: fileName, pageCount: null },
    html,
  };
}

export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return extractFromHtml(result.value, file.name);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parsers/docx-parser.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/parsers/docx-parser.js tests/parsers/docx-parser.test.js
git commit -m "feat: add DOCX parser using mammoth"
```

---

## Task 8: EPUB Parser

**Files:**
- Create: `src/parsers/epub-parser.js`

- [ ] **Step 1: Implement epub-parser.js**

```js
// src/parsers/epub-parser.js
import ePub from 'epubjs';
import { splitSentences } from './sentence-splitter.js';

export async function parseEpub(file) {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const spine = book.spine;
  let allText = '';
  let allHtml = '';

  for (const item of spine.items) {
    const doc = await item.load(book.load.bind(book));
    const body = doc.querySelector('body') || doc.documentElement;
    const text = body.textContent || '';
    allText += text + ' ';
    allHtml += body.innerHTML || '';
  }

  const words = allText.split(/\s+/).filter(Boolean);
  const sentences = splitSentences(allText);

  const segments = [];
  let wordIndex = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    segments.push({
      sentence,
      startIndex: wordIndex,
      wordCount: sentenceWords.length,
    });
    wordIndex += sentenceWords.length;
  }

  return {
    words,
    segments,
    metadata: {
      title: book.packaging?.metadata?.title || file.name,
      pageCount: null,
    },
    html: allHtml,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/parsers/epub-parser.js
git commit -m "feat: add basic EPUB parser"
```

---

## Task 9: Theme System

**Files:**
- Create: `src/ui/theme.js`
- Create: `tests/ui/theme.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/ui/theme.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../../src/ui/theme.js';

describe('ThemeManager', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies dark theme by default', () => {
    const tm = new ThemeManager('dark');
    tm.apply();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles theme', () => {
    const tm = new ThemeManager('dark');
    tm.apply();
    const newTheme = tm.toggle();
    expect(newTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets specific theme', () => {
    const tm = new ThemeManager('dark');
    tm.set('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ui/theme.test.js
```

- [ ] **Step 3: Implement theme.js**

```js
// src/ui/theme.js
export class ThemeManager {
  constructor(initialTheme = 'dark') {
    this.theme = initialTheme;
  }

  apply() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.apply();
    return this.theme;
  }

  set(theme) {
    this.theme = theme;
    this.apply();
  }

  get() {
    return this.theme;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ui/theme.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.js tests/ui/theme.test.js
git commit -m "feat: add theme manager for dark/light mode"
```

---

## Task 10: RSVP Engine

**Files:**
- Create: `src/reader/rsvp-engine.js`
- Create: `tests/reader/rsvp-engine.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/reader/rsvp-engine.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RsvpEngine } from '../../src/reader/rsvp-engine.js';

describe('RsvpEngine', () => {
  let engine;
  const mockData = {
    words: ['Hello', 'world.', 'Another', 'sentence', 'here.'],
    segments: [
      { sentence: 'Hello world.', startIndex: 0, wordCount: 2 },
      { sentence: 'Another sentence here.', startIndex: 2, wordCount: 3 },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new RsvpEngine();
    engine.load(mockData.words, mockData.segments);
  });

  afterEach(() => {
    vi.restoreAllTimers();
  });

  it('starts at word index 0', () => {
    expect(engine.currentIndex).toBe(0);
    expect(engine.getCurrentWord()).toBe('Hello');
  });

  it('advances words on play', () => {
    const onWord = vi.fn();
    engine.onWord(onWord);
    engine.play(600); // 600 WPM = 100ms per word
    vi.advanceTimersByTime(100);
    expect(onWord).toHaveBeenCalledWith('world.', 1);
  });

  it('pauses', () => {
    const onWord = vi.fn();
    engine.onWord(onWord);
    engine.play(600);
    engine.pause();
    vi.advanceTimersByTime(1000);
    expect(onWord).not.toHaveBeenCalled();
  });

  it('jumps to word index', () => {
    engine.jumpTo(3);
    expect(engine.currentIndex).toBe(3);
    expect(engine.getCurrentWord()).toBe('sentence');
  });

  it('finds current segment', () => {
    engine.jumpTo(3);
    expect(engine.getCurrentSegment()).toEqual(mockData.segments[1]);
  });

  it('navigates to next sentence', () => {
    engine.nextSentence();
    expect(engine.currentIndex).toBe(2); // start of segment 2
  });

  it('navigates to previous sentence', () => {
    engine.jumpTo(3);
    engine.prevSentence();
    expect(engine.currentIndex).toBe(0); // start of segment 1
  });

  it('reports progress as fraction', () => {
    engine.jumpTo(2);
    expect(engine.getProgress()).toBeCloseTo(2 / 5);
  });

  it('fires onComplete when reaching the end', () => {
    const onComplete = vi.fn();
    engine.onComplete(onComplete);
    engine.jumpTo(4); // last word
    engine.play(600);
    vi.advanceTimersByTime(100);
    expect(onComplete).toHaveBeenCalled();
  });

  it('applies half-bold formatting', () => {
    const result = engine.formatWord('Hello', true);
    expect(result).toBe('<b>He</b>llo');
  });

  it('returns plain word when half-bold is off', () => {
    const result = engine.formatWord('Hello', false);
    expect(result).toBe('Hello');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/reader/rsvp-engine.test.js
```

- [ ] **Step 3: Implement rsvp-engine.js**

Implement the `RsvpEngine` class with:
- `load(words, segments)` — set document data, reset to index 0
- `play(wpm)` — start advancing words at `60000/wpm` ms interval
- `pause()` — stop the interval
- `jumpTo(index)` — set current word index
- `nextSentence()` / `prevSentence()` — jump by segment
- `getCurrentWord()` / `getCurrentSegment()` — getters
- `getProgress()` — returns `currentIndex / words.length`
- `onWord(callback)` — register word-change listener
- `onComplete(callback)` — register end-of-document listener
- `formatWord(word, halfBold)` — returns formatted HTML string
- Internal: `_tick()` method called by `setInterval`, advances `currentIndex`, fires callbacks

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/reader/rsvp-engine.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/reader/rsvp-engine.js tests/reader/rsvp-engine.test.js
git commit -m "feat: add RSVP engine with word timing, navigation, and half-bold"
```

---

## Task 11: Upload Screen UI

**Files:**
- Create: `src/ui/upload-screen.js`

- [ ] **Step 1: Implement upload-screen.js**

Create the upload screen component that:
- Renders a centered drop zone with drag-and-drop support
- Shows "Drop a file or click to upload" text
- Lists supported formats: PDF, DOCX, EPUB, TXT
- Shows tagline: "Speed read any document with synchronized voice"
- Has a hidden `<input type="file" accept=".pdf,.docx,.epub,.txt">`
- Click on drop zone triggers file input
- Drag events: `dragover` (highlight), `dragleave` (remove highlight), `drop` (fire callback)
- Constructor takes a `container` element and an `onFile(file)` callback
- `show()` / `hide()` methods to toggle visibility

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open browser — should see the upload screen with drop zone. Dropping a .txt file should log to console.

- [ ] **Step 3: Commit**

```bash
git add src/ui/upload-screen.js
git commit -m "feat: add upload screen with drag-and-drop"
```

---

## Task 12: App Shell + Sidebar

**Files:**
- Create: `src/ui/app-shell.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement app-shell.js**

Create the app shell that manages the overall layout:
- Renders the sidebar (56px wide, left side, always visible)
- Sidebar contains: logo/name at top, RSVP mode tab, Browse mode tab, Upload button, Settings gear icon, Theme toggle at bottom
- Content area fills remaining width
- Mode tabs switch between RSVP and Browse views (emit events)
- Upload button emits event to show file picker
- Theme toggle calls `ThemeManager.toggle()` and persists to store
- Settings gear opens settings panel (placeholder for now)
- Constructor takes `#app` element, `Store` instance, `ThemeManager` instance
- `setMode(mode)` — 'rsvp' | 'browse', highlights active tab
- `setContent(element)` — swaps main content area

- [ ] **Step 2: Wire up main.js**

```js
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
    // Next tasks will wire this to RSVP/Browse views
  } catch (err) {
    console.error('Parse error:', err);
  }
}
```

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Expected: Sidebar visible on left with logo, mode tabs, upload button, settings icon, theme toggle. Upload screen in content area. Theme toggle switches dark/light. Uploading a .txt file logs parsed word count.

- [ ] **Step 4: Commit**

```bash
git add src/ui/app-shell.js src/main.js
git commit -m "feat: add app shell with sidebar and mode switching"
```

---

## Task 13: RSVP View

**Files:**
- Create: `src/ui/rsvp-view.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement rsvp-view.js**

Create the RSVP mode view:
- **Top 2/3**: Word display area (large centered text, `Inter` font), play/pause button, WPM display/control, progress bar
- **Bottom 1/3**: Document tracking panel — shows ~2 segments before and after current, current sentence highlighted with a distinct background. Uses `Georgia` font.
- Constructor takes a `container` element, `RsvpEngine` instance, and `Store` instance
- `show(doc)` — render the view with parsed document data
- `hide()` — remove from DOM
- `updateWord(word, index, halfBold)` — update the word display
- `updateTracking(segments, currentSegmentIndex)` — update the bottom panel
- `updateProgress(fraction)` — update the progress bar
- Play/pause button: calls `engine.play(wpm)` / `engine.pause()`
- WPM control: slider or input that updates on change
- Progress bar: clickable to jump to position

- [ ] **Step 2: Wire RSVP view into main.js**

After `handleFile` parses a document:
1. Create `RsvpEngine`, load words/segments
2. Create `RsvpView`, show it in the content area
3. Set mode to 'rsvp' in app shell
4. Register engine callbacks to update view

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Upload a .txt file. Should see large word display, play/pause works, WPM slider works, document tracking panel shows surrounding text with current sentence highlighted. Progress bar advances.

- [ ] **Step 4: Commit**

```bash
git add src/ui/rsvp-view.js src/main.js
git commit -m "feat: add RSVP view with word display and document tracking"
```

---

## Task 14: Browse View

**Files:**
- Create: `src/ui/browse-view.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement browse-view.js**

Create the browse mode view:
- Renders the parser's `html` output in a scrollable container
- Post-processes the HTML: tokenizes text nodes and wraps each word in `<span data-word-index="N">`, matching sequentially against the document's `words[]`
- Click handler on word spans: fires callback with the word index
- `highlightSentence(segmentIndex)` — adds highlight class to all words in the given segment
- `scrollToWord(index)` — scrolls the container to make the given word visible
- Uses `Georgia` font for document content
- Constructor takes `container`, `words[]`, `onWordClick(index)` callback

- [ ] **Step 2: Wire browse view into main.js**

- When mode tab switches to Browse: show browse view with current document
- Click a word in browse view: switch to RSVP mode, jump to that word index
- When RSVP is playing and mode is Browse: highlight current sentence in browse view

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Upload a .txt file, switch to Browse mode. Should see formatted text. Click a word — switches to RSVP mode at that position.

- [ ] **Step 4: Commit**

```bash
git add src/ui/browse-view.js src/main.js
git commit -m "feat: add browse view with word indexing and click-to-jump"
```

---

## Task 15: Settings Panel

**Files:**
- Create: `src/ui/settings-panel.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement settings-panel.js**

Create the settings panel as a slide-out overlay from the sidebar:
- **Reading section**: WPM slider (100-1400, shows current value), font size slider, half-bold toggle checkbox
- **Voice section**: voice on/off toggle, provider dropdown (Kokoro/OpenAI), voice selection dropdown (populated later), API key input (only visible when OpenAI selected, with warning text "API key is stored locally in your browser")
- **Display section**: dark/light theme toggle
- Constructor takes `Store` instance, callbacks for setting changes
- `open()` / `close()` — slide animation
- All changes immediately persisted via `store.updateSettings()`
- Emits change events so main.js can update RSVP engine, theme, etc.

- [ ] **Step 2: Wire settings into main.js**

- Settings gear click opens panel
- Setting changes propagate: WPM → RSVP engine, font size → RSVP view, theme → ThemeManager + store, voice settings → stored for TTS tasks

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Click settings gear. Panel slides out. Change WPM — RSVP speed changes. Toggle theme. Toggle half-bold. All settings persist on reload.

- [ ] **Step 4: Commit**

```bash
git add src/ui/settings-panel.js src/main.js
git commit -m "feat: add settings panel with reading, voice, and display options"
```

---

## Task 16: Keyboard Shortcuts

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add keyboard event listener**

In `main.js`, add a `keydown` listener on `document`:
- `Space` (when not in an input/textarea): toggle play/pause on RSVP engine. Call `event.preventDefault()` to avoid page scroll.
- `ArrowRight`: call `engine.nextSentence()`, update view
- `ArrowLeft`: call `engine.prevSentence()`, update view
- Guard: only active when a document is loaded

- [ ] **Step 2: Verify manually**

Upload a file, press Space to play/pause, arrows to navigate sentences.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add keyboard shortcuts (space, arrows)"
```

---

## Task 17: Reading Position Persistence

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Implement save on pause/unload**

In `main.js`:
- On RSVP pause: call `store.saveLastRead({ fileName, fileHash, wordIndex, timestamp })`
- On `beforeunload`: same save
- Use `computeFileHash` from `src/storage/file-hash.js` — compute hash when file is first loaded, store in module scope

- [ ] **Step 2: Implement resume prompt on file load**

In `handleFile`:
- After parsing, compute file hash
- Check `store.getLastRead()` — if `fileHash` matches, show a prompt: "Continue reading [fileName] from where you left off?"
- If yes: `engine.jumpTo(lastRead.wordIndex)`
- If no: start from beginning, `store.clearLastRead()`

Render the prompt as a small banner at the top of the RSVP view, not a browser `confirm()`.

- [ ] **Step 3: Verify manually**

Upload a file, read partway, pause. Reload page, upload same file — should see resume prompt.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: save and resume reading position"
```

---

## Task 18: TTS Manager + Kokoro Provider

**Files:**
- Create: `src/tts/index.js`
- Create: `src/tts/kokoro-tts.js`

- [ ] **Step 1: Implement TTS manager (src/tts/index.js)**

```js
// src/tts/index.js
export class TTSManager {
  constructor() {
    this.providers = {};
    this.activeProvider = null;
    this.audioContext = null;
  }

  registerProvider(name, provider) {
    this.providers[name] = provider;
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  async setProvider(name, onProgress) {
    const provider = this.providers[name];
    if (!provider) throw new Error(`Unknown TTS provider: ${name}`);
    if (!provider.isReady()) {
      await provider.init(onProgress, this.getAudioContext());
    }
    this.activeProvider = provider;
  }

  async generate(text) {
    if (!this.activeProvider) throw new Error('No TTS provider active');
    return this.activeProvider.generate(text);
  }

  async play(buffer) {
    const ctx = this.getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    return new Promise((resolve, reject) => {
      source.onended = resolve;
      this._currentSource = source;
      source.start();
    });
  }

  stop() {
    if (this._currentSource) {
      try { this._currentSource.stop(); } catch {}
      this._currentSource = null;
    }
    if (this.activeProvider) {
      this.activeProvider.stop();
    }
  }

  getVoices() {
    if (!this.activeProvider) return [];
    return this.activeProvider.getVoices();
  }

  setVoice(voiceId) {
    if (this.activeProvider) this.activeProvider.setVoice(voiceId);
  }
}
```

- [ ] **Step 2: Implement kokoro-tts.js**

```js
// src/tts/kokoro-tts.js
import { KokoroTTS } from 'kokoro-js';

export class KokoroProvider {
  constructor() {
    this.model = null;
    this.voiceId = 'af_heart';
    this._abortController = null;
  }

  async init(onProgress, audioContext) {
    this.audioContext = audioContext;
    this.model = await KokoroTTS.from_pretrained(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      { progress_callback: onProgress }
    );
  }

  async generate(text) {
    this._abortController = new AbortController();
    const audio = await this.model.generate(text, {
      voice: this.voiceId,
    });
    // Convert RawAudio (Float32Array + sampling_rate) to AudioBuffer
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, audio.audio.length, audio.sampling_rate);
    buffer.getChannelData(0).set(audio.audio);
    return buffer;
  }

  stop() {
    // Kokoro doesn't support mid-generation cancellation easily,
    // but we clear state so results are discarded
    this._abortController = null;
  }

  getVoices() {
    return [
      { id: 'af_heart', name: 'Heart (Female)' },
      { id: 'af_bella', name: 'Bella (Female)' },
      { id: 'af_sarah', name: 'Sarah (Female)' },
      { id: 'am_adam', name: 'Adam (Male)' },
      { id: 'am_michael', name: 'Michael (Male)' },
    ];
  }

  setVoice(voiceId) {
    this.voiceId = voiceId;
  }

  isReady() {
    return this.model !== null;
  }
}
```

- [ ] **Step 3: Wire TTS into main.js**

Import `TTSManager` and `KokoroProvider`. Register Kokoro as a provider. When voice is enabled in settings, initialize the provider. Store the manager instance for use by the sync controller.

**Kokoro loading indicator:** When `init(onProgress)` is called, show a centered overlay on the content area with a progress bar (0-100%) and text "Loading voice model... (X%)". The `onProgress` callback from Transformers.js fires with `{ progress: 0-100 }`. On completion, dismiss the overlay. On failure, show error with retry button. Render this as a simple `<div>` with inline styles — no separate component needed.

- [ ] **Step 4: Verify manually**

Enable voice in settings. Wait for Kokoro model download (should show progress). Model should load successfully. Actual speech playback tested in Task 20 (sync controller).

- [ ] **Step 5: Commit**

```bash
git add src/tts/index.js src/tts/kokoro-tts.js src/main.js
git commit -m "feat: add TTS manager and Kokoro provider"
```

---

## Task 19: OpenAI TTS Provider

**Files:**
- Create: `src/tts/openai-tts.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement openai-tts.js**

```js
// src/tts/openai-tts.js
export class OpenAIProvider {
  constructor() {
    this.apiKey = null;
    this.voiceId = 'alloy';
    this.audioContext = null;
  }

  async init(onProgress, audioContext) {
    this.audioContext = audioContext;
    // No model to download — just validate API key exists
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

  stop() {
    // No streaming to cancel for OpenAI
  }

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
```

- [ ] **Step 2: Register OpenAI provider in main.js**

Import `OpenAIProvider`, register with TTS manager. When OpenAI is selected as provider and API key is set in settings, initialize it. Pass API key from settings to the provider.

- [ ] **Step 3: Commit**

```bash
git add src/tts/openai-tts.js src/main.js
git commit -m "feat: add OpenAI TTS provider"
```

---

## Task 20: Sync Controller

**Files:**
- Create: `src/reader/sync-controller.js`
- Create: `tests/reader/sync-controller.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write failing tests for sync logic**

Test the per-word timing calculation and mode switching (mock the TTS manager):

```js
// tests/reader/sync-controller.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateWordTimings,
  SyncController,
} from '../../src/reader/sync-controller.js';

describe('calculateWordTimings', () => {
  it('distributes duration across words weighted by character length', () => {
    const words = ['Hi', 'there', 'world'];
    const durationMs = 1000;
    const timings = calculateWordTimings(words, durationMs);
    expect(timings).toHaveLength(3);
    // Sum should equal total duration
    const sum = timings.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(durationMs, 0);
    // Longer words get more time
    expect(timings[1]).toBeGreaterThan(timings[0]); // 'there' > 'Hi'
  });

  it('handles single word', () => {
    const timings = calculateWordTimings(['Hello'], 500);
    expect(timings).toEqual([500]);
  });
});

describe('SyncController', () => {
  let engine, tts, controller;

  beforeEach(() => {
    engine = {
      words: ['Hello', 'world.', 'Next', 'sentence.'],
      currentIndex: 0,
      play: vi.fn(),
      pause: vi.fn(),
      jumpTo: vi.fn((i) => { engine.currentIndex = i; }),
      getCurrentSegment: vi.fn(),
      nextSentence: vi.fn(() => { engine.currentIndex = engine.words.length; }),
    };
    tts = {
      generate: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
    };
    controller = new SyncController(engine, tts);
  });

  it('delegates to engine.play in RSVP-only mode (voice off)', async () => {
    controller.setVoiceEnabled(false);
    await controller.play(600);
    expect(engine.play).toHaveBeenCalledWith(600);
    expect(tts.generate).not.toHaveBeenCalled();
  });

  it('calls generate then play per segment in voice-led mode', async () => {
    controller.setVoiceEnabled(true);
    const mockBuffer = { duration: 0.5 };
    tts.generate.mockResolvedValue(mockBuffer);
    tts.play.mockResolvedValue(undefined);
    engine.getCurrentSegment
      .mockReturnValueOnce({ sentence: 'Hello world.', startIndex: 0, wordCount: 2 })
      .mockReturnValueOnce(null); // end after first segment

    await controller.play(600);

    expect(tts.generate).toHaveBeenCalledWith('Hello world.');
    expect(tts.play).toHaveBeenCalledWith(mockBuffer);
    expect(engine.jumpTo).toHaveBeenCalled();
  });

  it('pause cancels playback and stops TTS', () => {
    controller.playing = true;
    controller.pause();
    expect(controller.playing).toBe(false);
    expect(engine.pause).toHaveBeenCalled();
    expect(tts.stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/reader/sync-controller.test.js
```

- [ ] **Step 3: Implement sync-controller.js**

Export `calculateWordTimings` as a pure function plus the `SyncController` class:

```js
// src/reader/sync-controller.js

export function calculateWordTimings(words, durationMs) {
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  return words.map((w) => (w.length / totalChars) * durationMs);
}

export class SyncController {
  constructor(rsvpEngine, ttsManager) {
    this.engine = rsvpEngine;
    this.tts = ttsManager;
    this.voiceEnabled = false;
    this.playing = false;
    this._cancelled = false;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  async play(wpm) {
    this.playing = true;
    this._cancelled = false;

    if (!this.voiceEnabled) {
      this.engine.play(wpm);
      return;
    }

    // Voice-led mode: sentence-by-sentence
    while (this.playing && !this._cancelled) {
      const segment = this.engine.getCurrentSegment();
      if (!segment) break;

      const startIdx = segment.startIndex;
      const words = [];
      for (let i = 0; i < segment.wordCount; i++) {
        words.push(this.engine.words[startIdx + i]);
      }

      // Step 1-2: Generate audio, get duration
      const buffer = await this.tts.generate(segment.sentence);
      if (this._cancelled) break;

      const durationMs = buffer.duration * 1000;

      // Step 3: Calculate per-word timings
      const timings = calculateWordTimings(words, durationMs);

      // Step 4: Play audio and advance words simultaneously
      const playPromise = this.tts.play(buffer);

      let elapsed = 0;
      for (let i = 0; i < words.length && !this._cancelled; i++) {
        this.engine.jumpTo(startIdx + i);
        if (i < words.length - 1) {
          await this._delay(timings[i]);
          elapsed += timings[i];
        }
      }

      // Step 5: Wait for audio to finish (re-sync)
      if (!this._cancelled) {
        await playPromise;
      }

      // Advance to next segment
      if (!this._cancelled) {
        this.engine.nextSentence();
        if (this.engine.currentIndex >= this.engine.words.length) {
          this.playing = false;
          break;
        }
      }
    }
  }

  pause() {
    this.playing = false;
    this._cancelled = true;
    this.engine.pause();
    this.tts.stop();
  }

  _delay(ms) {
    return new Promise((resolve) => {
      this._timer = setTimeout(resolve, ms);
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/reader/sync-controller.test.js
```

- [ ] **Step 5: Wire sync controller into main.js**

Replace direct `engine.play(wpm)` calls with `syncController.play(wpm)`. The sync controller decides whether to use RSVP-only or voice-led mode based on `voiceEnabled` state.

- [ ] **Step 6: Verify manually**

Upload a file. Play without voice — RSVP works as before. Enable voice (Kokoro), play — should hear TTS and see words sync with audio.

- [ ] **Step 7: Commit**

```bash
git add src/reader/sync-controller.js tests/reader/sync-controller.test.js src/main.js
git commit -m "feat: add sync controller with voice-led and RSVP-only modes"
```

---

## Task 21: Error Handling

**Files:**
- Modify: `src/parsers/index.js`
- Modify: `src/parsers/pdf-parser.js`
- Modify: `src/tts/kokoro-tts.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add parser error handling**

In `src/parsers/index.js`: wrap all parser calls in try/catch. On failure, throw descriptive errors:
- Unsupported format: "Unsupported file format: .xyz"
- Generic parse failure: "Could not read this file. Try a different format."

In `src/parsers/pdf-parser.js`: after extracting text items, check if total word count is 0. If so, throw: "This PDF has no extractable text (it may be scanned or encrypted)."

In `src/parsers/epub-parser.js`: wrap epubjs calls in try/catch. On failure, throw: "This EPUB appears to be DRM-protected and cannot be opened."

- [ ] **Step 2: Add TTS error handling**

In `src/tts/kokoro-tts.js` `init()`: wrap `from_pretrained` in try/catch. On failure, set `this.model = null` and re-throw with message "Failed to load voice model. You can still read without voice."

In `src/main.js`: when TTS init fails, show error message in the UI but don't block reading. Disable voice toggle temporarily and show retry option.

- [ ] **Step 3: Add WASM/WebGPU detection**

In `src/tts/kokoro-tts.js`, add a static method:

```js
static checkCompatibility() {
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, message: "Your browser doesn't support local TTS. Use OpenAI or read without voice." };
  }
  return { supported: true };
}
```

Check this before allowing Kokoro selection in settings.

- [ ] **Step 4: Add error display in main.js**

Create a simple `showError(message)` function that displays a dismissible error banner at the top of the content area.

- [ ] **Step 5: Verify manually**

Test error cases: upload a non-supported file type, upload an image-only PDF (if available). Verify error messages display correctly.

- [ ] **Step 6: Commit**

```bash
git add src/parsers/index.js src/parsers/pdf-parser.js src/parsers/epub-parser.js src/tts/kokoro-tts.js src/main.js
git commit -m "feat: add error handling for parsers, TTS, and browser compatibility"
```

---

## Task 22: Polish and Visual Refinement

**Files:**
- Modify: `src/styles/main.css`
- Modify: `src/ui/rsvp-view.js`
- Modify: `src/ui/browse-view.js`
- Modify: `src/ui/app-shell.js`
- Modify: `src/ui/settings-panel.js`
- Modify: `src/ui/upload-screen.js`

- [ ] **Step 1: Use frontend-design skill for visual polish**

Invoke the `frontend-design:frontend-design` skill to review and polish all UI components. Focus on:
- Consistent spacing, colors, and typography
- Sidebar hover states and active indicators
- Settings panel slide animation
- Upload screen drop zone styling (drag hover state)
- RSVP word display sizing and centering
- Document tracking panel styling
- Progress bar design
- Light theme color palette
- Transitions and micro-interactions

- [ ] **Step 2: Commit**

```bash
git add src/styles/main.css src/ui/
git commit -m "feat: polish UI with consistent styling and interactions"
```

---

## Task 23: Final Integration Test

**Files:**
- No new files

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds, outputs to `dist/`.

- [ ] **Step 3: Preview production build**

```bash
npm run preview
```

Test the full flow:
1. Open app — see upload screen (dark theme)
2. Upload a .txt file — RSVP mode starts
3. Press Space — words advance at 600 WPM
4. Arrow keys navigate sentences
5. Switch to Browse mode — see formatted text, click a word to jump back
6. Open settings — change WPM, toggle half-bold, switch theme
7. Reload — settings persist, resume prompt appears for same file
8. Upload a PDF — verify header/footer dedup works
9. Enable voice (Kokoro) — wait for model load, play with voice sync
10. Test OpenAI TTS (if API key available)
11. Test DOCX upload
12. Switch to light theme — verify all views look correct

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final integration fixes"
```

---

## Task 24: Deploy

**Files:**
- No new files

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Vercel should auto-detect Vite and deploy. Verify the live site works at the Vercel URL.

- [ ] **Step 3: Verify old vercel.json removal doesn't break deploy**

If Vercel fails, it may need a framework override. Check Vercel dashboard settings and ensure Framework Preset is set to "Vite".
