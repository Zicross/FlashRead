import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Parse a PDF file and extract words with positions.
 * Returns words array and position metadata for canvas highlighting.
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;

  const words = [];
  const wordPositions = [];
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.5 });

    pages.push({ page, viewport });

    content.items.forEach(item => {
      if (item.str.trim()) {
        const transform = item.transform;
        const x = transform[4] * 1.5; // Scale with viewport
        const y = viewport.height - transform[5] * 1.5;
        const width = item.width * 1.5;
        const height = item.height * 1.5;
        const pageWords = item.str.split(/\s+/).filter(w => w.length > 0);
        const avgWordWidth = width / (pageWords.length || 1);
        let currentX = x;

        pageWords.forEach(word => {
          words.push(word);
          wordPositions.push({
            page: i,
            x: currentX,
            y: y - height,
            width: avgWordWidth + 2,
            height: height + 2,
            text: word,
          });
          currentX += avgWordWidth;
        });
      }
    });
  }

  return {
    type: 'pdf',
    words,
    wordPositions,
    pages,
    pdfDoc,
    text: words.join(' '),
    metadata: { title: file.name, pageCount: totalPages },
  };
}
