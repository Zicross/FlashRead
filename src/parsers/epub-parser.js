// src/parsers/epub-parser.js
import ePub from 'epubjs';
import { splitSentences } from './sentence-splitter.js';

export async function parseEpub(file) {
  let book;
  try {
    const arrayBuffer = await file.arrayBuffer();
    book = ePub(arrayBuffer);
    await book.ready;
  } catch (err) {
    const msg = err?.message?.toLowerCase() ?? '';
    const isDrm =
      msg.includes('drm') ||
      msg.includes('encrypted') ||
      msg.includes('rights') ||
      msg.includes('adept') ||
      msg.includes('protection');
    if (isDrm) {
      throw new Error('This EPUB appears to be DRM-protected and cannot be opened.');
    }
    throw new Error('Could not read this file. Try a different format.');
  }

  const spine = book.spine;
  let allText = '';
  let allHtml = '';

  try {
    for (const item of spine.items) {
      const doc = await item.load(book.load.bind(book));
      const body = doc.querySelector('body') || doc.documentElement;
      const text = body.textContent || '';
      allText += text + ' ';
      allHtml += body.innerHTML || '';
    }
  } catch (err) {
    const msg = err?.message?.toLowerCase() ?? '';
    const isDrm =
      msg.includes('drm') ||
      msg.includes('encrypted') ||
      msg.includes('rights') ||
      msg.includes('adept') ||
      msg.includes('protection');
    if (isDrm) {
      throw new Error('This EPUB appears to be DRM-protected and cannot be opened.');
    }
    throw new Error('Could not read this file. Try a different format.');
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
