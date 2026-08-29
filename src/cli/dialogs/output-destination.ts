/**
 * Output destination dialog helper for reusable output + rename prompts.
 */

import { parse, resolve } from 'path';
import type { ConfigManager } from '@/config/config';
import type { CLIInterface } from '@/cli/interface';
import type { OutputOrganizer } from '@/utils/logger';
import type { ImageOutputFormat, OutputFormat, VideoOutputFormat } from '@/types';
import { ensureDirectoryExists, expandHomePath } from '@/utils/path';

type OutputExtension = OutputFormat | VideoOutputFormat | ImageOutputFormat;

export interface OutputDestinationResult {
  outputDir: string;
  baseName: string;
  outputPath?: string;
}

export interface SingleOutputDialogOptions {
  format: OutputExtension;
  defaultBaseName: string;
  defaultDir?: string;
  allowRename?: boolean;
  allowCustomPath?: boolean;
}

export interface DirectoryOutputDialogOptions {
  defaultBaseName: string;
  defaultDir?: string;
  allowRename?: boolean;
  renameLabel?: string;
}

export class OutputDestinationDialog {
  constructor(
    private cli: CLIInterface,
    private organizer: OutputOrganizer,
    private config: ConfigManager
  ) {}

  async promptForSingleOutput(options: SingleOutputDialogOptions): Promise<OutputDestinationResult | null> {
    const allowRename = options.allowRename ?? true;
    const allowCustomPath = options.allowCustomPath ?? true;
    const defaultOutputPath = this.organizer.getOutputPath(options.defaultBaseName, options.format);

    const useDefault = await this.cli.confirm('Use default output path?', true);
    if (useDefault) {
      const baseName = allowRename
        ? await this.promptBaseName(options.defaultBaseName, 'Rename output file?')
        : options.defaultBaseName;
      const outputPath = baseName === options.defaultBaseName
        ? defaultOutputPath
        : this.organizer.getOutputPath(baseName, options.format);
      return this.buildResult(outputPath, baseName);
    }

    if (allowCustomPath) {
      const specifyFull = await this.cli.confirm('Specify full output path?', false);
      if (specifyFull) {
        const outputPath = await this.cli.prompt('Output path', defaultOutputPath);
        const parsed = parse(outputPath);
        return {
          outputPath,
          outputDir: parsed.dir || '.',
          baseName: parsed.name || options.defaultBaseName
        };
      }
    }

    const outputDir = await this.chooseOutputDirectory(
      options.defaultDir || this.config.get('defaultOutputDir')
    );
    if (outputDir === null) return null;

    const baseName = allowRename
      ? await this.promptBaseName(options.defaultBaseName, 'Rename output file?')
      : options.defaultBaseName;
    const outputPath = this.organizer.getOutputPath(baseName, options.format, { customDir: outputDir });

    return {
      outputPath,
      outputDir,
      baseName
    };
  }

  async promptForOutputDirectory(options: DirectoryOutputDialogOptions): Promise<OutputDestinationResult | null> {
    const outputDirDefault = options.defaultDir || this.config.get('defaultOutputDir');
    const outputDir = await this.chooseOutputDirectory(outputDirDefault);
    if (outputDir === null) return null;

    const allowRename = options.allowRename ?? true;
    const baseName = allowRename
      ? await this.promptBaseName(options.defaultBaseName, options.renameLabel || 'Rename output prefix?')
      : options.defaultBaseName;

    return {
      outputDir,
      baseName
    };
  }

  /**
   * Shared output-directory selection: use the default, browse with fzf
   * (directories only, live fuzzy filtering), or type a path manually.
   * Returns null when the user backs out; the chosen directory is created.
   */
  private async chooseOutputDirectory(defaultDir: string): Promise<string | null> {
    const fzfAvailable = await this.cli.isFzfAvailable();
    const choices: { key: 'default' | 'browse' | 'manual'; label: string }[] = [
      { key: 'default', label: `Use default (${defaultDir})` },
      ...(fzfAvailable
        ? [{ key: 'browse' as const, label: 'Browse directories (fzf)' }]
        : []),
      { key: 'manual', label: 'Type path manually' }
    ];

    while (true) {
      const selected = await this.cli.selectFromList('Output directory', choices, (choice) => choice.label);
      const choice = selected[0]?.key;

      if (!choice) return null; // user went back

      if (choice === 'default') {
        const prepared = this.prepareDirectory(defaultDir);
        if (prepared !== undefined) return prepared;
        continue;
      }

      if (choice === 'browse') {
        const browsed = await this.cli.selectDirectoryWithFzf({
          directory: defaultDir,
          prompt: 'Select output directory'
        });
        if (!browsed) continue; // canceled browse - back to the choice menu
        const prepared = this.prepareDirectory(browsed);
        if (prepared !== undefined) return prepared;
        continue;
      }

      const input = await this.cli.prompt('Output directory', defaultDir);
      if (!input) continue; // empty input - back to the choice menu
      const prepared = this.prepareDirectory(expandHomePath(input));
      if (prepared !== undefined) return prepared;
      continue;
    }
  }

  /** Create the directory if needed; undefined signals a failure to write. */
  private prepareDirectory(dir: string): string | undefined {
    try {
      ensureDirectoryExists(null, dir);
      return resolve(dir);
    } catch (error) {
      this.cli.error(`Cannot create directory "${dir}": ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private async promptBaseName(defaultBaseName: string, promptLabel: string): Promise<string> {
    const shouldRename = await this.cli.confirm(promptLabel, false);
    if (!shouldRename) return defaultBaseName;

    const nameInput = await this.cli.prompt('New base name', defaultBaseName);
    return nameInput.trim() || defaultBaseName;
  }

  private buildResult(outputPath: string, baseName: string): OutputDestinationResult {
    const parsed = parse(outputPath);
    return {
      outputPath,
      outputDir: parsed.dir || '.',
      baseName: baseName || parsed.name || 'output'
    };
  }
}
