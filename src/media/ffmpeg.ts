/**
 * FFmpeg Wrapper Module
 * Handles all audio extraction, conversion, and manipulation operations
 */

import { config } from '../config/config';
import type {
  MediaMetadata,
  Chapter,
  TimeClip,
  QualityPreset,
  OutputFormat,
  SilenceSegment,
  WaveformData,
  OperationResult,
  VideoPresetKey,
  VideoTranscodeOptions,
  VideoTranscodePreset,
  VideoScaleSettings
} from '../types';
import { QUALITY_PRESETS } from '../types';
import { VIDEO_TRANSCODE_PRESETS } from './video-presets';

const WEBM_OPUS_ARGS = ['-vbr', 'on', '-compression_level', '10', '-application', 'audio'];
const VIDEO_RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 }
};

export class FFmpegWrapper {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    this.ffmpegPath = config.get('ffmpegPath') || 'ffmpeg';
    this.ffprobePath = config.get('ffprobePath') || 'ffprobe';
  }

  /**
   * Get detailed metadata about a media file
   */
  async getMediaInfo(inputPath: string): Promise<OperationResult<MediaMetadata>> {
    try {
      const proc = Bun.spawn([
        this.ffprobePath,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-show_chapters',
        inputPath
      ], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `FFprobe failed: ${error}` };
      }

      const data = JSON.parse(output);
      const format = data.format || {};
      const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');
      const chapters: Chapter[] = (data.chapters || []).map((ch: { id: number; tags?: { title?: string }; start_time: string; end_time: string }, idx: number) => ({
        id: idx,
        title: ch.tags?.title || `Chapter ${idx + 1}`,
        startTime: parseFloat(ch.start_time),
        endTime: parseFloat(ch.end_time)
      }));

      const metadata: MediaMetadata = {
        title: format.tags?.title,
        artist: format.tags?.artist,
        album: format.tags?.album,
        duration: parseFloat(format.duration) || 0,
        bitrate: parseInt(format.bit_rate) || 0,
        sampleRate: audioStream ? parseInt(audioStream.sample_rate) : undefined,
        channels: audioStream?.channels,
        format: format.format_name,
        chapters: chapters.length > 0 ? chapters : undefined
      };

      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: `Failed to get media info: ${error}` };
    }
  }

  /**
   * Get duration of a media file in seconds
   */
  async getDuration(inputPath: string): Promise<number> {
    const result = await this.getMediaInfo(inputPath);
    return result.success ? result.data!.duration || 0 : 0;
  }

  /**
   * Extract audio from media file
   */
  async extractAudio(
    inputPath: string,
    outputPath: string,
    options: {
      format?: OutputFormat;
      quality?: string | QualityPreset;
      clip?: TimeClip;
      preserveMetadata?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ command: string; outputPath: string }>> {
    const {
      format = 'mp3',
      quality = 'music_medium',
      clip,
      preserveMetadata = config.get('preserveMetadata'),
      dryRun = false
    } = options;

    // Get quality settings
    const qualityPreset = typeof quality === 'string' ? QUALITY_PRESETS[quality] : quality;
    if (!qualityPreset) {
      return { success: false, error: `Unknown quality preset: ${quality}` };
    }

    // Build FFmpeg command
    const args: string[] = ['-y']; // Overwrite output

    // Add clipping options (placed before -i for input seeking, after for output seeking)
    if (clip) {
      // Use -ss before -i for fast seeking
      if (clip.startTime) {
        args.push('-ss', clip.startTime);
      }
    }

    args.push('-i', inputPath);

    // Duration/end time (after -i for precise cutting)
    if (clip) {
      if (clip.duration) {
        args.push('-t', String(clip.duration));
      } else if (clip.endTime) {
        args.push('-to', clip.endTime);
      }
    }

    // No video
    args.push('-vn');

    // Audio codec based on format
    const codecMap: Record<OutputFormat, string> = {
      mp3: 'libmp3lame',
      aac: 'aac',
      ogg: 'libvorbis',
      opus: 'libopus',
      flac: 'flac',
      wav: 'pcm_s16le',
      webm: 'libopus'
    };

    args.push('-acodec', codecMap[format] || 'libmp3lame');

    // Quality settings (not for lossless formats)
    if (format !== 'flac' && format !== 'wav') {
      args.push('-ar', String(qualityPreset.sampleRate));
      args.push('-ac', String(qualityPreset.channels));
      if (qualityPreset.bitrate !== '0') {
        args.push('-b:a', qualityPreset.bitrate);
      }
    }

    // Metadata handling
    if (!preserveMetadata) {
      args.push('-map_metadata', '-1');
    }

    if (format === 'webm') {
      if (qualityPreset.name === 'optimized_webm') {
        args.push(...WEBM_OPUS_ARGS);
      }
      args.push('-f', 'webm');
    }

    // Thread optimization
    args.push('-threads', '0');

    // Output file
    args.push(outputPath);

    const fullCommand = `${this.ffmpegPath} ${args.join(' ')}`;

    if (dryRun) {
      return {
        success: true,
        data: { command: fullCommand, outputPath },
        warnings: ['Dry run - command not executed']
      };
    }

    try {
      const proc = Bun.spawn([this.ffmpegPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `FFmpeg failed: ${error}` };
      }

      return { success: true, data: { command: fullCommand, outputPath } };
    } catch (error) {
      return { success: false, error: `Extraction failed: ${error}` };
    }
  }

  /**
   * Transcode video to another container/codec combination
   */
  async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: VideoTranscodeOptions = {}
  ): Promise<OperationResult<{ command: string; outputPath: string }>> {
    const preset = this.resolveVideoPreset(options);
    const preserveMetadata = options.preserveMetadata ?? config.get('preserveMetadata');

    const videoSettings = {
      ...preset.video,
      codec: options.videoCodec || preset.video.codec,
      qualityMode: options.qualityMode || preset.video.qualityMode,
      crf: options.crf ?? preset.video.crf,
      bitrate: options.bitrate ?? preset.video.bitrate,
      scale: {
        ...preset.video.scale,
        maxResolution: options.resolution || preset.video.scale.maxResolution
      }
    };

    const audioSettings = {
      ...preset.audio,
      codec: options.audioCodec || preset.audio.codec,
      bitrate: options.audioBitrate || preset.audio.bitrate
    };

    const args: string[] = ['-y', '-i', inputPath];

    const scaleFilter = this.buildScaleFilter(videoSettings.scale);
    if (scaleFilter) {
      args.push('-vf', scaleFilter);
    }

    args.push('-c:v', videoSettings.codec);

    if (videoSettings.pixelFormat) {
      args.push('-pix_fmt', videoSettings.pixelFormat);
    }

    if (videoSettings.qualityMode === 'crf' && videoSettings.crf !== undefined) {
      if (videoSettings.codec === 'libvpx-vp9') {
        args.push('-b:v', '0');
      }
      args.push('-crf', String(videoSettings.crf));
    } else if (videoSettings.qualityMode === 'bitrate' && videoSettings.bitrate) {
      args.push('-b:v', videoSettings.bitrate);
    }

    args.push('-c:a', audioSettings.codec);
    if (audioSettings.bitrate) {
      args.push('-b:a', audioSettings.bitrate);
    }
    if (audioSettings.sampleRate) {
      args.push('-ar', String(audioSettings.sampleRate));
    }
    if (audioSettings.channels) {
      args.push('-ac', String(audioSettings.channels));
    }
    if (audioSettings.ffmpegArgs?.length) {
      args.push(...audioSettings.ffmpegArgs);
    }

    if (!preserveMetadata) {
      args.push('-map_metadata', '-1');
    }

    args.push('-f', preset.container);
    args.push('-threads', '0');
    args.push(outputPath);

    const fullCommand = `${this.ffmpegPath} ${args.join(' ')}`;

    if (options.dryRun) {
      return {
        success: true,
        data: { command: fullCommand, outputPath },
        warnings: ['Dry run - command not executed']
      };
    }

    try {
      const proc = Bun.spawn([this.ffmpegPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `FFmpeg failed: ${error}` };
      }

      return { success: true, data: { command: fullCommand, outputPath } };
    } catch (error) {
      return { success: false, error: `Transcode failed: ${error}` };
    }
  }

  /**
   * Extract multiple clips from a single file
   */
  async extractMultipleClips(
    inputPath: string,
    clips: TimeClip[],
    outputDir: string,
    options: {
      format?: OutputFormat;
      quality?: string;
      baseFileName?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ outputs: string[]; commands: string[] }>> {
    const { format = 'mp3', quality = 'music_medium', baseFileName, dryRun = false } = options;

    const outputs: string[] = [];
    const commands: string[] = [];
    const errors: string[] = [];

    const baseName = baseFileName || inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'clip';

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipLabel = clip.label || `clip_${i + 1}`;
      const outputPath = `${outputDir}/${baseName}_${clipLabel}.${format}`;

      const result = await this.extractAudio(inputPath, outputPath, {
        format,
        quality,
        clip,
        dryRun
      });

      if (result.success) {
        outputs.push(result.data!.outputPath);
        commands.push(result.data!.command);
      } else {
        errors.push(`Clip ${i + 1}: ${result.error}`);
      }
    }

    if (errors.length > 0 && outputs.length === 0) {
      return { success: false, error: errors.join('\n') };
    }

    return {
      success: true,
      data: { outputs, commands },
      warnings: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Extract chapters as individual files
   */
  async extractChapters(
    inputPath: string,
    outputDir: string,
    options: {
      format?: OutputFormat;
      quality?: string;
      chapterIndices?: number[];
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ outputs: string[]; chapters: Chapter[] }>> {
    const { format = 'mp3', quality = 'music_medium', chapterIndices, dryRun = false } = options;

    // Get chapters
    const infoResult = await this.getMediaInfo(inputPath);
    if (!infoResult.success || !infoResult.data?.chapters || infoResult.data.chapters.length === 0) {
      return { success: false, error: 'No chapters found in media file' };
    }

    let chapters = infoResult.data.chapters;
    if (chapterIndices) {
      chapters = chapters.filter((_, idx) => chapterIndices.includes(idx));
    }

    // Convert chapters to clips
    const clips: TimeClip[] = chapters.map(ch => ({
      startTime: String(ch.startTime),
      endTime: String(ch.endTime),
      label: ch.title.replace(/[<>:"/\\|?*]/g, '_')
    }));

    const result = await this.extractMultipleClips(inputPath, clips, outputDir, {
      format,
      quality,
      dryRun
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: { outputs: result.data!.outputs, chapters },
      warnings: result.warnings
    };
  }

  /**
   * Detect silence in audio file
   */
  async detectSilence(
    inputPath: string,
    options: {
      noiseThreshold?: string; // in dB, default -30dB
      minDuration?: number;    // minimum silence duration in seconds
    } = {}
  ): Promise<OperationResult<SilenceSegment[]>> {
    const { noiseThreshold = '-30dB', minDuration = 0.5 } = options;

    try {
      const proc = Bun.spawn([
        this.ffmpegPath,
        '-i', inputPath,
        '-af', `silencedetect=noise=${noiseThreshold}:d=${minDuration}`,
        '-f', 'null',
        '-'
      ], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const stderr = await new Response(proc.stderr).text();
      await proc.exited;

      // Parse silence detection output
      const segments: SilenceSegment[] = [];
      const startRegex = /silence_start: ([\d.]+)/g;
      const endRegex = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;

      const starts: number[] = [];
      let match: RegExpExecArray | null;

      while ((match = startRegex.exec(stderr)) !== null) {
        starts.push(parseFloat(match[1]));
      }

      let i = 0;
      while ((match = endRegex.exec(stderr)) !== null) {
        segments.push({
          start: starts[i] || 0,
          end: parseFloat(match[1]),
          duration: parseFloat(match[2])
        });
        i++;
      }

      return { success: true, data: segments };
    } catch (error) {
      return { success: false, error: `Silence detection failed: ${error}` };
    }
  }

  /**
   * Split audio by silence
   */
  async splitBySilence(
    inputPath: string,
    outputDir: string,
    options: {
      format?: OutputFormat;
      quality?: string;
      noiseThreshold?: string;
      minSilenceDuration?: number;
      minSegmentDuration?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ outputs: string[]; segments: { start: number; end: number }[] }>> {
    const {
      format = 'mp3',
      quality = 'music_medium',
      noiseThreshold = '-30dB',
      minSilenceDuration = 0.5,
      minSegmentDuration = 5,
      dryRun = false
    } = options;

    // Detect silence
    const silenceResult = await this.detectSilence(inputPath, {
      noiseThreshold,
      minDuration: minSilenceDuration
    });

    if (!silenceResult.success || !silenceResult.data) {
      return { success: false, error: silenceResult.error || 'Failed to detect silence' };
    }

    // Get total duration
    const duration = await this.getDuration(inputPath);

    // Create segments between silence
    const segments: { start: number; end: number }[] = [];
    let lastEnd = 0;

    for (const silence of silenceResult.data) {
      if (silence.start - lastEnd >= minSegmentDuration) {
        segments.push({ start: lastEnd, end: silence.start });
      }
      lastEnd = silence.end;
    }

    // Add final segment
    if (duration - lastEnd >= minSegmentDuration) {
      segments.push({ start: lastEnd, end: duration });
    }

    if (segments.length === 0) {
      return { success: false, error: 'No segments found after silence detection' };
    }

    // Convert to clips
    const clips: TimeClip[] = segments.map((seg, idx) => ({
      startTime: String(seg.start),
      duration: seg.end - seg.start,
      label: `segment_${String(idx + 1).padStart(3, '0')}`
    }));

    const result = await this.extractMultipleClips(inputPath, clips, outputDir, {
      format,
      quality,
      dryRun
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: { outputs: result.data!.outputs, segments },
      warnings: result.warnings
    };
  }

  /**
   * Merge multiple audio files into one
   */
  async mergeAudioFiles(
    inputPaths: string[],
    outputPath: string,
    options: {
      format?: OutputFormat;
      quality?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ command: string; outputPath: string }>> {
    const { format = 'mp3', quality = 'music_medium', dryRun = false } = options;

    if (inputPaths.length < 2) {
      return { success: false, error: 'Need at least 2 files to merge' };
    }

    const qualityPreset = QUALITY_PRESETS[quality];
    if (!qualityPreset) {
      return { success: false, error: `Unknown quality preset: ${quality}` };
    }

    const codecMap: Record<OutputFormat, string> = {
      mp3: 'libmp3lame',
      aac: 'aac',
      ogg: 'libvorbis',
      opus: 'libopus',
      flac: 'flac',
      wav: 'pcm_s16le',
      webm: 'libopus'
    };

    // Create concat file content
    const concatContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    const concatFile = `${config.get('tempDir')}/concat_${Date.now()}.txt`;

    try {
      await Bun.write(concatFile, concatContent);

      const args: string[] = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-vn',
        '-acodec', codecMap[format] || 'libmp3lame',
        '-ar', String(qualityPreset.sampleRate),
        '-ac', String(qualityPreset.channels),
        '-b:a', qualityPreset.bitrate
      ];

      if (format === 'webm') {
        if (quality === 'optimized_webm') {
          args.push(...WEBM_OPUS_ARGS);
        }
        args.push('-f', 'webm');
      }

      args.push(outputPath);

      const fullCommand = `${this.ffmpegPath} ${args.join(' ')}`;

      if (dryRun) {
        // Clean up concat file
        await Bun.$`rm -f ${concatFile}`;
        return {
          success: true,
          data: { command: fullCommand, outputPath },
          warnings: ['Dry run - command not executed']
        };
      }

      const proc = Bun.spawn([this.ffmpegPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const exitCode = await proc.exited;

      // Clean up concat file
      await Bun.$`rm -f ${concatFile}`;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `Merge failed: ${error}` };
      }

      return { success: true, data: { command: fullCommand, outputPath } };
    } catch (error) {
      await Bun.$`rm -f ${concatFile}`.catch(() => {});
      return { success: false, error: `Merge failed: ${error}` };
    }
  }

  /**
   * Generate waveform data for visualization
   */
  async getWaveformData(
    inputPath: string,
    options: { samples?: number } = {}
  ): Promise<OperationResult<WaveformData>> {
    const { samples = 100 } = options;

    try {
      // Get duration first
      const duration = await this.getDuration(inputPath);
      if (duration === 0) {
        return { success: false, error: 'Could not determine file duration' };
      }

      // Extract audio levels using ffmpeg
      const proc = Bun.spawn([
        this.ffmpegPath,
        '-i', inputPath,
        '-af', `asetnsamples=n=${samples},astats=metadata=1:reset=1`,
        '-f', 'null',
        '-'
      ], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const stderr = await new Response(proc.stderr).text();
      await proc.exited;

      // Parse RMS levels from output
      const rmsRegex = /RMS level dB: ([-\d.]+)/g;
      const levels: number[] = [];
      let match: RegExpExecArray | null;

      while ((match = rmsRegex.exec(stderr)) !== null) {
        // Convert dB to linear scale (0-1)
        const db = parseFloat(match[1]);
        const linear = Math.pow(10, db / 20);
        levels.push(Math.min(1, Math.max(0, linear)));
      }

      // If we didn't get enough samples, generate simplified data
      if (levels.length < 10) {
        // Fall back to simpler volume detection
        const simpleProc = Bun.spawn([
          this.ffmpegPath,
          '-i', inputPath,
          '-af', 'volumedetect',
          '-f', 'null',
          '-'
        ], {
          stdout: 'pipe',
          stderr: 'pipe'
        });

        const simpleStderr = await new Response(simpleProc.stderr).text();
        await simpleProc.exited;

        const maxVolMatch = /max_volume: ([-\d.]+) dB/.exec(simpleStderr);
        const meanVolMatch = /mean_volume: ([-\d.]+) dB/.exec(simpleStderr);

        const maxVol = maxVolMatch ? parseFloat(maxVolMatch[1]) : -10;
        const meanVol = meanVolMatch ? parseFloat(meanVolMatch[1]) : -20;

        // Generate synthetic waveform based on volume stats
        for (let i = 0; i < samples; i++) {
          const variation = Math.sin(i * 0.5) * 0.2 + Math.random() * 0.1;
          const baseLevel = Math.pow(10, meanVol / 20);
          levels.push(Math.min(1, Math.max(0, baseLevel + variation)));
        }
      }

      return {
        success: true,
        data: {
          samples: levels,
          duration,
          sampleRate: Math.round(levels.length / duration)
        }
      };
    } catch (error) {
      return { success: false, error: `Waveform generation failed: ${error}` };
    }
  }

  /**
   * Preview a clip (extract first/last N seconds for playback)
   */
  async createPreview(
    inputPath: string,
    outputPath: string,
    options: {
      clip?: TimeClip;
      previewType: 'start' | 'end' | 'both';
      previewDuration?: number;
    }
  ): Promise<OperationResult<string>> {
    const { clip, previewType, previewDuration = 5 } = options;

    let startTime = 0;
    let endTime: number | undefined;

    if (clip) {
      startTime = this.parseTimeToSeconds(clip.startTime);
      if (clip.duration) {
        endTime = startTime + clip.duration;
      } else if (clip.endTime) {
        endTime = this.parseTimeToSeconds(clip.endTime);
      }
    } else {
      const duration = await this.getDuration(inputPath);
      endTime = duration;
    }

    let previewClip: TimeClip;

    switch (previewType) {
      case 'start':
        previewClip = {
          startTime: String(startTime),
          duration: previewDuration
        };
        break;
      case 'end':
        previewClip = {
          startTime: String(Math.max(startTime, (endTime || 0) - previewDuration)),
          duration: previewDuration
        };
        break;
      case 'both':
        // Create two clips and merge them
        const startClip: TimeClip = {
          startTime: String(startTime),
          duration: previewDuration
        };
        const endClip: TimeClip = {
          startTime: String(Math.max(startTime, (endTime || 0) - previewDuration)),
          duration: previewDuration
        };

        const tempDir = config.get('tempDir');
        const startFile = `${tempDir}/preview_start_${Date.now()}.mp3`;
        const endFile = `${tempDir}/preview_end_${Date.now()}.mp3`;

        await this.extractAudio(inputPath, startFile, { clip: startClip, quality: 'speech' });
        await this.extractAudio(inputPath, endFile, { clip: endClip, quality: 'speech' });

        const mergeResult = await this.mergeAudioFiles([startFile, endFile], outputPath, { quality: 'speech' });

        // Cleanup temp files
        await Bun.$`rm -f ${startFile} ${endFile}`.catch(() => {});

        if (!mergeResult.success) {
          return { success: false, error: mergeResult.error };
        }

        return { success: true, data: outputPath };
    }

    const result = await this.extractAudio(inputPath, outputPath, {
      clip: previewClip!,
      quality: 'speech'
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: outputPath };
  }

  /**
   * Convert multiple formats simultaneously
   */
  async convertToMultipleFormats(
    inputPath: string,
    outputDir: string,
    formats: OutputFormat[],
    options: {
      quality?: string;
      clip?: TimeClip;
      dryRun?: boolean;
    } = {}
  ): Promise<OperationResult<{ outputs: Record<OutputFormat, string> }>> {
    const { quality = 'music_medium', clip, dryRun = false } = options;

    const baseName = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'output';
    const outputs: Record<string, string> = {};
    const errors: string[] = [];

    // Run conversions in parallel
    const promises = formats.map(async (format) => {
      const outputPath = `${outputDir}/${baseName}_${Date.now()}.${format}`;
      const result = await this.extractAudio(inputPath, outputPath, {
        format,
        quality,
        clip,
        dryRun
      });

      if (result.success) {
        outputs[format] = result.data!.outputPath;
      } else {
        errors.push(`${format}: ${result.error}`);
      }
    });

    await Promise.all(promises);

    if (Object.keys(outputs).length === 0) {
      return { success: false, error: errors.join('\n') };
    }

    return {
      success: true,
      data: { outputs: outputs as Record<OutputFormat, string> },
      warnings: errors.length > 0 ? errors : undefined
    };
  }

  private resolveVideoPreset(options: VideoTranscodeOptions): VideoTranscodePreset {
    if (options.preset) {
      return options.preset;
    }

    const key = (options.presetKey || 'any-to-webm') as VideoPresetKey;
    return VIDEO_TRANSCODE_PRESETS[key] || VIDEO_TRANSCODE_PRESETS['any-to-webm'];
  }

  private buildScaleFilter(scale: VideoScaleSettings): string | null {
    if (!scale || scale.maxResolution === 'source') {
      return null;
    }

    const size = VIDEO_RESOLUTION_MAP[scale.maxResolution];
    if (!size) {
      return null;
    }

    const width = size.width;
    const height = size.height;

    if (!scale.preserveAspect || scale.policy === 'stretch') {
      return `scale=${width}:${height}`;
    }

    if (scale.policy === 'crop') {
      return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
    }

    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }

  /**
   * Helper to parse time string to seconds
   */
  private parseTimeToSeconds(time: string): number {
    // Already a number
    if (!isNaN(Number(time))) {
      return Number(time);
    }

    // HH:MM:SS or MM:SS format
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    return 0;
  }

  /**
   * Format seconds to HH:MM:SS
   */
  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

export const ffmpeg = new FFmpegWrapper();
