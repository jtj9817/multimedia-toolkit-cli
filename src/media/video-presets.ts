import type { VideoPresetKey, VideoTranscodePreset } from '../types';

export const VIDEO_TRANSCODE_PRESETS: Record<VideoPresetKey, VideoTranscodePreset> = {
  'any-to-webm': {
    label: 'Any-to-WebM (Discord optimized)',
    container: 'webm',
    video: {
      codec: 'libvpx-vp9',
      qualityMode: 'crf',
      crf: 31,
      bitrate: null,
      pixelFormat: 'yuv420p',
      scale: {
        policy: 'fit',
        maxResolution: '1080p',
        preserveAspect: true
      },
      // libvpx defaults to cpu-used 1 with row-mt off, which barely uses more than a
      // few cores. These cut 1080p encode time ~3x with a negligible SSIM change.
      ffmpegArgs: ['-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-tile-columns', '2'],
      // Two-pass lets libvpx plan alt-ref frames with full-file statistics: ~1-10% smaller
      // at equal or better SSIM. The statistics pass can run at a faster speed.
      twoPass: { firstPassArgs: ['-cpu-used', '4'] }
    },
    audio: {
      codec: 'libopus',
      bitrate: '128k',
      sampleRate: 48000,
      channels: 2,
      ffmpegArgs: ['-vbr', 'on', '-compression_level', '10', '-application', 'audio']
    },
    notes: [
      'Caps output at 1080p without upscaling smaller sources.',
      'Uses optimized WebM/Opus settings from commit d47cdb4ddc63787ca74076a699dd3fd2eac04d23.'
    ]
  },
  'any-to-mp4': {
    label: 'Any-to-MP4 (H.264/AAC)',
    container: 'mp4',
    video: {
      codec: 'libx264',
      qualityMode: 'crf',
      crf: 20,
      bitrate: null,
      pixelFormat: 'yuv420p',
      scale: {
        policy: 'fit',
        maxResolution: 'source',
        preserveAspect: true
      }
    },
    audio: {
      codec: 'aac',
      bitrate: '192k',
      sampleRate: 48000,
      channels: 2
    },
    notes: ['Safe default for broad device compatibility.']
  },
  'any-to-mkv': {
    label: 'Any-to-MKV (H.264/AAC)',
    container: 'mkv',
    video: {
      codec: 'libx264',
      qualityMode: 'crf',
      crf: 18,
      bitrate: null,
      pixelFormat: 'yuv420p',
      scale: {
        policy: 'fit',
        maxResolution: 'source',
        preserveAspect: true
      }
    },
    audio: {
      codec: 'aac',
      bitrate: '192k',
      sampleRate: 48000,
      channels: 2
    },
    notes: ['MKV container for flexible muxing and archival.']
  }
};
