import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { createConfigManager } from '@/config/config';
import { createDatabaseManager } from '@/db/database';
import { resolveAppPaths } from '@/app/paths';
import { join } from 'path';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir, homedir } from 'os';
import type { AppPaths } from '@/app/paths';
import type { DatabaseManager } from '@/db/database';

describe('ConfigManager', () => {
  let tempBaseDir: string;
  let paths: AppPaths;
  let db: DatabaseManager;

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-config-'));
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
    db.close();
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
    const fileContent = JSON.parse(readFileSync(paths.configFile, 'utf-8'));
    expect(fileContent.defaultFormat).toBe('flac');

    // Check DB
    const dbValue = db.config.getConfig('defaultFormat');
    expect(dbValue).toBe('flac');
  });

  it('should handle parse errors in config file gracefully', () => {
    if (!existsSync(paths.configDir)) {
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

describe('ConfigManager defaultOutputDir override semantics', () => {
  let tempBaseDir: string;
  let paths: AppPaths;
  let db: DatabaseManager;

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-config-'));
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
    db.close();
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('does not freeze the dynamic default into storage on first run', () => {
    createConfigManager({ paths, db });

    const fileContent = JSON.parse(readFileSync(paths.configFile, 'utf-8'));
    expect(fileContent.defaultOutputDir).toBeUndefined();
    expect(db.config.getConfig('defaultOutputDir')).toBeNull();
  });

  it('drops the legacy ~/Music/AudioExtracted value when loading', () => {
    if (!existsSync(paths.configDir)) {
      mkdirSync(paths.configDir, { recursive: true });
    }
    writeFileSync(paths.configFile, JSON.stringify({
      defaultOutputDir: join(homedir(), 'Music', 'AudioExtracted')
    }));

    const config = createConfigManager({ paths, db });
    expect(config.get('defaultOutputDir')).toBe(paths.defaultOutputDir);
  });

  it('persists an explicit user override', () => {
    const config = createConfigManager({ paths, db });
    config.set('defaultOutputDir', '/tmp/mtk-user-choice');

    const fileContent = JSON.parse(readFileSync(paths.configFile, 'utf-8'));
    expect(fileContent.defaultOutputDir).toBe('/tmp/mtk-user-choice');

    // A deliberate override survives a reload
    const reloaded = createConfigManager({ paths, db });
    expect(reloaded.get('defaultOutputDir')).toBe('/tmp/mtk-user-choice');
  });

  it('resetOutputDir returns to the dynamic default and unpersists the override', () => {
    const config = createConfigManager({ paths, db });
    config.set('defaultOutputDir', '/tmp/mtk-user-choice');
    config.resetOutputDir();

    expect(config.get('defaultOutputDir')).toBe(paths.defaultOutputDir);

    const fileContent = JSON.parse(readFileSync(paths.configFile, 'utf-8'));
    expect(fileContent.defaultOutputDir).toBeUndefined();
  });
});
