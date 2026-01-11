/**
 * Configuration Management System
 * Handles default settings, user preferences, and config file loading/saving
 */

import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { db } from '../db/database';
import type { AppConfig, OutputFormat, VideoOutputFormat, ImageOutputFormat } from '../types';

const CONFIG_DIR = join(homedir(), '.multimedia-toolkit');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  defaultOutputDir: join(homedir(), 'Music', 'AudioExtracted'),
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
  tempDir: join(CONFIG_DIR, 'temp')
};

class ConfigManager {
  private config: AppConfig;
  private static instance: ConfigManager | null = null;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Ensure temp directory exists
    if (!existsSync(DEFAULT_CONFIG.tempDir)) {
      mkdirSync(DEFAULT_CONFIG.tempDir, { recursive: true });
    }

    // Try to load from config file
    if (existsSync(CONFIG_FILE)) {
      try {
        const fileConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...fileConfig };
      } catch {
        console.warn('Warning: Could not parse config file, using defaults');
      }
    }

    // Try to load from database
    const dbConfig = db.getAllConfig();
    if (Object.keys(dbConfig).length > 0) {
      return this.parseDbConfig(dbConfig);
    }

    // Save defaults and return
    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  private parseDbConfig(dbConfig: Record<string, string>): AppConfig {
    const config = { ...DEFAULT_CONFIG };

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
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Save to file
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    } catch (error) {
      console.error('Error saving config file:', error);
    }

    // Save to database
    for (const [key, value] of Object.entries(configToSave)) {
      db.setConfig(key, String(value));
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
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  // Validate that required external tools are available
  async validateTools(): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    // Check ffmpeg
    try {
      const proc = Bun.spawn([this.config.ffmpegPath!, '-version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        missing.push('ffmpeg');
      }
    } catch {
      missing.push('ffmpeg');
    }

    // Check ffprobe
    try {
      const proc = Bun.spawn([this.config.ffprobePath!, '-version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        missing.push('ffprobe');
      }
    } catch {
      missing.push('ffprobe');
    }

    // Check yt-dlp (optional but warn)
    try {
      const proc = Bun.spawn([this.config.ytdlpPath!, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
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

  // Generate organized output path based on settings
  getOrganizedOutputPath(baseName: string, format: OutputFormat | VideoOutputFormat | ImageOutputFormat, source?: string): string {
    let subDir = '';

    if (this.config.autoOrganize) {
      const now = new Date();

      switch (this.config.organizeBy) {
        case 'date':
          subDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'source':
          subDir = source ? this.sanitizeFileName(source) : 'unknown';
          break;
        case 'format':
          subDir = format;
          break;
        case 'custom':
          // Custom organization can be extended here
          subDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          break;
      }
    }

    const outputDir = this.getOutputDir(subDir);
    const timestamp = Date.now();
    const fileName = `${this.sanitizeFileName(baseName)}_${timestamp}.${format}`;

    return join(outputDir, fileName);
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 100);
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

export const config = ConfigManager.getInstance();
export { DEFAULT_CONFIG };
