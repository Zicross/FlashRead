// src/ui/browse-view.js

export class BrowseView {
  /**
   * @param {HTMLElement} container - The content area element
   * @param {string[]} words - The words[] array from parser
   * @param {string} html - The html string from parser
   * @param {(index: number) => void} onWordClick - Callback when a word is clicked
   */
  constructor(container, words, html, onWordClick) {
    this._container = container;
    this._words = words;
    this._html = html;
    this._onWordClick = onWordClick;
    this._el = null;
    this._clickHandler = null;
    this._activeSpans = [];
  }

  /**
   * Walk all text nodes in a DOM subtree.
   * @param {Node} root
   * @returns {Text[]}
   */
  _getTextNodes(root) {
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode()) !== null) {
      textNodes.push(node);
    }
    return textNodes;
  }

  /**
   * Post-process parsed HTML: wrap each word token in a
   * <span data-word-index="N"> matching the words[] array sequentially.
   * @param {string} html
   * @returns {HTMLElement} - The processed div element
   */
  _buildWordIndexedDOM(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    const textNodes = this._getTextNodes(div);
    let wordIndex = 0;

    for (const textNode of textNodes) {
      const text = textNode.nodeValue;
      // Split by whitespace, keeping track of what was between tokens
      const parts = text.split(/(\s+)/);

      // Check if there are any non-whitespace tokens to process
      const hasWords = parts.some((p) => p.trim().length > 0);
      if (!hasWords) continue;

      const fragment = document.createDocumentFragment();

      for (const part of parts) {
        if (part.trim().length === 0) {
          // Preserve whitespace as a text node
          if (part.length > 0) {
            fragment.appendChild(document.createTextNode(part));
          }
        } else {
          const span = document.createElement('span');
          span.setAttribute('data-word-index', String(wordIndex));
          span.textContent = part;
          fragment.appendChild(span);
          wordIndex++;
        }
      }

      textNode.parentNode.replaceChild(fragment, textNode);
    }

    return div;
  }

  /**
   * Render the browse area and attach it to the container.
   */
  show() {
    if (this._el) {
      this._el.classList.remove('hidden');
      return;
    }

    const area = document.createElement('div');
    area.className = 'browse-area';

    const contentDiv = this._buildWordIndexedDOM(this._html);
    // Move all children of the processed div into the area
    while (contentDiv.firstChild) {
      area.appendChild(contentDiv.firstChild);
    }

    // Attach a single delegated click handler
    this._clickHandler = (e) => {
      const span = e.target.closest('span[data-word-index]');
      if (span) {
        const index = parseInt(span.getAttribute('data-word-index'), 10);
        if (!isNaN(index) && this._onWordClick) {
          this._onWordClick(index);
        }
      }
    };
    area.addEventListener('click', this._clickHandler);

    this._el = area;
    this._container.appendChild(area);
  }

  /**
   * Hide the browse area (keeps it in DOM for fast re-show).
   */
  hide() {
    if (this._el) {
      this._el.classList.add('hidden');
    }
  }

  /**
   * Highlight all word spans belonging to the given segment.
   * Removes .active from the previous active spans.
   * @param {number} segmentIndex
   * @param {Array<{sentence: string, startIndex: number, wordCount: number}>} segments
   */
  highlightSentence(segmentIndex, segments) {
    // Remove active class from previously highlighted spans
    for (const span of this._activeSpans) {
      span.classList.remove('active');
    }
    this._activeSpans = [];

    if (!this._el) return;

    const segment = segments[segmentIndex];
    if (!segment) return;

    const { startIndex, wordCount } = segment;

    for (let i = startIndex; i < startIndex + wordCount; i++) {
      const span = this._el.querySelector(`span[data-word-index="${i}"]`);
      if (span) {
        span.classList.add('active');
        this._activeSpans.push(span);
      }
    }
  }

  /**
   * Scroll the browse container to make the word at `index` visible.
   * @param {number} index
   */
  scrollToWord(index) {
    if (!this._el) return;
    const span = this._el.querySelector(`span[data-word-index="${index}"]`);
    if (span) {
      span.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /**
   * Remove the element from DOM and clean up event listeners.
   */
  destroy() {
    if (this._el) {
      if (this._clickHandler) {
        this._el.removeEventListener('click', this._clickHandler);
        this._clickHandler = null;
      }
      this._el.remove();
      this._el = null;
    }
    this._activeSpans = [];
  }
}
