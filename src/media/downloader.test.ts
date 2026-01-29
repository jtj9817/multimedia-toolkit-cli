import { describe, expect, test, mock } from 'bun:test';
import { MediaDownloader } from '@/media/downloader';
import type { ProcessRunner } from '@/utils/process-runner';

const mockConfig = {
  get: (key: string) => {
    if (key === 'ytdlpPath') return 'yt-dlp';
    return '/tmp';
  }
} as any;

const mockRun = mock(() => Promise.resolve({ 
  exitCode: 0, 
  stdout: JSON.stringify({ title: 'Test Video', uploader: 'Tester', duration: 60, ext: 'mp4' }), 
  stderr: '',
  timedOut: false,
  truncated: { stdout: false, stderr: false }
}));

const mockRunner: ProcessRunner = { run: mockRun };

describe('MediaDownloader', () => {
  const downloader = new MediaDownloader({ config: mockConfig, processRunner: mockRunner });

  test('isUrl identifies URLs correctly', () => {
    expect(downloader.isUrl('https://youtube.com/watch?v=123')).toBe(true);
    expect(downloader.isUrl('http://example.com/file.mp4')).toBe(true);
    expect(downloader.isUrl('/local/path/file.mp4')).toBe(false);
    expect(downloader.isUrl('not a url')).toBe(false);
  });

  test('detectUrlType identifies platforms', () => {
    expect(downloader.detectUrlType('https://youtube.com/watch?v=123')).toBe('youtube');
    expect(downloader.detectUrlType('https://youtu.be/123')).toBe('youtube');
    expect(downloader.detectUrlType('https://example.com/video.mp4')).toBe('direct');
    expect(downloader.detectUrlType('https://twitch.tv/streamer')).toBe('stream');
  });

  test('getUrlMetadata calls yt-dlp correctly', async () => {
    const url = 'https://youtube.com/watch?v=test';
    const result = await downloader.getUrlMetadata(url);

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Test Video');
    
    expect(mockRun).toHaveBeenCalled();
    const lastCall = mockRun.mock.calls[mockRun.mock.calls.length - 1];
    const args = lastCall[0] as string[];
    expect(args).toContain('yt-dlp');
    expect(args).toContain('--dump-json');
    expect(args).toContain(url);
  });
});
