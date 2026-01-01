/**
 * Waveform Visualizer Module
 * ASCII art visualization for audio waveforms
 */

import type { WaveformData } from '../types';

export class WaveformVisualizer {
  private width: number;
  private height: number;

  constructor(width: number = 60, height: number = 10) {
    this.width = width;
    this.height = height;
  }

  /**
   * Render waveform as ASCII art
   */
  render(data: WaveformData): string {
    const { samples, duration } = data;

    if (samples.length === 0) {
      return 'No waveform data available';
    }

    // Normalize samples to display width
    const normalizedSamples = this.resample(samples, this.width);

    // Build the visualization
    const lines: string[] = [];

    // Header
    lines.push(`┌${'─'.repeat(this.width + 2)}┐`);
    lines.push(`│ ${'Waveform'.padEnd(this.width)} │`);
    lines.push(`├${'─'.repeat(this.width + 2)}┤`);

    // Waveform display (center-aligned like audio waveform)
    const halfHeight = Math.floor(this.height / 2);

    for (let row = 0; row < this.height; row++) {
      const rowChars: string[] = [];

      for (let col = 0; col < this.width; col++) {
        const amplitude = normalizedSamples[col] || 0;
        const scaledAmplitude = Math.round(amplitude * halfHeight);

        // Calculate distance from center
        const distanceFromCenter = Math.abs(row - halfHeight);

        if (distanceFromCenter <= scaledAmplitude) {
          // Use different characters for intensity
          if (distanceFromCenter <= scaledAmplitude * 0.3) {
            rowChars.push('█');
          } else if (distanceFromCenter <= scaledAmplitude * 0.6) {
            rowChars.push('▓');
          } else if (distanceFromCenter <= scaledAmplitude * 0.8) {
            rowChars.push('▒');
          } else {
            rowChars.push('░');
          }
        } else {
          rowChars.push(' ');
        }
      }

      lines.push(`│ ${rowChars.join('')} │`);
    }

    // Time markers
    lines.push(`├${'─'.repeat(this.width + 2)}┤`);
    const timeMarkers = this.generateTimeMarkers(duration, this.width);
    lines.push(`│ ${timeMarkers} │`);
    lines.push(`└${'─'.repeat(this.width + 2)}┘`);

    return lines.join('\n');
  }

  /**
   * Render a compact horizontal bar visualization
   */
  renderCompact(data: WaveformData): string {
    const { samples, duration } = data;

    if (samples.length === 0) {
      return 'No waveform data available';
    }

    const normalizedSamples = this.resample(samples, this.width);
    const chars = '▁▂▃▄▅▆▇█';

    const barLine = normalizedSamples.map(sample => {
      const index = Math.floor(sample * (chars.length - 1));
      return chars[Math.min(index, chars.length - 1)];
    }).join('');

    const timeMarkers = this.generateTimeMarkers(duration, this.width);

    return [
      `┌${'─'.repeat(this.width + 2)}┐`,
      `│ ${barLine} │`,
      `│ ${timeMarkers} │`,
      `└${'─'.repeat(this.width + 2)}┘`
    ].join('\n');
  }

  /**
   * Render waveform with clip markers
   */
  renderWithClips(
    data: WaveformData,
    clips: { start: number; end: number; label?: string }[]
  ): string {
    const { samples, duration } = data;

    if (samples.length === 0) {
      return 'No waveform data available';
    }

    const normalizedSamples = this.resample(samples, this.width);
    const chars = '▁▂▃▄▅▆▇█';

    // Build the waveform line with clip highlighting
    const barChars: string[] = [];
    const markerLine: string[] = new Array(this.width).fill(' ');

    for (let i = 0; i < this.width; i++) {
      const time = (i / this.width) * duration;
      const sample = normalizedSamples[i] || 0;
      const charIndex = Math.floor(sample * (chars.length - 1));
      let char = chars[Math.min(charIndex, chars.length - 1)];

      // Check if this position is within a clip
      let inClip = false;
      for (const clip of clips) {
        if (time >= clip.start && time <= clip.end) {
          inClip = true;

          // Mark clip boundaries
          const startPos = Math.floor((clip.start / duration) * this.width);
          const endPos = Math.floor((clip.end / duration) * this.width);

          if (i === startPos) markerLine[i] = '[';
          else if (i === endPos) markerLine[i] = ']';
          else if (i > startPos && i < endPos) markerLine[i] = '-';

          break;
        }
      }

      // Highlight clips with color (using ANSI codes)
      if (inClip) {
        barChars.push(`\x1b[32m${char}\x1b[0m`);
      } else {
        barChars.push(char);
      }
    }

    const barLine = barChars.join('');
    const markers = markerLine.join('');
    const timeMarkers = this.generateTimeMarkers(duration, this.width);

    return [
      `┌${'─'.repeat(this.width + 2)}┐`,
      `│ ${barLine} │`,
      `│ ${markers} │`,
      `│ ${timeMarkers} │`,
      `└${'─'.repeat(this.width + 2)}┘`,
      '',
      'Legend: \x1b[32m████\x1b[0m = Selected clips, [ ] = Clip boundaries'
    ].join('\n');
  }

  /**
   * Resample array to target length
   */
  private resample(samples: number[], targetLength: number): number[] {
    if (samples.length === targetLength) return samples;

    const result: number[] = [];
    const ratio = samples.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const startIdx = Math.floor(i * ratio);
      const endIdx = Math.floor((i + 1) * ratio);

      // Average the samples in this range
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx && j < samples.length; j++) {
        sum += samples[j];
        count++;
      }

      result.push(count > 0 ? sum / count : 0);
    }

    return result;
  }

  /**
   * Generate time markers for the given duration
   */
  private generateTimeMarkers(duration: number, width: number): string {
    const numMarkers = 5;
    const markers: string[] = [];

    for (let i = 0; i < numMarkers; i++) {
      const time = (i / (numMarkers - 1)) * duration;
      const formatted = this.formatTime(time);
      markers.push(formatted);
    }

    // Calculate spacing
    const totalMarkerLength = markers.reduce((sum, m) => sum + m.length, 0);
    const spacing = Math.floor((width - totalMarkerLength) / (numMarkers - 1));

    let result = '';
    for (let i = 0; i < markers.length; i++) {
      result += markers[i];
      if (i < markers.length - 1) {
        result += ' '.repeat(Math.max(1, spacing));
      }
    }

    return result.slice(0, width).padEnd(width);
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Create a simple progress visualization
   */
  renderProgress(
    currentTime: number,
    totalDuration: number,
    width: number = 40
  ): string {
    const progress = currentTime / totalDuration;
    const filledWidth = Math.round(progress * width);
    const emptyWidth = width - filledWidth;

    const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
    const currentFormatted = this.formatTime(currentTime);
    const totalFormatted = this.formatTime(totalDuration);

    return `[${bar}] ${currentFormatted} / ${totalFormatted}`;
  }
}

export const visualizer = new WaveformVisualizer();
