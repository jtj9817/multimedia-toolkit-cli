import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createAppContext } from '@/app/context';

describe('createAppContext', () => {
  test('wires temp paths and in-memory database', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'multimedia-toolkit-'));
    const outputDir = join(baseDir, 'outputs');

    const app = createAppContext({
      baseDir,
      defaultOutputDir: outputDir,
      paths: {
        dbPath: ':memory:'
      }
    });

    expect(app.paths.baseDir).toBe(baseDir);
    expect(app.paths.configFile.startsWith(baseDir)).toBe(true);
    expect(app.db.dbPath).toBe(':memory:');
    expect(app.config.get('tempDir')).toBe(join(baseDir, 'temp'));
    expect(app.config.get('defaultOutputDir')).toBe(outputDir);
    expect(app.logger.getLogStats().logDir).toBe(join(outputDir, 'logs'));
    expect(existsSync(app.paths.configFile)).toBe(true);

    app.db.close();
  });
});
