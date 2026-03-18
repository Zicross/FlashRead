/**
 * Document Viewer - renders PDF canvases or text content with word highlighting.
 */
export class DocumentViewer {
  constructor(pdfViewerEl, textViewerEl) {
    this.pdfViewerEl = pdfViewerEl;
    this.textViewerEl = textViewerEl;
    this.canvases = [];
    this.lastRenderedPage = null;
    this.documentType = null;
    this.onWordClick = null; // (wordIndex) => void
  }

  clear() {
    this.pdfViewerEl.innerHTML = '';
    this.textViewerEl.innerHTML = '';
    this.textViewerEl.classList.add('hidden');
    this.pdfViewerEl.classList.remove('hidden');
    this.canvases = [];
    this.lastRenderedPage = null;
    this.documentType = null;
  }

  async renderPDF(parseResult) {
    this.clear();
    this.documentType = 'pdf';
    this.pdfViewerEl.classList.remove('hidden');
    this.textViewerEl.classList.add('hidden');

    const { pages, wordPositions } = parseResult;

    for (let i = 0; i < pages.length; i++) {
      const { page, viewport } = pages[i];
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      this.pdfViewerEl.appendChild(canvas);
      const context = canvas.getContext('2d');
      this.canvases.push({ canvas, viewport, context, pageObj: page });

      await page.render({ canvasContext: context, viewport }).promise;

      const pageNum = i + 1;
      canvas.addEventListener('click', (e) => {
        this._handleCanvasClick(e, pageNum, wordPositions);
      });
    }
  }

  renderText(parseResult) {
    this.clear();
    this.documentType = 'text';
    this.pdfViewerEl.classList.add('hidden');
    this.textViewerEl.classList.remove('hidden');

    const { words } = parseResult;

    // Render words as clickable spans
    this.textViewerEl.innerHTML = '';
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.dataset.index = index;
      span.textContent = word;
      span.addEventListener('click', () => {
        this.onWordClick?.(index);
      });
      this.textViewerEl.appendChild(span);
      // Add space between words
      if (index < words.length - 1) {
        this.textViewerEl.appendChild(document.createTextNode(' '));
      }
    });
  }

  highlightWord(index, wordPositions) {
    if (this.documentType === 'pdf') {
      this._highlightPDFWord(index, wordPositions);
    } else if (this.documentType === 'text') {
      this._highlightTextWord(index);
    }
  }

  async _highlightPDFWord(index, wordPositions) {
    if (index >= wordPositions.length) return;

    const pos = wordPositions[index];
    const pageIndex = pos.page - 1;
    if (pageIndex >= this.canvases.length) return;

    const { canvas, context, viewport, pageObj } = this.canvases[pageIndex];

    if (this.lastRenderedPage !== pos.page) {
      await pageObj.render({ canvasContext: context, viewport }).promise;
      this.lastRenderedPage = pos.page;
      canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    context.fillStyle = 'rgba(255, 255, 0, 0.3)';
    context.fillRect(pos.x, pos.y, pos.width, pos.height);
  }

  _highlightTextWord(index) {
    // Remove previous highlight
    const prev = this.textViewerEl.querySelector('.word.active');
    if (prev) prev.classList.remove('active');

    const span = this.textViewerEl.querySelector(`.word[data-index="${index}"]`);
    if (span) {
      span.classList.add('active');
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  _handleCanvasClick(event, pageNum, wordPositions) {
    const canvas = this.canvases[pageNum - 1].canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let closestIndex = -1;
    let minDistance = Infinity;

    wordPositions.forEach((pos, index) => {
      if (pos.page === pageNum) {
        const dx = x - (pos.x + pos.width / 2);
        const dy = y - (pos.y + pos.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });

    if (closestIndex >= 0) {
      this.onWordClick?.(closestIndex);
    }
  }
}
