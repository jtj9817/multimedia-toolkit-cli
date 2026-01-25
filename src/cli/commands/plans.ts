/**
 * Pure plan builders for interactive commands.
 */

import type {
  GifWebpConversionOptions,
  GifWebpPresetKey,
  ImageOutputFormat,
  OutputFormat
} from '@/types';

export interface ExtractAudioPlan {
  inputPath: string;
  outputPath: string;
  format: OutputFormat;
  quality: string;
  dryRun: boolean;
}

export function buildExtractAudioPlan(params: ExtractAudioPlan): ExtractAudioPlan {
  return { ...params };
}

export interface GifWebpPlan {
  inputPath: string;
  outputPath: string;
  format: ImageOutputFormat;
  presetKey: GifWebpPresetKey | 'custom';
  options: Partial<GifWebpConversionOptions>;
  dryRun: boolean;
}

export function buildGifWebpPlan(params: GifWebpPlan): GifWebpPlan {
  return { ...params };
}
