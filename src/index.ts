#!/usr/bin/env bun
/**
 * Multimedia Toolkit - Main Entry Point
 * A comprehensive audio extraction and conversion tool
 *
 * Combines functionality from:
 * - mkv-to-mp3.sh
 * - media-to-mp3.sh
 * - mp4-to-mp3-clipper.sh
 *
 * With enhanced features for batch processing, URL support, and more.
 */

import { parseArgs } from 'util';
import { existsSync, statSync } from 'fs';
import { basename } from 'path';
import { randomUUID } from 'crypto';

import { createAppContext, type AppContext } from '@/app/context';
import { createInteractiveCommands } from '@/cli/commands/interactive-commands';
import { showHistory } from '@/cli/history';
import type { TimeClip, OutputFormat, MenuOption, VideoPresetKey, VideoOutputFormat, VideoResolution, VideoQualityMode } from './types';
import { QUALITY_PRESETS, OUTPUT_FORMATS } from './types';
import { VIDEO_TRANSCODE_PRESETS } from './media/video-presets';
import { formatBytes } from '@/utils/format';
import { logAudioProcess, logVideoProcess } from '@/utils/process-logging';

const VERSION = '1.0.0';
let appContext: AppContext | null = null;

// ==================== Command Line Argument Parsing ====================

function parseArguments() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      // Input options
      input: { type: 'string', short: 'i', multiple: true },
      url: { type: 'string', short: 'u', multiple: true },

      // Output options
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      quality: { type: 'string', short: 'q' },
      'video-format': { type: 'string' },
      'video-quality': { type: 'string' },
      resolution: { type: 'string' },
      'video-preset': { type: 'string' },

      // Clipping options
      start: { type: 'string', short: 's' },
      duration: { type: 'string', short: 'd' },
      end: { type: 'string', short: 'e' },
      preset: { type: 'string', short: 'p' },

      // Features
      chapters: { type: 'boolean' },
      silence: { type: 'boolean' },
      merge: { type: 'boolean', short: 'm' },
      preview: { type: 'boolean' },
      waveform: { type: 'boolean', short: 'w' },

      // Metadata
      'strip-metadata': { type: 'boolean' },
      'preserve-metadata': { type: 'boolean' },
      tags: { type: 'string', short: 't' },

      // Workflow
      'dry-run': { type: 'boolean' },
      interactive: { type: 'boolean' },
      batch: { type: 'boolean', short: 'b' },
      config: { type: 'boolean', short: 'c' },

      // Other
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      verbose: { type: 'boolean' },
      'list-presets': { type: 'boolean' },
      'list-history': { type: 'boolean' },
      'export-logs': { type: 'string' },
      stats: { type: 'boolean' },
    },
    allowPositionals: true,
    strict: false
  });

  return { values, positionals };
}

// ==================== Help Text ====================

