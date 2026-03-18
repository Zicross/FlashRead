// src/ui/theme.js
export class ThemeManager {
  constructor(initialTheme = 'dark') {
    this.theme = initialTheme;
  }

  apply() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.apply();
    return this.theme;
  }

  set(theme) {
    this.theme = theme;
    this.apply();
  }

  get() {
    return this.theme;
  }
}
