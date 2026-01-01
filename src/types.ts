/**
 * Type definitions for Multimedia Toolkit
 */

// Supported input formats
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v'] as const;
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'] as const;
export const OUTPUT_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'webm'] as const;
export const VIDEO_OUTPUT_FORMATS = ['webm', 'mp4', 'mkv'] as const;
export const IMAGE_OUTPUT_FORMATS = ['gif', 'webp'] as const;

export type VideoFormat = typeof SUPPORTED_VIDEO_FORMATS[number];
export type AudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];
export type OutputFormat = typeof OUTPUT_FORMATS[number];
export type VideoOutputFormat = typeof VIDEO_OUTPUT_FORMATS[number];
export type ImageOutputFormat = typeof IMAGE_OUTPUT_FORMATS[number];

export type VideoResolution = 'source' | '1080p' | '720p';
export type VideoScalePolicy = 'fit' | 'stretch' | 'crop';
export type VideoQualityMode = 'crf' | 'bitrate';

export interface VideoScaleSettings {
  policy: VideoScalePolicy;
  maxResolution: VideoResolution;
  preserveAspect: boolean;
}

export interface VideoPresetVideoSettings {
  codec: string;
  qualityMode: VideoQualityMode;
  crf?: number;
  bitrate?: string | null;
  pixelFormat?: string;
  scale: VideoScaleSettings;
}

export interface VideoPresetAudioSettings {
  codec: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: 1 | 2 | 6;
  ffmpegArgs?: string[];
}

export interface VideoTranscodePreset {
  label: string;
  container: VideoOutputFormat;
  video: VideoPresetVideoSettings;
  audio: VideoPresetAudioSettings;
  notes?: string[];
}

export type VideoPresetKey = 'any-to-webm' | 'any-to-mp4' | 'any-to-mkv';

// GIF/WebP Conversion Types
export type GifWebpPresetKey =
  // GIF presets
  | 'gif-discord'
  | 'gif-high-quality'
  | 'gif-small-file'
  | 'gif-smooth-loop'
  // WebP presets
  | 'webp-discord'
  | 'webp-high-quality'
  | 'webp-small-file'
  | 'webp-lossless'
  | 'custom';

export interface GifWebpConversionOptions {
  format: ImageOutputFormat;
  fps: number;
  width?: number;          // Output width (height auto-calculated to preserve aspect)
  quality: number;         // 1-100 for WebP, ignored for GIF
  loop: boolean;           // Loop animation
  loopCount: number;       // 0 = infinite, otherwise specific count
  startTime?: string;      // Clip start
  duration?: number;       // Clip duration in seconds
  dither?: 'none' | 'floyd_steinberg' | 'sierra2' | 'bayer';  // GIF dithering
  paletteMode?: 'full' | 'diff';  // GIF palette generation mode
  compression?: number;    // WebP compression method (0-6, higher = slower/smaller)
  lossless?: boolean;      // WebP lossless mode
}

export interface GifWebpPreset {
  key: GifWebpPresetKey;
  label: string;
  description: string;
  format: ImageOutputFormat;
  settings: Partial<GifWebpConversionOptions>;
}

