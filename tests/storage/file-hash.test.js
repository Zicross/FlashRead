// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { File } from 'buffer';
import { computeFileHash } from '../../src/storage/file-hash.js';

describe('computeFileHash', () => {
  it('returns a hex string', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const hash = await computeFileHash(file);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('returns same hash for same content', async () => {
    const file1 = new File(['hello world'], 'a.txt');
    const file2 = new File(['hello world'], 'b.txt');
    const h1 = await computeFileHash(file1);
    const h2 = await computeFileHash(file2);
    expect(h1).toBe(h2);
  });

  it('returns different hash for different content', async () => {
    const file1 = new File(['hello'], 'a.txt');
    const file2 = new File(['world'], 'b.txt');
    const h1 = await computeFileHash(file1);
    const h2 = await computeFileHash(file2);
    expect(h1).not.toBe(h2);
  });
});
