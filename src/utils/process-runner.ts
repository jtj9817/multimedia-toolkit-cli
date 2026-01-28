/**
 * Shared process runner with stdout/stderr capture, timeouts, and truncation support.
 */

type ProcessStdio = 'pipe' | 'inherit' | 'ignore';

export interface RunProcessOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  stdin?: ProcessStdio;
  stdout?: ProcessStdio;
  stderr?: ProcessStdio;
  input?: string | Uint8Array;
  timeoutMs?: number;
  maxOutputBytes?: number;
  onStdout?: (chunk: Uint8Array) => void;
  onStderr?: (chunk: Uint8Array) => void;
}

export interface RunProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: {
    stdout: boolean;
    stderr: boolean;
  };
}

type StreamResult = {
  text: string;
  truncated: boolean;
};

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function consumeStream(
  stream: ReadableStream<Uint8Array> | null | undefined,
  onChunk?: (chunk: Uint8Array) => void,
  maxBytes?: number
): Promise<StreamResult> {
  if (!stream) {
    return { text: '', truncated: false };
  }

  const reader = stream.getReader();

  if (maxBytes === undefined) {
    const decoder = new TextDecoder();
    let text = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        onChunk?.(value);
        text += decoder.decode(value, { stream: true });
      }
    }

    text += decoder.decode();
    return { text, truncated: false };
  }

  const chunks: Uint8Array[] = [];
  let stored = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    onChunk?.(value);

    if (maxBytes <= 0) {
      truncated = true;
      continue;
    }

    if (stored < maxBytes) {
      const remaining = maxBytes - stored;
      if (value.byteLength <= remaining) {
        chunks.push(value);
        stored += value.byteLength;
      } else {
        chunks.push(value.slice(0, remaining));
        stored += remaining;
        truncated = true;
      }
    } else {
      truncated = true;
    }
  }

  const output = stored > 0 ? concatChunks(chunks, stored) : new Uint8Array(0);
  return { text: new TextDecoder().decode(output), truncated };
}

async function writeInput(
  stdin: any,
  input: string | Uint8Array | undefined
): Promise<void> {
  if (!stdin) {
    return;
  }

  if (typeof stdin.getWriter === 'function') {
    const writer = stdin.getWriter();

    if (input !== undefined) {
      const payload = typeof input === 'string' ? new TextEncoder().encode(input) : input;
      await writer.write(payload);
    }

    await writer.close();
  } else if (typeof stdin.write === 'function' && typeof stdin.end === 'function') {
    // Node stream fallback
    if (input !== undefined) {
      stdin.write(input);
    }
    stdin.end();
  }
}

export async function runProcess(
  command: string[],
  options: RunProcessOptions = {}
): Promise<RunProcessResult> {
  const {
    cwd,
    env,
    stdin = 'pipe',
    stdout = 'pipe',
    stderr = 'pipe',
    input,
    timeoutMs,
    maxOutputBytes,
    onStdout,
    onStderr
  } = options;

  const proc = Bun.spawn(command, {
    cwd,
    env,
    stdin,
    stdout,
    stderr
  });

  if (stdin === 'pipe') {
    await writeInput(proc.stdin, input);
  }

  let timedOut = false;
  const timeoutId = timeoutMs && timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        try {
          proc.kill();
        } catch {
          // Ignore kill errors; process may already be gone.
        }
      }, timeoutMs)
    : undefined;

  const stdoutPromise = consumeStream(proc.stdout, onStdout, maxOutputBytes);
  const stderrPromise = consumeStream(proc.stderr, onStderr, maxOutputBytes);

  const [stdoutResult, stderrResult, exitCode] = await Promise.all([
    stdoutPromise,
    stderrPromise,
    proc.exited
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return {
    exitCode: typeof exitCode === 'number' ? exitCode : (proc.exitCode ?? -1),
    stdout: stdoutResult.text,
    stderr: stderrResult.text,
    timedOut,
    truncated: {
      stdout: stdoutResult.truncated,
      stderr: stderrResult.truncated
    }
  };
}
