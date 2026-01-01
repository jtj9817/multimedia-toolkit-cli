/**
 * SQLite Database Manager using Bun's native SQLite support
 * Stores process metadata, presets, and operation history
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import type { ProcessRecord, ClipPreset, AppConfig } from '../types';

const DATA_DIR = join(homedir(), '.multimedia-toolkit');
const DB_PATH = join(DATA_DIR, 'toolkit.db');

export class DatabaseManager {
  private db: Database;
  private static instance: DatabaseManager | null = null;

  private constructor() {
    // Ensure data directory exists
    const fs = require('fs');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
    this.initializeTables();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeTables(): void {
    // Process history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS process_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        input_path TEXT NOT NULL,
        input_type TEXT NOT NULL,
        output_path TEXT NOT NULL,
        output_format TEXT NOT NULL,
        quality_preset TEXT NOT NULL,
        video_preset TEXT,
        video_resolution TEXT,
        video_output_format TEXT,
        clips_json TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        duration REAL,
        input_size INTEGER,
        output_size INTEGER,
        metadata_json TEXT,
        command_used TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        tags TEXT
      )
    `);

    // Clip presets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clip_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        source_pattern TEXT,
        clips_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Configuration table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Tags table for organizing outputs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Process-tags junction table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS process_tags (
        process_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (process_id, tag_id),
        FOREIGN KEY (process_id) REFERENCES process_history(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Interrupted operations table (for resume functionality)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS interrupted_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        operation_type TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create indexes for common queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_process_status ON process_history(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_process_created ON process_history(created_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_process_input ON process_history(input_path)');

    this.ensureProcessHistoryColumns();
  }

  private ensureProcessHistoryColumns(): void {
    const columns = [
      { name: 'video_preset', type: 'TEXT' },
      { name: 'video_resolution', type: 'TEXT' },
      { name: 'video_output_format', type: 'TEXT' }
    ];

    for (const column of columns) {
      try {
        this.db.run(`ALTER TABLE process_history ADD COLUMN ${column.name} ${column.type}`);
      } catch {
        // Column already exists or cannot be added; ignore.
      }
    }
  }

  // ==================== Process History ====================

  createProcess(record: Omit<ProcessRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO process_history (
        job_id, input_path, input_type, output_path, output_format,
        quality_preset, video_preset, video_resolution, video_output_format,
        clips_json, status, metadata_json, command_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.jobId,
      record.inputPath,
      record.inputType,
      record.outputPath,
      record.outputFormat,
      record.qualityPreset,
      record.videoPreset || null,
      record.videoResolution || null,
      record.videoOutputFormat || null,
      record.clipsJson || null,
      record.status,
      record.metadataJson || null,
      record.commandUsed || null,
      record.createdAt
    );

    return this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
  }

  updateProcessStatus(jobId: string, status: string, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE process_history
      SET status = ?, error_message = ?, completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN datetime('now') ELSE completed_at END
      WHERE job_id = ?
    `);
    stmt.run(status, error || null, status, jobId);
  }

  updateProcessOutput(jobId: string, outputSize: number, duration: number): void {
    const stmt = this.db.prepare(`
      UPDATE process_history
      SET output_size = ?, duration = ?
      WHERE job_id = ?
    `);
    stmt.run(outputSize, duration, jobId);
  }

  getProcess(jobId: string): ProcessRecord | null {
    const stmt = this.db.prepare('SELECT * FROM process_history WHERE job_id = ?');
    const row = stmt.get(jobId) as Record<string, unknown> | null;
    return row ? this.mapRowToProcessRecord(row) : null;
  }

  getRecentProcesses(limit: number = 50): ProcessRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM process_history
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
  }

  searchProcesses(query: string): ProcessRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM process_history
      WHERE input_path LIKE ? OR output_path LIKE ?
      ORDER BY created_at DESC
    `);
    const pattern = `%${query}%`;
    const rows = stmt.all(pattern, pattern) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
  }

  getProcessStats(): { total: number; completed: number; failed: number; totalSize: number } {
    const stats = this.db.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
        COALESCE(SUM(output_size), 0) as total_size
      FROM process_history
    `).get() as { total: number; completed: number; failed: number; total_size: number };

    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      totalSize: stats.total_size || 0
    };
  }

  private mapRowToProcessRecord(row: Record<string, unknown>): ProcessRecord {
    return {
      id: row.id as number,
      jobId: row.job_id as string,
      inputPath: row.input_path as string,
      inputType: row.input_type as string,
      outputPath: row.output_path as string,
      outputFormat: row.output_format as string,
      qualityPreset: row.quality_preset as string,
      videoPreset: row.video_preset as string | undefined,
      videoResolution: row.video_resolution as string | undefined,
      videoOutputFormat: row.video_output_format as string | undefined,
      clipsJson: row.clips_json as string | undefined,
      status: row.status as string,
      duration: row.duration as number | undefined,
      inputSize: row.input_size as number | undefined,
      outputSize: row.output_size as number | undefined,
      metadataJson: row.metadata_json as string | undefined,
      commandUsed: row.command_used as string | undefined,
      errorMessage: row.error_message as string | undefined,
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | undefined
    };
  }

  // ==================== Clip Presets ====================

  savePreset(preset: ClipPreset): number {
    const stmt = this.db.prepare(`
      INSERT INTO clip_presets (name, source_pattern, clips_json, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        source_pattern = excluded.source_pattern,
        clips_json = excluded.clips_json,
        updated_at = datetime('now')
    `);

    stmt.run(preset.name, preset.sourcePattern || null, JSON.stringify(preset.clips));

    const result = this.db.query('SELECT id FROM clip_presets WHERE name = ?').get(preset.name) as { id: number };
    return result.id;
  }

  getPreset(name: string): ClipPreset | null {
    const stmt = this.db.prepare('SELECT * FROM clip_presets WHERE name = ?');
    const row = stmt.get(name) as Record<string, unknown> | null;

    if (!row) return null;

    return {
      id: row.id as number,
      name: row.name as string,
      sourcePattern: row.source_pattern as string | undefined,
      clips: JSON.parse(row.clips_json as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  getAllPresets(): ClipPreset[] {
    const rows = this.db.query('SELECT * FROM clip_presets ORDER BY name').all() as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      sourcePattern: row.source_pattern as string | undefined,
      clips: JSON.parse(row.clips_json as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  }

  deletePreset(name: string): boolean {
    const stmt = this.db.prepare('DELETE FROM clip_presets WHERE name = ?');
    const result = stmt.run(name);
    return result.changes > 0;
  }

  // ==================== Configuration ====================

  setConfig(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `);
    stmt.run(key, value);
  }

  getConfig(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | null;
    return row ? row.value : null;
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.query('SELECT key, value FROM config').all() as { key: string; value: string }[];
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  }

  // ==================== Tags ====================

  createTag(name: string, color?: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO tags (name, color) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET color = excluded.color
    `);
    stmt.run(name, color || null);

    const result = this.db.query('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
    return result.id;
  }

  addTagToProcess(processId: number, tagId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO process_tags (process_id, tag_id) VALUES (?, ?)
    `);
    stmt.run(processId, tagId);
  }

  getProcessesByTag(tagName: string): ProcessRecord[] {
    const stmt = this.db.prepare(`
      SELECT ph.* FROM process_history ph
      JOIN process_tags pt ON ph.id = pt.process_id
      JOIN tags t ON pt.tag_id = t.id
      WHERE t.name = ?
      ORDER BY ph.created_at DESC
    `);
    const rows = stmt.all(tagName) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
  }

  getAllTags(): { id: number; name: string; color: string | null }[] {
    return this.db.query('SELECT * FROM tags ORDER BY name').all() as { id: number; name: string; color: string | null }[];
  }

  // ==================== Interrupted Operations ====================

  saveInterruptedOperation(jobId: string, operationType: string, state: object): void {
    const stmt = this.db.prepare(`
      INSERT INTO interrupted_operations (job_id, operation_type, state_json)
      VALUES (?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        state_json = excluded.state_json
    `);
    stmt.run(jobId, operationType, JSON.stringify(state));
  }

  getInterruptedOperations(): { jobId: string; operationType: string; state: object; createdAt: string }[] {
    const rows = this.db.query(`
      SELECT * FROM interrupted_operations ORDER BY created_at DESC
    `).all() as { job_id: string; operation_type: string; state_json: string; created_at: string }[];

    return rows.map(row => ({
      jobId: row.job_id,
      operationType: row.operation_type,
      state: JSON.parse(row.state_json),
      createdAt: row.created_at
    }));
  }

  clearInterruptedOperation(jobId: string): void {
    const stmt = this.db.prepare('DELETE FROM interrupted_operations WHERE job_id = ?');
    stmt.run(jobId);
  }

  // ==================== Export/Import ====================

  exportToJson(): string {
    const data = {
      processes: this.getRecentProcesses(1000),
      presets: this.getAllPresets(),
      config: this.getAllConfig(),
      tags: this.getAllTags(),
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
