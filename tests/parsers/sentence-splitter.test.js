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
