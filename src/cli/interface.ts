/**
 * Interactive CLI Interface Module
 * Provides terminal-based menu system and user interaction
 */

import * as readline from 'readline';
import type { TimeClip, OutputFormat, MenuOption, VideoPresetKey, VideoResolution, VideoOutputFormat, GifWebpPresetKey, ImageOutputFormat, GifWebpConversionOptions } from '@/types';
import { QUALITY_PRESETS, OUTPUT_FORMATS, VIDEO_OUTPUT_FORMATS } from '@/types';
import { VIDEO_TRANSCODE_PRESETS } from '@/media/video-presets';
import { GIF_WEBP_PRESETS, FPS_OPTIONS, WIDTH_OPTIONS, WEBP_QUALITY_OPTIONS, GIF_DITHER_OPTIONS, getDefaultGifWebpOptions } from '@/media/gif-webp-presets';
import { FzfSelector } from '@/utils/fzf';
import { NumberedMenu, type NumberedChoice } from '@/cli/menus/numbered-menu';

// ANSI escape regex for stripping color codes
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export class CLIInterface {
  private rl: readline.Interface | null = null;
  private fzf: FzfSelector;

  constructor(options: { fzf?: FzfSelector } = {}) {
    this.fzf = options.fzf ?? new FzfSelector();
  }

  /**
   * Initialize readline interface
   */
  private getReadline(): readline.Interface {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  /**
   * Close readline interface
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Release readline before handing control to full-screen TUI tools (like fzf)
   */
  private suspendReadline(): void {
    if (this.rl) {
      // Avoid stdin escape sequences leaking into the next prompt.
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Prompt user for input
   */
  async prompt(question: string, defaultValue?: string): Promise<string> {
    const rl = this.getReadline();
    const defaultHint = defaultValue ? ` ${c.dim}[${defaultValue}]${c.reset}` : '';

    return new Promise((resolve) => {
      rl.question(`${c.cyan}?${c.reset} ${question}${defaultHint}: `, (answer) => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }

  /**
   * Prompt for yes/no confirmation
   */
  async confirm(question: string, defaultYes: boolean = true): Promise<boolean> {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await this.prompt(`${question} ${hint}`);

    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
  }

  /**
   * Display a menu and get selection
   */
  async menu(title: string, options: MenuOption[]): Promise<string> {
    console.log(`\n${c.cyan}┌${'─'.repeat(title.length + 4)}┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  ${c.bright}${title}${c.reset}  ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}└${'─'.repeat(title.length + 4)}┘${c.reset}\n`);

    options.forEach((opt, idx) => {
      const key = opt.key || String(idx + 1);
      const desc = opt.description ? ` ${c.dim}- ${opt.description}${c.reset}` : '';
      console.log(`  ${c.yellow}[${key}]${c.reset} ${opt.label}${desc}`);
    });

    console.log();

    const validKeys = options.map(o => o.key || '');
    let selection = '';

    while (!validKeys.includes(selection)) {
      selection = await this.prompt('Enter your choice');
      if (!validKeys.includes(selection)) {
        console.log(`${c.red}Invalid selection. Please try again.${c.reset}`);
      }
    }

    return selection;
  }

  /**
   * Display numbered list and get selection
   */
  async selectFromList<T>(
    title: string,
    items: T[],
    displayFn: (item: T, index: number) => string,
    allowMultiple: boolean = false
  ): Promise<T[]> {
    const choices: NumberedChoice<T>[] = items.map((item, index) => ({
      label: displayFn(item, index),
      value: item
    }));
    const menu = new NumberedMenu(this, {
      title,
      choices,
      exitLabel: 'Back'
    });

    if (allowMultiple) {
      const selected = await menu.runMultiple();
      return selected ?? [];
    }

    const selected = await menu.run();
    return selected === null ? [] : [selected];
  }

  /**
   * Prompt for time input (validates format)
   */
  async promptTime(label: string, required: boolean = true): Promise<string> {
    while (true) {
      const input = await this.prompt(`${label} (HH:MM:SS or seconds)`);

      if (!input && !required) return '';

      if (this.isValidTime(input)) {
        return input;
      }

      console.log(`${c.red}Invalid time format. Use HH:MM:SS, MM:SS, or seconds.${c.reset}`);
    }
  }

  /**
   * Validate time format
   */
  private isValidTime(time: string): boolean {
    // Check if it's a number (seconds)
    if (!isNaN(Number(time))) return true;

    // Check HH:MM:SS or MM:SS format
    const timeRegex = /^(\d{1,2}:)?(\d{1,2}):(\d{2})(\.\d+)?$/;
    return timeRegex.test(time);
  }

  /**
   * Prompt for clip definition
   */
  async promptClip(): Promise<TimeClip> {
    console.log(`\n${c.cyan}Define a clip:${c.reset}`);

    const startTime = await this.promptTime('Start time');
    const useEndTime = await this.confirm('Specify end time instead of duration?', false);

    let endTime: string | undefined;
    let duration: number | undefined;

    if (useEndTime) {
      endTime = await this.promptTime('End time');
    } else {
      const durInput = await this.prompt('Duration (seconds)');
      duration = parseFloat(durInput);
    }

    const label = await this.prompt('Label for this clip (optional)');

    return {
      startTime,
      endTime,
      duration,
      label: label || undefined
    };
  }

  /**
   * Prompt for multiple clips
   */
  async promptMultipleClips(): Promise<TimeClip[]> {
    const clips: TimeClip[] = [];

    console.log(`\n${c.bright}Define clips (enter empty start time when done)${c.reset}\n`);

    while (true) {
      const startTime = await this.prompt(`Clip ${clips.length + 1} start time (or press Enter to finish)`);

      if (!startTime) break;

      if (!this.isValidTime(startTime)) {
        console.log(`${c.red}Invalid time format.${c.reset}`);
        continue;
      }

      const useEndTime = await this.confirm('Specify end time instead of duration?', false);

      let endTime: string | undefined;
      let duration: number | undefined;

      if (useEndTime) {
        endTime = await this.promptTime('End time');
      } else {
        const durInput = await this.prompt('Duration (seconds)');
        duration = parseFloat(durInput);
      }

      const label = await this.prompt('Label (optional)');

      clips.push({
        startTime,
        endTime,
        duration,
        label: label || `clip_${clips.length + 1}`
      });

      console.log(`${c.green}✓ Added clip ${clips.length}${c.reset}`);
    }

    return clips;
  }

  private runNumberedMenu<T>(
    title: string,
    choices: NumberedChoice<T>[],
    allowExit: boolean = true
  ): Promise<T | null> {
    return new NumberedMenu(this, {
      title,
      choices,
      exitLabel: 'Back',
      allowExit
    }).run();
  }

  /**
   * Select output format
   */
  async selectFormat(): Promise<OutputFormat | null> {
    const options: NumberedChoice<OutputFormat>[] = OUTPUT_FORMATS.map(fmt => ({
      label: fmt.toUpperCase(),
      description: fmt === 'mp3' ? 'Most compatible' :
                   fmt === 'flac' ? 'Lossless' :
                   fmt === 'opus' ? 'Best compression' :
                   fmt === 'webm' ? 'Opus in WebM container' : undefined,
      value: fmt
    }));

    return this.runNumberedMenu('Select Output Format', options);
  }

  /**
   * Select quality preset
   */
  async selectQuality(): Promise<string | null> {
    const options: NumberedChoice<string>[] = Object.entries(QUALITY_PRESETS).map(([key, preset]) => ({
      label: preset.name.replace('_', ' ').toUpperCase(),
      description: `${preset.description} (${preset.bitrate}, ${preset.sampleRate}Hz)`,
      value: key
    }));

    return this.runNumberedMenu('Select Quality Preset', options);
  }

  /**
   * Select video transcode preset
   */
  async selectVideoPreset(defaultKey?: VideoPresetKey): Promise<VideoPresetKey | null> {
    const options: NumberedChoice<VideoPresetKey>[] = Object.entries(VIDEO_TRANSCODE_PRESETS).map(([key, preset]) => ({
      label: preset.label,
      description: `${preset.container.toUpperCase()} default`,
      value: key as VideoPresetKey
    }));

    if (defaultKey && VIDEO_TRANSCODE_PRESETS[defaultKey]) {
      const existing = options.find(option => option.value === defaultKey);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    return this.runNumberedMenu('Select Video Preset', options);
  }

  /**
   * Select video resolution
   */
  async selectVideoResolution(defaultValue?: VideoResolution): Promise<VideoResolution | null> {
    const options: NumberedChoice<VideoResolution>[] = [
      { label: 'Source (no scaling)', value: 'source' },
      { label: '2160p (4K)', value: '2160p' },
      { label: '1440p (2K)', value: '1440p' },
      { label: '1080p', value: '1080p' },
      { label: '720p', value: '720p' },
      { label: '480p', value: '480p' }
    ];

    if (defaultValue) {
      const existing = options.find(option => option.value === defaultValue);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    return this.runNumberedMenu('Select Video Resolution', options);
  }

  /**
   * Select video output format
   */
  async selectVideoFormat(defaultValue?: VideoOutputFormat): Promise<VideoOutputFormat | null> {
    const options: NumberedChoice<VideoOutputFormat>[] = VIDEO_OUTPUT_FORMATS.map(fmt => ({
      label: fmt.toUpperCase(),
      value: fmt
    }));

    if (defaultValue) {
      const existing = options.find(option => option.value === defaultValue);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    return this.runNumberedMenu('Select Video Output Format', options);
  }

  /**
   * Select image output format (GIF or WebP)
   */
  async selectImageFormat(): Promise<ImageOutputFormat | null> {
    const options: NumberedChoice<ImageOutputFormat>[] = [
      { label: 'GIF', description: 'Universal support, larger files', value: 'gif' },
      { label: 'WebP', description: 'Better quality/size, modern format', value: 'webp' }
    ];

    return this.runNumberedMenu('Select Image Format', options);
  }

  /**
   * Select GIF/WebP conversion preset
   */
  async selectGifWebpPreset(format: ImageOutputFormat): Promise<GifWebpPresetKey | 'custom' | null> {
    // Filter presets by format
    const formatPresets = Object.values(GIF_WEBP_PRESETS).filter(p => p.format === format);

    const options: NumberedChoice<GifWebpPresetKey | 'custom'>[] = [
      ...formatPresets.map(preset => ({
        label: preset.label,
        description: preset.description,
        value: preset.key
      })),
      { label: 'Custom Settings', description: 'Configure your own settings', value: 'custom' }
    ];

    return this.runNumberedMenu(`Select ${format.toUpperCase()} Preset`, options);
  }

  /**
   * Configure custom GIF/WebP settings
   */
  async configureGifWebpOptions(format: ImageOutputFormat): Promise<Partial<GifWebpConversionOptions> | null> {
    const defaults = getDefaultGifWebpOptions(format);
    const options: Partial<GifWebpConversionOptions> = { format };

    console.log(`\n${c.cyan}Configure ${format.toUpperCase()} Settings${c.reset}\n`);

    // FPS selection
    const fpsOptions: NumberedChoice<number>[] = FPS_OPTIONS.map(opt => ({
      label: opt.label,
      description: opt.description,
      value: opt.value
    }));
    const fpsChoice = await this.runNumberedMenu('Frame Rate', fpsOptions);
    if (fpsChoice === null) return null;
    options.fps = fpsChoice || defaults.fps;

    // Width selection
    const widthOptions: NumberedChoice<number>[] = WIDTH_OPTIONS.map(opt => ({
      label: opt.label,
      description: opt.description,
      value: opt.value
    }));
    const widthChoice = await this.runNumberedMenu('Output Width', widthOptions);
    if (widthChoice === null) return null;
    const widthValue = widthChoice;
    if (widthValue > 0) {
      options.width = widthValue;
    }

    // Format-specific options
    if (format === 'webp') {
      // Quality selection
      const qualityOptions: NumberedChoice<number>[] = WEBP_QUALITY_OPTIONS.map(opt => ({
        label: opt.label,
        description: opt.description,
        value: opt.value
      }));
      const qualityChoice = await this.runNumberedMenu('Quality', qualityOptions);
      if (qualityChoice === null) return null;
      options.quality = qualityChoice || defaults.quality;

      // Lossless option
      options.lossless = await this.confirm('Use lossless compression?', false);

      // Compression level
      const compressionChoice = await this.prompt('Compression level (0-6, higher=slower/smaller)', '4');
      options.compression = Math.min(6, Math.max(0, parseInt(compressionChoice) || 4));
    } else {
      // GIF-specific: Dithering
      const ditherOptions: NumberedChoice<'none' | 'floyd_steinberg' | 'sierra2' | 'bayer'>[] = GIF_DITHER_OPTIONS.map(opt => ({
        label: opt.label,
        description: opt.description,
        value: opt.value as 'none' | 'floyd_steinberg' | 'sierra2' | 'bayer'
      }));
      const ditherChoice = await this.runNumberedMenu('Dithering Algorithm', ditherOptions);
      if (ditherChoice === null) return null;
      options.dither = ditherChoice;

      // Palette mode
      const paletteOptions: NumberedChoice<'full' | 'diff'>[] = [
        { label: 'Diff Mode', description: 'Optimizes for animation (recommended)', value: 'diff' },
        { label: 'Full Mode', description: 'Uses all frames for palette', value: 'full' }
      ];
      const paletteChoice = await this.runNumberedMenu('Palette Mode', paletteOptions);
      if (paletteChoice === null) return null;
      options.paletteMode = paletteChoice;
    }

    // Loop options
    options.loop = await this.confirm('Loop animation?', true);
    if (options.loop) {
      const loopChoice = await this.prompt('Loop count (0 = infinite)', '0');
      options.loopCount = parseInt(loopChoice) || 0;
    }

    return options;
  }

  /**
   * Prompt for clip/trim settings for GIF/WebP
   */
  async promptGifWebpClip(): Promise<{ startTime?: string; duration?: number }> {
    const useClip = await this.confirm('Clip a specific section?', false);

    if (!useClip) {
      return {};
    }

    const startTime = await this.promptTime('Start time', true);
    const durationStr = await this.prompt('Duration in seconds (leave empty for rest of video)');
    const duration = durationStr ? parseFloat(durationStr) : undefined;

    return { startTime, duration };
  }

  /**
   * Display progress spinner
   */
  async withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    const spinner = setInterval(() => {
      process.stdout.write(`\r${c.cyan}${frames[frameIndex]}${c.reset} ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);

    try {
      const result = await task();
      clearInterval(spinner);
      process.stdout.write(`\r${c.green}✓${c.reset} ${message}\n`);
      return result;
    } catch (error) {
      clearInterval(spinner);
      process.stdout.write(`\r${c.red}✗${c.reset} ${message}\n`);
      throw error;
    }
  }

  /**
   * Display a boxed message
   */
  box(title: string, content: string[]): void {
    const maxWidth = Math.max(
      title.length,
      ...content.map(l => l.replace(ANSI_REGEX, '').length)
    );
    const width = maxWidth + 4;

    console.log(`\n${c.cyan}┌${'─'.repeat(width)}┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset} ${c.bright}${title.padEnd(maxWidth + 2)}${c.reset} ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├${'─'.repeat(width)}┤${c.reset}`);

    content.forEach(line => {
      const plainLine = line.replace(ANSI_REGEX, '');
      const padding = maxWidth - plainLine.length + 2;
      console.log(`${c.cyan}│${c.reset} ${line}${' '.repeat(padding)} ${c.cyan}│${c.reset}`);
    });

    console.log(`${c.cyan}└${'─'.repeat(width)}┘${c.reset}\n`);
  }

  /**
   * Display a table
   */
  table(headers: string[], rows: string[][]): void {
    // Calculate column widths
    const widths = headers.map((h, i) => {
      const maxDataWidth = Math.max(...rows.map(r => (r[i] || '').length));
      return Math.max(h.length, maxDataWidth);
    });

    // Header
    const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(' │ ');
    const separator = widths.map(w => '─'.repeat(w)).join('─┼─');

    console.log(`\n┌─${separator.replace(/┼/g, '┬')}─┐`);
    console.log(`│ ${c.bright}${headerRow}${c.reset} │`);
    console.log(`├─${separator}─┤`);

    // Data rows
    rows.forEach(row => {
      const dataRow = row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' │ ');
      console.log(`│ ${dataRow} │`);
    });

    console.log(`└─${separator.replace(/┼/g, '┴')}─┘\n`);
  }

  /**
   * Clear the screen
   */
  clear(): void {
    console.clear();
  }

  /**
   * Print success message
   */
  success(message: string): void {
    console.log(`\n${c.green}✓${c.reset} ${message}\n`);
  }

  /**
   * Print error message
   */
  error(message: string): void {
    console.log(`\n${c.red}✗${c.reset} ${message}\n`);
  }

  /**
   * Print warning message
   */
  warn(message: string): void {
    console.log(`\n${c.yellow}⚠${c.reset} ${message}\n`);
  }

  /**
   * Print info message
   */
  info(message: string): void {
    console.log(`\n${c.blue}ℹ${c.reset} ${message}\n`);
  }

  /**
   * Select a file using FZF with feedback loop (retry/cancel/manual options)
   * Returns empty string if user chooses to go back
   */
  async selectFileWithFzf(options: {
    directory?: string;
    extensions?: string[];
    prompt?: string;
    allowBack?: boolean;
  } = {}): Promise<string> {
    const fzfAvailable = await this.fzf.isFzfAvailable();
    const allowBack = options.allowBack ?? true;

    while (true) {
      if (fzfAvailable) {
        console.log(`\n${c.cyan}╭─ File Selection ─────────────────────────────────────╮${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.dim}FZF Controls:${c.reset}                                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Type to search • Enter to select • Esc to cancel   ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}╰───────────────────────────────────────────────────────╯${c.reset}\n`);

        this.suspendReadline();
        const result = await this.fzf.selectFile({
          directory: options.directory,
          extensions: options.extensions,
          preview: true,
          prompt: options.prompt || 'Select file'
        });

        if (result.success && result.data) {
          // Show selected file and confirm
          console.log(`\n${c.green}✓${c.reset} Selected: ${c.bright}${result.data}${c.reset}\n`);

          const confirmChoice = await this.runNumberedMenu('Confirm selection?', [
            { label: 'Yes, use this file', description: 'Proceed with selected file', value: 'y' },
            { label: 'Reselect', description: 'Choose a different file', value: 'r' },
            { label: 'Manual input', description: 'Type file path manually', value: 'm' }
          ], allowBack);

          if (confirmChoice === 'y') {
            return result.data;
          } else if (confirmChoice === 'r') {
            continue; // Loop back to FZF selection
          } else if (confirmChoice === 'm') {
            const manualPath = await this.prompt('Enter file path');
            if (manualPath) return manualPath;
            continue;
          } else if (confirmChoice === null) {
            return ''; // Signal to go back
          }
        } else {
          // FZF was canceled or no files found
          console.log(`\n${c.yellow}⚠${c.reset} ${result.error || 'No file selected'}\n`);

          const retryChoice = await this.runNumberedMenu('What would you like to do?', [
            { label: 'Retry FZF', description: 'Try selecting again', value: 'r' },
            { label: 'Manual input', description: 'Type file path manually', value: 'm' }
          ], allowBack);

          if (retryChoice === 'r') {
            continue;
          } else if (retryChoice === 'm') {
            const manualPath = await this.prompt('Enter file path');
            if (manualPath) return manualPath;
            continue;
          } else if (retryChoice === null) {
            return ''; // Signal to go back
          }
        }
      } else {
        // FZF not available - show installation hint and use manual input
        console.log(`\n${c.yellow}⚠${c.reset} FZF not installed. Install with: ${c.cyan}sudo apt install fzf${c.reset}\n`);
        const manualPath = await this.prompt(options.prompt || 'Enter file path');
        if (manualPath) return manualPath;
        if (allowBack) return '';
      }
    }
  }

  /**
   * Select multiple files using FZF with feedback loop
   * Returns empty array if user chooses to go back
   */
  async selectFilesWithFzf(options: {
    directory?: string;
    extensions?: string[];
    prompt?: string;
    allowBack?: boolean;
  } = {}): Promise<string[]> {
    const fzfAvailable = await this.fzf.isFzfAvailable();
    const allowBack = options.allowBack ?? true;

    while (true) {
      if (fzfAvailable) {
        console.log(`\n${c.cyan}╭─ Multi-File Selection ───────────────────────────────╮${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.dim}FZF Controls:${c.reset}                                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Tab: select/deselect • Ctrl+A: select all          ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Enter: confirm • Esc: cancel                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}╰───────────────────────────────────────────────────────╯${c.reset}\n`);

        this.suspendReadline();
        const result = await this.fzf.selectFiles({
          directory: options.directory,
          extensions: options.extensions,
          multi: true,
          preview: true,
          prompt: options.prompt || 'Select file(s)'
        });

        if (result.success && result.data && result.data.length > 0) {
          // Show selected files and confirm
          console.log(`\n${c.green}✓${c.reset} Selected ${c.bright}${result.data.length}${c.reset} file(s):`);
          result.data.forEach((f, i) => {
            const shortPath = f.length > 60 ? '...' + f.slice(-57) : f;
            console.log(`  ${c.dim}${i + 1}.${c.reset} ${shortPath}`);
          });
          console.log();

          const confirmChoice = await this.runNumberedMenu('Confirm selection?', [
            { label: 'Yes, use these files', description: `Proceed with ${result.data.length} file(s)`, value: 'y' },
            { label: 'Reselect', description: 'Choose different files', value: 'r' },
            { label: 'Manual input', description: 'Type file paths manually', value: 'm' }
          ], allowBack);

          if (confirmChoice === 'y') {
            return result.data;
          } else if (confirmChoice === 'r') {
            continue;
          } else if (confirmChoice === 'm') {
            const input = await this.prompt('Enter file path(s) (comma-separated)');
            const files = input.split(',').map(f => f.trim()).filter(Boolean);
            if (files.length > 0) return files;
            continue;
          } else if (confirmChoice === null) {
            return [];
          }
        } else {
          // FZF was canceled or no files found
          console.log(`\n${c.yellow}⚠${c.reset} ${result.error || 'No files selected'}\n`);

          const retryChoice = await this.runNumberedMenu('What would you like to do?', [
            { label: 'Retry FZF', description: 'Try selecting again', value: 'r' },
            { label: 'Manual input', description: 'Type file paths manually', value: 'm' }
          ], allowBack);

          if (retryChoice === 'r') {
            continue;
          } else if (retryChoice === 'm') {
            const input = await this.prompt('Enter file path(s) (comma-separated)');
            const files = input.split(',').map(f => f.trim()).filter(Boolean);
            if (files.length > 0) return files;
            continue;
          } else if (retryChoice === null) {
            return [];
          }
        }
      } else {
        // FZF not available
        console.log(`\n${c.yellow}⚠${c.reset} FZF not installed. Install with: ${c.cyan}sudo apt install fzf${c.reset}\n`);
        const input = await this.prompt(options.prompt || 'Enter file path(s) (comma-separated)');
        const files = input.split(',').map(f => f.trim()).filter(Boolean);
        if (files.length > 0) return files;
        if (allowBack) return [];
      }
    }
  }

  /**
   * Select a single media file using FZF with feedback loop
   * Returns empty string if user chooses to go back
   */
  async selectMediaFile(directory?: string): Promise<string> {
    return this.selectFileWithFzf({
      directory,
      extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'],
      prompt: 'Select media file',
      allowBack: true
    });
  }

  /**
   * Select multiple media files using FZF with feedback loop
   * Returns empty array if user chooses to go back
   */
  async selectMediaFiles(directory?: string): Promise<string[]> {
    return this.selectFilesWithFzf({
      directory,
      extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'],
      prompt: 'Select media file(s)',
      allowBack: true
    });
  }
}
