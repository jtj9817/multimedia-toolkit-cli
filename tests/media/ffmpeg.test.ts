import { describe, expect, test, mock } from 'bun:test';
import { FFmpegWrapper } from '@/media/ffmpeg';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
    expect(command).toContain('-f matroska');
  });

  test('applies resolution scaling filter', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      resolution: '720p',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    // 720p caps the long side at 1280 and the short side at 720 in either orientation
    expect(command).toContain(
      "-vf scale='if(gte(iw,ih),min(iw,1280),min(iw,720))':'if(gte(iw,ih),min(ih,720),min(ih,1280))'"
    );
    expect(command).toContain('force_original_aspect_ratio=decrease:force_divisible_by=2');
  });

  test('fit scaling never pads to a letterboxed frame', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain("min(iw,1920)");
    expect(command).not.toContain('pad=');
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

  test('includes VP9 speed and threading flags for WebM', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain('-deadline good -cpu-used 2 -row-mt 1 -tile-columns 2');
  });

  test('omits preset encoder flags when the video codec is overridden', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      videoCodec: 'libaom-av1',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const command = result.data!.command;
    expect(command).toContain('-c:v libaom-av1');
    expect(command).not.toContain('-row-mt');
  });

  test('does not add VP9 flags to H.264 presets', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.mp4', {
      presetKey: 'any-to-mp4',
      dryRun: true
    });

    expect(result.data!.command).not.toContain('-cpu-used');
  });

  test('WebM preset runs a two-pass encode with a faster statistics pass', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      dryRun: true
    });

    expect(result.success).toBe(true);
    const [firstPass, secondPass] = result.data!.command.split(' && ');
    expect(firstPass).toContain('-cpu-used 4');
    expect(firstPass).toMatch(/-pass 1 -passlogfile \S+mat-2pass-/);
    expect(firstPass).toContain('-an -sn -dn -f null');
    expect(firstPass).not.toContain('-c:a');
    expect(secondPass).toContain('-cpu-used 2');
    expect(secondPass).toMatch(/-pass 2 -passlogfile \S+mat-2pass-/);
    expect(secondPass).toContain('-c:a libopus');
    expect(secondPass).toContain('output.webm');
  });

  test('twoPass: false forces a single pass', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', {
      presetKey: 'any-to-webm',
      twoPass: false,
      dryRun: true
    });

    expect(result.data!.command).not.toContain(' && ');
    expect(result.data!.command).not.toContain('-pass');
  });

  test('H.264 presets stay single pass', async () => {
    const result = await ffmpeg.transcodeVideo('input.mov', 'output.mp4', {
      presetKey: 'any-to-mp4',
      dryRun: true
    });

    expect(result.data!.command).not.toContain('-pass');
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
    expect(r2160.data!.command).toContain('min(iw,3840),min(iw,2160)');

    const r1440 = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { resolution: '1440p', dryRun: true });
    expect(r1440.success).toBe(true);
    expect(r1440.data!.command).toContain('min(iw,2560),min(iw,1440)');

    const r480 = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { resolution: '480p', dryRun: true });
    expect(r480.success).toBe(true);
    expect(r480.data!.command).toContain('min(iw,854),min(iw,480)');
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
      frameRate: { rate: '30', bitrateScale: 1 },
      dryRun: true
    });
    expect(bitrate.success).toBe(true);
    expect(bitrate.data!.command).toContain('-b:v 1M');
    expect(bitrate.data!.command).toContain('-r 30');
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

