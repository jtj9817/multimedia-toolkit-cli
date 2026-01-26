/**
 * Config repository for persisting key/value settings.
 */

import type { Database } from 'bun:sqlite';

export class ConfigRepository {
  private setStmt: ReturnType<Database['prepare']>;
  private getStmt: ReturnType<Database['prepare']>;
  private getAllStmt: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.setStmt = db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `);
    this.getStmt = db.prepare('SELECT value FROM config WHERE key = ?');
    this.getAllStmt = db.prepare('SELECT key, value FROM config');
  }

  setConfig(key: string, value: string): void {
    this.setStmt.run(key, value);
  }

  getConfig(key: string): string | null {
    const row = this.getStmt.get(key) as { value: string } | null;
    return row ? row.value : null;
  }

  getAllConfig(): Record<string, string> {
    const rows = this.getAllStmt.all() as { key: string; value: string }[];
    const config: Record<string, string> = {};

    for (const row of rows) {
      config[row.key] = row.value;
    }

    return config;
  }
}
