import { describe, expect, it } from 'bun:test';
import { WaveformVisualizer } from '@/utils/visualizer';

describe('WaveformVisualizer', () => {
  const mockData = {
    samples: [0.1, 0.5, 0.9, 0.5, 0.1],
    duration: 10,
    sampleRate: 44100
  };

  it('should render waveform', () => {
    const visualizer = new WaveformVisualizer(20, 5);
    const output = visualizer.render(mockData);
    expect(output).toContain('Waveform');
    expect(output).toContain('┌');
    expect(output).toContain('└');
  });

  it('should render compact waveform', () => {
    const visualizer = new WaveformVisualizer(40, 5);
    const output = visualizer.renderCompact(mockData);
    expect(output).toContain('┌');
    expect(output).toContain('0:00');
    expect(output).toContain('0:10');
  });

  it('should render with clips', () => {
    const visualizer = new WaveformVisualizer(20, 5);
    const output = visualizer.renderWithClips(mockData, [
      { start: 2, end: 5, label: 'test-clip' }
    ]);
    expect(output).toContain('[');
    expect(output).toContain(']');
    expect(output).toContain('Legend');
  });

  it('should render progress', () => {
    const visualizer = new WaveformVisualizer(20, 5);
    const output = visualizer.renderProgress(5, 10, 20);
    expect(output).toContain('0:05 / 0:10');
    expect(output).toContain('█');
    expect(output).toContain('░');
  });
});
