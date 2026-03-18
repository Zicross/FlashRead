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
