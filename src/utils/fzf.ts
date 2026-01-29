/**
 * FZF Integration Module
 * Provides fuzzy file selection using fzf for enhanced file browsing
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import type { OperationResult } from '@/types';
import { BunProcessRunner, type ProcessRunner } from '@/utils/process-runner';

export interface FzfOptions {
  /**
   * Starting directory for file search
   */
  directory?: string;

  /**
   * Allow multiple file selection
   */
  multi?: boolean;

  /**
   * File extensions to filter (e.g., ['mp4', 'mkv', 'mp3'])
   */
  extensions?: string[];

  /**
   * Preview command for fzf
   */
  preview?: boolean;

  /**
   * Custom prompt message
   */
  prompt?: string;

  /**
   * Show hidden files
   */
  showHidden?: boolean;

  /**
   * Search depth limit
   */
  maxDepth?: number;
}

export type FzfShellOptions = Required<Omit<FzfOptions, 'directory'>> & {
  directory: string;
};

/**
 * Escape a shell argument for safe single-quoting
 */
function escapeForShell(arg: string): string {
  return `'${arg.replace(/'/g, `'