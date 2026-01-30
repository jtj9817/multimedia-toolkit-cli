import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { createConfigManager } from './config';
import { createDatabaseManager } from '@/db/database';
import { resolveAppPaths } from '@/app/paths';
import { join } from 'path';
import { existsSync, rmSync, writeFileSync } from 'fs';

describe('ConfigManager', () => {
  const tempBaseDir = join(process.cwd(), 'temp-test-config');
  let paths: any;
  let db: any;

  beforeEach(() => {
    paths = resolveAppPaths({
      baseDir: tempBaseDir,
      defaultOutputDir: join(tempBaseDir, 'output')
    });
    db = createDatabaseManager({
      dbPath: ':memory:',
      dataDir: tempBaseDir
    });
  });

  afterEach(() => {
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('should load default config when no file exists', () => {
    const config = createConfigManager({ paths, db });
    expect(config.get('defaultFormat')).toBe('mp3');
  });

  it('should load config from file', () => {
    if (!existsSync(paths.configDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(paths.configDir, { recursive: true });
    }
    writeFileSync(paths.configFile, JSON.stringify({ defaultFormat: 'wav' }));

    const config = createConfigManager({ paths, db });
    expect(config.get('defaultFormat')).toBe('wav');
  });

  it('should save config to file and DB', () => {
    const config = createConfigManager({ paths, db });
    config.set('defaultFormat', 'flac');

    // Check file
    const fileContent = JSON.parse(require('fs').readFileSync(paths.configFile, 'utf-8'));
    expect(fileContent.defaultFormat).toBe('flac');

    // Check DB
    const dbValue = db.config.getConfig('defaultFormat');
    expect(dbValue).toBe('flac');
  });

  it('should handle parse errors in config file gracefully', () => {
    if (!existsSync(paths.configDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(paths.configDir, { recursive: true });
    }
    writeFileSync(paths.configFile, 'invalid json');

    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const config = createConfigManager({ paths, db });
    
    expect(config.get('defaultFormat')).toBe('mp3'); // Should fallback to default
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
