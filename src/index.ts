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
import { basename, join } from 'path';
import { randomUUID } from 'crypto';

import { OutputDestinationDialog } from '@/cli/dialogs/output-destination';
import { PresetManagementMenu } from '@/cli/menus/preset-management-menu';
import { SettingsMenu } from '@/cli/menus/settings-menu';
import { config } from './config/config';
import { db } from './db/database';
import { ffmpeg } from './media/ffmpeg';
import { downloader } from './media/downloader';
import { presets } from './utils/presets';
import { logger, organizer } from './utils/logger';
import { visualizer } from './utils/visualizer';
import { cli } from './cli/interface';
import type { TimeClip, OutputFormat, MenuOption, VideoPresetKey, VideoOutputFormat, VideoResolution, VideoQualityMode, GifWebpPresetKey, ImageOutputFormat, GifWebpConversionOptions } from './types';
import { QUALITY_PRESETS, OUTPUT_FORMATS } from './types';
import { VIDEO_TRANSCODE_PRESETS } from './media/video-presets';
import { GIF_WEBP_PRESETS } from './media/gif-webp-presets';

const VERSION = '1.0.0';

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
  --resolution <size>     Video resolution: source, 1080p, 720p
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

async function runInteractiveMode(): Promise<void> {
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

  // Main menu loop
  while (true) {
    const menuOptions: MenuOption[] = [
      { key: '1', label: 'Extract Audio', description: 'Convert video/audio to audio format', action: handleExtractAudio },
      { key: '2', label: 'Clip Audio', description: 'Extract specific time segments', action: handleClipAudio },
      { key: '3', label: 'Download & Extract', description: 'Download from URL and extract audio', action: handleUrlDownload },
      { key: '4', label: 'Batch Process', description: 'Process multiple files', action: handleBatchProcess },
      { key: '5', label: 'Extract Chapters', description: 'Split by metadata chapters', action: handleChapterExtraction },
      { key: '6', label: 'Split by Silence', description: 'Auto-split at silent points', action: handleSilenceSplit },
      { key: '7', label: 'Transcode Video', description: 'Convert video to WebM/MP4/MKV', action: handleVideoTranscode },
      { key: '8', label: 'Convert to GIF/WebP', description: 'Create animated GIFs or WebP images', action: handleGifWebpConvert },
      { key: '9', label: 'Manage Presets', description: 'Save/load clip time presets', action: handlePresetManagement },
      { key: '10', label: 'View History', description: 'See recent conversions', action: handleViewHistory },
      { key: '11', label: 'Settings', description: 'Configure default options', action: handleSettings },
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

// ==================== Interactive Mode Handlers ====================

async function handleExtractAudio(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  // User chose to go back
  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  // Get media info
  const infoResult = await cli.withSpinner('Analyzing media file...', () => ffmpeg.getMediaInfo(inputPath));

  if (infoResult.success && infoResult.data) {
    cli.box('Media Information', [
      `Duration: ${ffmpeg.formatTime(infoResult.data.duration || 0)}`,
      `Format: ${infoResult.data.format}`,
      `Bitrate: ${Math.round((infoResult.data.bitrate || 0) / 1000)} kbps`,
      `Channels: ${infoResult.data.channels}`,
      infoResult.data.chapters ? `Chapters: ${infoResult.data.chapters.length}` : ''
    ].filter(Boolean));
  }

  // Select format and quality
  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();

  // Output path
  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForSingleOutput({
    format,
    defaultBaseName: baseName,
    defaultDir: config.get('defaultOutputDir'),
    allowRename: true,
    allowCustomPath: true
  });
  const outputPath = outputChoice.outputPath || organizer.getOutputPath(baseName, format);

  // Confirm and execute
  const dryRun = await cli.confirm('Dry run first?', false);

  const jobId = randomUUID();
  const result = await cli.withSpinner('Extracting audio...', () =>
    ffmpeg.extractAudio(inputPath, outputPath, { format, quality, dryRun })
  );

  if (result.success) {
    cli.success(`Audio extracted: ${result.data!.outputPath}`);

    if (dryRun) {
      console.log(`\nCommand: ${result.data!.command}\n`);
      if (await cli.confirm('Execute for real?')) {
        const realResult = await ffmpeg.extractAudio(inputPath, outputPath, { format, quality, dryRun: false });
        if (realResult.success) {
          cli.success(`Audio saved: ${realResult.data!.outputPath}`);
          logProcess(jobId, inputPath, realResult.data!.outputPath, format, quality, 'completed');
        }
      }
    } else {
      logProcess(jobId, inputPath, result.data!.outputPath, format, quality, 'completed');
    }
  } else {
    cli.error(result.error || 'Extraction failed');
  }
}

async function handleClipAudio(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  // User chose to go back
  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  // Get media info and show waveform
  const infoResult = await ffmpeg.getMediaInfo(inputPath);
  if (infoResult.success && infoResult.data) {
    console.log(`\nDuration: ${ffmpeg.formatTime(infoResult.data.duration || 0)}\n`);

    if (await cli.confirm('Show waveform?', false)) {
      const waveformResult = await cli.withSpinner('Generating waveform...', () => ffmpeg.getWaveformData(inputPath));
      if (waveformResult.success && waveformResult.data) {
        console.log(visualizer.renderCompact(waveformResult.data));
      }
    }
  }

  // Define clips
  const usePreset = await cli.confirm('Use a saved preset?', false);
  let clips: TimeClip[] = [];

  if (usePreset) {
    const allPresets = presets.getAll();
    if (!allPresets.success || !allPresets.data || allPresets.data.length === 0) {
      cli.warn('No presets saved. Please define clips manually.');
      clips = await cli.promptMultipleClips();
    } else {
      const selected = await cli.selectFromList(
        'Select a preset',
        allPresets.data,
        (p) => `${p.name} (${p.clips.length} clips)`
      );
      clips = selected[0]?.clips || [];
    }
  } else {
    const multipleClips = await cli.confirm('Define multiple clips?', false);
    if (multipleClips) {
      clips = await cli.promptMultipleClips();
    } else {
      clips = [await cli.promptClip()];
    }
  }

  if (clips.length === 0) {
    cli.warn('No clips defined. Aborting.');
    return;
  }

  // Select format and quality
  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();

  // Output directory
  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: baseName,
    defaultDir: config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });
  const outputDir = outputChoice.outputDir;

  // Execute
  const jobId = randomUUID();
  const result = await cli.withSpinner(`Extracting ${clips.length} clip(s)...`, () =>
    ffmpeg.extractMultipleClips(inputPath, clips, outputDir, {
      format,
      quality,
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    cli.success(`Created ${result.data!.outputs.length} clips`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));

    // Offer to save as preset
    if (!usePreset && await cli.confirm('Save these clips as a preset?', false)) {
      const presetName = await cli.prompt('Preset name');
      presets.createFromClips(presetName, clips);
      cli.success(`Preset "${presetName}" saved`);
    }

    logProcess(jobId, inputPath, outputDir, format, quality, 'completed');
  } else {
    cli.error(result.error || 'Clipping failed');
  }
}

async function handleUrlDownload(): Promise<void> {
  // Check yt-dlp availability
  const ytdlpAvailable = await downloader.isYtdlpAvailable();
  if (!ytdlpAvailable) {
    cli.error('yt-dlp is not installed. Please install it to download from URLs.');
    cli.info('Install with: pip install yt-dlp');
    return;
  }

  const url = await cli.prompt('Enter URL');

  // Get metadata
  cli.info('Fetching video information...');
  const metaResult = await downloader.getUrlMetadata(url);

  if (metaResult.success && metaResult.data) {
    cli.box('Video Information', [
      `Title: ${metaResult.data.title}`,
      `Duration: ${ffmpeg.formatTime(metaResult.data.duration || 0)}`,
      metaResult.data.artist ? `Uploader: ${metaResult.data.artist}` : '',
      metaResult.data.chapters ? `Chapters: ${metaResult.data.chapters.length}` : ''
    ].filter(Boolean));
  }

  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();

  // Download
  const jobId = randomUUID();
  const downloadResult = await cli.withSpinner('Downloading...', () =>
    downloader.downloadAudio(url, { format: format as 'mp3' | 'aac' | 'm4a' | 'opus' | 'flac' | 'wav' | 'webm' })
  );

  if (!downloadResult.success) {
    cli.error(downloadResult.error || 'Download failed');
    return;
  }

  // Ask about clipping
  if (await cli.confirm('Clip the downloaded audio?', false)) {
    const clips = await cli.promptMultipleClips();
    const outputDir = getDefaultOutputDir();

    const clipResult = await ffmpeg.extractMultipleClips(
      downloadResult.data!.path,
      clips,
      outputDir,
      { format, quality }
    );

    if (clipResult.success) {
      cli.success(`Created ${clipResult.data!.outputs.length} clips`);
      clipResult.data!.outputs.forEach(p => console.log(`  → ${p}`));
    }
  } else {
    cli.success(`Downloaded: ${downloadResult.data!.path}`);
  }

  logProcess(jobId, url, downloadResult.data!.path, format, quality, 'completed');
}

async function handleBatchProcess(): Promise<void> {
  const useFzf = await cli.confirm('Use FZF to browse and select files?', true);
  let selectedFiles: string[] = [];

  if (useFzf) {
    // Use FZF for file selection
    selectedFiles = await cli.selectMediaFiles(process.cwd());

    // User chose to go back or canceled
    if (selectedFiles.length === 0) {
      return;
    }

    cli.info(`Selected ${selectedFiles.length} files`);
  } else {
    // Traditional directory-based approach
    const inputDir = await cli.prompt('Enter input directory');

    if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) {
      cli.error(`Not a valid directory: ${inputDir}`);
      return;
    }

    // Find media files
    const extensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac'];
    const files: string[] = [];

    for await (const entry of Bun.glob(`*.{${extensions.join(',')}}`).scan(inputDir)) {
      files.push(join(inputDir, entry));
    }

    if (files.length === 0) {
      cli.warn('No media files found in directory.');
      return;
    }

    cli.info(`Found ${files.length} media files`);

    // Select files to process
    selectedFiles = await cli.selectFromList(
      'Select files to process',
      files,
      (f) => basename(f),
      true
    );

    if (selectedFiles.length === 0) {
      cli.warn('No files selected.');
      return;
    }
  }

  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: 'output',
    defaultDir: config.get('defaultOutputDir'),
    allowRename: false
  });
  const outputDir = outputChoice.outputDir;

  // Process files
  let completed = 0;
  let failed = 0;

  for (const file of selectedFiles) {
    const baseName = basename(file).replace(/\.[^.]+$/, '');
    const outputPath = organizer.getOutputPath(baseName, format, { customDir: outputDir });

    logger.progress(completed + failed + 1, selectedFiles.length, basename(file));

    const result = await ffmpeg.extractAudio(file, outputPath, { format, quality });

    if (result.success) {
      completed++;
      logProcess(randomUUID(), file, outputPath, format, quality, 'completed');
    } else {
      failed++;
      logger.error(`Failed: ${basename(file)} - ${result.error}`);
    }
  }

  console.log();
  cli.success(`Batch complete: ${completed} succeeded, ${failed} failed`);
}

