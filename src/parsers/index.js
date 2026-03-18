import { parsePDF } from './pdf-parser.js';
import { parseDOCX } from './docx-parser.js';
import { parseTXT } from './txt-parser.js';
import { parseEPUB } from './epub-parser.js';

const PARSERS = {
  'application/pdf': parsePDF,
  'pdf': parsePDF,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': parseDOCX,
  'docx': parseDOCX,
  'text/plain': parseTXT,
  'txt': parseTXT,
  'application/epub+zip': parseEPUB,
  'epub': parseEPUB,
};

/**
 * Parse a file by detecting its format.
 */
export async function parseFile(file) {
  // Try MIME type first, then fall back to extension
  let parser = PARSERS[file.type];

  if (!parser) {
    const ext = file.name.split('.').pop().toLowerCase();
    parser = PARSERS[ext];
  }

  if (!parser) {
    throw new Error(`Unsupported file format: ${file.name}`);
  }

  return parser(file);
}
