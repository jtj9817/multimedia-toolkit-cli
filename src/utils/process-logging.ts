/**
 * Shared process logging helpers for db + log file output.
 */

import type { DatabaseManager } from '@/db/database';
import type { Logger } from '@/utils/logger';
import type { Clock } from '@/utils/clock';
import type {
  GifWebpPresetKey,
  ImageOutputFormat,
  OutputFormat,
  VideoOutputFormat,
  VideoPresetKey,
  VideoResolution
} from '@/types';

export type LogDeps = {
  db: DatabaseManager;
  logger: Logger;
  clock: Clock;
};

function getTimestamp(clock: Clock): string {
  return new Date(clock.now()).toISOString();
}

function inferInputType(inputPath: string): 'url' | 'file' {
  try {
    const url = new URL(inputPath);
    return ['http:', 'https:'].includes(url.protocol) ? 'url' : 'file';
  } catch {
    return 'file';
  }
}

export function logAudioProcess(
  deps: LogDeps,
  record: {
    jobId: string;
    inputPath: string;
    outputPath: string;
    format: OutputFormat;
    quality: string;
    status: string;
  }
): void {
  const createdAt = getTimestamp(deps.clock);
  const inputType = inferInputType(record.inputPath);

  deps.db.processes.createProcess({
    jobId: record.jobId,
    inputPath: record.inputPath,
    inputType,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.quality,
    status: record.status,
    createdAt
  });

  deps.logger.logToFile({
    jobId: record.jobId,
    inputPath: record.inputPath,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.quality,
    status: record.status,
    createdAt
  });
}

export function logVideoProcess(
  deps: LogDeps,
  record: {
    jobId: string;
    inputPath: string;
    outputPath: string;
    format: VideoOutputFormat;
    presetKey: VideoPresetKey;
    resolution: VideoResolution;
    status: string;
  }
): void {
  const createdAt = getTimestamp(deps.clock);
  const inputType = inferInputType(record.inputPath);

  deps.db.processes.createProcess({
    jobId: record.jobId,
    inputPath: record.inputPath,
    inputType,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.presetKey,
    videoPreset: record.presetKey,
    videoResolution: record.resolution,
    videoOutputFormat: record.format,
    status: record.status,
    createdAt
  });

  deps.logger.logToFile({
    jobId: record.jobId,
    inputPath: record.inputPath,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.presetKey,
    videoPreset: record.presetKey,
    videoResolution: record.resolution,
    videoOutputFormat: record.format,
    status: record.status,
    createdAt
  });
}

export function logGifWebpProcess(
  deps: LogDeps,
  record: {
    jobId: string;
    inputPath: string;
    outputPath: string;
    format: ImageOutputFormat;
    presetKey: GifWebpPresetKey | 'custom';
    status: string;
  }
): void {
  const createdAt = getTimestamp(deps.clock);
  const inputType = inferInputType(record.inputPath);

  deps.db.processes.createProcess({
    jobId: record.jobId,
    inputPath: record.inputPath,
    inputType,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.presetKey,
    status: record.status,
    createdAt
  });

  deps.logger.logToFile({
    jobId: record.jobId,
    inputPath: record.inputPath,
    outputPath: record.outputPath,
    outputFormat: record.format,
    qualityPreset: record.presetKey,
    status: record.status,
    createdAt
  });
}