async function handleChapterExtraction(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  // User chose to go back
  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  // Get chapters
  const infoResult = await ffmpeg.getMediaInfo(inputPath);

  if (!infoResult.success || !infoResult.data?.chapters || infoResult.data.chapters.length === 0) {
    cli.error('No chapters found in this file.');
    return;
  }

  // Display chapters
  cli.table(
    ['#', 'Title', 'Start', 'End', 'Duration'],
    infoResult.data.chapters.map((ch, idx) => [
      String(idx + 1),
      ch.title,
      ffmpeg.formatTime(ch.startTime),
      ffmpeg.formatTime(ch.endTime),
      ffmpeg.formatTime(ch.endTime - ch.startTime)
    ])
  );

  const extractAll = await cli.confirm('Extract all chapters?');
  let chapterIndices: number[] | undefined;

  if (!extractAll) {
    const input = await cli.prompt('Enter chapter numbers (comma-separated)');
    chapterIndices = input.split(',').map(s => parseInt(s.trim()) - 1);
  }

  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: basename(inputPath).replace(/\.[^.]+$/, ''),
    defaultDir: config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });
  const outputDir = outputChoice.outputDir;

  const result = await cli.withSpinner('Extracting chapters...', () =>
    ffmpeg.extractChapters(inputPath, outputDir, {
      format,
      quality,
      chapterIndices,
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    cli.success(`Extracted ${result.data!.outputs.length} chapters`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));
  } else {
    cli.error(result.error || 'Chapter extraction failed');
  }
}

