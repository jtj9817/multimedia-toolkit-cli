/**
 * Logger and Output Organization Module
 * Handles logging, output file organization, and export functionality
 */

import { config } from '../config/config';
import { db } from '../db/database';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { buildTimestampedName, ensureDir, resolveOrganizedSubDir } from '@/utils/path';
import type { ProcessRecord, OutputFormat, VideoOutputFormat, ImageOutputFormat } from '../types';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export class Logger {
  private logDir: string;
  private currentLogFile: string;

  constructor() {
    this.logDir = join(config.get('defaultOutputDir'), 'logs');
    this.ensureLogDir();
    this.currentLogFile = this.getLogFileName();
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const format = config.get('logFormat');
    const date = new Date().toISOString().split('T')[0];
    return join(this.logDir, `audio-toolkit-${date}.${format}`);
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  // ==================== Console Output ====================

  info(message: string): void {
    console.log(`${colors.blue}[INFO]${colors.reset} ${this.timestamp()} - ${message}`);
  }

  success(message: string): void {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${this.timestamp()} - ${message}`);
  }

  warn(message: string): void {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${this.timestamp()} - ${message}`);
  }

  error(message: string): void {
    console.error(`${colors.red}[ERROR]${colors.reset} ${this.timestamp()} - ${message}`);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(`${colors.dim}[DEBUG]${colors.reset} ${this.timestamp()} - ${message}`);
    }
  }

  // Styled output helpers
  header(text: string): void {
    const line = '─'.repeat(text.length + 4);
    console.log(`\n${colors.cyan}┌${line}┐${colors.reset}`);
    console.log(`${colors.cyan}│${colors.reset}  ${colors.bright}${text}${colors.reset}  ${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}└${line}┘${colors.reset}\n`);
  }

  divider(): void {
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
  }

  progress(current: number, total: number, label?: string): void {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    const labelText = label ? ` ${label}` : '';
    process.stdout.write(`\r${colors.cyan}[${bar}]${colors.reset} ${percent}%${labelText}`);

    if (current === total) {
      console.log(); // New line when complete
    }
  }

  // ==================== File Logging ====================

  logToFile(record: Partial<ProcessRecord>): void {
    if (!config.get('logOutputs')) return;

    const format = config.get('logFormat');

    if (format === 'json') {
      this.logToJsonFile(record);
    } else {
      this.logToCsvFile(record);
    }
  }

  private logToJsonFile(record: Partial<ProcessRecord>): void {
    const logFile = this.currentLogFile;

    // Check if file exists and has content
    let existingData: Partial<ProcessRecord>[] = [];
    if (existsSync(logFile)) {
      try {
        const content = require('fs').readFileSync(logFile, 'utf-8');
        existingData = JSON.parse(content);
      } catch {
        existingData = [];
      }
    }

    existingData.push({
      ...record,
      createdAt: record.createdAt || this.timestamp()
    });

    writeFileSync(logFile, JSON.stringify(existingData, null, 2));
  }

  private logToCsvFile(record: Partial<ProcessRecord>): void {
    const logFile = this.currentLogFile;

    const headers = [
      'timestamp', 'jobId', 'inputPath', 'inputType', 'outputPath',
      'outputFormat', 'qualityPreset', 'videoPreset', 'videoResolution', 'videoOutputFormat',
      'status', 'duration', 'inputSize', 'outputSize'
    ];

    // Create header if file doesn't exist
    if (!existsSync(logFile)) {
      writeFileSync(logFile, headers.join(',') + '\n');
    }

    const row = [
      record.createdAt || this.timestamp(),
      record.jobId || '',
      `"${(record.inputPath || '').replace(/"/g, '""')}"`,
      record.inputType || '',
      `"${(record.outputPath || '').replace(/"/g, '""')}"`,
      record.outputFormat || '',
      record.qualityPreset || '',
      record.videoPreset || '',
      record.videoResolution || '',
      record.videoOutputFormat || '',
      record.status || '',
      record.duration || '',
      record.inputSize || '',
      record.outputSize || ''
    ];

    appendFileSync(logFile, row.join(',') + '\n');
  }

  // ==================== Export Functions ====================

  exportProcessHistory(format: 'json' | 'csv', outputPath?: string): string {
    const processes = db.processes.getRecentProcesses(10000);
    const finalPath = outputPath || join(
      this.logDir,
      `export-${Date.now()}.${format}`
    );

    if (format === 'json') {
      writeFileSync(finalPath, JSON.stringify(processes, null, 2));
    } else {
      const headers = [
        'id', 'jobId', 'inputPath', 'inputType', 'outputPath',
        'outputFormat', 'qualityPreset', 'videoPreset', 'videoResolution', 'videoOutputFormat',
        'status', 'duration', 'inputSize', 'outputSize', 'createdAt', 'completedAt'
      ];

      const csvContent = [
        headers.join(','),
        ...processes.map(p => [
          p.id,
          p.jobId,
          `"${(p.inputPath || '').replace(/"/g, '""')}"`,
          p.inputType,
          `"${(p.outputPath || '').replace(/"/g, '""')}"`,
          p.outputFormat,
          p.qualityPreset,
          p.videoPreset || '',
          p.videoResolution || '',
          p.videoOutputFormat || '',
          p.status,
          p.duration || '',
          p.inputSize || '',
          p.outputSize || '',
          p.createdAt,
          p.completedAt || ''
        ].join(','))
      ].join('\n');

      writeFileSync(finalPath, csvContent);
    }

    return finalPath;
  }

  getLogStats(): {
    totalLogs: number;
    todayLogs: number;
    logDir: string;
  } {
    const processes = db.processes.getRecentProcesses(10000);
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = processes.filter(p =>
      p.createdAt?.startsWith(today)
    ).length;

    return {
      totalLogs: processes.length,
      todayLogs,
      logDir: this.logDir
    };
  }
}