function showHelp(): void {
  console.log(`
${'\x1b[36m'}╔══════════════════════════════════════════════════════════════╗
║              Multimedia Toolkit v${VERSION}                           ║
║     Comprehensive Audio Extraction & Conversion Tool          ║
╚══════════════════════════════════════════════════════════════╝${'\x1b[0m'}

${'\x1b[33m'}USAGE:${'\x1b[0m'}
  multimedia-toolkit [options] [input-files...]
  multimedia-toolkit --interactive

${'\x1b[33m'}INPUT OPTIONS:${'\x1b[0m'}
  -i, --input <file>      Input file(s), can be specified multiple times
  -u, --url <url>         URL to download (YouTube, streaming sites)

${'\x1b[33m'}OUTPUT OPTIONS:${'\x1b[0m'}
  -o, --output <path>     Output file or directory
  -f, --format <fmt>      Output format: ${OUTPUT_FORMATS.join(', ')}
  -q, --quality <preset>  Quality preset: ${Object.keys(QUALITY_PRESETS).join(', ')}
  --video-format <fmt>    Video output format: webm, mp4, mkv
  --video-quality <val>   Video quality (CRF number or bitrate like 2500k)
  --resolution <size>     Video resolution: source, 2160p, 1440p, 1080p, 720p, 480p
  --video-preset <key>    Video preset: any-to-webm, any-to-mp4, any-to-mkv

${'\x1b[33m'}CLIPPING OPTIONS:${'\x1b[0m'}
  -s, --start <time>      Start time (HH:MM:SS or seconds)
  -d, --duration <sec>    Duration in seconds
  -e, --end <time>        End time (alternative to duration)
  -p, --preset <name>     Use a saved clip preset

${'\x1b[33m'}FEATURES:${'\x1b[0m'}
  --chapters              Extract chapters as separate files
  --silence               Split audio by detected silence
  -m, --merge             Merge multiple clips/files into one
  --preview               Preview clip before saving (plays first/last 5s)
  -w, --waveform          Display ASCII waveform visualization

${'\x1b[33m'}METADATA:${'\x1b[0m'}
  --strip-metadata        Remove all metadata from output
  --preserve-metadata     Keep original metadata (default)
  -t, --tags <tags>       Add tags (comma-separated) for organization

${'\x1b[33m'}WORKFLOW:${'\x1b[0m'}
  --interactive           Launch interactive mode
  --dry-run               Show commands without executing
  -b, --batch             Process multiple files from directory
  -c, --config            Show/edit configuration

${'\x1b[33m'}OTHER:${'\x1b[0m'}
  --list-presets          List saved clip presets
  --list-history          Show recent conversion history
  --export-logs <format>  Export logs (json/csv)
  --stats                 Show usage statistics
  -h, --help              Show this help message
  -v, --version           Show version

${'\x1b[33m'}EXAMPLES:${'\x1b[0m'}
  # Basic conversion
  multimedia-toolkit video.mp4

  # Extract with clipping
  multimedia-toolkit -i video.mkv -s 00:01:30 -d 60 -o clip.mp3

  # Download and extract from YouTube
  multimedia-toolkit -u "https://youtube.com/watch?v=..." -f mp3

  # Batch process directory
  multimedia-toolkit -b --input ./videos -f mp3 -q music_high

  # Interactive mode
  multimedia-toolkit --interactive

  # Extract all chapters
  multimedia-toolkit -i podcast.mp4 --chapters -o ./chapters/

For more information, visit: https://github.com/your-repo/multimedia-toolkit
`);
}

// ==================== Interactive Mode ====================

async function runInteractiveMode(app: AppContext): Promise<void> {
  const { cli, logger, config } = app;

  cli.clear();
  logger.header('Multimedia Toolkit - Interactive Mode');

  // Check tools
  const toolCheck = await config.validateTools();
  if (!toolCheck.valid) {
    cli.error(`Required tools missing: ${toolCheck.missing.join(', ')}`);
    return;
  }

  if (toolCheck.missing.length > 0) {
    cli.warn(`Optional tools missing: ${toolCheck.missing.join(', ')}`);
  }

  const ctx = app;
  const commands = createInteractiveCommands();

  // Main menu loop
  while (true) {
    const menuOptions: MenuOption[] = [
      ...commands.map((command, index) => ({
        key: String(index + 1),
        label: command.label,
        description: command.description,
        action: async () => {
          await command.run(ctx);
        }
      })),
      { key: '0', label: 'Exit', description: 'Quit the program', action: async () => { process.exit(0); } },
    ];

    const choice = await cli.menu('Main Menu', menuOptions);
    const selected = menuOptions.find(o => o.key === choice);

    if (selected) {
      try {
        await selected.action();
      } catch (error) {
        cli.error(`Error: ${error}`);
      }
    }
  }
}

// ==================== CLI Mode Handlers ====================

