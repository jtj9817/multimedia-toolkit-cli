/**
 * Interrupted operations repository.
 */

import type { Database } from 'bun:sqlite';

export type InterruptedOperation = {
  jobId: string;
  operationType: string;
  state: object;
  createdAt: string;
};

export class InterruptedOperationsRepository {
  private saveStmt: ReturnType<Database['prepare']>;
  private getAllStmt: ReturnType<Database['prepare']>;
  private clearStmt: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.saveStmt = db.prepare(`
      INSERT INTO interrupted_operations (job_id, operation_type, state_json)
      VALUES (?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        state_json = excluded.state_json
    `);
    this.getAllStmt = db.prepare(`
      SELECT * FROM interrupted_operations ORDER BY created_at DESC
    `);
    this.clearStmt = db.prepare('DELETE FROM interrupted_operations WHERE job_id = ?');
  }

  saveInterruptedOperation(jobId: string, operationType: string, state: object): void {
    this.saveStmt.run(jobId, operationType, JSON.stringify(state));
  }

  getInterruptedOperations(): InterruptedOperation[] {
    const rows = this.getAllStmt.all() as { job_id: string; operation_type: string; state_json: string; created_at: string }[];

    return rows.map(row => ({
      jobId: row.job_id,
      operationType: row.operation_type,
      state: JSON.parse(row.state_json),
      createdAt: row.created_at
    }));
  }

  clearInterruptedOperation(jobId: string): void {
    this.clearStmt.run(jobId);
  }
}
