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
  private db!: Database;
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

    this.db = new Database(this.dbPath);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
    applyMigrations(this.db);

    this.processes = new ProcessHistoryRepository(this.db);
    this.presets = new PresetRepository(this.db);
    this.config = new ConfigRepository(this.db);
    this.tags = new TagsRepository(this.db);
    this.interrupted = new InterruptedOperationsRepository(this.db);
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
    this.db.close();
  }
}

export function createDatabaseManager(options: DatabaseManagerOptions): DatabaseManager {
  return new DatabaseManager(options);
}