async function runCliMode(app: AppContext, values: Record<string, unknown>, positionals: string[]): Promise<void> {
  const { cli, logger, config, ffmpeg, downloader, presets, organizer, visualizer, db } = app;
  // Collect input files
  const inputs: string[] = [
    ...(values.input as string[] || []),
    ...positionals
  ];

  // Handle URLs
  const urls = values.url as string[] || [];

  if (inputs.length === 0 && urls.length === 0) {
    cli.error('No input files or URLs specified. Use --help for usage.');
    process.exit(1);
  }

  const videoPresetInput = values['video-preset'] as string | undefined;
  const videoFormatInput = values['video-format'] as string | undefined;
  const videoQualityInput = values['video-quality'] as string | undefined;
  const resolutionInput = values.resolution as string | undefined;
  const isVideoTranscode = Boolean(videoPresetInput || videoFormatInput || videoQualityInput || resolutionInput);

  if (isVideoTranscode) {
    if (urls.length > 0) {
      cli.error('Video transcoding does not support URL inputs yet.');
      process.exit(1);
    }

    let presetKey: VideoPresetKey = config.get('defaultVideoPreset');
    if (videoPresetInput) {
      if (!VIDEO_TRANSCODE_PRESETS[videoPresetInput as VideoPresetKey]) {
        cli.error(`Unknown video preset: ${videoPresetInput}`);
        process.exit(1);
      }
      presetKey = videoPresetInput as VideoPresetKey;
    } else if (videoFormatInput) {
      const formatKey = videoFormatInput.toLowerCase();
      if (formatKey === 'webm') presetKey = 'any-to-webm';
      else if (formatKey === 'mp4') presetKey = 'any-to-mp4';
      else if (formatKey === 'mkv') presetKey = 'any-to-mkv';
      else {
        cli.error(`Unsupported video format: ${videoFormatInput}`);
        process.exit(1);
      }
    }

    let resolution = config.get('defaultVideoResolution');
    if (resolutionInput) {
      if (!['source', '2160p', '1440p', '1080p', '720p', '480p'].includes(resolutionInput)) {
        cli.error(`Unsupported resolution: ${resolutionInput}`);
        process.exit(1);
      }
      resolution = resolutionInput as VideoResolution;
    }

    let qualityMode: VideoQualityMode | undefined;
    let crf: number | undefined;
    let bitrate: string | undefined;
    if (videoQualityInput) {
      const parsedCrf = Number(videoQualityInput);
      if (!Number.isNaN(parsedCrf) && Number.isFinite(parsedCrf)) {
        qualityMode = 'crf';
        crf = parsedCrf;
      } else if (/^\d+(k|m)$/i.test(videoQualityInput)) {
        qualityMode = 'bitrate';
        bitrate = videoQualityInput;
      } else {
        cli.error('Video quality must be a CRF number or a bitrate like 2500k.');
        process.exit(1);
      }
    }

    const preset = VIDEO_TRANSCODE_PRESETS[presetKey];
    const dryRun = values['dry-run'] as boolean || false;
    const preserveMetadata = !(values['strip-metadata'] as boolean);

    for (const input of inputs) {
      if (!existsSync(input)) {
        logger.error(`File not found: ${input}`);
        continue;
      }

      const baseName = basename(input).replace(/\.[^.]+$/, '');
      const outputValue = values.output as string | undefined;
      let outputPath = '';

      if (outputValue) {
        const isDir = existsSync(outputValue) && statSync(outputValue).isDirectory();
        if (isDir || inputs.length > 1) {
          outputPath = organizer.getOutputPath(baseName, preset.container, { customDir: outputValue });
        } else {
          outputPath = outputValue;
        }
      } else {
        outputPath = organizer.getOutputPath(baseName, preset.container);
      }

      const result = await ffmpeg.transcodeVideo(input, outputPath, {
        presetKey,
        resolution,
        qualityMode,
        crf,
        bitrate,
        preserveMetadata,
        dryRun
      });

      if (result.success) {
        if (dryRun) {
          logger.info(`[DRY RUN] ${result.data!.command}`);
        } else {
          logger.success(`Created: ${result.data!.outputPath}`);
          logVideoProcess(
            { db, logger },
            {
              jobId: randomUUID(),
              inputPath: input,
              outputPath: result.data!.outputPath,
              format: preset.container,
              presetKey,
              resolution,
              status: 'completed'
            }
          );
        }
      } else {
        logger.error(`Failed: ${result.error}`);
      }
    }

    return;
  }

  const format = (values.format as OutputFormat) || config.get('defaultFormat');
  const quality = (values.quality as string) || config.get('defaultQuality');
  const dryRun = values['dry-run'] as boolean || false;
  const preserveMetadata = !(values['strip-metadata'] as boolean);

  // Process URLs first
  for (const url of urls) {
    if (!await downloader.isYtdlpAvailable()) {
      cli.error('yt-dlp is required for URL downloads');
      continue;
    }

    logger.info(`Downloading: ${url}`);
    const result = await downloader.downloadAudio(url, { format: format as 'mp3' | 'aac' | 'm4a' | 'opus' | 'flac' | 'wav' | 'webm' });

    if (result.success) {
      inputs.push(result.data!.path);
    } else {
      logger.error(`Failed to download: ${result.error}`);
    }
  }

  // Build clip if specified
  let clip: TimeClip | undefined;
  if (values.start) {
    clip = {
      startTime: values.start as string,
      duration: values.duration ? parseFloat(values.duration as string) : undefined,
      endTime: values.end as string
    };
  }

  // Use preset if specified
  if (values.preset) {
    const presetResult = presets.get(values.preset as string);
    if (presetResult.success && presetResult.data) {
      for (const input of inputs) {
        const outputDir = values.output as string || config.getOutputDir();
        const result = await ffmpeg.extractMultipleClips(input, presetResult.data.clips, outputDir, {
          format,
          quality,
          dryRun
        });

        if (result.success) {
          logger.success(`Created ${result.data!.outputs.length} clips from ${basename(input)}`);
          if (dryRun) {
            result.data!.commands.forEach(cmd => console.log(`  ${cmd}`));
          }
        } else {
          logger.error(result.error || 'Failed');
        }
      }
      return;
    } else {
      cli.error(`Preset not found: ${values.preset}`);
      process.exit(1);
    }
  }

  // Handle chapters extraction
  if (values.chapters) {
    for (const input of inputs) {
      const outputDir = values.output as string || config.getOutputDir();
      const result = await ffmpeg.extractChapters(input, outputDir, { format, quality, dryRun });

      if (result.success) {
        logger.success(`Extracted ${result.data!.chapters.length} chapters from ${basename(input)}`);
      } else {
        logger.error(result.error || 'Failed');
      }
    }
    return;
  }

  // Handle silence split
  if (values.silence) {
    for (const input of inputs) {
      const outputDir = values.output as string || config.getOutputDir();
      const result = await ffmpeg.splitBySilence(input, outputDir, { format, quality, dryRun });

      if (result.success) {
        logger.success(`Created ${result.data!.segments.length} segments from ${basename(input)}`);
      } else {
        logger.error(result.error || 'Failed');
      }
    }
    return;
  }

  // Standard extraction
  for (const input of inputs) {
    if (!existsSync(input)) {
      logger.error(`File not found: ${input}`);
      continue;
    }

    const baseName = basename(input).replace(/\.[^.]+$/, '');
    const outputPath = values.output as string || organizer.getOutputPath(baseName, format);

    // Show waveform if requested
    if (values.waveform) {
      const waveResult = await ffmpeg.getWaveformData(input);
      if (waveResult.success && waveResult.data) {
        console.log(visualizer.renderCompact(waveResult.data));
      }
    }

    const result = await ffmpeg.extractAudio(input, outputPath, {
      format,
      quality,
      clip,
      preserveMetadata,
      dryRun
    });

    if (result.success) {
      if (dryRun) {
        logger.info(`[DRY RUN] ${result.data!.command}`);
      } else {
        logger.success(`Created: ${result.data!.outputPath}`);
        logAudioProcess(
          { db, logger },
          {
            jobId: randomUUID(),
            inputPath: input,
            outputPath: result.data!.outputPath,
            format,
            quality,
            status: 'completed'
          }
        );
      }
    } else {
      logger.error(`Failed: ${result.error}`);
    }
  }
}

