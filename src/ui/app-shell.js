// src/ui/app-shell.js

export class AppShell {
  /**
   * @param {HTMLElement} appEl - The #app root element
   * @param {import('../storage/store.js').Store} store
   * @param {import('./theme.js').ThemeManager} theme
   */
  constructor(appEl, store, theme) {
    this._appEl = appEl;
    this._store = store;
    this._theme = theme;

    this._mode = 'rsvp';

    this._callbacks = {
      modeChange: [],
      upload: [],
      themeToggle: [],
      settingsOpen: [],
    };

    this._render();
  }

  _render() {
    // Sidebar
    const sidebar = document.createElement('nav');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Main navigation');

    // Logo
    const logo = document.createElement('div');
    logo.className = 'sidebar-logo';
    logo.textContent = 'FR';
    logo.title = 'FlashRead';

    // Nav (mode tabs + upload)
    const nav = document.createElement('div');
    nav.className = 'sidebar-nav';

    // RSVP mode tab
    const rsvpBtn = document.createElement('button');
    rsvpBtn.className = 'sidebar-btn active';
    rsvpBtn.title = 'RSVP mode';
    rsvpBtn.setAttribute('aria-label', 'RSVP mode');
    rsvpBtn.dataset.mode = 'rsvp';
    rsvpBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor"/>
        <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/>
        <rect x="3" y="13" width="8" height="2" rx="1" fill="currentColor"/>
      </svg>`;

    // Browse mode tab
    const browseBtn = document.createElement('button');
    browseBtn.className = 'sidebar-btn';
    browseBtn.title = 'Browse mode';
    browseBtn.setAttribute('aria-label', 'Browse mode');
    browseBtn.dataset.mode = 'browse';
    browseBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 4h12v1H4zM4 7h12v1H4zM4 10h12v1H4zM4 13h8v1H4z" fill="currentColor"/>
        <circle cx="15" cy="14" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <line x1="17.1" y1="16.1" x2="19" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

    // Upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'sidebar-btn';
    uploadBtn.title = 'Upload file';
    uploadBtn.setAttribute('aria-label', 'Upload file');
    uploadBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3L10 13M10 3L7 6M10 3L13 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

    // Mode tab click handlers
    rsvpBtn.addEventListener('click', () => this.setMode('rsvp'));
    browseBtn.addEventListener('click', () => this.setMode('browse'));

    // Upload button click handler
    uploadBtn.addEventListener('click', () => {
      this._callbacks.upload.forEach((cb) => cb());
    });

    nav.appendChild(rsvpBtn);
    nav.appendChild(browseBtn);
    nav.appendChild(uploadBtn);

    // Bottom section: settings + theme toggle
    const bottom = document.createElement('div');
    bottom.className = 'sidebar-bottom';

    // Settings gear
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'sidebar-btn';
    settingsBtn.title = 'Settings';
    settingsBtn.setAttribute('aria-label', 'Settings');
    settingsBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

    settingsBtn.addEventListener('click', () => {
      this._callbacks.settingsOpen.forEach((cb) => cb());
    });

    // Theme toggle (sun / moon)
    const themeBtn = document.createElement('button');
    themeBtn.className = 'sidebar-btn';
    themeBtn.setAttribute('aria-label', 'Toggle theme');
    this._themeBtn = themeBtn;
    this._updateThemeIcon();

    themeBtn.addEventListener('click', () => {
      this._callbacks.themeToggle.forEach((cb) => cb());
      this._updateThemeIcon();
    });

    bottom.appendChild(settingsBtn);
    bottom.appendChild(themeBtn);

    // Assemble sidebar
    sidebar.appendChild(logo);
    sidebar.appendChild(nav);
    sidebar.appendChild(bottom);

    // Content area
    const contentArea = document.createElement('main');
    contentArea.className = 'content-area';

    // Store refs for external access
    this._rsvpBtn = rsvpBtn;
    this._browseBtn = browseBtn;
    this._sidebar = sidebar;
    this.contentArea = contentArea;

    // Mount into #app
    this._appEl.appendChild(sidebar);
    this._appEl.appendChild(contentArea);
  }

  _updateThemeIcon() {
    const isDark = this._theme.get() === 'dark';
    this._themeBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    // Sun icon for dark mode (clicking will switch to light), moon for light mode
    if (isDark) {
      this._themeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    } else {
      this._themeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M17 11.5A7 7 0 118.5 3a5.5 5.5 0 008.5 8.5z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }
  }

  /**
   * Switch the active mode tab.
   * @param {'rsvp'|'browse'} mode
   */
  setMode(mode) {
    this._mode = mode;
    this._rsvpBtn.classList.toggle('active', mode === 'rsvp');
    this._browseBtn.classList.toggle('active', mode === 'browse');
    this._callbacks.modeChange.forEach((cb) => cb(mode));
  }

  /**
   * Replace the content area's children with the given element.
   * @param {HTMLElement} element
   */
  setContent(element) {
    this.contentArea.innerHTML = '';
    this.contentArea.appendChild(element);
  }

  /** @param {(mode: string) => void} callback */
  onModeChange(callback) {
    this._callbacks.modeChange.push(callback);
  }

  /** @param {() => void} callback */
  onUpload(callback) {
    this._callbacks.upload.push(callback);
  }

  /** @param {() => void} callback */
  onThemeToggle(callback) {
    this._callbacks.themeToggle.push(callback);
  }

  /** @param {() => void} callback */
  onSettingsOpen(callback) {
    this._callbacks.settingsOpen.push(callback);
  }
}
