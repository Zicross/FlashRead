// src/parsers/pdf-parser.js
import { splitSentences } from './sentence-splitter.js';

/**
 * filterHeadersFooters - pure function, testable without pdf.js
 *
 * @param {Array<{height: number, items: Array<{str: string, y: number}>}>} pages
 * @returns {Array<{height: number, items: Array<{str: string, y: number}>}>}
 */
export function filterHeadersFooters(pages) {
  if (!pages || pages.length === 0) return pages;

  const totalPages = pages.length;
  const HEADER_THRESHOLD = 0.88; // top 12%: y > height * 0.88
  const FOOTER_THRESHOLD = 0.12; // bottom 12%: y < height * 0.12
  const PAGE_NUM_THRESHOLD = 0.05; // bottom 5%: y < height * 0.05
  const FREQ_THRESHOLD = 0.4; // >40% of pages

  // Frequency maps: str -> count of pages where it appears in header/footer zone
  const allZoneFreq = new Map();   // all pages
  const evenZoneFreq = new Map();  // even-indexed pages (0, 2, 4, ...)
  const oddZoneFreq = new Map();   // odd-indexed pages (1, 3, 5, ...)
  const evenCount = Math.ceil(totalPages / 2);
  const oddCount = Math.floor(totalPages / 2);

  // Pass 1: build frequency maps
  pages.forEach((page, pageIndex) => {
    const { height, items } = page;
    const headerMin = height * HEADER_THRESHOLD;
    const footerMax = height * FOOTER_THRESHOLD;
    const isEven = pageIndex % 2 === 0;

    // Track which strings we've counted on this page (avoid double-counting same str)
    const seenOnPage = new Set();

    for (const item of items) {
      const inZone = item.y > headerMin || item.y < footerMax;
      if (!inZone) continue;

      const str = item.str;
      if (seenOnPage.has(str)) continue;
      seenOnPage.add(str);

      allZoneFreq.set(str, (allZoneFreq.get(str) ?? 0) + 1);
      if (isEven) {
        evenZoneFreq.set(str, (evenZoneFreq.get(str) ?? 0) + 1);
      } else {
        oddZoneFreq.set(str, (oddZoneFreq.get(str) ?? 0) + 1);
      }
    }
  });

  // Build filter set: strings that exceed frequency threshold
  const filterSet = new Set();

  for (const [str, count] of allZoneFreq) {
    if (count / totalPages > FREQ_THRESHOLD) {
      filterSet.add(str);
    }
  }

  // Check alternating even/odd patterns
  if (evenCount > 0) {
    for (const [str, count] of evenZoneFreq) {
      if (count / evenCount > FREQ_THRESHOLD) {
        filterSet.add(str);
      }
    }
  }
  if (oddCount > 0) {
    for (const [str, count] of oddZoneFreq) {
      if (count / oddCount > FREQ_THRESHOLD) {
        filterSet.add(str);
      }
    }
  }

  // Pass 2: filter items from each page
  return pages.map((page) => {
    const { height, items } = page;
    const pageNumMax = height * PAGE_NUM_THRESHOLD;
    const footerMax = height * FOOTER_THRESHOLD;
    const headerMin = height * HEADER_THRESHOLD;

    const filtered = items.filter((item) => {
      // Strip purely numeric items in bottom 5% regardless of frequency
      if (item.y < pageNumMax && /^\d+$/.test(item.str.trim())) {
        return false;
      }

      // Strip items in header/footer zones that are in the filter set
      const inZone = item.y > headerMin || item.y < footerMax;
      if (inZone && filterSet.has(item.str)) {
        return false;
      }

      return true;
    });

    return { ...page, items: filtered };
  });
}

/**
 * parsePdf - main entry using pdf.js
 *
 * @param {File} file
 * @returns {Promise<{words: string[], segments: Array, metadata: object, html: string}>}
 */
export async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Build pages array
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const height = viewport.height;
    const textContent = await page.getTextContent();
    const items = textContent.items
      .filter((item) => typeof item.str === 'string' && item.str.trim())
      .map((item) => ({
        str: item.str,
        y: item.transform[5],
      }));
    pages.push({ height, items });
  }

  // Filter headers/footers
  const filteredPages = filterHeadersFooters(pages);

  // Build full text
  const fullText = filteredPages
    .map((p) => p.items.map((it) => it.str).join(' '))
    .join('\n\n');

  const words = fullText.split(/\s+/).filter(Boolean);
  const sentences = splitSentences(fullText);

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

  // Build HTML with page containers
  const html = filteredPages
    .map((p, i) => {
      const text = p.items.map((it) => it.str).join(' ').trim();
      if (!text) return '';
      const paragraphs = text.split(/\n\s*\n/).filter((t) => t.trim());
      const inner = paragraphs.length > 0
        ? paragraphs.map((para) => `<p>${para.trim()}</p>`).join('\n')
        : `<p>${text}</p>`;
      return `<div class="pdf-page" data-page="${i + 1}">\n${inner}\n</div>`;
    })
    .filter(Boolean)
    .join('\n');

  // Get metadata
  let title = file.name;
  try {
    const meta = await pdf.getMetadata();
    if (meta?.info?.Title) {
      title = meta.info.Title;
    }
  } catch {
    // fallback to filename
  }

  return {
    words,
    segments,
    metadata: {
      title,
      pageCount: pdf.numPages,
    },
    html,
  };
}
