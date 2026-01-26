/**
 * Interactive command implementations for main menu actions.
 */

import { existsSync, statSync } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';

import { OutputDestinationDialog } from '@/cli/dialogs/output-destination';
import { showHistory } from '@/cli/history';
import { PresetManagementMenu } from '@/cli/menus/preset-management-menu';
import { SettingsMenu } from '@/cli/menus/settings-menu';
import { buildExtractAudioPlan, buildGifWebpPlan } from '@/cli/commands/plans';
import type { Command, CommandContext } from '@/cli/commands/command';
import { GIF_WEBP_PRESETS } from '@/media/gif-webp-presets';
import { VIDEO_TRANSCODE_PRESETS } from '@/media/video-presets';
import type { GifWebpConversionOptions, TimeClip } from '@/types';
import { logAudioProcess, logGifWebpProcess, logVideoProcess } from '@/utils/process-logging';

class FunctionCommand implements Command {
  constructor(
    public id: string,
    public label: string,
    public description: string | undefined,
    private handler: (ctx: CommandContext) => Promise<void>
  ) {}

  async run(ctx: CommandContext): Promise<void> {
    await this.handler(ctx);
  }
}

export function createInteractiveCommands(): Command[] {
  return [
    new FunctionCommand('extract-audio', 'Extract Audio', 'Convert video/audio to audio format', runExtractAudio),
    new FunctionCommand('clip-audio', 'Clip Audio', 'Extract specific time segments', runClipAudio),
    new FunctionCommand('url-download', 'Download & Extract', 'Download from URL and extract audio', runUrlDownload),
    new FunctionCommand('batch-process', 'Batch Process', 'Process multiple files', runBatchProcess),
    new FunctionCommand('extract-chapters', 'Extract Chapters', 'Split by metadata chapters', runChapterExtraction),
    new FunctionCommand('split-silence', 'Split by Silence', 'Auto-split at silent points', runSilenceSplit),
    new FunctionCommand('video-transcode', 'Transcode Video', 'Convert video to WebM/MP4/MKV', runVideoTranscode),
    new FunctionCommand('gif-webp', 'Convert to GIF/WebP', 'Create animated GIFs or WebP images', runGifWebpConvert),
    new FunctionCommand('presets', 'Manage Presets', 'Save/load clip time presets', runPresetManagement),
    new FunctionCommand('history', 'View History', 'See recent conversions', runViewHistory),
    new FunctionCommand('settings', 'Settings', 'Configure default options', runSettings)
  ];
}

