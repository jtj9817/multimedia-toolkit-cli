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
      }
    },
    audio: {
      codec: 'libopus',
      bitrate: '128k',
      sampleRate: 48000,
      channels: 2,
      ffmpegArgs: ['-vbr', 'on', '-compression_level', '10', '-application', 'audio']
    },
    notes: [
      'Defaults to 1080p output.',
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
