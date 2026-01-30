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
import { join } from 'path';

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
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.BUN_TEST === '1' ||
    (typeof Bun !== 'undefined' && Bun.env.NODE_ENV === 'test');

  if (isTestEnv) {
    const hasExplicitBaseDir = options.baseDir !== undefined || options.paths?.baseDir !== undefined;
    const hasExplicitDefaultOutputDir =
      options.defaultOutputDir !== undefined || options.paths?.defaultOutputDir !== undefined;

    if (paths.dbPath !== ':memory:') {
      throw new Error('In-memory database required in tests. Pass paths: { dbPath: ":memory:" }');
    }

    if (!hasExplicitBaseDir || !hasExplicitDefaultOutputDir) {
      throw new Error('Context isolation required in tests. Provide a temp baseDir and defaultOutputDir.');
    }

    const homeDir = options.homeDir ?? process.env.HOME ?? '';
    if (homeDir) {
      const toolkitBaseDir = join(homeDir, '.multimedia-toolkit');
      const toolkitTestBaseDir = join(homeDir, '.multimedia-toolkit-test');
      const defaultOutputFallback = join(homeDir, 'Music', 'AudioExtracted');

      if (paths.baseDir === toolkitBaseDir || paths.baseDir === toolkitTestBaseDir) {
        throw new Error('Context isolation required in tests. Do not use ~/.multimedia-toolkit paths.');
      }

      if (paths.defaultOutputDir === defaultOutputFallback) {
        throw new Error('Context isolation required in tests. Do not write outputs to ~/Music/AudioExtracted.');
      }
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
  const visualizer = new WaveformVisualizer(60, 10, { clock });

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