async function runExtractAudio(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());

  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const infoResult = await ctx.cli.withSpinner('Analyzing media file...', () => ctx.ffmpeg.getMediaInfo(inputPath));
  if (infoResult.success && infoResult.data) {
    ctx.cli.box('Media Information', [
      `Duration: ${ctx.ffmpeg.formatTime(infoResult.data.duration || 0)}`,
      `Format: ${infoResult.data.format}`,
      `Bitrate: ${Math.round((infoResult.data.bitrate || 0) / 1000)} kbps`,
      `Channels: ${infoResult.data.channels}`,
      infoResult.data.chapters ? `Chapters: ${infoResult.data.chapters.length}` : ''
    ].filter(Boolean));
  }

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();

  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForSingleOutput({
    format,
    defaultBaseName: baseName,
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    allowCustomPath: true
  });
  const outputPath = outputChoice.outputPath || ctx.organizer.getOutputPath(baseName, format);

  const dryRun = await ctx.cli.confirm('Dry run first?', false);
  const plan = buildExtractAudioPlan({
    inputPath,
    outputPath,
    format,
    quality,
    dryRun
  });

  const jobId = randomUUID();
  const result = await ctx.cli.withSpinner('Extracting audio...', () =>
    ctx.ffmpeg.extractAudio(plan.inputPath, plan.outputPath, {
      format: plan.format,
      quality: plan.quality,
      dryRun: plan.dryRun
    })
  );

  if (result.success) {
    ctx.cli.success(`Audio extracted: ${result.data!.outputPath}`);

    if (dryRun) {
      console.log(`\nCommand: ${result.data!.command}\n`);
      if (await ctx.cli.confirm('Execute for real?')) {
        const realResult = await ctx.ffmpeg.extractAudio(inputPath, outputPath, { format, quality, dryRun: false });
        if (realResult.success) {
          ctx.cli.success(`Audio saved: ${realResult.data!.outputPath}`);
          logAudioProcess(
            { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
            {
              jobId,
              inputPath,
              outputPath: realResult.data!.outputPath,
              format,
              quality,
              status: 'completed'
            }
          );
        }
      }
    } else {
      logAudioProcess(
        { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
        {
          jobId,
          inputPath,
          outputPath: result.data!.outputPath,
          format,
          quality,
          status: 'completed'
        }
      );
    }
  } else {
    ctx.cli.error(result.error || 'Extraction failed');
  }
}

async function runClipAudio(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());

  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const infoResult = await ctx.ffmpeg.getMediaInfo(inputPath);
  if (infoResult.success && infoResult.data) {
    console.log(`\nDuration: ${ctx.ffmpeg.formatTime(infoResult.data.duration || 0)}\n`);

    if (await ctx.cli.confirm('Show waveform?', false)) {
      const waveformResult = await ctx.cli.withSpinner('Generating waveform...', () => ctx.ffmpeg.getWaveformData(inputPath));
      if (waveformResult.success && waveformResult.data) {
        console.log(ctx.visualizer.renderCompact(waveformResult.data));
      }
    }
  }

  const usePreset = await ctx.cli.confirm('Use a saved preset?', false);
  let clips: TimeClip[] = [];

  if (usePreset) {
    const allPresets = ctx.presets.getAll();
    if (!allPresets.success || !allPresets.data || allPresets.data.length === 0) {
      ctx.cli.warn('No presets saved. Please define clips manually.');
      clips = await ctx.cli.promptMultipleClips();
    } else {
      const selected = await ctx.cli.selectFromList(
        'Select a preset',
        allPresets.data,
        (p) => `${p.name} (${p.clips.length} clips)`
      );
      clips = selected[0]?.clips || [];
    }
  } else {
    const multipleClips = await ctx.cli.confirm('Define multiple clips?', false);
    if (multipleClips) {
      clips = await ctx.cli.promptMultipleClips();
    } else {
      clips = [await ctx.cli.promptClip()];
    }
  }

  if (clips.length === 0) {
    ctx.cli.warn('No clips defined. Aborting.');
    return;
  }

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();

  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: baseName,
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });
  const outputDir = outputChoice.outputDir;

  const jobId = randomUUID();
  const result = await ctx.cli.withSpinner(`Extracting ${clips.length} clip(s)...`, () =>
    ctx.ffmpeg.extractMultipleClips(inputPath, clips, outputDir, {
      format,
      quality,
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    ctx.cli.success(`Created ${result.data!.outputs.length} clips`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));

    if (!usePreset && await ctx.cli.confirm('Save these clips as a preset?', false)) {
      const presetName = await ctx.cli.prompt('Preset name');
      ctx.presets.createFromClips(presetName, clips);
      ctx.cli.success(`Preset "${presetName}" saved`);
    }

    logAudioProcess(
      { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
      {
        jobId,
        inputPath,
        outputPath: outputDir,
        format,
        quality,
        status: 'completed'
      }
    );
  } else {
    ctx.cli.error(result.error || 'Clipping failed');
  }
}

async function runUrlDownload(ctx: CommandContext): Promise<void> {
  const ytdlpAvailable = await ctx.downloader.isYtdlpAvailable();
  if (!ytdlpAvailable) {
    ctx.cli.error('yt-dlp is not installed. Please install it to download from URLs.');
    ctx.cli.info('Install with: pip install yt-dlp');
    return;
  }

  const url = await ctx.cli.prompt('Enter URL');
  ctx.cli.info('Fetching video information...');
  const metaResult = await ctx.downloader.getUrlMetadata(url);

  if (metaResult.success && metaResult.data) {
    ctx.cli.box('Video Information', [
      `Title: ${metaResult.data.title}`,
      `Duration: ${ctx.ffmpeg.formatTime(metaResult.data.duration || 0)}`,
      metaResult.data.artist ? `Uploader: ${metaResult.data.artist}` : '',
      metaResult.data.chapters ? `Chapters: ${metaResult.data.chapters.length}` : ''
    ].filter(Boolean));
  }

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();

  const jobId = randomUUID();
  const downloadResult = await ctx.cli.withSpinner('Downloading...', () =>
    ctx.downloader.downloadAudio(url, { format: format as 'mp3' | 'aac' | 'm4a' | 'opus' | 'flac' | 'wav' | 'webm' })
  );

  if (!downloadResult.success) {
    ctx.cli.error(downloadResult.error || 'Download failed');
    return;
  }

  const downloadedPath = downloadResult.data!.path;

  if (await ctx.cli.confirm('Clip the downloaded audio?', false)) {
    const clips = await ctx.cli.promptMultipleClips();
    const baseName = basename(downloadedPath).replace(/\.[^.]+$/, '');
    const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
    const outputChoice = await outputDialog.promptForOutputDirectory({
      defaultBaseName: baseName,
      defaultDir: ctx.config.get('defaultOutputDir'),
      allowRename: true,
      renameLabel: 'Rename output prefix?'
    });

    const clipResult = await ctx.ffmpeg.extractMultipleClips(
      downloadedPath,
      clips,
      outputChoice.outputDir,
      { format, quality, baseFileName: outputChoice.baseName }
    );

    if (clipResult.success) {
      ctx.cli.success(`Created ${clipResult.data!.outputs.length} clips`);
      clipResult.data!.outputs.forEach(p => console.log(`  → ${p}`));
    }
  } else {
    ctx.cli.success(`Downloaded: ${downloadedPath}`);
  }

  logAudioProcess(
    { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
    {
      jobId,
      inputPath: url,
      outputPath: downloadedPath,
      format,
      quality,
      status: 'completed'
    }
  );
}

async function runBatchProcess(ctx: CommandContext): Promise<void> {
  const useFzf = await ctx.cli.confirm('Use FZF to browse and select files?', true);
  let selectedFiles: string[] = [];

  if (useFzf) {
    selectedFiles = await ctx.cli.selectMediaFiles(process.cwd());
    if (selectedFiles.length === 0) return;
    ctx.cli.info(`Selected ${selectedFiles.length} files`);
  } else {
    const inputDir = await ctx.cli.prompt('Enter input directory');
    if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) {
      ctx.cli.error(`Not a valid directory: ${inputDir}`);
      return;
    }

    const extensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac'];
    const files: string[] = [];

    for await (const entry of Bun.glob(`*.{${extensions.join(',')}}`).scan(inputDir)) {
      files.push(join(inputDir, entry));
    }

    if (files.length === 0) {
      ctx.cli.warn('No media files found in directory.');
      return;
    }

    ctx.cli.info(`Found ${files.length} media files`);
    selectedFiles = await ctx.cli.selectFromList(
      'Select files to process',
      files,
      (f) => basename(f),
      true
    );

    if (selectedFiles.length === 0) {
      ctx.cli.warn('No files selected.');
      return;
    }
  }

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: 'output',
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: false
  });
  const outputDir = outputChoice.outputDir;

  let completed = 0;
  let failed = 0;

  for (const file of selectedFiles) {
    const baseName = basename(file).replace(/\.[^.]+$/, '');
    const outputPath = ctx.organizer.getOutputPath(baseName, format, { customDir: outputDir });

    ctx.logger.progress(completed + failed + 1, selectedFiles.length, basename(file));

    const result = await ctx.ffmpeg.extractAudio(file, outputPath, { format, quality });

    if (result.success) {
      completed++;
      logAudioProcess(
        { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
        {
          jobId: randomUUID(),
          inputPath: file,
          outputPath,
          format,
          quality,
          status: 'completed'
        }
      );
    } else {
      failed++;
      ctx.logger.error(`Failed: ${basename(file)} - ${result.error}`);
    }
  }

  console.log();
  ctx.cli.success(`Batch complete: ${completed} succeeded, ${failed} failed`);
}