export class OutputOrganizer {
  /**
   * Generate organized output path based on config settings
   */
  getOutputPath(
    baseName: string,
    format: OutputFormat | VideoOutputFormat | ImageOutputFormat,
    options: {
      source?: string;
      tags?: string[];
      customDir?: string;
    } = {}
  ): string {
    const { source, tags, customDir } = options;

    if (customDir) {
      ensureDir(customDir);
      return join(customDir, buildTimestampedName(baseName, format, { tags }));
    }

    const baseDir = config.get('defaultOutputDir');
    const subDir = resolveOrganizedSubDir({
      autoOrganize: config.get('autoOrganize'),
      organizeBy: config.get('organizeBy'),
      format,
      source
    });

    const outputDir = join(baseDir, subDir);
    ensureDir(outputDir);

    return join(outputDir, buildTimestampedName(baseName, format, { tags }));
  }

  /**
   * Get the output directory structure
   */
  getDirectoryTree(depth: number = 2): string {
    const baseDir = config.get('defaultOutputDir');

    if (!existsSync(baseDir)) {
      return `Output directory not found: ${baseDir}`;
    }

    return this.buildTree(baseDir, depth, 0);
  }

  private buildTree(dir: string, maxDepth: number, currentDepth: number): string {
    if (currentDepth >= maxDepth) return '';

    const entries = readdirSync(dir, { withFileTypes: true });
    const lines: string[] = [];

    const prefix = '  '.repeat(currentDepth);
    const dirName = basename(dir);

    if (currentDepth === 0) {
      lines.push(`📁 ${dirName}/`);
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        lines.push(`${prefix}├── 📁 ${entry.name}/`);
        const subTree = this.buildTree(join(dir, entry.name), maxDepth, currentDepth + 1);
        if (subTree) lines.push(subTree);
      } else {
        lines.push(`${prefix}├── 📄 ${entry.name}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTemp(olderThanDays: number = 7): Promise<number> {
    const tempDir = config.get('tempDir');

    if (!existsSync(tempDir)) return 0;

    const now = Date.now();
    const maxAge = olderThanDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    const entries = readdirSync(tempDir);

    for (const entry of entries) {
      const filePath = join(tempDir, entry);
      const stats = statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        unlinkSync(filePath);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export const logger = new Logger();
export const organizer = new OutputOrganizer();
