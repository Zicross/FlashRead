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
    expect(result.every((p) => p.items.every((it) => it.str !== 'Chapter Title'))).toBe(true);
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
    // Page numbers should be stripped
    expect(result.every((p) => p.items.length === 1)).toBe(true);
    expect(result.every((p) => p.items[0].str === 'Content')).toBe(true);
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
    expect(result[0].items.some((it) => it.str === 'Rare Header')).toBe(true);
  });
});
