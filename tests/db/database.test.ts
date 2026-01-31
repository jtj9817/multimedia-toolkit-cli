import { afterEach, describe, expect, test } from 'bun:test';
import { createDatabaseManager, type DatabaseManager } from '@/db/database';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DatabaseManager', () => {
  let baseDir: string | undefined;
  let db: DatabaseManager | undefined;

  afterEach(() => {
    db?.close();
    if (baseDir) {
      rmSync(baseDir, { recursive: true, force: true });
    }
    db = undefined;
    baseDir = undefined;
  });

  test('initializes repositories for an in-memory database', () => {
    baseDir = mkdtempSync(join(tmpdir(), 'mat-test-db-'));
    db = createDatabaseManager({ dbPath: ':memory:', dataDir: baseDir });

    expect(db.dbPath).toBe(':memory:');
    expect(db.processes).toBeDefined();
    expect(db.config).toBeDefined();
    expect(db.presets).toBeDefined();
    expect(db.tags).toBeDefined();
    expect(db.interrupted).toBeDefined();
  });

  test('supports config repository round-trip', () => {
    baseDir = mkdtempSync(join(tmpdir(), 'mat-test-db-'));
    db = createDatabaseManager({ dbPath: ':memory:', dataDir: baseDir });

    db.config.setConfig('defaultFormat', 'mp3');
    expect(db.config.getConfig('defaultFormat')).toBe('mp3');
  });

  test('supports basic process history write/read', () => {
    baseDir = mkdtempSync(join(tmpdir(), 'mat-test-db-'));
    db = createDatabaseManager({ dbPath: ':memory:', dataDir: baseDir });

    db.processes.createProcess({
      jobId: 'job-1',
      inputPath: 'in.mp3',
      inputType: 'file',
      outputPath: 'out.mp3',
      outputFormat: 'mp3',
      qualityPreset: 'music_medium',
      status: 'completed',
      createdAt: new Date('2023-01-01T12:00:00Z').toISOString()
    });

    const recent = db.processes.getRecentProcesses(1);
    expect(recent).toHaveLength(1);
    expect(recent[0].jobId).toBe('job-1');
    expect(recent[0].status).toBe('completed');
  });
});

