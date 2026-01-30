import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { PresetManager } from './presets';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

describe('PresetManager', () => {
  let ctx: any;
  const tempBaseDir = join(process.cwd(), 'temp-test-presets');

  beforeEach(() => {
    ctx = createAppContext({
      baseDir: tempBaseDir,
      paths: {
        dbPath: ':memory:',
        baseDir: tempBaseDir
      }
    });
  });

  afterEach(() => {
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should save and get presets', () => {
    const manager = new PresetManager(ctx);
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
    const manager = new PresetManager(ctx);
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
    const manager = new PresetManager(ctx);
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
