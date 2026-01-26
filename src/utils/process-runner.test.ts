import { describe, expect, test } from 'bun:test';
import { runProcess } from '@/utils/process-runner';

describe('runProcess', () => {
  test('captures stdout for successful commands', async () => {
    const result = await runProcess(['bash', '-c', 'echo hello']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  });

  test('captures stderr and exit code on failure', async () => {
    const result = await runProcess(['bash', '-c', 'echo boom 1>&2; exit 2']);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('boom');
  });

  test('marks timeouts and terminates the process', async () => {
    const result = await runProcess(['bash', '-c', 'sleep 2'], { timeoutMs: 100 });
    expect(result.timedOut).toBe(true);
  });

  test('truncates output when maxOutputBytes is set', async () => {
    const result = await runProcess(['bash', '-c', 'printf "1234567890"'], { maxOutputBytes: 4 });
    expect(result.stdout).toBe('1234');
    expect(result.truncated.stdout).toBe(true);
  });
});
