import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { PresetManager } from './presets';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { AppContext } from '@/app/context';

describe('PresetManager', () => {
  let ctx: AppContext;
  let tempBaseDir: string;
  let tempOutputDir: string;

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-presets-'));
    tempOutputDir = join(tempBaseDir, 'output');
    ctx = createAppContext({
      baseDir: tempBaseDir,
      defaultOutputDir: tempOutputDir,
      paths: {
        dbPath: ':memory:'
      }
    });
  });

  afterEach(() => {
    ctx.db.close();
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should save and get presets', () => {
    const manager = new PresetManager({ db: ctx.db });
    const preset = {
      name: 'test-preset',
      clips: [{ startTime: '0:00', duration: 10 }]
    };

    const saveResult = manager.save(preset);
    expect(saveResult.success).toBe(true);

    const getResult = manager.get('test-preset');
    expect(getResult.success).toBe(true);
    expect(getResult.data?.name).toBe('test-preset');
    expect(getResult.data?.clips.length).toBe(1);
  });

  it('should find matching presets', () => {
    const manager = new PresetManager({ db: ctx.db });
    manager.save({
      name: 'match',
      sourcePattern: 'audio',
      clips: [{ startTime: '0:00', duration: 5 }]
    });

    const matches = manager.findMatchingPresets('my-audio-file.mp3');
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('match');

    const noMatches = manager.findMatchingPresets('video.mp4');
    expect(noMatches.length).toBe(0);
  });

  it('should delete presets', () => {
    const manager = new PresetManager({ db: ctx.db });
    manager.save({
      name: 'to-delete',
      clips: [{ startTime: '0:00', duration: 5 }]
    });

    const deleteResult = manager.delete('to-delete');
    expect(deleteResult.success).toBe(true);
    
    const getResult = manager.get('to-delete');
    expect(getResult.success).toBe(false);
  });
});