describe('FFmpegWrapper - video clipping', () => {
  const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: mockRunner });

  test('builds a source-container stream-copy clip command with all CPU cores', async () => {
    const result = await ffmpeg.clipVideo('input.mp4', 'clip.mp4', {
      clip: { startTime: '00:01:30', duration: 15 },
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.data!.command).toContain('-ss 00:01:30');
    expect(result.data!.command).toContain('-t 15');
    expect(result.data!.command).toContain('-map 0');
    expect(result.data!.command).toContain('-c copy');
    expect(result.data!.command).toContain('-threads 0');
    expect(result.warnings).toContain('Stream-copy cuts may begin at a nearby keyframe.');
  });

  test('converts start/end timing into a clip duration after input seeking', async () => {
    const result = await ffmpeg.clipVideo('input.mp4', 'clip.mp4', {
      clip: { startTime: '00:01:30', endTime: '00:01:45' },
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.data!.command).toContain('-t 15');
    expect(result.data!.command).not.toContain('-to');
  });

  test('rejects ambiguous and invalid video clip timing', async () => {
    const ambiguous = await ffmpeg.clipVideo('input.mp4', 'clip.mp4', {
      clip: { startTime: '5', endTime: '10', duration: 5 },
      dryRun: true
    });
    const invalid = await ffmpeg.clipVideo('input.mp4', 'clip.mp4', {
      clip: { startTime: 'bogus', duration: 5 },
      dryRun: true
    });

    expect(ambiguous.success).toBe(false);
    expect(ambiguous.error).toContain('either clip duration or end time');
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain('Invalid clip start time');
  });

  test('plans source clipping before a requested transcode', async () => {
    const result = await ffmpeg.clipAndTranscodeVideo('input.mp4', 'intermediate.mp4', 'clip.webm', {
      clip: { startTime: '10', endTime: '20' },
      transcode: { presetKey: 'any-to-webm' },
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.data!.command.indexOf('intermediate.mp4')).toBeLessThan(result.data!.command.indexOf('clip.webm'));
    expect(result.data!.command).toContain('&&');
    expect(result.data!.command).toContain('-c:v libvpx-vp9');
  });
});

describe('FFmpegWrapper - two-pass execution', () => {
  const passLogOf = (args: string[]) => args[args.indexOf('-passlogfile') + 1];

  test('runs statistics pass before the final encode and removes the stats file', async () => {
    const calls: string[][] = [];
    const runner = {
      run: mock(async (args: string[]) => {
        calls.push(args);
        if (args[args.indexOf('-pass') + 1] === '1') {
          writeFileSync(`${passLogOf(args)}-0.log`, 'stats');
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      })
    } as any;
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });

    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { presetKey: 'any-to-webm' });

    expect(result.success).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0][calls[0].indexOf('-pass') + 1]).toBe('1');
    expect(calls[1][calls[1].indexOf('-pass') + 1]).toBe('2');
    expect(passLogOf(calls[0])).toBe(passLogOf(calls[1]));
    expect(existsSync(`${passLogOf(calls[0])}-0.log`)).toBe(false);
  });

  test('stops after a failed statistics pass', async () => {
    const runner = {
      run: mock(() => Promise.resolve({ exitCode: 1, stdout: '', stderr: 'boom' }))
    } as any;
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });

    const result = await ffmpeg.transcodeVideo('input.mov', 'output.webm', { presetKey: 'any-to-webm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('first pass failed');
    expect(runner.run).toHaveBeenCalledTimes(1);
  });
});

/** Build ffprobe packet CSV ("pts,dts" per line) for frames at the given times. */
function packetCsv(times: number[]): string {
  return times.map(time => `${time.toFixed(6)},${time.toFixed(6)}`).join('\n');
}

/** Evenly spaced frame times: `count` frames at `fps`. */
function frameTimes(count: number, fps: number): number[] {
  return Array.from({ length: count }, (_, index) => index / fps);
}

