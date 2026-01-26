import { resolveAppPaths, type AppPaths, type AppPathsOptions } from '@/app/paths';
import { createConfigManager } from '@/config/config';
import { createDatabaseManager } from '@/db/database';
import { MediaDownloader } from '@/media/downloader';
import { FFmpegWrapper } from '@/media/ffmpeg';
import type { CommandContext } from '@/cli/commands/command';
import { CLIInterface } from '@/cli/interface';
import { PresetManager } from '@/utils/presets';
import { WaveformVisualizer } from '@/utils/visualizer';
import { Logger, OutputOrganizer } from '@/utils/logger';
import { FzfSelector } from '@/utils/fzf';
import { systemClock, type Clock } from '@/utils/clock';

export interface AppContext extends CommandContext {
  paths: AppPaths;
  fzf: FzfSelector;
}

export interface AppContextOptions extends AppPathsOptions {
  paths?: Partial<AppPaths>;
  clock?: Clock;
  fzf?: FzfSelector;
}

export function createAppContext(options: AppContextOptions = {}): AppContext {
  const baseDir = options.baseDir ?? options.paths?.baseDir;
  const defaultOutputDir = options.defaultOutputDir ?? options.paths?.defaultOutputDir;
  const basePaths = resolveAppPaths({
    baseDir,
    defaultOutputDir,
    env: options.env,
    homeDir: options.homeDir
  });
  const paths = { ...basePaths, ...options.paths };
  const clock = options.clock ?? systemClock;

  const db = createDatabaseManager({
    dbPath: paths.dbPath,
    dataDir: paths.baseDir
  });
  const config = createConfigManager({ paths, db });
  const logger = new Logger({ config, db, clock });
  const organizer = new OutputOrganizer({ config, clock });
  const presets = new PresetManager({ db });
  const fzf = options.fzf ?? new FzfSelector();
  const cli = new CLIInterface({ fzf });
  const ffmpeg = new FFmpegWrapper({ config });
  const downloader = new MediaDownloader({ config });
  const visualizer = new WaveformVisualizer();

  return {
    paths,
    clock,
    cli,
    config,
    db,
    downloader,
    ffmpeg,
    presets,
    logger,
    organizer,
    visualizer,
    fzf
  };
}
