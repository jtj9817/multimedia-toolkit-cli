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
  const home = options.homeDir ?? homedir();
  const baseDir = options.baseDir ?? env.MULTIMEDIA_TOOLKIT_HOME ?? join(home, '.multimedia-toolkit');
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
