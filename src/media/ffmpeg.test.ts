import { describe, expect, test, mock } from 'bun:test';
import { FFmpegWrapper } from '@/media/ffmpeg';

// Mock config
const mockConfig = {
  get: (key: string) => {
    if (key === 'ffmpegPath') return 'ffmpeg';
    if (key === 'ffprobePath') return 'ffprobe';
    if (key === 'preserveMetadata') return true;
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
    expect(command).toContain('scale=1280:720:force_original_aspect_ratio=decrease');
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

  test('does not apply scaling when resolution is source', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      resolution: 'source',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).not.toContain('-vf scale=');
  });

  test('supports additional resolutions (2160p, 1440p, 480p)', async () => {
    const r2160 = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { resolution: '2160p', dryRun: true });
    expect(r2160.success).toBe(true);
    expect(r2160.data!.command).toContain('scale=3840:2160:force_original_aspect_ratio=decrease');

    const r1440 = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { resolution: '1440p', dryRun: true });
    expect(r1440.success).toBe(true);
    expect(r1440.data!.command).toContain('scale=2560:1440:force_original_aspect_ratio=decrease');

    const r480 = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { resolution: '480p', dryRun: true });
    expect(r480.success).toBe(true);
    expect(r480.data!.command).toContain('scale=854:480:force_original_aspect_ratio=decrease');
  });

  test('supports CRF and bitrate quality modes (webm)', async () => {
    const crf = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      qualityMode: 'crf',
      crf: 35,
      dryRun: true
    });
    expect(crf.success).toBe(true);
    expect(crf.data!.command).toContain('-crf 35');
    expect(crf.data!.command).toContain('-b:v 0');

    const bitrate = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      qualityMode: 'bitrate',
      bitrate: '1M',
      dryRun: true
    });
    expect(bitrate.success).toBe(true);
    expect(bitrate.data!.command).toContain('-b:v 1M');
    expect(bitrate.data!.command).not.toContain('-crf ');
  });

  test('supports CRF and bitrate quality modes (mp4)', async () => {
    const crf = await ffmpeg.transcodeVideo('input.mov', 'output.mp4', {
      presetKey: 'any-to-mp4',
      qualityMode: 'crf',
      crf: 22,
      dryRun: true
    });
    expect(crf.success).toBe(true);
    expect(crf.data!.command).toContain('-c:v libx264');
    expect(crf.data!.command).toContain('-crf 22');

    const bitrate = await ffmpeg.transcodeVideo('input.mov', 'output.mp4', {
      presetKey: 'any-to-mp4',
      qualityMode: 'bitrate',
      bitrate: '2M',
      dryRun: true
    });
    expect(bitrate.success).toBe(true);
    expect(bitrate.data!.command).toContain('-c:v libx264');
    expect(bitrate.data!.command).toContain('-b:v 2M');
    expect(bitrate.data!.command).not.toContain('-crf ');
  });

  test('supports CRF and bitrate quality modes (mkv)', async () => {
    const crf = await ffmpeg.transcodeVideo('input.mov', 'output.mkv', {
      presetKey: 'any-to-mkv',
      qualityMode: 'crf',
      crf: 19,
      dryRun: true
    });
    expect(crf.success).toBe(true);
    expect(crf.data!.command).toContain('-c:v libx264');
    expect(crf.data!.command).toContain('-crf 19');

    const bitrate = await ffmpeg.transcodeVideo('input.mov', 'output.mkv', {
      presetKey: 'any-to-mkv',
      qualityMode: 'bitrate',
      bitrate: '2M',
      dryRun: true
    });
    expect(bitrate.success).toBe(true);
    expect(bitrate.data!.command).toContain('-c:v libx264');
    expect(bitrate.data!.command).toContain('-b:v 2M');
    expect(bitrate.data!.command).not.toContain('-crf ');
  });
});

