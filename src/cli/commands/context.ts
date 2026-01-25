/**
 * Default command context using the shared singletons.
 */

import { cli } from '@/cli/interface';
import { config } from '@/config/config';
import { db } from '@/db/database';
import { downloader } from '@/media/downloader';
import { ffmpeg } from '@/media/ffmpeg';
import { presets } from '@/utils/presets';
import { logger, organizer } from '@/utils/logger';
import { visualizer } from '@/utils/visualizer';
import type { CommandContext } from '@/cli/commands/command';

export function createCommandContext(): CommandContext {
  return {
    cli,
    config,
    db,
    downloader,
    ffmpeg,
    presets,
    logger,
    organizer,
    visualizer,
    clock: {
      now: () => Date.now()
    }
  };
}
