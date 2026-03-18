// src/ui/settings-panel.js

export class SettingsPanel {
  /**
   * @param {import('../storage/store.js').Store} store
   * @param {{
   *   onWpmChange: (wpm: number) => void,
   *   onFontSizeChange: (size: number) => void,
   *   onHalfBoldChange: (enabled: boolean) => void,
   *   onVoiceToggle: (enabled: boolean) => void,
   *   onProviderChange: (provider: string) => void,
   *   onVoiceChange: (voiceId: string) => void,
   *   onApiKeyChange: (key: string) => void,
   *   onThemeChange: (theme: string) => void,
   * }} callbacks
   */
  constructor(store, callbacks) {
    this._store = store;
    this._callbacks = callbacks;

    this._overlay = null;
    this._panel = null;
    this._voiceSelect = null;
    this._apiKeyRow = null;

    this._render();
  }

  /** Slide the panel open */
  open() {
    if (this._overlay) {
      this._overlay.classList.add('open');
    }
  }

  /** Slide the panel closed */
  close() {
    if (this._overlay) {
      this._overlay.classList.remove('open');
    }
  }

  /**
   * Repopulate the voice dropdown with new voice list.
   * @param {{ id: string, name: string }[]} voices
   */
  updateVoices(voices) {
    if (!this._voiceSelect) return;
    const currentVoice = this._store.getSettings().voiceId;
    this._voiceSelect.innerHTML = '';
    for (const voice of voices) {
      const opt = document.createElement('option');
      opt.value = voice.id;
      opt.textContent = voice.name;
      if (voice.id === currentVoice) opt.selected = true;
      this._voiceSelect.appendChild(opt);
    }
  }

  // ----------------------------------------------------------------
  // Private rendering
  // ----------------------------------------------------------------

