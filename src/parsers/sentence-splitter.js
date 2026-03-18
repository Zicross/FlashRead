// src/parsers/sentence-splitter.js
const ABBREVIATIONS = new Set([
  'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Jr', 'Sr', 'St',
  'Inc', 'Ltd', 'vs', 'etc', 'approx',
]);

const ABBREV_PATTERNS = /\b(e\.g|i\.e)\./g;
const PLACEHOLDER = '\x00ABBR\x00';

export function splitSentences(text) {
  if (!text || !text.trim()) return [];

  // Protect e.g. and i.e.
  let working = text.replace(ABBREV_PATTERNS, (m) => m.replace(/\./g, PLACEHOLDER));

  // Protect known abbreviations
  for (const abbr of ABBREVIATIONS) {
    const re = new RegExp(`\\b${abbr}\\.`, 'g');
    working = working.replace(re, (m) => m.replace('.', PLACEHOLDER));
  }

  const parts = [];
  let current = '';

  for (let i = 0; i < working.length; i++) {
    current += working[i];

    // Check for ellipsis
    if (working[i] === '.' && working[i + 1] === '.' && working[i + 2] === '.') {
      current += '..';
      i += 2;
      // Check if followed by space + uppercase (same rule as .!?)
      const afterIdx = i + 1;
      const afterAfterIdx = i + 2;
      if (
        afterIdx < working.length &&
        /\s/.test(working[afterIdx]) &&
        (afterAfterIdx >= working.length || /[A-Z]/.test(working[afterAfterIdx]))
      ) {
        parts.push(current.trim());
        current = '';
        i++; // skip whitespace
      }
      continue;
    }

    // Check for .!? followed by space + uppercase (or end of string)
    if (/[.!?]/.test(working[i])) {
      const next = working[i + 1];
      const afterNext = working[i + 2];
      if (next === undefined) {
        parts.push(current.trim());
        current = '';
      } else if (/\s/.test(next) && (afterNext === undefined || /[A-Z]/.test(afterNext))) {
        parts.push(current.trim());
        current = '';
        if (/\s/.test(next)) i++;
      }
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.map((s) => s.replaceAll(PLACEHOLDER, '.'));
}
