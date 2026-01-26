/**
 * Shared history display helper.
 */

import { basename } from 'path';
import type { CLIInterface } from '@/cli/interface';
import type { DatabaseManager } from '@/db/database';
import { formatBytes } from '@/utils/format';

export function showHistory(cli: CLIInterface, db: DatabaseManager): void {
  const records = db.processes.getRecentProcesses(20);

  if (records.length === 0) {
    cli.info('No conversion history yet.');
    return;
  }

  cli.table(
    ['Date', 'Input', 'Format', 'Status'],
    records.map(r => [
      r.createdAt?.split('T')[0] || 'N/A',
      basename(r.inputPath).slice(0, 30),
      r.outputFormat,
      r.status
    ])
  );

  const stats = db.processes.getProcessStats();
  cli.box('Statistics', [
    `Total conversions: ${stats.total}`,
    `Completed: ${stats.completed}`,
    `Failed: ${stats.failed}`,
    `Total output size: ${formatBytes(stats.totalSize)}`
  ]);
}
