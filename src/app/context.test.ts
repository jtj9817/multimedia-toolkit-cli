import { describe, expect, test, afterEach } from 'bun:test';
import { existsSync, mkdtempSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createAppContext } from '@/app/context';

describe('createAppContext', () => {
  const tempDirs: string[] = [];

  const createTempDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'mat-test-context-'));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    // Cleanup temp dirs
    tempDirs.forEach(dir => {
      try {
        if (existsSync(dir)) {
          rmdirSync(dir, { recursive: true });
        }
      } catch (e) {
        // ignore
      }
    });
    tempDirs.length = 0;
  });

  test('wires temp paths and in-memory database correctly', () => {
    const baseDir = createTempDir();
    const outputDir = join(baseDir, 'outputs');

    const app = createAppContext({
      baseDir,
      defaultOutputDir: outputDir,
      paths: {
        dbPath: ':memory:'
      }
    });

    expect(app.paths.baseDir).toBe(baseDir);
    expect(app.db.dbPath).toBe(':memory:');
    // Ensure config uses the isolated path
    expect(app.config.get('tempDir')).toBe(join(baseDir, 'temp'));
    
    app.db.close();
  });

  test('THROWS if baseDir is not isolated (homedir) during tests', () => {
    // We want to force tests to be explicit.
    // This test expects createAppContext to throw if we don't provide isolation overrides
    // while running in a test environment.
    expect(() => {
      // We satisfy the DB check to ensure we hit the BaseDir check
      createAppContext({ paths: { dbPath: ':memory:' } });
    }).toThrow(/Context isolation required in tests/);
  });

  test('THROWS if dbPath is not :memory: during tests (unless explicit override allowed)', () => {
    const baseDir = createTempDir();
    expect(() => {
      createAppContext({
        baseDir,
        paths: { dbPath: join(baseDir, 'test.db') }
      });
    }).toThrow(/In-memory database required in tests/);
  });
});