// src/ui/upload-screen.js

export class UploadScreen {
  /**
   * @param {HTMLElement} container - The element to render into
   * @param {(file: File) => void} onFile - Callback invoked when a file is selected
   */
  constructor(container, onFile) {
    this._container = container;
    this._onFile = onFile;
    this._el = null;
    this._input = null;
    this._render();
  }

  _render() {
    const el = document.createElement('div');
    el.className = 'upload-screen';

    const tagline = document.createElement('p');
    tagline.className = 'upload-dropzone-subtitle';
    tagline.textContent = 'Speed read any document with synchronized voice';

    const dropzone = document.createElement('div');
    dropzone.className = 'upload-dropzone';
    dropzone.setAttribute('role', 'button');
    dropzone.setAttribute('tabindex', '0');

    const title = document.createElement('p');
    title.className = 'upload-dropzone-title';
    title.textContent = 'Drop a file or click to upload';

    const formats = document.createElement('p');
    formats.className = 'upload-formats';
    formats.textContent = 'PDF · DOCX · EPUB · TXT';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.epub,.txt';
    input.style.display = 'none';
    input.setAttribute('aria-hidden', 'true');

    dropzone.appendChild(title);
    dropzone.appendChild(formats);
    dropzone.appendChild(input);

    el.appendChild(tagline);
    el.appendChild(dropzone);

    // Click on dropzone opens file picker
    dropzone.addEventListener('click', () => input.click());

    // Keyboard: Enter/Space also opens file picker
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    // Drag events
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', (e) => {
      // Only remove if leaving the dropzone itself (not a child)
      if (!dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove('drag-over');
      }
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this._onFile(file);
    });

    // File input change
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) {
        this._onFile(file);
        // Reset so the same file can be re-selected
        input.value = '';
      }
    });

    this._el = el;
    this._input = input;
    this._container.appendChild(el);
  }

  show() {
    if (this._el) this._el.classList.remove('hidden');
  }

  hide() {
    if (this._el) this._el.classList.add('hidden');
  }

  /** Programmatically open the file picker (used by sidebar upload button) */
  showFilePicker() {
    this._input.click();
  }
}