async function handleSilenceSplit(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  // User chose to go back
  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  // Get options
  const threshold = await cli.prompt('Silence threshold (dB)', '-30');
  const minSilence = await cli.prompt('Minimum silence duration (seconds)', '0.5');
  const minSegment = await cli.prompt('Minimum segment duration (seconds)', '5');

  const format = await cli.selectFormat();
  const quality = await cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: basename(inputPath).replace(/\.[^.]+$/, ''),
    defaultDir: config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });
  const outputDir = outputChoice.outputDir;

  // Detect silence first
  cli.info('Analyzing audio for silence...');
  const silenceResult = await ffmpeg.detectSilence(inputPath, {
    noiseThreshold: `${threshold}dB`,
    minDuration: parseFloat(minSilence)
  });

  if (!silenceResult.success || !silenceResult.data || silenceResult.data.length === 0) {
    cli.warn('No silence detected. Try adjusting the threshold.');
    return;
  }

  cli.info(`Found ${silenceResult.data.length} silent segments`);

  if (!await cli.confirm('Proceed with splitting?')) {
    return;
  }

  const result = await cli.withSpinner('Splitting audio...', () =>
    ffmpeg.splitBySilence(inputPath, outputDir, {
      format,
      quality,
      noiseThreshold: `${threshold}dB`,
      minSilenceDuration: parseFloat(minSilence),
      minSegmentDuration: parseFloat(minSegment),
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    cli.success(`Created ${result.data!.outputs.length} segments`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));
  } else {
    cli.error(result.error || 'Splitting failed');
  }
}

