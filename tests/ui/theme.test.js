// tests/ui/theme.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../../src/ui/theme.js';

describe('ThemeManager', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies dark theme by default', () => {
    const tm = new ThemeManager('dark');
    tm.apply();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles theme', () => {
    const tm = new ThemeManager('dark');
    tm.apply();
    const newTheme = tm.toggle();
    expect(newTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets specific theme', () => {
    const tm = new ThemeManager('dark');
    tm.set('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
