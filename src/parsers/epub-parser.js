import ePub from 'epubjs';

/**
 * Parse an EPUB file and extract text in reading order.
 */
export async function parseEPUB(file) {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  await book.ready;

  const spine = book.spine;
  let fullText = '';

  // Iterate through spine items in reading order
  for (const section of spine.items) {
    await section.load(book.load.bind(book));
    const doc = section.document;
    if (doc && doc.body) {
      const text = doc.body.textContent || '';
      fullText += text.trim() + ' ';
    }
    section.unload();
  }

  fullText = fullText.trim();
  const words = fullText.split(/\s+/).filter(w => w.length > 0);

  book.destroy();

  return {
    type: 'text',
    words,
    wordPositions: [],
    text: fullText,
    metadata: { title: book.packaging?.metadata?.title || file.name },
  };
}