async function handleVideoTranscode(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  const presetKey = await cli.selectVideoPreset(config.get('defaultVideoPreset'));
  const resolution = await cli.selectVideoResolution(config.get('defaultVideoResolution'));
  const preset = VIDEO_TRANSCODE_PRESETS[presetKey];

  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputPath = organizer.getOutputPath(baseName, preset.container);

  const result = await cli.withSpinner('Transcoding video...', () =>
    ffmpeg.transcodeVideo(inputPath, outputPath, {
      presetKey,
      resolution,
      preserveMetadata: config.get('preserveMetadata')
    })
  );

  if (result.success) {
    cli.success(`Created: ${result.data!.outputPath}`);
    logVideoProcess(
      randomUUID(),
      inputPath,
      result.data!.outputPath,
      preset.container,
      presetKey,
      resolution,
      'completed'
    );
  } else {
    cli.error(`Failed: ${result.error}`);
  }
}

async function handleGifWebpConvert(): Promise<void> {
  const inputPath = await cli.selectMediaFile(process.cwd());

  if (!inputPath) {
    return;
  }

  if (!existsSync(inputPath)) {
    cli.error(`File not found: ${inputPath}`);
    return;
  }

  // Get media info
  const infoResult = await cli.withSpinner('Analyzing media file...', () => ffmpeg.getMediaInfo(inputPath));

  if (infoResult.success && infoResult.data) {
    cli.box('Media Information', [
      `Duration: ${ffmpeg.formatTime(infoResult.data.duration || 0)}`,
      `Format: ${infoResult.data.format}`,
      `Bitrate: ${Math.round((infoResult.data.bitrate || 0) / 1000)} kbps`
    ]);
  }

  // Select output format (GIF or WebP)
  const format = await cli.selectImageFormat();

  // Select preset or custom
  const presetKey = await cli.selectGifWebpPreset(format);

  let conversionOptions: Partial<GifWebpConversionOptions> = { format };

  if (presetKey !== 'custom') {
    // Use preset settings
    const preset = GIF_WEBP_PRESETS[presetKey as Exclude<GifWebpPresetKey, 'custom'>];
    conversionOptions = { ...conversionOptions, ...preset.settings };
    cli.info(`Using preset: ${preset.label}`);
  } else {
    // Configure custom settings
    const customOptions = await cli.configureGifWebpOptions(format);
    conversionOptions = { ...conversionOptions, ...customOptions };
  }

  // Prompt for clipping
  const clipOptions = await cli.promptGifWebpClip();
  if (clipOptions.startTime) {
    conversionOptions.startTime = clipOptions.startTime;
  }
  if (clipOptions.duration) {
    conversionOptions.duration = clipOptions.duration;
  }

  // Generate output path
  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(cli, organizer);
  const outputChoice = await outputDialog.promptForSingleOutput({
    format,
    defaultBaseName: baseName,
    defaultDir: config.get('defaultOutputDir'),
    allowRename: true,
    allowCustomPath: true
  });
  const outputPath = outputChoice.outputPath || organizer.getOutputPath(baseName, format);

  // Confirm and execute
  const dryRun = await cli.confirm('Dry run first?', false);

  const jobId = randomUUID();
  const result = await cli.withSpinner(`Converting to ${format.toUpperCase()}...`, () =>
    ffmpeg.convertToAnimatedImage(inputPath, outputPath, { ...conversionOptions, dryRun })
  );

  if (result.success) {
    cli.success(`Created: ${result.data!.outputPath}`);

    if (dryRun) {
      console.log(`\nCommand: ${result.data!.command}\n`);
      if (await cli.confirm('Execute for real?')) {
        const realResult = await ffmpeg.convertToAnimatedImage(inputPath, outputPath, { ...conversionOptions, dryRun: false });
        if (realResult.success) {
          cli.success(`Saved: ${realResult.data!.outputPath}`);
          logGifWebpProcess(jobId, inputPath, realResult.data!.outputPath, format, presetKey, 'completed');
        } else {
          cli.error(realResult.error || 'Conversion failed');
        }
      }
    } else {
      logGifWebpProcess(jobId, inputPath, result.data!.outputPath, format, presetKey, 'completed');

      // Offer to save custom settings as a preset
      if (presetKey === 'custom') {
        if (await cli.confirm('Save these settings as a custom preset?', false)) {
          cli.info('Custom GIF/WebP presets can be saved in Settings.');
        }
      }
    }
  } else {
    cli.error(result.error || 'Conversion failed');
  }
}

