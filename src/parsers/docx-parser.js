import mammoth from 'mammoth';

/**
 * Parse a DOCX file and extract text and words.
 */
export async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();
  const words = text.split(/\s+/).filter(w => w.length > 0);

  return {
    type: 'text',
    words,
    wordPositions: [],
    text,
    metadata: { title: file.name },
  };
}
