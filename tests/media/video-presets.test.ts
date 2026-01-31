import { describe, expect, test } from 'bun:test';
import { VIDEO_TRANSCODE_PRESETS } from '@/media/video-presets';
import type { VideoPresetKey } from '@/types';

describe('Video Transcoding Presets', () => {
  test('defines all required preset keys', () => {
    const keys = Object.keys(VIDEO_TRANSCODE_PRESETS) as VideoPresetKey[];
    expect(keys).toContain('any-to-webm');
    expect(keys).toContain('any-to-mp4');
    expect(keys).toContain('any-to-mkv');
  });

  test('any-to-webm preset has correct Discord-optimized settings', () => {
    const preset = VIDEO_TRANSCODE_PRESETS['any-to-webm'];
    expect(preset.container).toBe('webm');
    expect(preset.video.codec).toBe('libvpx-vp9');
    expect(preset.video.scale.maxResolution).toBe('1080p');
    
    // Verify audio settings from specific commit requirement
    expect(preset.audio.ffmpegArgs).toContain('-vbr');
    expect(preset.audio.ffmpegArgs).toContain('on');
    expect(preset.audio.ffmpegArgs).toContain('-compression_level');
    expect(preset.audio.ffmpegArgs).toContain('10');
    expect(preset.audio.ffmpegArgs).toContain('-application');
    expect(preset.audio.ffmpegArgs).toContain('audio');
  });

  test('any-to-mp4 preset defaults to H.264/AAC', () => {
    const preset = VIDEO_TRANSCODE_PRESETS['any-to-mp4'];
    expect(preset.container).toBe('mp4');
    expect(preset.video.codec).toBe('libx264');
    expect(preset.audio.codec).toBe('aac');
  });
});