async function handlePresetManagement(): Promise<void> {
  const menu = new PresetManagementMenu(cli);
  const action = await menu.run();
  if (action) {
    await action();
  }
}

async function handleViewHistory(): Promise<void> {
  const records = db.getRecentProcesses(20);

  if (records.length === 0) {
    cli.info('No conversion history yet.');
    return;
  }

  cli.table(
    ['Date', 'Input', 'Format', 'Status'],
    records.map(r => [
      r.createdAt?.split('T')[0] || 'N/A',
      basename(r.inputPath).slice(0, 30),
      r.outputFormat,
      r.status
    ])
  );

  const stats = db.getProcessStats();
  cli.box('Statistics', [
    `Total conversions: ${stats.total}`,
    `Completed: ${stats.completed}`,
    `Failed: ${stats.failed}`,
    `Total output size: ${formatBytes(stats.totalSize)}`
  ]);
}

async function handleSettings(): Promise<void> {
  config.printConfig();

  const menu = new SettingsMenu(cli);
  const action = await menu.run();
  if (action) {
    await action();
  }
}

// ==================== Helper Functions ====================

function logProcess(
  jobId: string,
  inputPath: string,
  outputPath: string,
  format: OutputFormat,
  quality: string,
  status: string
): void {
  db.createProcess({
    jobId,
    inputPath,
    inputType: downloader.isUrl(inputPath) ? 'url' : 'file',
    outputPath,
    outputFormat: format,
    qualityPreset: quality,
    status,
    createdAt: new Date().toISOString()
  });

  logger.logToFile({
    jobId,
    inputPath,
    outputPath,
    outputFormat: format,
    qualityPreset: quality,
    status,
    createdAt: new Date().toISOString()
  });
}

