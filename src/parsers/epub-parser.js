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
