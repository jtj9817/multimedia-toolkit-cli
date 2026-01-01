import type { GifWebpPresetKey, GifWebpPreset } from '../types';

/**
 * GIF/WebP Conversion Presets
 *
 * These presets provide sensible defaults for different use cases.
 * Users can also create custom presets and save them.
 */

export const GIF_WEBP_PRESETS: Record<Exclude<GifWebpPresetKey, 'custom'>, GifWebpPreset> = {
  // ==================== GIF Presets ====================

  'gif-discord': {
    key: 'gif-discord',
    label: 'GIF - Discord Optimized',
    description: 'Max 8MB, 480px wide, 30fps for Discord uploads',
    format: 'gif',
    settings: {
      fps: 30,
      width: 480,
      loop: true,
      loopCount: 0,
      dither: 'floyd_steinberg',
      paletteMode: 'diff'
    }
  },

  'gif-high-quality': {
    key: 'gif-high-quality',
    label: 'GIF - High Quality',
    description: 'Best visual quality, larger file size, 60fps',
    format: 'gif',
    settings: {
      fps: 60,
      width: 720,
      loop: true,
      loopCount: 0,
      dither: 'floyd_steinberg',
      paletteMode: 'full'
    }
  },

  'gif-small-file': {
    key: 'gif-small-file',
    label: 'GIF - Small File',
    description: 'Optimized for small file size, 10fps, 320px',
    format: 'gif',
    settings: {
      fps: 10,
      width: 320,
      loop: true,
      loopCount: 0,
      dither: 'bayer',
      paletteMode: 'diff'
    }
  },

  'gif-smooth-loop': {
    key: 'gif-smooth-loop',
    label: 'GIF - Smooth Loop',
    description: 'High framerate for smooth looping animations',
    format: 'gif',
    settings: {
      fps: 50,
      width: 480,
      loop: true,
      loopCount: 0,
      dither: 'floyd_steinberg',
      paletteMode: 'diff'
    }
  },

  // ==================== WebP Presets ====================

  'webp-discord': {
    key: 'webp-discord',
    label: 'WebP - Discord Optimized',
    description: 'High quality WebP for Discord (better than GIF)',
    format: 'webp',
    settings: {
      fps: 30,
      width: 480,
      quality: 80,
      loop: true,
      loopCount: 0,
      compression: 4,
      lossless: false
    }
  },

  'webp-high-quality': {
    key: 'webp-high-quality',
    label: 'WebP - High Quality',
    description: 'Best visual quality, 60fps, near-lossless',
    format: 'webp',
    settings: {
      fps: 60,
      width: 720,
      quality: 95,
      loop: true,
      loopCount: 0,
      compression: 6,
      lossless: false
    }
  },

  'webp-small-file': {
    key: 'webp-small-file',
    label: 'WebP - Small File',
    description: 'Aggressive compression, good quality/size ratio',
    format: 'webp',
    settings: {
      fps: 24,
      width: 480,
      quality: 70,
      loop: true,
      loopCount: 0,
      compression: 6,
      lossless: false
    }
  },

  'webp-lossless': {
    key: 'webp-lossless',
    label: 'WebP - Lossless',
    description: 'Perfect quality, larger files, preserves all detail',
    format: 'webp',
    settings: {
      fps: 60,
      loop: true,
      loopCount: 0,
      quality: 100,
      compression: 6,
      lossless: true
    }
  }
};

/**
 * Get default conversion options based on format
 */
export function getDefaultGifWebpOptions(format: 'gif' | 'webp'): Required<Omit<import('../types').GifWebpConversionOptions, 'startTime' | 'duration'>> {
  if (format === 'gif') {
    return {
      format: 'gif',
      fps: 15,
      width: 480,
      quality: 100, // Not used for GIF
      loop: true,
      loopCount: 0,
      dither: 'floyd_steinberg',
      paletteMode: 'diff',
      compression: 0,
      lossless: false
    };
  } else {
    return {
      format: 'webp',
      fps: 30,
      width: 480,
      quality: 80,
      loop: true,
      loopCount: 0,
      dither: 'none',
      paletteMode: 'full',
      compression: 4,
      lossless: false
    };
  }
}

/**
 * Common FPS options for user selection
 */
export const FPS_OPTIONS = [
  { value: 10, label: '10 FPS', description: 'Very small files, choppy motion' },
  { value: 15, label: '15 FPS', description: 'Small files, acceptable smoothness' },
  { value: 24, label: '24 FPS', description: 'Film-like, good balance' },
  { value: 30, label: '30 FPS', description: 'Smooth, standard video rate' },
  { value: 50, label: '50 FPS', description: 'Very smooth, larger files' },
  { value: 60, label: '60 FPS', description: 'Maximum smoothness, largest files' },
  { value: 0, label: 'Same as input', description: 'Keep original framerate' }
];

/**
 * Common width options for user selection
 */
export const WIDTH_OPTIONS = [
  { value: 240, label: '240px', description: 'Tiny, very small files' },
  { value: 320, label: '320px', description: 'Small, good for thumbnails' },
  { value: 480, label: '480px', description: 'Standard, Discord-friendly' },
  { value: 640, label: '640px', description: 'Medium, good quality/size ratio' },
  { value: 720, label: '720px', description: 'Large, HD-like' },
  { value: 1080, label: '1080px', description: 'Full HD width' },
  { value: 0, label: 'Same as input', description: 'Keep original width' }
];

/**
 * WebP quality presets
 */
export const WEBP_QUALITY_OPTIONS = [
  { value: 50, label: 'Low', description: '50% - Small files, visible compression' },
  { value: 70, label: 'Medium', description: '70% - Good balance' },
  { value: 80, label: 'High', description: '80% - Recommended for most uses' },
  { value: 90, label: 'Very High', description: '90% - Near-perfect quality' },
  { value: 95, label: 'Excellent', description: '95% - Minimal compression artifacts' },
  { value: 100, label: 'Maximum', description: '100% - Best quality (not lossless)' }
];

/**
 * GIF dithering options
 */
export const GIF_DITHER_OPTIONS = [
  { value: 'none', label: 'None', description: 'No dithering, may show banding' },
  { value: 'floyd_steinberg', label: 'Floyd-Steinberg', description: 'Best quality, recommended' },
  { value: 'sierra2', label: 'Sierra-2', description: 'Good quality, slightly different look' },
  { value: 'bayer', label: 'Bayer', description: 'Patterned dithering, retro look' }
];
