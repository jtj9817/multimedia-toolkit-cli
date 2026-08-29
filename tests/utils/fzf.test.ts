import { describe, expect, test, mock } from 'bun:test';
import { buildFzfShellCommand, parseFzfOutput, FzfSelector } from '@/utils/fzf';
import { resolve } from 'path';
import type { ProcessRunner, RunProcessResult } from '@/utils/process-runner';

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

  test('directory mode lists directories only and skips extension filters', () => {
    const command = buildFzfShellCommand({
      directory: '.',
      multi: false,
      extensions: ['mp3'],
      preview: false,
      prompt: 'Select directory',
      showHidden: false,
      maxDepth: 5,
      entryType: 'directories'
    });

    expect(command).toContain('find "."');
    expect(command).toContain('-type d');
    expect(command).not.toContain('-type f');
    expect(command).not.toContain("-name '*.mp3'");
  });

  test('file mode is unchanged when entryType is absent', () => {
    const command = buildFzfShellCommand({
      directory: '.',
      multi: false,
      extensions: ['mp4'],
      preview: false,
      prompt: 'Select file',
      showHidden: false
    });

    expect(command).toContain('-type f');
    expect(command).toContain("-name '*.mp4'");
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

describe('FzfSelector', () => {
  const mockRun = mock((cmd: string[]) => Promise.resolve({
    exitCode: 0,
    stdout: '',
    stderr: '',
    timedOut: false,
    truncated: { stdout: false, stderr: false }
  } as RunProcessResult));

  const mockRunner: ProcessRunner = { run: mockRun };
  const fzf = new FzfSelector(mockRunner);

  test('isFzfAvailable checks version', async () => {
    mockRun.mockResolvedValueOnce({ exitCode: 0 } as any);
    expect(await fzf.isFzfAvailable()).toBe(true);
    expect(mockRun).toHaveBeenCalledWith(['fzf', '--version'], expect.anything());

    mockRun.mockResolvedValueOnce({ exitCode: 1 } as any);
    expect(await fzf.isFzfAvailable()).toBe(false);
  });

  test('selectFiles runs the correct command', async () => {
    // Mock availability check
    mockRun.mockResolvedValueOnce({ exitCode: 0 } as any);
    
    // Mock selection result
    mockRun.mockResolvedValueOnce({
      exitCode: 0, 
      stdout: 'file1.mp3\nfile2.mp3',
      stderr: '' 
    } as any);

    // We need to mock existence checks since we are passing a real directory
    // Using current directory '.' should pass validation
    const result = await fzf.selectFiles({ directory: '.', multi: true });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    
    // Verify run call
    const calls = mockRun.mock.calls;
    const lastCall = calls[calls.length - 1];
    const cmdArgs = lastCall[0] as string[];
    
    expect(cmdArgs[0]).toBe('bash');
    expect(cmdArgs[1]).toBe('-c');
    expect(cmdArgs[2]).toContain('find "."');
    expect(cmdArgs[2]).toContain('fzf');
  });

  test('selectDirectory lists directories with a depth bound', async () => {
    // Mock availability check
    mockRun.mockResolvedValueOnce({ exitCode: 0 } as any);

    // Mock selection result
    mockRun.mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'some/nested/dir',
      stderr: ''
    } as any);

    const result = await fzf.selectDirectory({ directory: '.', prompt: 'Pick output dir' });

    expect(result.success).toBe(true);
    expect(result.data).toBe(resolve(process.cwd(), 'some/nested/dir'));

    const calls = mockRun.mock.calls;
    const lastCall = calls[calls.length - 1];
    const cmd = (lastCall[0] as string[])[2];

    expect(cmd).toContain('-type d');
    expect(cmd).toContain('-maxdepth 5');
    expect(cmd).toContain('--prompt=Pick output dir >');
    expect(cmd).not.toContain('--preview');
  });
});