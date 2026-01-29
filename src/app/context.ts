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
import { BunProcessRunner, type ProcessRunner } from '@/utils/process-runner';

export interface AppContext extends CommandContext {
  paths: AppPaths;
  fzf: FzfSelector;
  processRunner: ProcessRunner;
}

export interface AppContextOptions extends AppPathsOptions {
  paths?: Partial<AppPaths>;
  clock?: Clock;
  fzf?: FzfSelector;
  processRunner?: ProcessRunner;
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

  // SAFETY CHECK: Test Isolation
  // We strictly enforce isolation to prevent tests from touching the user's real data
  if (process.env.NODE_ENV === 'test' || (typeof Bun !== 'undefined' && Bun.env.NODE_ENV === 'test')) {
    const isMemoryDb = paths.dbPath === ':memory:';
    
    // Check if baseDir falls back to the default home directory
    // We assume that if the user explicitly provided a baseDir in options, they know what they are doing
    // BUT for tests we really want temp dirs.
    // The safest check is: did we fall back to home-based paths without an explicit override?
    const homeDir = options.homeDir || process.env.HOME || '';
    const isHomeBased = paths.baseDir.startsWith(homeDir) && homeDir !== '';
    
    // We consider it "unsafe" if it's home-based AND the user didn't explicitely provide it in options
    // Actually, even if they provided it, if it's HOME, it's bad for tests.
    // So we just check if it matches the home path.
    // However, we need to allow standard usage if someone really wants to test against real files (manual tests).
    // But `bun test` should be isolated.
    
    // Refined check: If baseDir is effectively the default `~/.multimedia-toolkit`
    if (!isMemoryDb) {
       throw new Error('In-memory database required in tests. Pass paths: { dbPath: ":memory:" }');
    }

    if (isHomeBased && !options.baseDir) {
       throw new Error('Context isolation required in tests. Provide a temp baseDir.');
    }
  }

  const clock = options.clock ?? systemClock;
  const processRunner = options.processRunner ?? new BunProcessRunner();

  const db = createDatabaseManager({
    dbPath: paths.dbPath,
    dataDir: paths.baseDir
  });
  const config = createConfigManager({ paths, db });
  const logger = new Logger({ config, db, clock });
  const organizer = new OutputOrganizer({ config, clock });
  const presets = new PresetManager({ db });
  const fzf = options.fzf ?? new FzfSelector(processRunner);
  const cli = new CLIInterface({ fzf });
  const ffmpeg = new FFmpegWrapper({ config, processRunner });
  const downloader = new MediaDownloader({ config, processRunner });
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
    fzf,
    processRunner
  };
}
