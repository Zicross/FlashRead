// tests/reader/rsvp-engine.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RsvpEngine } from '../../src/reader/rsvp-engine.js';

describe('RsvpEngine', () => {
  let engine;
  const mockData = {
    words: ['Hello', 'world.', 'Another', 'sentence', 'here.'],
    segments: [
      { sentence: 'Hello world.', startIndex: 0, wordCount: 2 },
      { sentence: 'Another sentence here.', startIndex: 2, wordCount: 3 },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new RsvpEngine();
    engine.load(mockData.words, mockData.segments);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at word index 0', () => {
    expect(engine.currentIndex).toBe(0);
    expect(engine.getCurrentWord()).toBe('Hello');
  });

  it('advances words on play', () => {
    const onWord = vi.fn();
    engine.onWord(onWord);
    engine.play(600); // 600 WPM = 100ms per word
    vi.advanceTimersByTime(100);
    expect(onWord).toHaveBeenCalledWith('world.', 1);
  });

  it('pauses', () => {
    const onWord = vi.fn();
    engine.onWord(onWord);
    engine.play(600);
    engine.pause();
    vi.advanceTimersByTime(1000);
    expect(onWord).not.toHaveBeenCalled();
  });

  it('jumps to word index', () => {
    engine.jumpTo(3);
    expect(engine.currentIndex).toBe(3);
    expect(engine.getCurrentWord()).toBe('sentence');
  });

  it('finds current segment', () => {
    engine.jumpTo(3);
    expect(engine.getCurrentSegment()).toEqual(mockData.segments[1]);
  });

  it('navigates to next sentence', () => {
    engine.nextSentence();
    expect(engine.currentIndex).toBe(2);
  });

  it('navigates to previous sentence', () => {
    engine.jumpTo(3);
    engine.prevSentence();
    expect(engine.currentIndex).toBe(0);
  });

  it('reports progress as fraction', () => {
    engine.jumpTo(2);
    expect(engine.getProgress()).toBeCloseTo(2 / 5);
  });

  it('fires onComplete when reaching the end', () => {
    const onComplete = vi.fn();
    engine.onComplete(onComplete);
    engine.jumpTo(4); // last word
    engine.play(600);
    vi.advanceTimersByTime(100);
    expect(onComplete).toHaveBeenCalled();
  });

  it('applies half-bold formatting', () => {
    const result = engine.formatWord('Hello', true);
    expect(result).toBe('<b>He</b>llo');
  });

  it('returns plain word when half-bold is off', () => {
    const result = engine.formatWord('Hello', false);
    expect(result).toBe('Hello');
  });
});
