import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { Logger, OutputOrganizer } from './logger';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { AppContext } from '@/app/context';
import type { Clock } from '@/utils/clock';

class MockClock implements Clock {
  constructor(private _now: number) {}
  now(): number { return this._now; }
}

describe('Logger', () => {
  let ctx: AppContext;
  let tempBaseDir: string;
  let tempOutputDir: string;
  const clock = new MockClock(new Date('2023-01-01T12:00:00Z').getTime());

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-logger-'));
    tempOutputDir = join(tempBaseDir, 'output');
    ctx = createAppContext({
      baseDir: tempBaseDir,
      defaultOutputDir: tempOutputDir,
      clock,
      paths: {
        dbPath: ':memory:',
      }
    });
  });

  afterEach(() => {
    ctx.db.close();
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should create log directory', () => {
    const logDir = join(ctx.config.get('defaultOutputDir'), 'logs');
    expect(existsSync(logDir)).toBe(true);
  });

  it('should log to console', () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    
    const logger = new Logger({ config: ctx.config, db: ctx.db, clock: ctx.clock });
    logger.info('test info');
    expect(logSpy).toHaveBeenCalled();
    
    logger.error('test error');
    expect(errorSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should log to file when enabled', () => {
    ctx.config.set('logOutputs', true);
    ctx.config.set('logFormat', 'json');
    
    const logger = new Logger({ config: ctx.config, db: ctx.db, clock: ctx.clock });
    logger.logToFile({
      jobId: 'test-job',
      status: 'completed'
    });

    const logDir = join(ctx.config.get('defaultOutputDir'), 'logs');
    // We need to find the actual file name which is timestamped
    const date = new Date(ctx.clock.now()).toISOString().split('T')[0];
    const logFile = join(logDir, `audio-toolkit-${date}.json`);
    
    expect(existsSync(logFile)).toBe(true);
    const content = JSON.parse(readFileSync(logFile, 'utf-8'));
    expect(content[0].jobId).toBe('test-job');
  });
});

describe('OutputOrganizer', () => {
  let ctx: AppContext;
  let tempBaseDir: string;
  let tempOutputDir: string;
  const clock = new MockClock(new Date('2023-01-01T12:00:00Z').getTime());

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-organizer-'));
    tempOutputDir = join(tempBaseDir, 'output');
    ctx = createAppContext({
      baseDir: tempBaseDir,
      defaultOutputDir: tempOutputDir,
      clock,
      paths: {
        dbPath: ':memory:',
      }
    });
  });

  afterEach(() => {
    ctx.db.close();
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should generate output path', () => {
    ctx.config.set('organizeBy', 'format');
    const organizer = new OutputOrganizer({ config: ctx.config, clock: ctx.clock });
    const outputPath = organizer.getOutputPath('test-file', 'mp3');
    
    expect(outputPath).toContain('test-file');
    expect(outputPath).toContain('.mp3');
    expect(existsSync(join(ctx.config.get('defaultOutputDir'), 'mp3'))).toBe(true);
  });
});
