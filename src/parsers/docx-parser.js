// src/parsers/docx-parser.js
import mammoth from 'mammoth';
import { splitSentences } from './sentence-splitter.js';

export function extractFromHtml(html, fileName) {
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
