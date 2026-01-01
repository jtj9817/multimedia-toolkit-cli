/**
 * URL Downloader Module
 * Handles downloading media from URLs using yt-dlp
 */

import { config } from '../config/config';
import type { InputSource, MediaMetadata, OperationResult } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';

export class MediaDownloader {
  private ytdlpPath: string;
  private tempDir: string;

  constructor() {
    this.ytdlpPath = config.get('ytdlpPath') || 'yt-dlp';
    this.tempDir = config.get('tempDir');
  }

  /**
   * Check if a string is a URL
   */
  isUrl(input: string): boolean {
    try {
      const url = new URL(input);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Detect the type of URL (YouTube, general stream, etc.)
   */
  detectUrlType(url: string): 'youtube' | 'stream' | 'direct' {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();

    // YouTube domains
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'youtube';
    }

    // Common streaming platforms supported by yt-dlp
    const streamingPlatforms = [
      'vimeo.com', 'dailymotion.com', 'twitch.tv', 'twitter.com',
      'x.com', 'facebook.com', 'instagram.com', 'tiktok.com',
      'soundcloud.com', 'bandcamp.com', 'mixcloud.com'
    ];

    if (streamingPlatforms.some(p => host.includes(p))) {
      return 'stream';
    }

    // Check for direct media file extensions
    const path = urlObj.pathname.toLowerCase();
    const mediaExtensions = ['.mp4', '.mkv', '.webm', '.mp3', '.m4a', '.wav', '.flac', '.ogg'];
    if (mediaExtensions.some(ext => path.endsWith(ext))) {
      return 'direct';
    }

    // Default to stream (let yt-dlp try to handle it)
    return 'stream';
  }

  /**
   * Get metadata from URL without downloading
   */
  async getUrlMetadata(url: string): Promise<OperationResult<MediaMetadata & { title: string; formats?: unknown[] }>> {
    try {
      const proc = Bun.spawn([
        this.ytdlpPath,
        '--dump-json',
        '--no-download',
        url
      ], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `Failed to get URL metadata: ${error}` };
      }

      const data = JSON.parse(output);

      const metadata: MediaMetadata & { title: string; formats?: unknown[] } = {
        title: data.title || 'Unknown',
        artist: data.uploader || data.artist || data.creator,
        album: data.album,
        duration: data.duration,
        format: data.ext,
        formats: data.formats
      };

      // Extract chapters if available
      if (data.chapters && Array.isArray(data.chapters)) {
        metadata.chapters = data.chapters.map((ch: { title: string; start_time: number; end_time: number }, idx: number) => ({
          id: idx,
          title: ch.title || `Chapter ${idx + 1}`,
          startTime: ch.start_time,
          endTime: ch.end_time
        }));
      }

      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: `Failed to get URL metadata: ${error}` };
    }
  }

  /**
   * Download media from URL
   */
  async downloadMedia(
    url: string,
    options: {
      outputPath?: string;
      audioOnly?: boolean;
      format?: string;
      quality?: 'best' | 'worst' | string;
    } = {}
  ): Promise<OperationResult<InputSource>> {
    const {
      outputPath,
      audioOnly = true,
      format = 'mp3',
      quality = 'best'
    } = options;

    // Generate output path if not provided
    const finalOutputPath = outputPath || join(
      this.tempDir,
      `download_${Date.now()}.${audioOnly ? format : 'mp4'}`
    );

    const args: string[] = [
      '--no-playlist',
      '-o', finalOutputPath
    ];

    if (audioOnly) {
      if (format === 'webm') {
        args.push('-f', 'bestaudio[ext=webm]/bestaudio');
      } else {
        args.push(
          '-x',                          // Extract audio
          '--audio-format', format,      // Convert to format
          '--audio-quality', '0'         // Best quality
        );
      }
    } else {
      // Video download
      if (quality === 'best') {
        args.push('-f', 'bestvideo+bestaudio/best');
      } else if (quality === 'worst') {
        args.push('-f', 'worstvideo+worstaudio/worst');
      } else {
        args.push('-f', quality);
      }
    }

    args.push(url);

    try {
      console.log(`\n📥 Downloading from: ${url}`);
      console.log(`   Output: ${finalOutputPath}\n`);

      const proc = Bun.spawn([this.ytdlpPath, ...args], {
        stdout: 'inherit',  // Show progress
        stderr: 'pipe'
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `Download failed: ${error}` };
      }

      // yt-dlp might change the extension, find the actual file
      let actualPath = finalOutputPath;

      // Check common extension variations
      const possibleExtensions = [format, 'mp3', 'm4a', 'opus', 'webm', 'mp4'];
      const basePath = finalOutputPath.replace(/\.[^.]+$/, '');

      for (const ext of possibleExtensions) {
        const testPath = `${basePath}.${ext}`;
        if (existsSync(testPath)) {
          actualPath = testPath;
          break;
        }
      }

      // Also check if yt-dlp added extension
      if (!existsSync(actualPath)) {
        for (const ext of possibleExtensions) {
          const testPath = `${finalOutputPath}.${ext}`;
          if (existsSync(testPath)) {
            actualPath = testPath;
            break;
          }
        }
      }

      if (!existsSync(actualPath)) {
        return { success: false, error: `Download completed but file not found at expected path` };
      }

      const inputSource: InputSource = {
        type: this.detectUrlType(url),
        path: actualPath,
        originalUrl: url
      };

      return { success: true, data: inputSource };
    } catch (error) {
      return { success: false, error: `Download failed: ${error}` };
    }
  }

  /**
   * Download audio directly without video
   */
  async downloadAudio(
    url: string,
    options: {
      outputPath?: string;
      format?: 'mp3' | 'aac' | 'm4a' | 'opus' | 'flac' | 'wav' | 'webm';
    } = {}
  ): Promise<OperationResult<InputSource>> {
    return this.downloadMedia(url, {
      ...options,
      audioOnly: true,
      format: options.format || 'mp3'
    });
  }

  /**
   * List available formats for a URL
   */
  async listFormats(url: string): Promise<OperationResult<string>> {
    try {
      const proc = Bun.spawn([
        this.ytdlpPath,
        '-F',
        url
      ], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `Failed to list formats: ${error}` };
      }

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: `Failed to list formats: ${error}` };
    }
  }

  /**
   * Download a direct URL (not a streaming platform)
   */
  async downloadDirect(
    url: string,
    outputPath: string
  ): Promise<OperationResult<InputSource>> {
    try {
      console.log(`\n📥 Downloading: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        return { success: false, error: `HTTP error: ${response.status} ${response.statusText}` };
      }

      const buffer = await response.arrayBuffer();
      await Bun.write(outputPath, buffer);

      console.log(`   Saved to: ${outputPath}\n`);

      return {
        success: true,
        data: {
          type: 'url',
          path: outputPath,
          originalUrl: url
        }
      };
    } catch (error) {
      return { success: false, error: `Direct download failed: ${error}` };
    }
  }

  /**
   * Process input - determine if it's a file or URL and prepare it
   */
  async prepareInput(input: string): Promise<OperationResult<InputSource>> {
    // Check if it's a local file
    if (existsSync(input)) {
      return {
        success: true,
        data: {
          type: 'file',
          path: input
        }
      };
    }

    // Check if it's a URL
    if (this.isUrl(input)) {
      const urlType = this.detectUrlType(input);

      if (urlType === 'direct') {
        // Direct download for media file URLs
        const ext = input.split('.').pop() || 'mp4';
        const outputPath = join(this.tempDir, `direct_${Date.now()}.${ext}`);
        return this.downloadDirect(input, outputPath);
      } else {
        // Use yt-dlp for streaming platforms
        return this.downloadMedia(input, { audioOnly: false });
      }
    }

    return { success: false, error: `Input not found: ${input}` };
  }

  /**
   * Check if yt-dlp is available
   */
  async isYtdlpAvailable(): Promise<boolean> {
    try {
      const proc = Bun.spawn([this.ytdlpPath, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Update yt-dlp to latest version
   */
  async updateYtdlp(): Promise<OperationResult<string>> {
    try {
      const proc = Bun.spawn([this.ytdlpPath, '-U'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        return { success: false, error: `Update failed: ${error}` };
      }

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: `Update failed: ${error}` };
    }
  }
}

export const downloader = new MediaDownloader();
