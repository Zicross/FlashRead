/**
 * TextChunker - Splits word arrays into sentence-sized chunks for TTS.
 * Each chunk knows its start/end indices in the global words array.
 */
export class TextChunker {
  constructor() {
    this.chunks = [];
    this.currentChunkIndex = 0;
  }

  /**
   * Build sentence chunks from a words array.
   * @param {string[]} words
   * @returns {Array<{text: string, startIndex: number, endIndex: number, words: string[]}>}
   */
  buildChunks(words) {
    this.chunks = [];
    this.currentChunkIndex = 0;

    if (words.length === 0) return this.chunks;

    let chunkStart = 0;
    let currentSentence = [];

    for (let i = 0; i < words.length; i++) {
      currentSentence.push(words[i]);

      // Check if this word ends a sentence
      const word = words[i];
      const endsWithPunctuation = /[.!?]["'\u201D\u2019)]*$/.test(word);
      const nextWordStartsUpper = i + 1 < words.length && /^[A-Z\u201C\u2018"'(]/.test(words[i + 1]);
      const isLastWord = i === words.length - 1;

      if (isLastWord || (endsWithPunctuation && (nextWordStartsUpper || isLastWord))) {
        this.chunks.push({
          text: currentSentence.join(' '),
          startIndex: chunkStart,
          endIndex: i,
          words: [...currentSentence],
        });
        chunkStart = i + 1;
        currentSentence = [];
      }

      // Also break if sentence gets too long (50+ words) for TTS
      if (currentSentence.length >= 50) {
        this.chunks.push({
          text: currentSentence.join(' '),
          startIndex: chunkStart,
          endIndex: i,
          words: [...currentSentence],
        });
        chunkStart = i + 1;
        currentSentence = [];
      }
    }

    return this.chunks;
  }

  getCurrentChunk() {
    return this.chunks[this.currentChunkIndex] || null;
  }

  nextChunk() {
    if (this.currentChunkIndex < this.chunks.length - 1) {
      this.currentChunkIndex++;
      return this.getCurrentChunk();
    }
    return null;
  }

  previousChunk() {
    if (this.currentChunkIndex > 0) {
      this.currentChunkIndex--;
      return this.getCurrentChunk();
    }
    return null;
  }

  /**
   * Find the chunk containing a given word index and set it as current.
   */
  jumpToWordIndex(wordIndex) {
    for (let i = 0; i < this.chunks.length; i++) {
      if (wordIndex >= this.chunks[i].startIndex && wordIndex <= this.chunks[i].endIndex) {
        this.currentChunkIndex = i;
        return this.chunks[i];
      }
    }
    return null;
  }

  get hasMore() {
    return this.currentChunkIndex < this.chunks.length - 1;
  }

  get isAtStart() {
    return this.currentChunkIndex === 0;
  }
}
