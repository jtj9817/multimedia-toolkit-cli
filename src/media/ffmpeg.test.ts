import { describe, expect, test, mock } from 'bun:test';
import { FFmpegWrapper } from '@/media/ffmpeg';
import type { AppConfig } from '@/types';

// Mock config
const mockConfig = {
  get: (key: string) => {
    if (key === 'ffmpegPath') return 'ffmpeg';
    return undefined;
  }
} as any;

const mockRunner = {
  run: mock(() => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' }))
} as any;

describe('FFmpegWrapper - transcodeVideo', () => {
  const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: mockRunner });

  test('transcodeVideo exists', () => {
    expect(typeof ffmpeg.transcodeVideo).toBe('function');
  });

  test('builds correct command for dry-run', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    // Expect the command to contain key flags
    const command = result.data!.command;
    expect(command).toContain('ffmpeg');
    expect(command).toContain('-i input.mov');
    expect(command).toContain('output.webm');
    // Verify WebM specific flags from preset
    expect(command).toContain('-c:v libvpx-vp9');
    expect(command).toContain('-c:a libopus');
  });

  test('builds correct command for any-to-mp4', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.mp4', {
      presetKey: 'any-to-mp4',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain('-c:v libx264');
    expect(command).toContain('-c:a aac');
    expect(command).toContain('-f mp4');
  });

  test('builds correct command for any-to-mkv', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.mkv', {
      presetKey: 'any-to-mkv',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain('-c:v libx264');
    expect(command).toContain('-c:a aac');
    expect(command).toContain('-f mkv');
  });

  test('applies resolution scaling filter', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      resolution: '720p',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    // 720p is 1280x720
    expect(command).toContain('-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2');
  });

  test('includes WebM optimized audio flags', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain('-vbr on');
    expect(command).toContain('-compression_level 10');
    expect(command).toContain('-application audio');
  });
});
