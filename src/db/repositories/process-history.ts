/**
 * Process history repository for SQLite access.
 */

import type { Database } from 'bun:sqlite';
import type { ProcessRecord } from '@/types';

type ProcessStats = {
  total: number;
  completed: number;
  failed: number;
  totalSize: number;
};

export class ProcessHistoryRepository {
  private createStmt: ReturnType<Database['prepare']>;
  private updateStatusStmt: ReturnType<Database['prepare']>;
  private updateOutputStmt: ReturnType<Database['prepare']>;
  private getByJobIdStmt: ReturnType<Database['prepare']>;
  private getRecentStmt: ReturnType<Database['prepare']>;
  private searchStmt: ReturnType<Database['prepare']>;
  private statsStmt: ReturnType<Database['prepare']>;
  private byTagStmt: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.createStmt = db.prepare(`
      INSERT INTO process_history (
        job_id, input_path, input_type, output_path, output_format,
        quality_preset, video_preset, video_resolution, video_output_format,
        clips_json, status, metadata_json, command_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStatusStmt = db.prepare(`
      UPDATE process_history
      SET status = ?, error_message = ?, completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN datetime('now') ELSE completed_at END
      WHERE job_id = ?
    `);
    this.updateOutputStmt = db.prepare(`
      UPDATE process_history
      SET output_size = ?, duration = ?
      WHERE job_id = ?
    `);
    this.getByJobIdStmt = db.prepare('SELECT * FROM process_history WHERE job_id = ?');
    this.getRecentStmt = db.prepare(`
      SELECT * FROM process_history
      ORDER BY created_at DESC
      LIMIT ?
    `);
    this.searchStmt = db.prepare(`
      SELECT * FROM process_history
      WHERE input_path LIKE ? OR output_path LIKE ?
      ORDER BY created_at DESC
    `);
    this.statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
        COALESCE(SUM(output_size), 0) as total_size
      FROM process_history
    `);
    this.byTagStmt = db.prepare(`
      SELECT ph.* FROM process_history ph
      JOIN process_tags pt ON ph.id = pt.process_id
      JOIN tags t ON pt.tag_id = t.id
      WHERE t.name = ?
      ORDER BY ph.created_at DESC
    `);
  }

  createProcess(record: Omit<ProcessRecord, 'id'>): number {
    const result = this.createStmt.run(
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

    return Number(result.lastInsertRowid);
  }

  updateProcessStatus(jobId: string, status: string, error?: string): void {
    this.updateStatusStmt.run(status, error || null, status, jobId);
  }

  updateProcessOutput(jobId: string, outputSize: number, duration: number): void {
    this.updateOutputStmt.run(outputSize, duration, jobId);
  }

  getProcess(jobId: string): ProcessRecord | null {
    const row = this.getByJobIdStmt.get(jobId) as Record<string, unknown> | null;
    return row ? this.mapRowToProcessRecord(row) : null;
  }

  getRecentProcesses(limit: number = 50): ProcessRecord[] {
    const rows = this.getRecentStmt.all(limit) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
  }

  searchProcesses(query: string): ProcessRecord[] {
    const pattern = `%${query}%`;
    const rows = this.searchStmt.all(pattern, pattern) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
  }

  getProcessStats(): ProcessStats {
    const stats = this.statsStmt.get() as { total: number; completed: number; failed: number; total_size: number };

    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      totalSize: stats.total_size || 0
    };
  }

  getProcessesByTag(tagName: string): ProcessRecord[] {
    const rows = this.byTagStmt.all(tagName) as Record<string, unknown>[];
    return rows.map(row => this.mapRowToProcessRecord(row));
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
      videoPreset: (row.video_preset as string | null) ?? undefined,
      videoResolution: (row.video_resolution as string | null) ?? undefined,
      videoOutputFormat: (row.video_output_format as string | null) ?? undefined,
      clipsJson: (row.clips_json as string | null) ?? undefined,
      status: row.status as string,
      duration: (row.duration as number | null) ?? undefined,
      inputSize: (row.input_size as number | null) ?? undefined,
      outputSize: (row.output_size as number | null) ?? undefined,
      metadataJson: (row.metadata_json as string | null) ?? undefined,
      commandUsed: (row.command_used as string | null) ?? undefined,
      errorMessage: (row.error_message as string | null) ?? undefined,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? undefined
    };
  }
}
