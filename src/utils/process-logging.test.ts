import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { logAudioProcess, logVideoProcess, logGifWebpProcess } from './process-logging';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { AppContext } from '@/app/context';

describe('process-logging', () => {
  let ctx: AppContext;
  let tempBaseDir: string;
  let tempOutputDir: string;

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-process-logging-'));
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

  it('should log audio process to DB and file', () => {
    const dbSpy = spyOn(ctx.db.processes, 'createProcess');
    const loggerSpy = spyOn(ctx.logger, 'logToFile').mockImplementation(() => {});

    logAudioProcess({ db: ctx.db, logger: ctx.logger, clock: ctx.clock }, {
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
    const loggerSpy = spyOn(ctx.logger, 'logToFile').mockImplementation(() => {});

    logVideoProcess({ db: ctx.db, logger: ctx.logger, clock: ctx.clock }, {
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
    const loggerSpy = spyOn(ctx.logger, 'logToFile').mockImplementation(() => {});

    logGifWebpProcess({ db: ctx.db, logger: ctx.logger, clock: ctx.clock }, {
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