async function runChapterExtraction(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());
  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const infoResult = await ctx.ffmpeg.getMediaInfo(inputPath);
  if (!infoResult.success || !infoResult.data?.chapters || infoResult.data.chapters.length === 0) {
    ctx.cli.error('No chapters found in this file.');
    return;
  }

  ctx.cli.table(
    ['#', 'Title', 'Start', 'End', 'Duration'],
    infoResult.data.chapters.map((ch, idx) => [
      String(idx + 1),
      ch.title,
      ctx.ffmpeg.formatTime(ch.startTime),
      ctx.ffmpeg.formatTime(ch.endTime),
      ctx.ffmpeg.formatTime(ch.endTime - ch.startTime)
    ])
  );

  const extractAll = await ctx.cli.confirm('Extract all chapters?');
  let chapterIndices: number[] | undefined;
  if (!extractAll) {
    const input = await ctx.cli.prompt('Enter chapter numbers (comma-separated)');
    chapterIndices = input.split(',').map(s => parseInt(s.trim()) - 1);
  }

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: basename(inputPath).replace(/\.[^.]+$/, ''),
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });

  const result = await ctx.cli.withSpinner('Extracting chapters...', () =>
    ctx.ffmpeg.extractChapters(inputPath, outputChoice.outputDir, {
      format,
      quality,
      chapterIndices,
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    ctx.cli.success(`Extracted ${result.data!.outputs.length} chapters`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));
  } else {
    ctx.cli.error(result.error || 'Chapter extraction failed');
  }
}

