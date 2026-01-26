/**
 * Output destination dialog helper for reusable output + rename prompts.
 */

import { parse } from 'path';
import type { ConfigManager } from '@/config/config';
import type { CLIInterface } from '@/cli/interface';
import type { OutputOrganizer } from '@/utils/logger';
import type { ImageOutputFormat, OutputFormat, VideoOutputFormat } from '@/types';

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

  async promptForSingleOutput(options: SingleOutputDialogOptions): Promise<OutputDestinationResult> {
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

    const outputDirDefault = options.defaultDir || this.config.get('defaultOutputDir');
    const outputDir = await this.cli.prompt('Output directory', outputDirDefault);
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

  async promptForOutputDirectory(options: DirectoryOutputDialogOptions): Promise<OutputDestinationResult> {
    const outputDirDefault = options.defaultDir || this.config.get('defaultOutputDir');
    const outputDir = await this.cli.prompt('Output directory', outputDirDefault);
    const allowRename = options.allowRename ?? true;
    const baseName = allowRename
      ? await this.promptBaseName(options.defaultBaseName, options.renameLabel || 'Rename output prefix?')
      : options.defaultBaseName;

    return {
      outputDir,
      baseName
    };
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
