import { homedir } from 'os';
import { join } from 'path';

export interface AppPaths {
  baseDir: string;
  configDir: string;
  configFile: string;
  dbPath: string;
  tempDir: string;
  defaultOutputDir: string;
}

export interface AppPathsOptions {
  baseDir?: string;
  defaultOutputDir?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

export function resolveAppPaths(options: AppPathsOptions = {}): AppPaths {
  const env = options.env ?? process.env;
  
  // If baseDir is provided, use it.
  // Otherwise, check environment variable.
  // In test environments, we should really be providing a baseDir.
  let baseDir = options.baseDir ?? env.MULTIMEDIA_TOOLKIT_HOME;
  
  if (!baseDir) {
    if (env.NODE_ENV === 'test' || process.env.BUN_TEST) {
      // In tests, if no baseDir is provided, we should probably throw or use a safe temp dir
      // But for now, let's keep it compatible but easier to detect
      const home = options.homeDir ?? homedir();
      baseDir = join(home, '.multimedia-toolkit-test');
    } else {
      const home = options.homeDir ?? homedir();
      baseDir = join(home, '.multimedia-toolkit');
    }
  }

  const home = options.homeDir ?? homedir();
  const defaultOutputDir = options.defaultOutputDir ?? env.MULTIMEDIA_TOOLKIT_OUTPUT_DIR ?? join(home, 'Music', 'AudioExtracted');

  return {
    baseDir,
    configDir: baseDir,
    configFile: join(baseDir, 'config.json'),
    dbPath: join(baseDir, 'toolkit.db'),
    tempDir: join(baseDir, 'temp'),
    defaultOutputDir
  };
}