/** Runner that answers the stream probe and packet listing from fixtures. */
function probeRunner(fixture: { declared?: string; packets?: string; noStream?: boolean }) {
  const calls: string[][] = [];
  const runner = {
    run: mock(async (args: string[]) => {
      calls.push(args);
      if (args[0] !== 'ffprobe') {
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      if (args.includes('packet=pts_time,dts_time')) {
        return { exitCode: 0, stdout: fixture.packets ?? '', stderr: '' };
      }
      if (args.includes('stream=r_frame_rate')) {
        const streams = fixture.noStream ? [] : [{ r_frame_rate: fixture.declared ?? '30/1' }];
        return { exitCode: 0, stdout: JSON.stringify({ streams }), stderr: '' };
      }
      // getMediaInfo (duration) for target-size sizing
      return {
        exitCode: 0,
        stdout: JSON.stringify({ format: { duration: '20.0', format_name: 'mov' }, streams: [] }),
        stderr: ''
      };
    })
  } as any;
  return { runner, calls };
}

describe('FFmpegWrapper - detectFrameRate', () => {
  const detect = (fixture: Parameters<typeof probeRunner>[0]) => {
    const { runner, calls } = probeRunner(fixture);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    return { result: ffmpeg.detectFrameRate('in.mp4'), calls };
  };

  test('keeps the exact declared fraction for constant frame rate sources', async () => {
    const { result } = detect({ declared: '30000/1001', packets: packetCsv(frameTimes(300, 30000 / 1001)) });
    const info = (await result).data!;
    expect(info.variable).toBe(false);
    expect(info.rate).toBe('30000/1001');
    expect(info.frameCount).toBe(300);
  });

  test('uses the measured rate when the declared rate is far too high', async () => {
    // Real Twitter uploads declare 60-240 fps for ~30 fps phone video.
    const { result } = detect({ declared: '120/1', packets: packetCsv(frameTimes(300, 29.75)) });
    const info = (await result).data!;
    expect(info.variable).toBe(true);
    expect(info.declaredFps).toBe(120);
    expect(info.fps).toBeCloseTo(29.75, 3);
    // Evenly spaced frames: the grid is the real rate (rounded up), no bitrate correction.
    expect(Number(info.rate)).toBeCloseTo(29.75, 2);
    expect(info.bitrateScale).toBeCloseTo(1, 3);
  });

  test('uses the measured rate when the declared rate is too low', async () => {
    // Real Twitter upload: declares 143/6 (23.83) fps, measures ~28.1 fps.
    const { result } = detect({ declared: '143/6', packets: packetCsv(frameTimes(300, 28.125)) });
    const info = (await result).data!;
    expect(info.variable).toBe(true);
    expect(Number(info.rate)).toBeCloseTo(28.125, 2);
  });

  test('measures irregular frame spacing over the whole stream', async () => {
    // 1 s at 60 fps followed by 2 s at 10 fps: 60 + 20 frames spanning ~3 s.
    const burst = frameTimes(60, 60);
    const slow = frameTimes(20, 10).map(time => 1 + time);
    const { result } = detect({ declared: '60/1', packets: packetCsv([...burst, ...slow]) });
    const info = (await result).data!;
    expect(info.variable).toBe(true);
    expect(info.fps).toBeCloseTo(79 / 2.9, 3);
    // The grid must hold the 60 fps burst without dropping frames...
    expect(info.peakFps).toBeCloseTo(60, 1);
    expect(Number(info.rate)).toBeGreaterThanOrEqual(info.peakFps);
    // ...and bitrates are scaled so the budget per real second is unchanged.
    expect(info.bitrateScale).toBeCloseTo(Number(info.rate) / info.fps, 6);
  });

  test('treats millisecond timestamp jitter on a CFR source as constant', async () => {
    // 23.976 fps in MKV: 1 ms timestamps alternate 41/42 ms intervals.
    const times = frameTimes(240, 24000 / 1001).map(time => Math.round(time * 1000) / 1000);
    const { result } = detect({ declared: '24000/1001', packets: packetCsv(times) });
    const info = (await result).data!;
    expect(info.variable).toBe(false);
    expect(info.rate).toBe('24000/1001');
    expect(info.bitrateScale).toBe(1);
  });

  test('caps the grid when broken timestamps imply an absurd peak rate', async () => {
    const times = frameTimes(300, 30);
    times[100] = times[99] + 0.0001;
    const { result } = detect({ declared: '30/1', packets: packetCsv(times) });
    const info = (await result).data!;
    expect(info.variable).toBe(true);
    expect(info.rate).toBe('240');
  });

  test('orders B-frame packets by timestamp and falls back to dts', async () => {
    const lines = ['0.000000,N/A', '0.100000,0.033333', '0.033333,0.066667', '0.066667,0.100000', 'N/A,0.133333'];
    const { result } = detect({ declared: '30/1', packets: lines.join('\n') });
    const info = (await result).data!;
    expect(info.frameCount).toBe(5);
    expect(info.variable).toBe(false);
  });

  test('skips cover art by selecting the first non-attached-picture video stream', async () => {
    const { result, calls } = detect({ packets: packetCsv(frameTimes(30, 30)) });
    await result;
    expect(calls.every(args => args.includes('V:0'))).toBe(true);
  });

  test('fails instead of guessing when timing cannot be measured', async () => {
    expect((await detect({ noStream: true }).result).error).toContain('no video stream');
    expect((await detect({ packets: '0.000000,0.000000' }).result).error).toContain('fewer than two');
    expect((await detect({ packets: '0.0,0.0\nN/A,N/A\n0.1,0.1' }).result).error).toContain('no timestamp');
    expect((await detect({ packets: '1.0,1.0\n1.0,1.0' }).result).error).toContain('implausible');
  });
});

describe('FFmpegWrapper - frame rate enforcement', () => {
  const vfrStream = { declared: '120/1', packets: packetCsv(frameTimes(566, 29.783)) };
  // 60 fps footage with pauses: peaks at 60 fps, averages 30 fps.
  const burstyTimes = Array.from({ length: 200 }, (_, index) => Math.floor(index / 10) * 0.3333 + (index % 10) / 60);
  const burstyStream = { declared: '60/1', packets: packetCsv(burstyTimes) };

  test('two-pass bitrate encodes pass the measured rate to both passes', async () => {
    const { runner } = probeRunner(vfrStream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', qualityMode: 'bitrate', bitrate: '1M', dryRun: true
    });

    const [firstPass, secondPass] = result.data!.command.split(' && ');
    expect(firstPass).toMatch(/-r 29\.78\d /);
    expect(secondPass).toMatch(/-r 29\.78\d /);
  });

  test('bursty VFR uses the peak-rate grid and scales the bitrate to match', async () => {
    const { runner } = probeRunner(burstyStream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', qualityMode: 'bitrate', bitrate: '1M', dryRun: true
    });

    const detected = (await ffmpeg.detectFrameRate('in.mp4')).data!;
    const scaledKbps = Math.round(1000 * detected.bitrateScale);
    expect(detected.bitrateScale).toBeGreaterThan(1.5);
    expect(result.data!.command).toContain(`-r ${detected.rate} -b:v ${scaledKbps}k`);
  });

  test('target-size encodes pass the measured rate', async () => {
    const { runner } = probeRunner(vfrStream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', targetSizeMB: 3, dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.data!.command).toMatch(/-r 29\.78\d -crf 31 -b:v \d+k/);
  });

  test('refuses a two-pass bitrate encode when the rate cannot be measured', async () => {
    const { runner } = probeRunner({ declared: '30/1', packets: '' });
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', qualityMode: 'bitrate', bitrate: '1M', dryRun: true
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('--single-pass');
  });

  test('CRF and single-pass encodes leave frame timing untouched', async () => {
    const { runner, calls } = probeRunner(vfrStream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const crf = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', { presetKey: 'any-to-webm', dryRun: true });
    const singlePass = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', qualityMode: 'bitrate', bitrate: '1M', twoPass: false, dryRun: true
    });

    expect(crf.data!.command).not.toContain(' -r ');
    expect(singlePass.data!.command).not.toContain(' -r ');
    expect(calls).toHaveLength(0);
  });
});

