import { describe, expect, test, mock } from 'bun:test';
import { BunProcessRunner, type ProcessRunner, type RunProcessOptions, type RunProcessResult } from '@/utils/process-runner';

describe('BunProcessRunner', () => {
  test('implements ProcessRunner interface', () => {
    const runner = new BunProcessRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.run).toBe('function');
  });

  test('executes a real command via Bun.spawn', async () => {
    const runner = new BunProcessRunner();
    const result = await runner.run(['echo', 'hello world']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.stderr).toBe('');
  });

  test('handles command failure', async () => {
    const runner = new BunProcessRunner();
    // Using bash to generate stderr output and exit code
    const result = await runner.run(['bash', '-c', 'echo "error msg" >&2; exit 1']);
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr.trim()).toBe('error msg');
  });

  test('supports timeouts', async () => {
    const runner = new BunProcessRunner();
    const result = await runner.run(['sleep', '2'], { timeoutMs: 50 });
    
    expect(result.timedOut).toBe(true);
  });
});

describe('MockProcessRunner', () => {
  test('can be mocked for testing', async () => {
    const mockRun = mock((cmd: string[]) => Promise.resolve({
      exitCode: 0,
      stdout: 'mocked output',
      stderr: '',
      timedOut: false,
      truncated: { stdout: false, stderr: false }
    }));

    const mockRunner: ProcessRunner = {
      run: mockRun
    };

    const result = await mockRunner.run(['some', 'command']);
    
    expect(result.stdout).toBe('mocked output');
    expect(mockRun).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith(['some', 'command']);
  });
});