async function runSilenceSplit(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());
  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const threshold = await ctx.cli.prompt('Silence threshold (dB)', '-30');
  const minSilence = await ctx.cli.prompt('Minimum silence duration (seconds)', '0.5');
  const minSegment = await ctx.cli.prompt('Minimum segment duration (seconds)', '5');

  const format = await ctx.cli.selectFormat();
  const quality = await ctx.cli.selectQuality();
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForOutputDirectory({
    defaultBaseName: basename(inputPath).replace(/\.[^.]+$/, ''),
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    renameLabel: 'Rename output prefix?'
  });

  ctx.cli.info('Analyzing audio for silence...');
  const silenceResult = await ctx.ffmpeg.detectSilence(inputPath, {
    noiseThreshold: `${threshold}dB`,
    minDuration: parseFloat(minSilence)
  });

  if (!silenceResult.success || !silenceResult.data || silenceResult.data.length === 0) {
    ctx.cli.warn('No silence detected. Try adjusting the threshold.');
    return;
  }

  ctx.cli.info(`Found ${silenceResult.data.length} silent segments`);
  if (!await ctx.cli.confirm('Proceed with splitting?')) {
    return;
  }

  const result = await ctx.cli.withSpinner('Splitting audio...', () =>
    ctx.ffmpeg.splitBySilence(inputPath, outputChoice.outputDir, {
      format,
      quality,
      noiseThreshold: `${threshold}dB`,
      minSilenceDuration: parseFloat(minSilence),
      minSegmentDuration: parseFloat(minSegment),
      baseFileName: outputChoice.baseName
    })
  );

  if (result.success) {
    ctx.cli.success(`Created ${result.data!.outputs.length} segments`);
    result.data!.outputs.forEach(p => console.log(`  → ${p}`));
  } else {
    ctx.cli.error(result.error || 'Splitting failed');
  }
}

async function runVideoTranscode(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());
  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const presetKey = await ctx.cli.selectVideoPreset(ctx.config.get('defaultVideoPreset'));
  const resolution = await ctx.cli.selectVideoResolution(ctx.config.get('defaultVideoResolution'));
  const preset = VIDEO_TRANSCODE_PRESETS[presetKey];

  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForSingleOutput({
    format: preset.container,
    defaultBaseName: baseName,
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    allowCustomPath: true
  });
  const outputPath = outputChoice.outputPath || ctx.organizer.getOutputPath(baseName, preset.container);

  const result = await ctx.cli.withSpinner('Transcoding video...', () =>
    ctx.ffmpeg.transcodeVideo(inputPath, outputPath, {
      presetKey,
      resolution,
      preserveMetadata: ctx.config.get('preserveMetadata')
    })
  );

  if (result.success) {
    ctx.cli.success(`Created: ${result.data!.outputPath}`);
    logVideoProcess(
      { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
      {
        jobId: randomUUID(),
        inputPath,
        outputPath: result.data!.outputPath,
        format: preset.container,
        presetKey,
        resolution,
        status: 'completed'
      }
    );
  } else {
    ctx.cli.error(`Failed: ${result.error}`);
  }
}

