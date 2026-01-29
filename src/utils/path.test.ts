import { describe, expect, it } from 'bun:test';
import { buildTimestampedName, resolveOrganizedSubDir, sanitizeFileName } from './path';
import { createAppContext } from '@/app/context';
import type { Clock } from './clock';

class MockClock implements Clock {
  constructor(private _now: number) {}
  now(): number { return this._now; }
}

describe('Path Utilities (Refactored)', () => {
  const fixedTime = new Date('2023-01-01T12:00:00Z').getTime();
  const mockClock = new MockClock(fixedTime);
  
  // Create context with mock clock and in-memory DB/temp dir to satisfy safety checks
  const ctx = createAppContext({
    clock: mockClock,
    paths: {
      dbPath: ':memory:',
      baseDir: '/tmp/test-path-utils' 
    },
    baseDir: '/tmp/test-path-utils' // Explicit override for safety check
  });

  describe('sanitizeFileName', () => {
    it('should sanitize unsafe characters', () => {
      expect(sanitizeFileName('file/with|unsafe?chars')).toBe('file_with_unsafe_chars');
    });

    it('should trim whitespace and underscores', () => {
      expect(sanitizeFileName('  file_name  ')).toBe('file_name');
      expect(sanitizeFileName('__file__name__')).toBe('file_name');
    });

    it('should truncate long names', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeFileName(longName, 50).length).toBe(50);
    });
  });

  describe('buildTimestampedName', () => {
    it('should use context clock for timestamp', () => {
      const name = buildTimestampedName(ctx, 'test-file', 'mp4');
      
      // Expected format: test-file_1672574400000.mp4
      expect(name).toBe(`test-file_${fixedTime}.mp4`);
    });

    it('should handle custom options with context', () => {
      const name = buildTimestampedName(ctx, 'My File', 'mkv', {
        tags: ['hd', 'raw']
      });

      expect(name).toBe(`My_File_${fixedTime}_hd_raw.mkv`);
    });
  });

  describe('resolveOrganizedSubDir', () => {
    it('should use context clock for date-based organization', () => {
      const dir = resolveOrganizedSubDir(ctx, {
        autoOrganize: true,
        organizeBy: 'date',
        format: 'mp4'
      });

      // 2023/01/01
      expect(dir).toBe('2023/01/01');
    });

    it('should use context clock for custom organization', () => {
      const dir = resolveOrganizedSubDir(ctx, {
        autoOrganize: true,
        organizeBy: 'custom',
        format: 'mp4',
        source: 'Youtube'
      });

      // 2023-01/Youtube
      expect(dir).toBe('2023-01/Youtube');
    });

    it('should handle source organization', () => {
      const dir = resolveOrganizedSubDir(ctx, {
        autoOrganize: true,
        organizeBy: 'source',
        format: 'mp4',
        source: 'My Source'
      });
      expect(dir).toBe('My_Source');
    });

    it('should fallback to unknown for missing source', () => {
      const dir = resolveOrganizedSubDir(ctx, {
        autoOrganize: true,
        organizeBy: 'source',
        format: 'mp4'
      });
      expect(dir).toBe('unknown');
    });

    it('should return empty string for disabled auto-organize', () => {
        const dir = resolveOrganizedSubDir(ctx, {
            autoOrganize: false,
            organizeBy: 'date',
            format: 'mp4'
        });
        expect(dir).toBe('');
    });
    
    it('should return format for format organization', () => {
        const dir = resolveOrganizedSubDir(ctx, {
            autoOrganize: true,
            organizeBy: 'format',
            format: 'mp3'
        });
        expect(dir).toBe('mp3');
    });

    it('should return empty string for unknown organizeBy strategy', () => {
        const dir = resolveOrganizedSubDir(ctx, {
            autoOrganize: true,
            organizeBy: 'unknown' as any,
            format: 'mp3'
        });
        expect(dir).toBe('');
    });
  });
});
