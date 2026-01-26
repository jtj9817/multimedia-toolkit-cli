/**
 * Command interface and shared context for interactive operations.
 */

import type { CLIInterface } from '@/cli/interface';
import type { MediaDownloader } from '@/media/downloader';
import type { FFmpegWrapper } from '@/media/ffmpeg';
import type { PresetManager } from '@/utils/presets';
import type { WaveformVisualizer } from '@/utils/visualizer';
import type { DatabaseManager } from '@/db/database';
import type { Logger, OutputOrganizer } from '@/utils/logger';
import type { ConfigManager } from '@/config/config';
import type { Clock } from '@/utils/clock';

export type CommandClock = Clock;

export interface CommandContext {
  cli: CLIInterface;
  downloader: MediaDownloader;
  ffmpeg: FFmpegWrapper;
  presets: PresetManager;
  visualizer: WaveformVisualizer;
  db: DatabaseManager;
  logger: Logger;
  organizer: OutputOrganizer;
  config: ConfigManager;
  clock: CommandClock;
}

export interface Command {
  id: string;
  label: string;
  description?: string;
  run(ctx: CommandContext): Promise<void>;
}
