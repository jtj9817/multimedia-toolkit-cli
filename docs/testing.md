# Testing Strategy & Guide

This document outlines the testing strategy for the Multimedia Toolkit. As the project evolves from a script-based tool to a robust application, we are adopting a **Bun-first** testing approach that prioritizes fast feedback, architectural isolation, and deterministic behavior.

## 🎯 Testing Philosophy

1.  **Bun Native**: We use `bun:test` exclusively. It is fast, compatible with Jest expectations, and requires no extra dependencies.
2.  **Isolation via Dependency Injection**: Tests should not touch the user's home directory (`~/.multimedia-toolkit`). We use the `createAppContext` factory to inject temporary paths and in-memory databases.
3.  **Pure Logic vs. I/O**: We strive to separate "planning" (pure functions) from "execution" (side effects).
    *   *Test the plan* with unit tests.
    *   *Test the execution* with integration tests or careful mocks.
4.  **Deterministic**: Avoid flaky tests by injecting time sources (`clock`) and file system roots.

## 🛠️ Tech Stack

*   **Runner**: `bun test`
*   **Assertions**: `expect` (Jest-compatible, built-in)
*   **Mocks**: `mock` / `spyOn` (built-in)

## 🏗️ Test Pyramid & Organization

We categorize tests into three layers. Tests are organized in a root-level `tests/` directory that mirrors the `src/` directory structure (e.g., `src/utils/path.ts` -> `tests/utils/path.test.ts`).

### 1. Unit Tests (Logic & Wiring)
*Focus: Pure functions, command builders, configuration logic, and context wiring.*

*   **What to test**:
    *   Path sanitization and organization rules.
    *   FFmpeg argument generation (e.g., "Given these options, what CLI args are generated?").
    *   Configuration overrides and defaults.
    *   Time formatting and parsing.
    *   Database schema creation and basic queries (using `:memory:` DB).
*   **Key technique**: Use `createAppContext` with `dbPath: ':memory:'` and a temp directory for `baseDir`.

### 2. Process/System Tests (Integration)
*Focus: Interaction with the OS, processes, and external tools.*

*   **What to test**:
    *   `ProcessRunner`: Handling stdout/stderr, timeouts, and exit codes.
    *   `FZF`: Parsing output from the fuzzy finder.
    *   `FFmpegWrapper`: Parsing media metadata from `ffprobe` JSON output.
*   **Key technique**: These tests may spawn real processes (like `echo` or `sleep`) but should mock *heavy* external dependencies (like encoding a full video) unless strictly necessary.

### 3. Manual & Smoke Tests (Interactive)
*Focus: UX flows, TTY behavior, and "does it crash?"*

*   **What to test**:
    *   FZF interactive selection in a real terminal.
    *   Spinner animations and progress bars.
    *   Full end-to-end extraction on a sample file.
*   **Location**: `test-fzf.ts` (manual script) or specific "manual check" procedures.

## 👩‍💻 How to Write Tests

### A. Testing Context & Database
Use the application context factory to ensure your test is isolated.

```typescript
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createAppContext } from '@/app/context';

describe('MyFeature', () => {
  test('uses isolated context', () => {
    // 1. Setup Temp Dir
    const baseDir = mkdtempSync(join(tmpdir(), 'mat-test-'));
    
    // 2. Create Context
    const app = createAppContext({
      baseDir,
      defaultOutputDir: join(baseDir, 'out'),
      paths: { dbPath: ':memory:' } // In-memory SQLite
    });

    try {
      // 3. Act & Assert
      app.config.set('defaultFormat', 'flac');
      expect(app.config.get('defaultFormat')).toBe('flac');
      
      // DB interactions are safe and isolated
      app.db.createProcess({ /* ... */ });
    } finally {
      // 4. Cleanup
      app.db.close();
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
```

### B. Testing FFmpeg Command Building (Pure)
Instead of running FFmpeg, test that we build the correct command.

*Refactoring Note*: We are moving towards "Plan Builders" that return the argument list.

```typescript
import { describe, expect, test } from 'bun:test';
import { buildTranscodeArgs } from '@/media/ffmpeg-builder'; // Hypothetical helper

describe('buildTranscodeArgs', () => {
  test('generates correct args for webm discord preset', () => {
    const args = buildTranscodeArgs({
      input: 'in.mp4',
      preset: 'any-to-webm',
      resolution: '1080p'
    });
    
    expect(args).toContain('-c:v');
    expect(args).toContain('libvpx-vp9');
    expect(args).toContain('scale=-1:1080');
  });
});
```

### C. Mocking External Processes
When testing components that call `runProcess`, you can spy on the runner if strictly needed, but prefer testing the *result* of the runner or the *inputs* to it.

For specific tool tests (e.g., checking if `ffmpeg` is installed), integration tests checking the actual binary are acceptable if flagged to skip when tools are missing.

## 🧪 Running Tests

### Standard Run
Runs all tests matching `*.test.ts`.

```bash
bun test
```

### Watch Mode
Re-runs tests on file change.

```bash
bun test --watch
```

### Filter Tests
Run only tests matching a filename pattern.

```bash
bun test fzf
```

## 🚧 CI & Automation (Future)

To enable Continuous Integration (CI), we need to ensure the environment has the required binaries or that tests skip gracefully.

