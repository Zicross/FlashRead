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
