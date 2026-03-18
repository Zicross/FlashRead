// tests/reader/sync-controller.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateWordTimings,
  SyncController,
} from '../../src/reader/sync-controller.js';

describe('calculateWordTimings', () => {
  it('distributes duration across words weighted by character length', () => {
    const words = ['Hi', 'there', 'world'];
    const durationMs = 1000;
    const timings = calculateWordTimings(words, durationMs);
    expect(timings).toHaveLength(3);
    const sum = timings.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(durationMs, 0);
    expect(timings[1]).toBeGreaterThan(timings[0]); // 'there' > 'Hi'
  });

  it('handles single word', () => {
    const timings = calculateWordTimings(['Hello'], 500);
    expect(timings).toEqual([500]);
  });
});

describe('SyncController', () => {
  let engine, tts, controller;

  beforeEach(() => {
    engine = {
      words: ['Hello', 'world.', 'Next', 'sentence.'],
      currentIndex: 0,
      play: vi.fn(),
      pause: vi.fn(),
      jumpTo: vi.fn((i) => { engine.currentIndex = i; }),
      getCurrentSegment: vi.fn(),
      nextSentence: vi.fn(() => { engine.currentIndex = engine.words.length; }),
    };
    tts = {
      generate: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
    };
    controller = new SyncController(engine, tts);
  });

  it('delegates to engine.play in RSVP-only mode (voice off)', async () => {
    controller.setVoiceEnabled(false);
    await controller.play(600);
    expect(engine.play).toHaveBeenCalledWith(600);
    expect(tts.generate).not.toHaveBeenCalled();
  });

  it('calls generate then play per segment in voice-led mode', async () => {
    controller.setVoiceEnabled(true);
    const mockBuffer = { duration: 0.5 };
    tts.generate.mockResolvedValue(mockBuffer);
    tts.play.mockResolvedValue(undefined);
    engine.getCurrentSegment
      .mockReturnValueOnce({ sentence: 'Hello world.', startIndex: 0, wordCount: 2 })
      .mockReturnValueOnce(null);

    await controller.play(600);

    expect(tts.generate).toHaveBeenCalledWith('Hello world.');
    expect(tts.play).toHaveBeenCalledWith(mockBuffer);
    expect(engine.jumpTo).toHaveBeenCalled();
  });

  it('pause cancels playback and stops TTS', () => {
    controller.playing = true;
    controller.pause();
    expect(controller.playing).toBe(false);
    expect(engine.pause).toHaveBeenCalled();
    expect(tts.stop).toHaveBeenCalled();
  });
});