**CI Checklist**:
1.  [ ] Install Bun.
2.  [ ] Install FFmpeg/FFprobe (or mock them).
3.  [ ] Run `bun test`.
4.  [ ] Linting check (if added).

## 📄 Test File Locations

| Component | Source File | Test File |
|-----------|-------------|-----------|
| **Context** | `src/app/context.ts` | `tests/app/context.test.ts` |
| **Process Runner** | `src/utils/process-runner.ts` | `tests/utils/process-runner.test.ts` |
| **FZF Utils** | `src/utils/fzf.ts` | `tests/utils/fzf.test.ts` |
| **Paths/Org** | `src/utils/path.ts` | `tests/utils/path.test.ts` |
| **Database** | `src/db/database.ts` | `tests/db/database.test.ts` |
| **FFmpeg** | `src/media/ffmpeg.ts` | `tests/media/ffmpeg.test.ts` |
| **Config** | `src/config/config.ts` | `tests/config/config.test.ts` |
| **Logger** | `src/utils/logger.ts` | `tests/utils/logger.test.ts` |
| **Presets** | `src/utils/presets.ts` | `tests/utils/presets.test.ts` |

## 📋 Proposed Test Coverage Expansion

To ensure robustness, we will expand the test suite to cover specific transcoding and conversion scenarios using "Pure Command Building" tests.

### 1. Audio Extraction Scenarios (`src/media/ffmpeg-builder.test.ts`)

We must verify that `extractAudio` generates the correct FFmpeg flags for every user option.

*   **Format Targets**:
    *   `MP3` (Standard): Verify `-acodec libmp3lame`.
    *   `FLAC` (Lossless): Verify `-acodec flac` and absence of bitrate flags.
    *   `WAV` (Uncompressed): Verify `-acodec pcm_s16le`.
    *   `Opus`: Verify `-acodec libopus`.
*   **Quality Presets**:
    *   `Speech`: Verify `-ar 16000 -ac 1 -b:a 64k`.
    *   `Music High`: Verify `-ar 48000 -ac 2 -b:a 320k`.
    *   `Lossless`: Verify no sample rate/bitrate modification flags are added.
*   **Clipping Logic**:
    *   **Start + Duration**: Verify `-ss [start]` appears *before* `-i` (fast seek) and `-t [duration]` appears.
    *   **Start + End**: Verify `-ss [start]` and `-to [end]` (and absence of `-t`).
*   **Metadata**:
    *   **Strip**: Verify `-map_metadata -1` is present when requested.
    *   **Preserve**: Verify absence of stripping flag by default.

### 2. Video Transcoding Scenarios (`src/media/ffmpeg-builder.test.ts`)

We must verify `transcodeVideo` handles the complex matrix of presets, resolutions, and quality settings.

*   **Presets**:
    *   **Any-to-WebM (Discord)**:
        *   Verify codec `libvpx-vp9`.
        *   Verify extension `webm`.
        *   **Critical**: Verify custom Opus args `['-vbr', 'on', '-compression_level', '10']`.
    *   **Any-to-MP4**: Verify `libx264` and `aac`.
    *   **Any-to-MKV**: Verify `libx264` and container `matroska`.
*   **Resolution Scaling**:
    *   **2160p (4K)**: Verify filter `scale=3840:2160:force_original_aspect_ratio=decrease`.
    *   **1440p (2K)**: Verify filter `scale=2560:1440:force_original_aspect_ratio=decrease`.
    *   **1080p**: Verify filter `scale=1920:1080:force_original_aspect_ratio=decrease`.
    *   **720p**: Verify filter `scale=1280:720:force_original_aspect_ratio=decrease`.
    *   **480p**: Verify filter `scale=854:480:force_original_aspect_ratio=decrease`.
    *   **Source**: Verify no scaling filter is applied.
*   **Quality Overrides (Test for Each Preset)**:
    *   **Any-to-WebM**: Test both **CRF Mode** (verify `-crf` exists, `-b:v 0`) and **Bitrate Mode** (verify `-b:v` exists, `-crf` absent).
    *   **Any-to-MP4**: Test both **CRF Mode** (verify `-crf` exists) and **Bitrate Mode** (verify `-b:v` exists).
    *   **Any-to-MKV**: Test both **CRF Mode** (verify `-crf` exists) and **Bitrate Mode** (verify `-b:v` exists).

### 3. Path & Organization (`src/utils/path.test.ts`)

*   **Sanitization**: Test removal of `/`, `\`, `:`, and replacement of spaces.
*   **Timestamping**: Test that filenames include deterministic timestamps (mocked clock).
*   **Strategies**:
    *   `Date`: Verify `YYYY/MM/DD` structure.
    *   `Format`: Verify `format/filename.ext`.
    *   `Source`: Verify `source_name/filename.ext`.

## 🚫 Anti-Patterns to Avoid

1.  **Global State**: Never import `config` or `db` directly from the module level in source code if you want to test it. Use the `AppContext` passed into your function/class.
2.  **Hardcoded Paths**: Do not use `~/Music` or specific user paths in tests.
3.  **Sleeping**: Avoid `await Bun.sleep(1000)` to wait for async operations. Use `await process.exited` or deterministic events.
4.  **Console Noise**: If expected errors log to console, mock `console.error` to keep test output clean.

---
**Version**: 1.0.0
**Last Updated**: 2026-01-26