// User-saved custom presets for GIF/WebP
export interface CustomGifWebpPreset {
  id?: number;
  name: string;
  format: ImageOutputFormat;
  fps: number;
  width?: number;
  quality: number;
  loop: boolean;
  loopCount: number;
  dither?: string;
  paletteMode?: string;
  compression?: number;
  lossless?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoTranscodeOptions {
  presetKey?: VideoPresetKey;
  preset?: VideoTranscodePreset;
  resolution?: VideoResolution;
  videoCodec?: string;
  audioCodec?: string;
  qualityMode?: VideoQualityMode;
  crf?: number;
  bitrate?: string;
  audioBitrate?: string;
  preserveMetadata?: boolean;
  dryRun?: boolean;
}

// Quality presets
export interface QualityPreset {
  name: string;
  bitrate: string;
  sampleRate: number;
  channels: 1 | 2;
  description: string;
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  speech: {
    name: 'speech',
    bitrate: '64k',
    sampleRate: 16000,
    channels: 1,
    description: 'Optimized for speech/podcasts'
  },
  music_low: {
    name: 'music_low',
    bitrate: '128k',
    sampleRate: 44100,
    channels: 2,
    description: 'Music - Low quality'
  },
  music_medium: {
    name: 'music_medium',
    bitrate: '192k',
    sampleRate: 44100,
    channels: 2,
    description: 'Music - Medium quality'
  },
  music_high: {
    name: 'music_high',
    bitrate: '320k',
    sampleRate: 48000,
    channels: 2,
    description: 'Music - High quality'
  },
  optimized_webm: {
    name: 'optimized_webm',
    bitrate: '128k',
    sampleRate: 48000,
    channels: 2,
    description: 'Optimized for WebM/Opus output'
  },
  lossless: {
    name: 'lossless',
    bitrate: '0',
    sampleRate: 48000,
    channels: 2,
    description: 'Lossless (FLAC/WAV only)'
  }
};

// Time clip definition
export interface TimeClip {
  startTime: string;  // HH:MM:SS or seconds
  endTime?: string;   // HH:MM:SS or seconds (optional, can use duration instead)
  duration?: number;  // Duration in seconds
  label?: string;     // Optional label for the clip
}

// Preset for frequently used clip segments
export interface ClipPreset {
  id?: number;
  name: string;
  sourcePattern?: string;  // Regex pattern to match source files
  clips: TimeClip[];
  createdAt?: string;
  updatedAt?: string;
}

// Input source types
export type InputSourceType = 'file' | 'url' | 'youtube' | 'stream';

export interface InputSource {
  type: InputSourceType;
  path: string;
  originalUrl?: string;
  metadata?: MediaMetadata;
}

// Media metadata
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  chapters?: Chapter[];
  coverArt?: string;
}

// Chapter information
export interface Chapter {
  id: number;
  title: string;
  startTime: number;
  endTime: number;
}

// Conversion job
export interface ConversionJob {
  id?: number;
  inputPath: string;
  inputType: InputSourceType;
  outputPath: string;
  outputFormat: OutputFormat;
  qualityPreset: string;
  videoPreset?: VideoPresetKey;
  videoResolution?: VideoResolution;
  videoOutputFormat?: VideoOutputFormat;
  clips?: TimeClip[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  error?: string;
  metadata?: MediaMetadata;
  createdAt?: string;
  completedAt?: string;
  commandUsed?: string;
  dryRun?: boolean;
}

// Process history record (for SQLite)
export interface ProcessRecord {
  id?: number;
  jobId: string;
  inputPath: string;
  inputType: string;
  outputPath: string;
  outputFormat: string;
  qualityPreset: string;
  videoPreset?: VideoPresetKey;
  videoResolution?: VideoResolution;
  videoOutputFormat?: VideoOutputFormat;
  clipsJson?: string;
  status: string;
  duration?: number;
  inputSize?: number;
  outputSize?: number;
  metadataJson?: string;
  commandUsed?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// Configuration
export interface AppConfig {
  defaultOutputDir: string;
  defaultQuality: string;
  defaultFormat: OutputFormat;
  defaultVideoFormat: VideoOutputFormat;
  defaultVideoPreset: VideoPresetKey;
  defaultVideoResolution: VideoResolution;
  // GIF/WebP defaults
  defaultGifWebpPreset: GifWebpPresetKey;
  defaultGifFps: number;
  defaultWebpQuality: number;
  autoOrganize: boolean;
  organizeBy: 'date' | 'source' | 'format' | 'custom';
  preserveMetadata: boolean;
  logOutputs: boolean;
  logFormat: 'json' | 'csv';
  ytdlpPath?: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  maxConcurrentJobs: number;
  tempDir: string;
}

// CLI menu options
export interface MenuOption {
  key: string;
  label: string;
  description?: string;
  action: () => Promise<void> | void;
}

// Silence detection result
export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

// Operation result
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Batch operation status
export interface BatchStatus {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
}

// Waveform data for visualization
export interface WaveformData {
  samples: number[];
  duration: number;
  sampleRate: number;
}
