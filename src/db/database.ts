/**
 * SQLite Database Manager using Bun's native SQLite support
 * Stores process metadata, presets, and operation history
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { applyMigrations } from '@/db/migrations';
import { ConfigRepository } from '@/db/repositories/config';
import { InterruptedOperationsRepository } from '@/db/repositories/interrupted-operations';
import { PresetRepository } from '@/db/repositories/presets';
import { ProcessHistoryRepository } from '@/db/repositories/process-history';
import { TagsRepository } from '@/db/repositories/tags';

const DATA_DIR = join(homedir(), '.multimedia-toolkit');
const DB_PATH = join(DATA_DIR, 'toolkit.db');

export class DatabaseManager {
  private db: Database;
  private static instance: DatabaseManager | null = null;

  readonly processes: ProcessHistoryRepository;
  readonly presets: PresetRepository;
  readonly config: ConfigRepository;
  readonly tags: TagsRepository;
  readonly interrupted: InterruptedOperationsRepository;

  private constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
    applyMigrations(this.db);

    this.processes = new ProcessHistoryRepository(this.db);
    this.presets = new PresetRepository(this.db);
    this.config = new ConfigRepository(this.db);
    this.tags = new TagsRepository(this.db);
    this.interrupted = new InterruptedOperationsRepository(this.db);
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  exportToJson(): string {
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
    DatabaseManager.instance = null;
  }
}

export const db = DatabaseManager.getInstance();
