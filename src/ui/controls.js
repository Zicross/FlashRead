/**
 * Controls - binds UI controls to the sync controller and settings.
 */
export class Controls {
  constructor(syncController, ttsManager) {
    this.sync = syncController;
    this.tts = ttsManager;

    // DOM elements
    this.fileButton = document.getElementById('fileButton');
    this.fileInput = document.getElementById('fileInput');
    this.fileName = document.getElementById('fileName');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    this.fontSizeSlider = document.getElementById('fontSizeSlider');
    this.fontSizeValue = document.getElementById('fontSizeValue');
    this.boldToggle = document.getElementById('boldFirstHalf');
    this.voiceToggle = document.getElementById('voiceToggle');
    this.startButton = document.getElementById('startButton');
    this.pauseButton = document.getElementById('pauseButton');
    this.prevButton = document.getElementById('prevSentence');
    this.nextButton = document.getElementById('nextSentence');

    // Callbacks
    this.onFileSelected = null; // (file) => void

    this._bindEvents();
    this._loadSettings();
  }

  setEnabled(enabled) {
    this.startButton.disabled = !enabled;
    this.pauseButton.disabled = !enabled;
    this.prevButton.disabled = !enabled;
    this.nextButton.disabled = !enabled;
  }

  updatePlayState({ isPlaying, isPaused }) {
    this.pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    this.pauseButton.disabled = !isPlaying && !isPaused;
  }

  _bindEvents() {
    this.fileButton.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.fileName.textContent = file.name;
        this.onFileSelected?.(file);
      }
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (this.voiceToggle.checked) {
        // Voice mode: slider controls speech rate (0.5x - 3x)
        const rate = value / 300; // 100 → 0.33x, 300 → 1x, 1400 → 4.67x
        const clampedRate = Math.max(0.5, Math.min(3.0, rate));
        this.speedValue.textContent = `${clampedRate.toFixed(1)}x`;
        this.sync.setSpeedRate(clampedRate);
      } else {
        // RSVP mode: slider controls WPM
        this.speedValue.textContent = `${value} WPM`;
        this.sync.setWPM(value);
      }
      localStorage.setItem('flashread_speed', value);
    });

    this.fontSizeSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value);
      this.fontSizeValue.textContent = `${size}px`;
      this.sync.rsvp.setFontSize(size);
      localStorage.setItem('flashread_fontSize', size);
    });

    this.boldToggle.addEventListener('change', (e) => {
      this.sync.rsvp.setBoldFirstHalf(e.target.checked);
      localStorage.setItem('flashread_bold', e.target.checked);
    });

    this.voiceToggle.addEventListener('change', (e) => {
      this.sync.setVoiceEnabled(e.target.checked);
      this._updateSpeedLabel();
      localStorage.setItem('flashread_voice', e.target.checked);
    });

    this.startButton.addEventListener('click', () => this.sync.start(true));
    this.pauseButton.addEventListener('click', () => this.sync.togglePause());
    this.prevButton.addEventListener('click', () => this.sync.previousSentence());
    this.nextButton.addEventListener('click', () => this.sync.nextSentence());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.sync.togglePause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.sync.previousSentence();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.sync.nextSentence();
          break;
      }
    });

    // Listen to sync state changes
    this.sync.onStateChange = (state) => {
      this.updatePlayState(state);
    };
  }

  _updateSpeedLabel() {
    const value = parseInt(this.speedSlider.value);
    if (this.voiceToggle.checked) {
      const rate = Math.max(0.5, Math.min(3.0, value / 300));
      this.speedValue.textContent = `${rate.toFixed(1)}x`;
    } else {
      this.speedValue.textContent = `${value} WPM`;
    }
  }

  _loadSettings() {
    const speed = localStorage.getItem('flashread_speed');
    if (speed) {
      this.speedSlider.value = speed;
      this.sync.setWPM(parseInt(speed));
    }

    const fontSize = localStorage.getItem('flashread_fontSize');
    if (fontSize) {
      this.fontSizeSlider.value = fontSize;
      this.fontSizeValue.textContent = `${fontSize}px`;
      this.sync.rsvp.setFontSize(parseInt(fontSize));
    }

    const bold = localStorage.getItem('flashread_bold');
    if (bold === 'true') {
      this.boldToggle.checked = true;
      this.sync.rsvp.setBoldFirstHalf(true);
    }

    const voice = localStorage.getItem('flashread_voice');
    if (voice === 'true') {
      this.voiceToggle.checked = true;
      this.sync.setVoiceEnabled(true);
    }

    this._updateSpeedLabel();
  }
}
