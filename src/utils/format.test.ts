import { describe, expect, it } from 'bun:test';
import { formatBytes } from './format';

describe('format', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(500)).toBe('500 B');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 2.345)).toBe('2.35 GB'); // Rounded to 2 decimal places
    });
  });
});
