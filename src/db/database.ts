/**
 * SQLite Database Manager using Bun's native SQLite support
 * Stores process metadata, presets, and operation history
 */

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { applyMigrations } from '@/db/migrations';
import { ConfigRepository } from '@/db/repositories/config';
import { InterruptedOperationsRepository } from '@/db/repositories/interrupted-operations';
import { PresetRepository } from '@/db/repositories/presets';
import { ProcessHistoryRepository } from '@/db/repositories/process-history';
import { TagsRepository } from '@/db/repositories/tags';

export interface DatabaseManagerOptions {
  dbPath: string;
  dataDir: string;
  skipInit?: boolean;
}

export class DatabaseManager {
  private db: Database | null = null;
  readonly dbPath: string;
  readonly dataDir: string;

  processes!: ProcessHistoryRepository;
  presets!: PresetRepository;
  config!: ConfigRepository;
  tags!: TagsRepository;
  interrupted!: InterruptedOperationsRepository;

  constructor(options: DatabaseManagerOptions) {
    this.dbPath = options.dbPath;
    this.dataDir = options.dataDir;

    if (!options.skipInit) {
      this.init();
    }
  }

  init(): void {
    if (this.db) return;

    if (this.dataDir && this.dbPath !== ':memory:' && !existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    const db = new Database(this.dbPath);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    applyMigrations(db);
    this.db = db;

    this.processes = new ProcessHistoryRepository(db);
    this.presets = new PresetRepository(db);
    this.config = new ConfigRepository(db);
    this.tags = new TagsRepository(db);
    this.interrupted = new InterruptedOperationsRepository(db);
  }

  private ensureInitialized(): void {
    if (!this.db) {
      this.init();
    }
  }

  exportToJson(): string {
    this.ensureInitialized();
    const data = {
      processes: this.processes.getRecentProcesses(1000),
      presets: this.presets.getAllPresets(),
      config: this.config.getAllConfig(),
      tags: this.tags.getAllTags(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

export function createDatabaseManager(options: DatabaseManagerOptions): DatabaseManager {
  return new DatabaseManager(options);
}