describe('FFmpegWrapper - extractAudio', () => {
  const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: mockRunner });

  test('uses correct audio codecs per format', async () => {
    const mp3 = await ffmpeg.extractAudio('in.mp4', 'out.mp3', { format: 'mp3', dryRun: true });
    expect(mp3.success).toBe(true);
    expect(mp3.data!.command).toContain('-acodec libmp3lame');

    const flac = await ffmpeg.extractAudio('in.mp4', 'out.flac', { format: 'flac', dryRun: true });
    expect(flac.success).toBe(true);
    expect(flac.data!.command).toContain('-acodec flac');

    const wav = await ffmpeg.extractAudio('in.mp4', 'out.wav', { format: 'wav', dryRun: true });
    expect(wav.success).toBe(true);
    expect(wav.data!.command).toContain('-acodec pcm_s16le');

    const opus = await ffmpeg.extractAudio('in.mp4', 'out.opus', { format: 'opus', dryRun: true });
    expect(opus.success).toBe(true);
    expect(opus.data!.command).toContain('-acodec libopus');
  });

  test('applies speech and music_high quality presets', async () => {
    const speech = await ffmpeg.extractAudio('in.mp4', 'out.mp3', { format: 'mp3', quality: 'speech', dryRun: true });
    expect(speech.success).toBe(true);
    expect(speech.data!.command).toContain('-ar 16000');
    expect(speech.data!.command).toContain('-ac 1');
    expect(speech.data!.command).toContain('-b:a 64k');

    const musicHigh = await ffmpeg.extractAudio('in.mp4', 'out.mp3', { format: 'mp3', quality: 'music_high', dryRun: true });
    expect(musicHigh.success).toBe(true);
    expect(musicHigh.data!.command).toContain('-ar 48000');
    expect(musicHigh.data!.command).toContain('-ac 2');
    expect(musicHigh.data!.command).toContain('-b:a 320k');
  });

  test('does not add bitrate/sample-rate overrides for lossless formats', async () => {
    const flacLossless = await ffmpeg.extractAudio('in.mp4', 'out.flac', { format: 'flac', quality: 'lossless', dryRun: true });
    expect(flacLossless.success).toBe(true);
    expect(flacLossless.data!.command).not.toContain('-b:a');
    expect(flacLossless.data!.command).not.toContain('-ar ');
    expect(flacLossless.data!.command).not.toContain('-ac ');
  });

  test('places -ss before -i (start + duration)', async () => {
    const result = await ffmpeg.extractAudio('in.mp4', 'out.mp3', {
      dryRun: true,
      clip: { startTime: '5', duration: 10 }
    });
    expect(result.success).toBe(true);
    const cmd = result.data!.command;
    expect(cmd.indexOf('-ss 5')).toBeGreaterThanOrEqual(0);
    expect(cmd.indexOf('-i in.mp4')).toBeGreaterThanOrEqual(0);
    expect(cmd.indexOf('-ss 5')).toBeLessThan(cmd.indexOf('-i in.mp4'));
    expect(cmd).toContain('-t 10');
  });

  test('uses -to (and not -t) for start + end clips', async () => {
    const result = await ffmpeg.extractAudio('in.mp4', 'out.mp3', {
      dryRun: true,
      clip: { startTime: '5', endTime: '15' }
    });
    expect(result.success).toBe(true);
    const cmd = result.data!.command;
    const tokens = cmd.split(/\s+/);
    expect(tokens).toContain('-ss');
    expect(tokens).toContain('5');
    expect(tokens).toContain('-to');
    expect(tokens).toContain('15');
    expect(tokens).not.toContain('-t');
  });

  test('supports strip metadata option', async () => {
    const stripped = await ffmpeg.extractAudio('in.mp4', 'out.mp3', { preserveMetadata: false, dryRun: true });
    expect(stripped.success).toBe(true);
    expect(stripped.data!.command).toContain('-map_metadata -1');

    const preserved = await ffmpeg.extractAudio('in.mp4', 'out.mp3', { dryRun: true });
    expect(preserved.success).toBe(true);
    expect(preserved.data!.command).not.toContain('-map_metadata -1');
  });
});