describe('FFmpegWrapper - target size', () => {
  const stream = { declared: '30/1', packets: packetCsv(frameTimes(600, 30)) };

  test('derives a capped VP9 bitrate from duration, headroom and audio bitrate', async () => {
    const { runner } = probeRunner(stream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', targetSizeMB: 2, dryRun: true
    });

    // 2 MB * 8 = 16000 kbit * 0.96 / 20 s = 768 kbps - 128 kbps audio = 640 kbps
    expect(result.data!.command).toContain('-crf 31 -b:v 640k');
    expect(result.data!.command).not.toContain('-b:v 0');
  });

  test('uses VBV-constrained ABR for H.264', async () => {
    const { runner } = probeRunner(stream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.mp4', {
      presetKey: 'any-to-mp4', targetSizeMB: 2, dryRun: true
    });

    // 768 kbps budget - 192 kbps AAC = 576 kbps
    expect(result.data!.command).toContain('-b:v 576k -maxrate 576k -bufsize 1152k');
    expect(result.data!.command).not.toContain('-crf');
  });

  test('rejects targets too small for the duration with a minimum suggestion', async () => {
    const { runner } = probeRunner(stream);
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });
    const result = await ffmpeg.transcodeVideo('in.mp4', 'out.webm', {
      presetKey: 'any-to-webm', targetSizeMB: 0.5, dryRun: true
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('use at least 1 MB');
  });

  test('rejects non-positive targets and unknown durations', async () => {
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: mockRunner });
    expect((await ffmpeg.transcodeVideo('in.mp4', 'out.webm', { targetSizeMB: 0 })).error)
      .toContain('positive');
    expect((await ffmpeg.transcodeVideo('in.mp4', 'out.webm', { targetSizeMB: 5, dryRun: true })).error)
      .toContain('duration');
  });

  test('re-encodes once at a lower bitrate when the first attempt overshoots', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mat-target-'));
    const output = join(dir, 'out.webm');
    const sizes = [2_400_000, 1_900_000];
    const { runner: probe } = probeRunner(stream);
    const bitrates: string[] = [];
    const runner = {
      run: mock(async (args: string[]) => {
        if (args[0] === 'ffprobe') {
          return probe.run(args);
        }
        if (args[args.indexOf('-pass') + 1] === '2') {
          bitrates.push(args[args.indexOf('-b:v') + 1]);
          writeFileSync(output, Buffer.alloc(sizes.shift()!));
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      })
    } as any;
    const ffmpeg = new FFmpegWrapper({ config: mockConfig, processRunner: runner });

    try {
      const result = await ffmpeg.transcodeVideo('in.mp4', output, { presetKey: 'any-to-webm', targetSizeMB: 2 });
      expect(result.success).toBe(true);
      expect(result.warnings ?? []).toHaveLength(0);
      // 640k * (2.0 / 2.4) * 0.96 = 512k
      expect(bitrates).toEqual(['640k', '512k']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