async function runGifWebpConvert(ctx: CommandContext): Promise<void> {
  const inputPath = await ctx.cli.selectMediaFile(process.cwd());
  if (!inputPath) return;
  if (!existsSync(inputPath)) {
    ctx.cli.error(`File not found: ${inputPath}`);
    return;
  }

  const infoResult = await ctx.cli.withSpinner('Analyzing media file...', () => ctx.ffmpeg.getMediaInfo(inputPath));
  if (infoResult.success && infoResult.data) {
    ctx.cli.box('Media Information', [
      `Duration: ${ctx.ffmpeg.formatTime(infoResult.data.duration || 0)}`,
      `Format: ${infoResult.data.format}`,
      `Bitrate: ${Math.round((infoResult.data.bitrate || 0) / 1000)} kbps`
    ]);
  }

  const format = await ctx.cli.selectImageFormat();
  const presetKey = await ctx.cli.selectGifWebpPreset(format);

  let conversionOptions: Partial<GifWebpConversionOptions> = { format };
  if (presetKey !== 'custom') {
    const preset = GIF_WEBP_PRESETS[presetKey];
    conversionOptions = { ...conversionOptions, ...preset.settings };
    ctx.cli.info(`Using preset: ${preset.label}`);
  } else {
    const customOptions = await ctx.cli.configureGifWebpOptions(format);
    conversionOptions = { ...conversionOptions, ...customOptions };
  }

  const clipOptions = await ctx.cli.promptGifWebpClip();
  if (clipOptions.startTime) {
    conversionOptions.startTime = clipOptions.startTime;
  }
  if (clipOptions.duration) {
    conversionOptions.duration = clipOptions.duration;
  }

  const baseName = basename(inputPath).replace(/\.[^.]+$/, '');
  const outputDialog = new OutputDestinationDialog(ctx.cli, ctx.organizer, ctx.config);
  const outputChoice = await outputDialog.promptForSingleOutput({
    format,
    defaultBaseName: baseName,
    defaultDir: ctx.config.get('defaultOutputDir'),
    allowRename: true,
    allowCustomPath: true
  });
  const outputPath = outputChoice.outputPath || ctx.organizer.getOutputPath(baseName, format);

  const dryRun = await ctx.cli.confirm('Dry run first?', false);
  const plan = buildGifWebpPlan({
    inputPath,
    outputPath,
    format,
    presetKey,
    options: conversionOptions,
    dryRun
  });

  const jobId = randomUUID();
  const result = await ctx.cli.withSpinner(`Converting to ${format.toUpperCase()}...`, () =>
    ctx.ffmpeg.convertToAnimatedImage(plan.inputPath, plan.outputPath, { ...plan.options, dryRun: plan.dryRun })
  );

  if (result.success) {
    ctx.cli.success(`Created: ${result.data!.outputPath}`);

    if (dryRun) {
      console.log(`\nCommand: ${result.data!.command}\n`);
      if (await ctx.cli.confirm('Execute for real?')) {
        const realResult = await ctx.ffmpeg.convertToAnimatedImage(inputPath, outputPath, { ...conversionOptions, dryRun: false });
        if (realResult.success) {
          ctx.cli.success(`Saved: ${realResult.data!.outputPath}`);
          logGifWebpProcess(
            { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
            {
              jobId,
              inputPath,
              outputPath: realResult.data!.outputPath,
              format,
              presetKey,
              status: 'completed'
            }
          );
        } else {
          ctx.cli.error(realResult.error || 'Conversion failed');
        }
      }
    } else {
      logGifWebpProcess(
        { db: ctx.db, logger: ctx.logger, now: ctx.clock.now },
        {
          jobId,
          inputPath,
          outputPath: result.data!.outputPath,
          format,
          presetKey,
          status: 'completed'
        }
      );

      if (presetKey === 'custom') {
        if (await ctx.cli.confirm('Save these settings as a custom preset?', false)) {
          ctx.cli.info('Custom GIF/WebP presets can be saved in Settings.');
        }
      }
    }
  } else {
    ctx.cli.error(result.error || 'Conversion failed');
  }
}

async function runPresetManagement(ctx: CommandContext): Promise<void> {
  const menu = new PresetManagementMenu(ctx.cli, ctx.config, ctx.presets);
  const action = await menu.run();
  if (action) {
    await action();
  }
}

async function runViewHistory(ctx: CommandContext): Promise<void> {
  showHistory(ctx.cli, ctx.db);
}

async function runSettings(ctx: CommandContext): Promise<void> {
  ctx.config.printConfig();
  const menu = new SettingsMenu(ctx.cli, ctx.config);
  const action = await menu.run();
  if (action) {
    await action();
  }
}