// ==================== Main Entry Point ====================

async function main(): Promise<void> {
  const { values, positionals } = parseArguments();

  // Handle simple flags
  if (values.version) {
    console.log(`Multimedia Toolkit v${VERSION}`);
    process.exit(0);
  }

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  appContext = createAppContext();
  const { cli, config, db, logger, presets } = appContext;

  // Validate tools
  const toolCheck = await config.validateTools();
  if (!toolCheck.valid) {
    cli.error(`Required tools missing: ${toolCheck.missing.filter(m => !m.includes('optional')).join(', ')}`);
    cli.info('Please install ffmpeg and ffprobe to use this tool.');
    process.exit(1);
  }

  // Handle utility commands
  if (values['list-presets']) {
    console.log('\n' + presets.listPresets() + '\n');
    process.exit(0);
  }

  if (values['list-history']) {
    showHistory(cli, db);
    process.exit(0);
  }

  if (values.stats) {
    const stats = db.processes.getProcessStats();
    const logStats = logger.getLogStats();
    cli.box('Usage Statistics', [
      `Total conversions: ${stats.total}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Total output: ${formatBytes(stats.totalSize)}`,
      `Today's conversions: ${logStats.todayLogs}`,
      `Log directory: ${logStats.logDir}`
    ]);
    process.exit(0);
  }

  if (values['export-logs']) {
    const format = values['export-logs'] as 'json' | 'csv';
    const path = logger.exportProcessHistory(format);
    cli.success(`Logs exported to: ${path}`);
    process.exit(0);
  }

  if (values.config) {
    config.printConfig();
    process.exit(0);
  }

  // Interactive or CLI mode
  if (values.interactive || (positionals.length === 0 && !values.input && !values.url)) {
    await runInteractiveMode(appContext);
  } else {
    await runCliMode(appContext, values, positionals);
  }

  cli.close();
}

// Run the application
main().catch((error) => {
  if (appContext) {
    appContext.cli.error(`Fatal error: ${error.message}`);
  } else {
    console.error(`Fatal error: ${error.message}`);
  }
  process.exit(1);
});
