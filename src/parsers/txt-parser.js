/**
 * Parse a plain text file.
 */
export async function parseTXT(file) {
  const text = await file.text();
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);

  return {
    type: 'text',
    words,
    wordPositions: [],
    text: trimmed,
    metadata: { title: file.name },
  };
}
