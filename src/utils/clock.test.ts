import { describe, expect, it } from 'bun:test';
import { systemClock } from './clock';

describe('clock', () => {
  describe('systemClock', () => {
    it('should return a number representing current time', () => {
      const now = systemClock.now();
      expect(typeof now).toBe('number');
      expect(now).toBeGreaterThan(0);
    });

    it('should return non-decreasing values', () => {
      const time1 = systemClock.now();
      const time2 = systemClock.now();
      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });
});
