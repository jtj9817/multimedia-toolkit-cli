import { describe, expect, test } from 'bun:test';
import { buildFzfShellCommand, parseFzfOutput } from '@/utils/fzf';
import { resolve } from 'path';

describe('buildFzfShellCommand', () => {
  test('includes filters, prompt, and multi-select flags', () => {
    const command = buildFzfShellCommand({
      directory: '/tmp',
      multi: true,
      extensions: ['mp3', 'wav'],
      preview: false,
      prompt: 'Pick files',
      showHidden: false,
      maxDepth: 2
    });

    expect(command).toContain('find "/tmp"');
    expect(command).toContain('-maxdepth 2');
    expect(command).toContain("-not -path '*/\\.*'");
    expect(command).toContain("\\( -name '*.mp3' -o -name '*.wav' \\)");
    expect(command).toContain('--multi');
    expect(command).toContain('--prompt=Pick files >');
  });

  test('adds preview flags when enabled', () => {
    const command = buildFzfShellCommand({
      directory: '/tmp',
      multi: false,
      extensions: [],
      preview: true,
      prompt: 'Select',
      showHidden: true,
      maxDepth: undefined
    });

    expect(command).toContain('--preview');
    expect(command).toContain('--preview-window=right:50%:wrap');
  });
});

describe('parseFzfOutput', () => {
  test('resolves paths and filters blanks', () => {
    const output = 'relative/file.mp3\n/abs/path.wav\n\n';
    const cwd = '/workspace';
    const result = parseFzfOutput(output, cwd);

    expect(result).toEqual([
      resolve(cwd, 'relative/file.mp3'),
      resolve(cwd, '/abs/path.wav')
    ]);
  });
});
