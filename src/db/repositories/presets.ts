/**
 * Clip preset repository.
 */

import type { Database } from 'bun:sqlite';
import type { ClipPreset } from '@/types';

export class PresetRepository {
  private saveStmt: ReturnType<Database['prepare']>;
  private getByNameStmt: ReturnType<Database['prepare']>;
  private getAllStmt: ReturnType<Database['prepare']>;
  private deleteStmt: ReturnType<Database['prepare']>;
  private getIdStmt: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.saveStmt = db.prepare(`
      INSERT INTO clip_presets (name, source_pattern, clips_json, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        source_pattern = excluded.source_pattern,
        clips_json = excluded.clips_json,
        updated_at = datetime('now')
    `);
    this.getByNameStmt = db.prepare('SELECT * FROM clip_presets WHERE name = ?');
    this.getAllStmt = db.prepare('SELECT * FROM clip_presets ORDER BY name');
    this.deleteStmt = db.prepare('DELETE FROM clip_presets WHERE name = ?');
    this.getIdStmt = db.prepare('SELECT id FROM clip_presets WHERE name = ?');
  }

  savePreset(preset: ClipPreset): number {
    this.saveStmt.run(
      preset.name,
      preset.sourcePattern || null,
      JSON.stringify(preset.clips)
    );

    const result = this.getIdStmt.get(preset.name) as { id: number };
    return result.id;
  }

  getPreset(name: string): ClipPreset | null {
    const row = this.getByNameStmt.get(name) as Record<string, unknown> | null;
    if (!row) return null;

    return {
      id: row.id as number,
      name: row.name as string,
      sourcePattern: (row.source_pattern as string | null) ?? undefined,
      clips: JSON.parse(row.clips_json as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  getAllPresets(): ClipPreset[] {
    const rows = this.getAllStmt.all() as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      sourcePattern: (row.source_pattern as string | null) ?? undefined,
      clips: JSON.parse(row.clips_json as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  }

  deletePreset(name: string): boolean {
    const result = this.deleteStmt.run(name);
    return result.changes > 0;
  }
}
