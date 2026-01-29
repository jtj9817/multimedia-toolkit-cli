/**
 * Configuration Management System
 * Handles default settings, user preferences, and config file loading/saving
 */

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type { AppConfig, OutputFormat, VideoOutputFormat, ImageOutputFormat } from '@/types';
import type { AppPaths } from '@/app/paths';
import type { DatabaseManager } from '@/db/database';
import { BunProcessRunner, type ProcessRunner } from '@/utils/process-runner';

export interface ConfigManagerOptions {
  paths: AppPaths;
  db?: DatabaseManager;
  skipInit?: boolean;
  processRunner?: ProcessRunner;
}

export function buildDefaultConfig(paths: AppPaths): AppConfig {
  return {
    defaultOutputDir: paths.defaultOutputDir,
    defaultQuality: 'music_medium',
    defaultFormat: 'mp3',
    defaultVideoFormat: 'webm',
    defaultVideoPreset: 'any-to-webm',
    defaultVideoResolution: '1080p',
    // GIF/WebP defaults
    defaultGifWebpPreset: 'webp-discord',
    defaultGifFps: 30,
    defaultWebpQuality: 80,
    autoOrganize: true,
    organizeBy: 'date',
    preserveMetadata: true,
    logOutputs: true,
    logFormat: 'json',
    ytdlpPath: 'yt-dlp',
    ffmpegPath: 'ffmpeg',
    ffprobePath: 'ffprobe',
    maxConcurrentJobs: 2,
    tempDir: paths.tempDir
  };
}

class ConfigManager {
  private config!: AppConfig;
  private paths: AppPaths;
  private db?: DatabaseManager;
  private defaultConfig: AppConfig;
  private processRunner: ProcessRunner;

  constructor(options: ConfigManagerOptions) {
    this.paths = options.paths;
    this.db = options.db;
    this.processRunner = options.processRunner ?? new BunProcessRunner();
    this.defaultConfig = buildDefaultConfig(this.paths);
    
    if (!options.skipInit) {
      this.init();
    }
  }

  init(): void {
    if (this.config) return;
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    // Ensure config directory exists
    if (this.paths.configDir && this.paths.configDir !== ':memory:' && !existsSync(this.paths.configDir)) {
      mkdirSync(this.paths.configDir, { recursive: true });
    }

    // Ensure temp directory exists
    if (this.defaultConfig.tempDir && !existsSync(this.defaultConfig.tempDir)) {
      mkdirSync(this.defaultConfig.tempDir, { recursive: true });
    }

    // Try to load from config file
    if (existsSync(this.paths.configFile)) {
      try {
        const fileConfig = JSON.parse(readFileSync(this.paths.configFile, 'utf-8'));
        return { ...this.defaultConfig, ...fileConfig };
      } catch {
        console.warn('Warning: Could not parse config file, using defaults');
      }
    }

    // Try to load from database
    if (this.db) {
      this.db.init(); // Ensure DB is initialized
      const dbConfig = this.db.config.getAllConfig();
      if (Object.keys(dbConfig).length > 0) {
        return this.parseDbConfig(dbConfig);
      }
    }

    // Save defaults and return (only if not skipping init)
    this.saveConfig(this.defaultConfig);
    return this.defaultConfig;
  }

  private parseDbConfig(dbConfig: Record<string, string>): AppConfig {
    const config = { ...this.defaultConfig };

    for (const [key, value] of Object.entries(dbConfig)) {
      const typedKey = key as keyof AppConfig;
      if (typedKey in config) {
        // Handle boolean values
        if (typeof config[typedKey] === 'boolean') {
          (config as Record<string, unknown>)[typedKey] = value === 'true';
        }
        // Handle number values
        else if (typeof config[typedKey] === 'number') {
          (config as Record<string, unknown>)[typedKey] = parseInt(value, 10);
        }
        // String values
        else {
          (config as Record<string, unknown>)[typedKey] = value;
        }
      }
    }

    return config;
  }

  saveConfig(config?: AppConfig): void {
    const configToSave = config || this.config;

    // Ensure directories exist
    if (!existsSync(this.paths.configDir)) {
      mkdirSync(this.paths.configDir, { recursive: true });
    }

    // Save to file
    try {
      writeFileSync(this.paths.configFile, JSON.stringify(configToSave, null, 2));
    } catch (error) {
      console.error('Error saving config file:', error);
    }

    // Save to database
    if (this.db) {
      for (const [key, value] of Object.entries(configToSave)) {
        this.db.config.setConfig(key, String(value));
      }
    }

    this.config = configToSave;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  setMultiple(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  reset(): void {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
  }

  // Validate that required external tools are available
  async validateTools(): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    // Check ffmpeg
    try {
      const result = await this.processRunner.run([this.config.ffmpegPath!, '-version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      if (result.exitCode !== 0) {
        missing.push('ffmpeg');
      }
    } catch {
      missing.push('ffmpeg');
    }

    // Check ffprobe
    try {
      const result = await this.processRunner.run([this.config.ffprobePath!, '-version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      if (result.exitCode !== 0) {
        missing.push('ffprobe');
      }
    } catch {
      missing.push('ffprobe');
    }

    // Check yt-dlp (optional but warn)
    try {
      const result = await this.processRunner.run([this.config.ytdlpPath!, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      if (result.exitCode !== 0) {
        missing.push('yt-dlp (optional - needed for URL downloads)');
      }
    } catch {
      missing.push('yt-dlp (optional - needed for URL downloads)');
    }

    return { valid: !missing.includes('ffmpeg') && !missing.includes('ffprobe'), missing };
  }

  // Get output directory, creating it if needed
  getOutputDir(subDir?: string): string {
    let outputDir = this.config.defaultOutputDir;

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    if (subDir) {
      outputDir = join(outputDir, subDir);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
    }

    return outputDir;
  }

  // Print current configuration
  printConfig(): void {
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│         Current Configuration           │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Output Directory: ${this.config.defaultOutputDir}`);
    console.log(`│ Default Quality:  ${this.config.defaultQuality}`);
    console.log(`│ Default Format:   ${this.config.defaultFormat}`);
    console.log(`│ Video Format:     ${this.config.defaultVideoFormat}`);
    console.log(`│ Video Preset:     ${this.config.defaultVideoPreset}`);
    console.log(`│ Video Resolution: ${this.config.defaultVideoResolution}`);
    console.log(`│ GIF/WebP Preset:  ${this.config.defaultGifWebpPreset}`);
    console.log(`│ GIF FPS:          ${this.config.defaultGifFps}`);
    console.log(`│ WebP Quality:     ${this.config.defaultWebpQuality}`);
    console.log(`│ Auto Organize:    ${this.config.autoOrganize}`);
    console.log(`│ Organize By:      ${this.config.organizeBy}`);
    console.log(`│ Preserve Meta:    ${this.config.preserveMetadata}`);
    console.log(`│ Log Outputs:      ${this.config.logOutputs}`);
    console.log(`│ Log Format:       ${this.config.logFormat}`);
    console.log(`│ Max Concurrent:   ${this.config.maxConcurrentJobs}`);
    console.log('└─────────────────────────────────────────┘\n');
  }
}

export function createConfigManager(options: ConfigManagerOptions): ConfigManager {
  return new ConfigManager(options);
}

export { ConfigManager };