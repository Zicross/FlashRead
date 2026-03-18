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
