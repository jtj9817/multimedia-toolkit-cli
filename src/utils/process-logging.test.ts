import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { logAudioProcess, logVideoProcess, logGifWebpProcess } from './process-logging';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

describe('process-logging', () => {
  let ctx: any;
  const tempBaseDir = join(process.cwd(), 'temp-test-process-logging');

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

  it('should log audio process to DB and file', () => {
    const dbSpy = spyOn(ctx.db.processes, 'createProcess');
    const loggerSpy = spyOn(ctx.logger, 'logToFile');

    logAudioProcess(ctx, {
      jobId: 'audio-job',
      inputPath: 'test.mp3',
      outputPath: 'out.mp3',
      format: 'mp3',
      quality: 'high',
      status: 'completed'
    });

    expect(dbSpy).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalled();
    
    const dbCall = dbSpy.mock.calls[0][0];
    expect(dbCall.jobId).toBe('audio-job');
    expect(dbCall.outputFormat).toBe('mp3');
  });

  it('should log video process to DB and file', () => {
    const dbSpy = spyOn(ctx.db.processes, 'createProcess');
    const loggerSpy = spyOn(ctx.logger, 'logToFile');

    logVideoProcess(ctx, {
      jobId: 'video-job',
      inputPath: 'test.mp4',
      outputPath: 'out.mp4',
      format: 'mp4',
      presetKey: 'any-to-mp4',
      resolution: '1080p',
      status: 'completed'
    });

    expect(dbSpy).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalled();
    
    const dbCall = dbSpy.mock.calls[0][0];
    expect(dbCall.jobId).toBe('video-job');
    expect(dbCall.videoPreset).toBe('any-to-mp4');
  });

  it('should log GIF/WebP process to DB and file', () => {
    const dbSpy = spyOn(ctx.db.processes, 'createProcess');
    const loggerSpy = spyOn(ctx.logger, 'logToFile');

    logGifWebpProcess(ctx, {
      jobId: 'image-job',
      inputPath: 'test.mp4',
      outputPath: 'out.gif',
      format: 'gif',
      presetKey: 'gif-discord',
      status: 'completed'
    });

    expect(dbSpy).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalled();
    
    const dbCall = dbSpy.mock.calls[0][0];
    expect(dbCall.jobId).toBe('image-job');
    expect(dbCall.outputFormat).toBe('gif');
  });
});
