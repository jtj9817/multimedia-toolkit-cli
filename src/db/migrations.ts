/**
 * Database migrations for the multimedia toolkit.
 */

import type { Database } from 'bun:sqlite';

type Migration = {
  id: string;
  up: (db: Database) => void;
};

function ensureSchemaMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function getAppliedMigrations(db: Database): Set<string> {
  const rows = db.query('SELECT id FROM schema_migrations').all() as { id: string }[];
  return new Set(rows.map(row => row.id));
}

function ensureColumns(
  db: Database,
  table: string,
  columns: Array<{ name: string; type: string }>
): void {
  const rows = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  const existing = new Set(rows.map(row => row.name));

  for (const column of columns) {
    if (existing.has(column.name)) continue;
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.type}`);
  }
}

const migrations: Migration[] = [
  {
    id: '001_init',
    up(db) {
      db.run(`
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

      db.run(`
        CREATE TABLE IF NOT EXISTS clip_presets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          source_pattern TEXT,
          clips_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS process_tags (
          process_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (process_id, tag_id),
          FOREIGN KEY (process_id) REFERENCES process_history(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS interrupted_operations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id TEXT UNIQUE NOT NULL,
          operation_type TEXT NOT NULL,
          state_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.run('CREATE INDEX IF NOT EXISTS idx_process_status ON process_history(status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_process_created ON process_history(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_process_input ON process_history(input_path)');
    }
  },
  {
    id: '002_process_history_video_columns',
    up(db) {
      ensureColumns(db, 'process_history', [
        { name: 'video_preset', type: 'TEXT' },
        { name: 'video_resolution', type: 'TEXT' },
        { name: 'video_output_format', type: 'TEXT' }
      ]);
    }
  }
];

export function applyMigrations(db: Database): void {
  ensureSchemaMigrations(db);
  const applied = getAppliedMigrations(db);
  const insertStmt = db.prepare('INSERT INTO schema_migrations (id) VALUES (?)');

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    db.run('BEGIN');
    try {
      migration.up(db);
      insertStmt.run(migration.id);
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  }
}