function logVideoProcess(
  jobId: string,
  inputPath: string,
  outputPath: string,
  format: VideoOutputFormat,
  presetKey: VideoPresetKey,
  resolution: VideoResolution,
  status: string
): void {
  db.createProcess({
    jobId,
    inputPath,
    inputType: downloader.isUrl(inputPath) ? 'url' : 'file',
    outputPath,
    outputFormat: format,
    qualityPreset: presetKey,
    videoPreset: presetKey,
    videoResolution: resolution,
    videoOutputFormat: format,
    status,
    createdAt: new Date().toISOString()
  });

  logger.logToFile({
    jobId,
    inputPath,
    outputPath,
    outputFormat: format,
    qualityPreset: presetKey,
    videoPreset: presetKey,
    videoResolution: resolution,
    videoOutputFormat: format,
    status,
    createdAt: new Date().toISOString()
  });
}

function logGifWebpProcess(
  jobId: string,
  inputPath: string,
  outputPath: string,
  format: ImageOutputFormat,
  presetKey: GifWebpPresetKey | 'custom',
  status: string
): void {
  db.createProcess({
    jobId,
    inputPath,
    inputType: downloader.isUrl(inputPath) ? 'url' : 'file',
    outputPath,
    outputFormat: format,
    qualityPreset: presetKey,
    status,
    createdAt: new Date().toISOString()
  });

  logger.logToFile({
    jobId,
    inputPath,
    outputPath,
    outputFormat: format,
    qualityPreset: presetKey,
    status,
    createdAt: new Date().toISOString()
  });
}

function getDefaultOutputDir(): string {
  return process.cwd();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ==================== CLI Mode Handlers ====================

async function runCliMode(values: Record<string, unknown>, positionals: string[]): Promise<void> {
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
      if (!['source', '1080p', '720p'].includes(resolutionInput)) {
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
          logVideoProcess(randomUUID(), input, result.data!.outputPath, preset.container, presetKey, resolution, 'completed');
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
        const outputDir = values.output as string || getDefaultOutputDir();
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
      const outputDir = values.output as string || getDefaultOutputDir();
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
      const outputDir = values.output as string || getDefaultOutputDir();
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
        logProcess(randomUUID(), input, result.data!.outputPath, format, quality, 'completed');
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
    await handleViewHistory();
    process.exit(0);
  }

  if (values.stats) {
    const stats = db.getProcessStats();
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
    await runInteractiveMode();
  } else {
    await runCliMode(values, positionals);
  }

  cli.close();
}

// Run the application
main().catch((error) => {
  cli.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
