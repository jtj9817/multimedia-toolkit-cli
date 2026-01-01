/**
 * Interactive CLI Interface Module
 * Provides terminal-based menu system and user interaction
 */

import * as readline from 'readline';
import type { TimeClip, OutputFormat, MenuOption, VideoPresetKey, VideoResolution, VideoOutputFormat } from '../types';
import { QUALITY_PRESETS, OUTPUT_FORMATS, VIDEO_OUTPUT_FORMATS } from '../types';
import { VIDEO_TRANSCODE_PRESETS } from '../media/video-presets';
import { fzfSelector } from '../utils/fzf';

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

  constructor() {}

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
    console.log(`\n${c.bright}${title}${c.reset}\n`);

    items.forEach((item, idx) => {
      console.log(`  ${c.yellow}[${idx + 1}]${c.reset} ${displayFn(item, idx)}`);
    });

    console.log();

    if (allowMultiple) {
      const input = await this.prompt('Enter numbers (comma-separated, or "all")');

      if (input.toLowerCase() === 'all') {
        return items;
      }

      const indices = input.split(',')
        .map(s => parseInt(s.trim()) - 1)
        .filter(i => i >= 0 && i < items.length);

      return indices.map(i => items[i]);
    } else {
      let selection = -1;
      while (selection < 0 || selection >= items.length) {
        const input = await this.prompt('Enter number');
        selection = parseInt(input) - 1;
        if (selection < 0 || selection >= items.length) {
          console.log(`${c.red}Invalid selection. Please enter 1-${items.length}.${c.reset}`);
        }
      }
      return [items[selection]];
    }
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

  /**
   * Select output format
   */
  async selectFormat(): Promise<OutputFormat> {
    const options: MenuOption[] = OUTPUT_FORMATS.map(fmt => ({
      key: fmt,
      label: fmt.toUpperCase(),
      description: fmt === 'mp3' ? 'Most compatible' :
                   fmt === 'flac' ? 'Lossless' :
                   fmt === 'opus' ? 'Best compression' :
                   fmt === 'webm' ? 'Opus in WebM container' : undefined,
      action: async () => {}
    }));

    const selection = await this.menu('Select Output Format', options);
    return selection as OutputFormat;
  }

  /**
   * Select quality preset
   */
  async selectQuality(): Promise<string> {
    const options: MenuOption[] = Object.entries(QUALITY_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.name.replace('_', ' ').toUpperCase(),
      description: `${preset.description} (${preset.bitrate}, ${preset.sampleRate}Hz)`,
      action: async () => {}
    }));

    return this.menu('Select Quality Preset', options);
  }

  /**
   * Select video transcode preset
   */
  async selectVideoPreset(defaultKey?: VideoPresetKey): Promise<VideoPresetKey> {
    const options: MenuOption[] = Object.entries(VIDEO_TRANSCODE_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.label,
      description: `${preset.container.toUpperCase()} default`,
      action: async () => {}
    }));

    if (defaultKey && VIDEO_TRANSCODE_PRESETS[defaultKey]) {
      const existing = options.find(option => option.key === defaultKey);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    const selection = await this.menu('Select Video Preset', options);
    return selection as VideoPresetKey;
  }

  /**
   * Select video resolution
   */
  async selectVideoResolution(defaultValue?: VideoResolution): Promise<VideoResolution> {
    const options: MenuOption[] = [
      { key: 'source', label: 'Source (no scaling)', action: async () => {} },
      { key: '1080p', label: '1080p', action: async () => {} },
      { key: '720p', label: '720p', action: async () => {} }
    ];

    if (defaultValue) {
      const existing = options.find(option => option.key === defaultValue);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    const selection = await this.menu('Select Video Resolution', options);
    return selection as VideoResolution;
  }

  /**
   * Select video output format
   */
  async selectVideoFormat(defaultValue?: VideoOutputFormat): Promise<VideoOutputFormat> {
    const options: MenuOption[] = VIDEO_OUTPUT_FORMATS.map(fmt => ({
      key: fmt,
      label: fmt.toUpperCase(),
      action: async () => {}
    }));

    if (defaultValue) {
      const existing = options.find(option => option.key === defaultValue);
      if (existing) {
        existing.label = `${existing.label} (default)`;
      }
    }

    const selection = await this.menu('Select Video Output Format', options);
    return selection as VideoOutputFormat;
  }

  /**
   * Display progress spinner
   */
  async withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let running = true;

    const spinner = setInterval(() => {
      process.stdout.write(`\r${c.cyan}${frames[frameIndex]}${c.reset} ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);

    try {
      const result = await task();
      running = false;
      clearInterval(spinner);
      process.stdout.write(`\r${c.green}✓${c.reset} ${message}\n`);
      return result;
    } catch (error) {
      running = false;
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
      ...content.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length)
    );
    const width = maxWidth + 4;

    console.log(`\n${c.cyan}┌${'─'.repeat(width)}┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset} ${c.bright}${title.padEnd(maxWidth + 2)}${c.reset} ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├${'─'.repeat(width)}┤${c.reset}`);

    content.forEach(line => {
      const plainLine = line.replace(/\x1b\[[0-9;]*m/g, '');
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
    const fzfAvailable = await fzfSelector.isFzfAvailable();
    const allowBack = options.allowBack ?? true;

    while (true) {
      if (fzfAvailable) {
        console.log(`\n${c.cyan}╭─ File Selection ─────────────────────────────────────╮${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.dim}FZF Controls:${c.reset}                                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Type to search • Enter to select • Esc to cancel   ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}╰───────────────────────────────────────────────────────╯${c.reset}\n`);

        this.suspendReadline();
        const result = await fzfSelector.selectFile({
          directory: options.directory,
          extensions: options.extensions,
          preview: true,
          prompt: options.prompt || 'Select file'
        });

        if (result.success && result.data) {
          // Show selected file and confirm
          console.log(`\n${c.green}✓${c.reset} Selected: ${c.bright}${result.data}${c.reset}\n`);

          const confirmChoice = await this.menu('Confirm selection?', [
            { key: 'y', label: 'Yes, use this file', description: 'Proceed with selected file', action: async () => {} },
            { key: 'r', label: 'Reselect', description: 'Choose a different file', action: async () => {} },
            { key: 'm', label: 'Manual input', description: 'Type file path manually', action: async () => {} },
            ...(allowBack ? [{ key: 'b', label: 'Back', description: 'Return to previous menu', action: async () => {} }] : [])
          ]);

          if (confirmChoice === 'y') {
            return result.data;
          } else if (confirmChoice === 'r') {
            continue; // Loop back to FZF selection
          } else if (confirmChoice === 'm') {
            const manualPath = await this.prompt('Enter file path');
            if (manualPath) return manualPath;
            continue;
          } else if (confirmChoice === 'b') {
            return ''; // Signal to go back
          }
        } else {
          // FZF was canceled or no files found
          console.log(`\n${c.yellow}⚠${c.reset} ${result.error || 'No file selected'}\n`);

          const retryChoice = await this.menu('What would you like to do?', [
            { key: 'r', label: 'Retry FZF', description: 'Try selecting again', action: async () => {} },
            { key: 'm', label: 'Manual input', description: 'Type file path manually', action: async () => {} },
            ...(allowBack ? [{ key: 'b', label: 'Back', description: 'Return to previous menu', action: async () => {} }] : [])
          ]);

          if (retryChoice === 'r') {
            continue;
          } else if (retryChoice === 'm') {
            const manualPath = await this.prompt('Enter file path');
            if (manualPath) return manualPath;
            continue;
          } else if (retryChoice === 'b') {
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
    const fzfAvailable = await fzfSelector.isFzfAvailable();
    const allowBack = options.allowBack ?? true;

    while (true) {
      if (fzfAvailable) {
        console.log(`\n${c.cyan}╭─ Multi-File Selection ───────────────────────────────╮${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.dim}FZF Controls:${c.reset}                                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Tab: select/deselect • Ctrl+A: select all          ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}   Enter: confirm • Esc: cancel                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}╰───────────────────────────────────────────────────────╯${c.reset}\n`);

        this.suspendReadline();
        const result = await fzfSelector.selectFiles({
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

          const confirmChoice = await this.menu('Confirm selection?', [
            { key: 'y', label: 'Yes, use these files', description: `Proceed with ${result.data.length} file(s)`, action: async () => {} },
            { key: 'r', label: 'Reselect', description: 'Choose different files', action: async () => {} },
            { key: 'm', label: 'Manual input', description: 'Type file paths manually', action: async () => {} },
            ...(allowBack ? [{ key: 'b', label: 'Back', description: 'Return to previous menu', action: async () => {} }] : [])
          ]);

          if (confirmChoice === 'y') {
            return result.data;
          } else if (confirmChoice === 'r') {
            continue;
          } else if (confirmChoice === 'm') {
            const input = await this.prompt('Enter file path(s) (comma-separated)');
            const files = input.split(',').map(f => f.trim()).filter(Boolean);
            if (files.length > 0) return files;
            continue;
          } else if (confirmChoice === 'b') {
            return [];
          }
        } else {
          // FZF was canceled or no files found
          console.log(`\n${c.yellow}⚠${c.reset} ${result.error || 'No files selected'}\n`);

          const retryChoice = await this.menu('What would you like to do?', [
            { key: 'r', label: 'Retry FZF', description: 'Try selecting again', action: async () => {} },
            { key: 'm', label: 'Manual input', description: 'Type file paths manually', action: async () => {} },
            ...(allowBack ? [{ key: 'b', label: 'Back', description: 'Return to previous menu', action: async () => {} }] : [])
          ]);

          if (retryChoice === 'r') {
            continue;
          } else if (retryChoice === 'm') {
            const input = await this.prompt('Enter file path(s) (comma-separated)');
            const files = input.split(',').map(f => f.trim()).filter(Boolean);
            if (files.length > 0) return files;
            continue;
          } else if (retryChoice === 'b') {
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

export const cli = new CLIInterface();
