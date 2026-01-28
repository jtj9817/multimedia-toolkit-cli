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

describe('FFmpegWrapper - transcodeVideo', () => {
  const ffmpeg = new FFmpegWrapper({ config: mockConfig } as any);

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
});
