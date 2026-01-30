import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { Logger, OutputOrganizer } from './logger';
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { existsSync, readFileSync, rmSync } from 'fs';

describe('Logger', () => {
  let ctx: any;
  const tempBaseDir = join(process.cwd(), 'temp-test-logger');
  const tempOutputDir = join(tempBaseDir, 'output');

  beforeEach(() => {
    ctx = createAppContext({
      baseDir: tempBaseDir,
      paths: {
        dbPath: ':memory:',
        defaultOutputDir: tempOutputDir
      }
    });
  });

  afterEach(() => {
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
    
    const logger = new Logger(ctx);
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
    
    const logger = new Logger(ctx);
    logger.logToFile({
      jobId: 'test-job',
      status: 'completed'
    });

    const logDir = join(ctx.config.get('defaultOutputDir'), 'logs');
    const files = ctx.db.processes.getRecentProcesses(10); // Not the file, but we check if file exists
    
    // We need to find the actual file name which is timestamped
    const date = new Date(ctx.clock.now()).toISOString().split('T')[0];
    const logFile = join(logDir, `audio-toolkit-${date}.json`);
    
    expect(existsSync(logFile)).toBe(true);
    const content = JSON.parse(readFileSync(logFile, 'utf-8'));
    expect(content[0].jobId).toBe('test-job');
  });
});

describe('OutputOrganizer', () => {
  let ctx: any;
  const tempBaseDir = join(process.cwd(), 'temp-test-organizer');
  const tempOutputDir = join(tempBaseDir, 'output');

  beforeEach(() => {
    ctx = createAppContext({
      baseDir: tempBaseDir,
      paths: {
        dbPath: ':memory:',
        defaultOutputDir: tempOutputDir
      }
    });
  });

  afterEach(() => {
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should generate output path', () => {
    ctx.config.set('organizeBy', 'format');
    const organizer = new OutputOrganizer(ctx);
    const outputPath = organizer.getOutputPath('test-file', 'mp3');
    
    expect(outputPath).toContain('test-file');
    expect(outputPath).toContain('.mp3');
    expect(existsSync(join(ctx.config.get('defaultOutputDir'), 'mp3'))).toBe(true);
  });
});
