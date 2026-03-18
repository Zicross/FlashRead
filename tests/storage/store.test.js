import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../../src/storage/store.js';

describe('Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('settings', () => {
    it('returns defaults when nothing saved', () => {
      const store = new Store();
      const settings = store.getSettings();
      expect(settings.wpm).toBe(600);
      expect(settings.theme).toBe('dark');
      expect(settings.halfBold).toBe(false);
    });

    it('persists settings changes', () => {
      const store = new Store();
      store.updateSettings({ wpm: 800 });
      const settings = store.getSettings();
      expect(settings.wpm).toBe(800);
      expect(settings.theme).toBe('dark');
    });

    it('survives re-instantiation', () => {
      const store1 = new Store();
      store1.updateSettings({ wpm: 900 });
      const store2 = new Store();
      expect(store2.getSettings().wpm).toBe(900);
    });
  });

  describe('lastRead', () => {
    it('returns null when nothing saved', () => {
      const store = new Store();
      expect(store.getLastRead()).toBeNull();
    });

    it('saves and retrieves reading position', () => {
      const store = new Store();
      store.saveLastRead({
        fileName: 'test.pdf',
        fileHash: 'abc123',
        wordIndex: 42,
        timestamp: Date.now(),
      });
      const last = store.getLastRead();
      expect(last.fileName).toBe('test.pdf');
      expect(last.wordIndex).toBe(42);
    });

    it('clears reading position', () => {
      const store = new Store();
      store.saveLastRead({
        fileName: 'test.pdf',
        fileHash: 'abc',
        wordIndex: 10,
        timestamp: Date.now(),
      });
      store.clearLastRead();
      expect(store.getLastRead()).toBeNull();
    });
  });
});