  _render() {
    const settings = this._store.getSettings();

    // Overlay (backdrop + panel container)
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    this._overlay = overlay;

    // Panel
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    this._panel = panel;

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Header row
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; justify-content:space-between;';

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    title.style.cssText = 'font-size:var(--text-lg); font-weight:600; color:var(--color-text-primary); margin:0;';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar-btn';
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.title = 'Close';
    closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // ---- Reading section ----
    panel.appendChild(this._makeSectionTitle('Reading'));

    // WPM slider
    const wpmValueLabel = document.createElement('span');
    wpmValueLabel.style.cssText = 'font-size:var(--text-sm); color:var(--color-text-secondary); min-width:60px; text-align:right;';
    wpmValueLabel.textContent = `${settings.wpm} wpm`;

    const wpmSlider = document.createElement('input');
    wpmSlider.type = 'range';
    wpmSlider.min = '100';
    wpmSlider.max = '1400';
    wpmSlider.step = '25';
    wpmSlider.value = String(settings.wpm);
    wpmSlider.setAttribute('aria-label', 'Words per minute');

    wpmSlider.addEventListener('input', () => {
      const val = Number(wpmSlider.value);
      wpmValueLabel.textContent = `${val} wpm`;
      this._store.updateSettings({ wpm: val });
      this._callbacks.onWpmChange?.(val);
    });

    const wpmSliderRow = document.createElement('div');
    wpmSliderRow.style.cssText = 'display:flex; flex-direction:column; gap:var(--space-2); margin-bottom:var(--space-3);';
    const wpmLabelLine = document.createElement('div');
    wpmLabelLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const wpmLabel = document.createElement('span');
    wpmLabel.className = 'settings-label';
    wpmLabel.textContent = 'Speed';
    wpmLabelLine.appendChild(wpmLabel);
    wpmLabelLine.appendChild(wpmValueLabel);
    wpmSliderRow.appendChild(wpmLabelLine);
    wpmSliderRow.appendChild(wpmSlider);
    panel.appendChild(wpmSliderRow);

    // Font size slider
    const fontValueLabel = document.createElement('span');
    fontValueLabel.style.cssText = 'font-size:var(--text-sm); color:var(--color-text-secondary); min-width:40px; text-align:right;';
    fontValueLabel.textContent = `${settings.fontSize}px`;

    const fontSlider = document.createElement('input');
    fontSlider.type = 'range';
    fontSlider.min = '16';
    fontSlider.max = '72';
    fontSlider.step = '2';
    fontSlider.value = String(settings.fontSize);
    fontSlider.setAttribute('aria-label', 'Font size');

    fontSlider.addEventListener('input', () => {
      const val = Number(fontSlider.value);
      fontValueLabel.textContent = `${val}px`;
      this._store.updateSettings({ fontSize: val });
      this._callbacks.onFontSizeChange?.(val);
    });

    const fontSliderRow = document.createElement('div');
    fontSliderRow.style.cssText = 'display:flex; flex-direction:column; gap:var(--space-2); margin-bottom:var(--space-3);';
    const fontLabelLine = document.createElement('div');
    fontLabelLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const fontLabel = document.createElement('span');
    fontLabel.className = 'settings-label';
    fontLabel.textContent = 'Font size';
    fontLabelLine.appendChild(fontLabel);
    fontLabelLine.appendChild(fontValueLabel);
    fontSliderRow.appendChild(fontLabelLine);
    fontSliderRow.appendChild(fontSlider);
    panel.appendChild(fontSliderRow);

    // Half-bold toggle
    const halfBoldRow = document.createElement('div');
    halfBoldRow.className = 'settings-row';
    const halfBoldLabel = document.createElement('label');
    halfBoldLabel.className = 'settings-label';
    halfBoldLabel.textContent = 'Half-bold words';
    halfBoldLabel.style.cursor = 'pointer';

    const halfBoldToggle = this._makeToggle(settings.halfBold, (checked) => {
      this._store.updateSettings({ halfBold: checked });
      this._callbacks.onHalfBoldChange?.(checked);
    });
    halfBoldLabel.htmlFor = halfBoldToggle.querySelector('input').id = 'settings-halfbold';

    halfBoldRow.appendChild(halfBoldLabel);
    halfBoldRow.appendChild(halfBoldToggle);
    panel.appendChild(halfBoldRow);

    // ---- Voice section ----
    panel.appendChild(this._makeSectionTitle('Voice'));

    // Voice on/off toggle
    const voiceRow = document.createElement('div');
    voiceRow.className = 'settings-row';
    const voiceLabel = document.createElement('label');
    voiceLabel.className = 'settings-label';
    voiceLabel.textContent = 'Enable voice';
    voiceLabel.style.cursor = 'pointer';

    const voiceToggle = this._makeToggle(settings.voiceEnabled, (checked) => {
      this._store.updateSettings({ voiceEnabled: checked });
      this._callbacks.onVoiceToggle?.(checked);
    });
    voiceLabel.htmlFor = voiceToggle.querySelector('input').id = 'settings-voice-enabled';

    voiceRow.appendChild(voiceLabel);
    voiceRow.appendChild(voiceToggle);
    panel.appendChild(voiceRow);

    // Provider dropdown
    const providerRow = document.createElement('div');
    providerRow.className = 'settings-row';
    const providerLabel = document.createElement('span');
    providerLabel.className = 'settings-label';
    providerLabel.textContent = 'Provider';

    const providerSelect = document.createElement('select');
    providerSelect.setAttribute('aria-label', 'TTS provider');
    [{ value: 'kokoro', label: 'Kokoro (local)' }, { value: 'openai', label: 'OpenAI' }].forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === settings.ttsProvider) opt.selected = true;
      providerSelect.appendChild(opt);
    });

    providerSelect.addEventListener('change', () => {
      const provider = providerSelect.value;
      this._store.updateSettings({ ttsProvider: provider });
      this._callbacks.onProviderChange?.(provider);
      this._updateApiKeyVisibility(provider);
    });

    providerRow.appendChild(providerLabel);
    providerRow.appendChild(providerSelect);
    panel.appendChild(providerRow);

    // Voice selection dropdown
    const voiceSelectRow = document.createElement('div');
    voiceSelectRow.className = 'settings-row';
    const voiceSelectLabel = document.createElement('span');
    voiceSelectLabel.className = 'settings-label';
    voiceSelectLabel.textContent = 'Voice';

    const voiceSelect = document.createElement('select');
    voiceSelect.setAttribute('aria-label', 'Voice selection');
    this._voiceSelect = voiceSelect;

    voiceSelect.addEventListener('change', () => {
      const voiceId = voiceSelect.value;
      this._store.updateSettings({ voiceId });
      this._callbacks.onVoiceChange?.(voiceId);
    });

    voiceSelectRow.appendChild(voiceSelectLabel);
    voiceSelectRow.appendChild(voiceSelect);
    panel.appendChild(voiceSelectRow);

    // API key input (only for OpenAI)
    const apiKeyRow = document.createElement('div');
    apiKeyRow.style.cssText = 'display:flex; flex-direction:column; gap:var(--space-2); margin-bottom:var(--space-3);';
    this._apiKeyRow = apiKeyRow;

    const apiKeyLabel = document.createElement('span');
    apiKeyLabel.className = 'settings-label';
    apiKeyLabel.textContent = 'OpenAI API key';

    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'sk-...';
    apiKeyInput.setAttribute('aria-label', 'OpenAI API key');
    apiKeyInput.autocomplete = 'off';
    if (settings.openaiApiKey) {
      apiKeyInput.value = settings.openaiApiKey;
    }

    const apiKeyWarning = document.createElement('p');
    apiKeyWarning.style.cssText = 'font-size:var(--text-xs); color:var(--color-text-muted); margin:0;';
    apiKeyWarning.textContent = 'API key is stored locally in your browser';

    apiKeyInput.addEventListener('change', () => {
      const key = apiKeyInput.value.trim();
      this._store.updateSettings({ openaiApiKey: key || null });
      this._callbacks.onApiKeyChange?.(key);
    });

    apiKeyRow.appendChild(apiKeyLabel);
    apiKeyRow.appendChild(apiKeyInput);
    apiKeyRow.appendChild(apiKeyWarning);
    panel.appendChild(apiKeyRow);

    // Set initial visibility of API key row
    this._updateApiKeyVisibility(settings.ttsProvider);

    // ---- Display section ----
    panel.appendChild(this._makeSectionTitle('Display'));

    // Dark/light theme toggle
    const themeRow = document.createElement('div');
    themeRow.className = 'settings-row';
    const themeLabel = document.createElement('label');
    themeLabel.className = 'settings-label';
    themeLabel.textContent = 'Light theme';
    themeLabel.style.cursor = 'pointer';

    const themeToggle = this._makeToggle(settings.theme === 'light', (checked) => {
      const newTheme = checked ? 'light' : 'dark';
      this._store.updateSettings({ theme: newTheme });
      this._callbacks.onThemeChange?.(newTheme);
    });
    themeLabel.htmlFor = themeToggle.querySelector('input').id = 'settings-theme';

    themeRow.appendChild(themeLabel);
    themeRow.appendChild(themeToggle);
    panel.appendChild(themeRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  /**
   * Create a section title element.
   * @param {string} text
   * @returns {HTMLElement}
   */
  _makeSectionTitle(text) {
    const el = document.createElement('div');
    el.className = 'settings-section-title';
    el.textContent = text;
    return el;
  }

  /**
   * Create a toggle switch element.
   * @param {boolean} checked
   * @param {(checked: boolean) => void} onChange
   * @returns {HTMLElement}
   */
  _makeToggle(checked, onChange) {
    const label = document.createElement('label');
    label.className = 'toggle';
    label.setAttribute('aria-label', '');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));

    const track = document.createElement('span');
    track.className = 'toggle-track';

    const thumb = document.createElement('span');
    thumb.className = 'toggle-thumb';

    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(thumb);
    return label;
  }

  /**
   * Show or hide the API key row based on provider.
   * @param {string} provider
   */
  _updateApiKeyVisibility(provider) {
    if (!this._apiKeyRow) return;
    this._apiKeyRow.style.display = provider === 'openai' ? 'flex' : 'none';
  }
}
