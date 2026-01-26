/**
 * Path helpers for output organization.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export type OrganizeBy = 'date' | 'source' | 'format' | 'custom';

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function sanitizeFileName(name: string, maxLength: number = 80): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, maxLength);
}

export function buildTimestampedName(
  baseName: string,
  extension: string,
  options: {
    tags?: string[];
    now?: number;
    maxLength?: number;
  } = {}
): string {
  const maxLength = options.maxLength ?? 80;
  const sanitizedBase = sanitizeFileName(baseName, maxLength);
  const timestamp = options.now ?? Date.now();
  const tagSuffix = options.tags && options.tags.length > 0
    ? `_${options.tags.map(tag => sanitizeFileName(tag, maxLength)).join('_')}`
    : '';

  return `${sanitizedBase}_${timestamp}${tagSuffix}.${extension}`;
}

export function resolveOrganizedSubDir(options: {
  autoOrganize: boolean;
  organizeBy: OrganizeBy;
  format: string;
  source?: string;
  now?: Date;
}): string {
  if (!options.autoOrganize) return '';

  const now = options.now ?? new Date();

  switch (options.organizeBy) {
    case 'date':
      return join(
        String(now.getFullYear()),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      );
    case 'source':
      return options.source ? sanitizeFileName(options.source) : 'unknown';
    case 'format':
      return options.format;
    case 'custom':
      return join(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        options.source ? sanitizeFileName(options.source) : 'misc'
      );
    default:
      return '';
  }
}
