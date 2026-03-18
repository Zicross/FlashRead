// src/parsers/index.js
import { parseTxt } from './txt-parser.js';

const PARSERS = {
  'text/plain': (file) => file.text().then((t) => parseTxt(t, file.name)),
  'application/pdf': async (file) => {
    const { parsePdf } = await import('./pdf-parser.js');
    return parsePdf(file);
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    async (file) => {
      const { parseDocx } = await import('./docx-parser.js');
      return parseDocx(file);
    },
  'application/epub+zip': async (file) => {
    const { parseEpub } = await import('./epub-parser.js');
    return parseEpub(file);
  },
};

const EXT_MAP = {
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.epub': 'application/epub+zip',
};

export async function parseFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const mime = file.type || EXT_MAP[ext];
  const parser = PARSERS[mime] || PARSERS[EXT_MAP[ext]];

  if (!parser) {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  try {
    return await parser(file);
  } catch (err) {
    // Re-throw errors that already have descriptive messages (from individual parsers)
    if (err.message && err.message !== '') {
      throw err;
    }
    throw new Error('Could not read this file. Try a different format.');
  }
}
