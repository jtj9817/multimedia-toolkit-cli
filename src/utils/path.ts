/**
 * Path helpers for output organization.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface PathContext {
  clock: {
    now(): number;
  };
}

export type OrganizeBy = 'date' | 'source' | 'format' | 'custom';

export function ensureDirectoryExists(ctx: PathContext | null, dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Legacy alias for compatibility, marked deprecated
export function ensureDir(dir: string): void {
  ensureDirectoryExists(null, dir);
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
  ctx: PathContext,
  baseName: string,
  extension: string,
  options: {
    tags?: string[];
    maxLength?: number;
  } = {}
): string {
  const maxLength = options.maxLength ?? 80;
  const sanitizedBase = sanitizeFileName(baseName, maxLength);
  const timestamp = ctx.clock.now();
  const tagSuffix = options.tags && options.tags.length > 0
    ? `_${options.tags.map(tag => sanitizeFileName(tag, maxLength)).join('_')}`
    : '';

  return `${sanitizedBase}_${timestamp}${tagSuffix}.${extension}`;
}

/**
 * Build the user-facing name for a video clip. The requested 26-character
 * threshold applies to the original stem: long stems fall back to the first
 * ten non-whitespace/non-dash/non-underscore characters.
 */
export function buildVideoClipName(
  ctx: PathContext,
  sourceBaseName: string,
  extension: string,
  sequence: number = 1
): string {
  const date = new Date(ctx.clock.now());
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('') + '-' + [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('');
  const suffix = `_CLIP_${timestamp}`;
  const safeBase = sanitizeFileName(sourceBaseName);
  const stem = safeBase.length + suffix.length > 26
    ? sourceBaseName.replace(/[\s_-]/g, '').slice(0, 10) || 'clip'
    : safeBase || 'clip';
  const sequenceSuffix = sequence > 1 ? `_${String(sequence).padStart(2, '0')}` : '';

  return `${stem}${suffix}${sequenceSuffix}.${extension.replace(/^\./, '')}`;
}

export function resolveOrganizedSubDir(
  ctx: PathContext,
  options: {
    autoOrganize: boolean;
    organizeBy: OrganizeBy;
    format: string;
    source?: string;
  }
): string {
  if (!options.autoOrganize) return '';

  const now = new Date(ctx.clock.now());

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
