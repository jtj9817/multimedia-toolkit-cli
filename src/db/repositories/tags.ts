/**
 * Tags repository for organizing outputs.
 */

import type { Database } from 'bun:sqlite';

export type TagRecord = {
  id: number;
  name: string;
  color: string | null;
};

export class TagsRepository {
  private createStmt: ReturnType<Database['prepare']>;
  private addToProcessStmt: ReturnType<Database['prepare']>;
  private getAllStmt: ReturnType<Database['prepare']>;
  private getIdStmt: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.createStmt = db.prepare(`
      INSERT INTO tags (name, color) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET color = excluded.color
    `);
    this.addToProcessStmt = db.prepare(`
      INSERT OR IGNORE INTO process_tags (process_id, tag_id) VALUES (?, ?)
    `);
    this.getAllStmt = db.prepare('SELECT * FROM tags ORDER BY name');
    this.getIdStmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  }

  createTag(name: string, color?: string): number {
    this.createStmt.run(name, color || null);
    const result = this.getIdStmt.get(name) as { id: number };
    return result.id;
  }

  addTagToProcess(processId: number, tagId: number): void {
    this.addToProcessStmt.run(processId, tagId);
  }

  getAllTags(): TagRecord[] {
    return this.getAllStmt.all() as TagRecord[];
  }
}
