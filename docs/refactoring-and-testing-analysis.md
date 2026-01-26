# Refactoring and Testing Analysis

This document reviews the current Multimedia Toolkit codebase and proposes refactors that improve maintainability, testability, and Bun-first correctness. It also outlines a testing strategy using `bun:test`.

Scope of review (primary files):
- `src/index.ts` (entrypoint, CLI + interactive orchestration)
- `src/cli/interface.ts` (prompting, menu rendering, FZF feedback loops)
- `src/utils/fzf.ts` (FZF integration; now Bun.spawn())
- `src/media/ffmpeg.ts` (FFmpeg/FFprobe wrapper, command building)
- `src/db/database.ts` (SQLite + schema management)
- `src/config/config.ts` (config persistence + tool validation)
- `src/utils/logger.ts` (logging + output naming/organization)

Supplementary docs consulted:
- `docs/architecture.md` (intended module responsibilities and patterns)
- `docs/development.md` (testing section: currently marked "future")
- `docs/api-reference.md`, `docs/user-guide.md`, `docs/configuration.md` (API/behavior expectations)

## Status Update (Phase 1-5 Applied)

- Output destination dialog implemented at `src/cli/dialogs/output-destination.ts`.
- Numbered menu template implemented at `src/cli/menus/numbered-menu.ts` and adopted by Settings + Presets menus.
- Command-driven interactive flows implemented at `src/cli/commands/interactive-commands.ts`, with shared context in `src/cli/commands/context.ts`.
- Shared helpers added at `src/cli/history.ts`, `src/utils/format.ts`, and `src/utils/process-logging.ts`.
- `src/index.ts` now builds the interactive menu from the command list and uses shared helpers in CLI mode.
- FZF now uses `runProcess(...)`, and shell building/output parsing are split into testable helpers.
- Output organization is centralized in `src/utils/path.ts` and shared by config + output organizer.
- Database migrations + repository layer added under `src/db/`.
- Import-time singletons removed in favor of `createAppContext()` and explicit factories.
- New unit tests cover app context wiring, process runner behavior, and FZF helpers.

## High-Impact Findings (Current Gaps)

1) Documentation drift exists; tests will help prevent regressions
- `docs/architecture.md` and `docs/api-reference.md` describe APIs/paths that do not match the current implementation in several places (e.g., logging location, database class naming, missing referenced docs like `docs/testing.md` / `docs/database-schema.md`).

2) CLI orchestration still uses `process.exit(...)`
- `src/index.ts` exits directly in several CLI flows, which complicates CLI-mode tests and reuse as a library.
- This is not a unit-test blocker now that `createAppContext()` exists, but it is still a friction point for CLI integration tests.

3) External-tool-dependent tests need gating
- FFmpeg/FFprobe/yt-dlp/FZF integration tests should be skipped when binaries are missing; manual `bun run test-fzf.ts` remains required for TTY behavior.

## Refactor Proposals (With Trade-offs and Testing Impact)

### 1) Output Destination + Rename Dialog as a Reusable Helper

Problem:
- Output selection logic is duplicated and inconsistent across flows in `src/index.ts`:
  - Some paths use `organizer.getOutputPath(...)` and then `cli.prompt('Output path', default)`.
  - Other flows default to `getDefaultOutputDir()` which currently returns `process.cwd()` rather than `config.get('defaultOutputDir')`.
- There is no shared "choose directory + optionally rename" dialog; adding it once would improve UX consistency and reduce bugs.

Proposal (OOP + FP):
- Create a reusable dialog helper responsible for collecting the output destination and optional rename, and returning a structured result.
- Split the logic into:
  - Pure functions (FP) for path/name computation and sanitization.
  - A small dialog class/function (OOP boundary around I/O) that uses `CLIInterface` for prompts.

Suggested API:
```ts
// src/cli/dialogs/output-destination.ts
export type OutputDestinationMode = 'file' | 'directory' | 'prefix';

export interface OutputDestinationRequest {
  mode: OutputDestinationMode;
  defaultDir: string;
  defaultBaseName: string;      // e.g. derived from input filename
  extension: string;            // e.g. "mp3", "webm", "gif"
  allowRename?: boolean;        // default true
  allowCustomDir?: boolean;     // default true
}

export interface OutputDestinationResult {
  dir: string;
  baseName: string;
  outputPath: string;           // for mode === 'file'
  prefix: string;               // for mode === 'prefix'/'directory' (multi-output)
}

export async function promptForOutputDestination(
  cli: CLIInterface,
  req: OutputDestinationRequest
): Promise<OutputDestinationResult | null> { /* ... */ }
```

Implemented (current):
- `OutputDestinationDialog` with `promptForSingleOutput(...)` and `promptForOutputDirectory(...)`
- `OutputDestinationResult` is `{ outputDir, baseName, outputPath? }`

Where it helps immediately:
- `src/index.ts`:
  - `handleExtractAudio()` (single output file)
  - `handleGifWebpConvert()` (single output file)
  - `handleClipAudio()`, `handleChapterExtraction()`, `handleSilenceSplit()` (multi-output; choose directory + prefix/base name)
  - `handleBatchProcess()` (directory + naming)

Trade-offs:
- Pros: consistent UX; fewer duplicated prompts; easier to test path logic; fewer bugs around "dir vs file" handling.
- Cons: adds an abstraction layer that must remain flexible for edge cases (multi-output naming, collisions, timestamping); requires touching many handlers to adopt it.

Testing impact:
- Unit tests for the pure path helpers (sanitization, output path building, dir/file resolution).
- "Dialog contract" tests using a fake prompt adapter (see Proposal #4) to ensure:
  - `0`/back behavior works
  - rename is optional
  - mode-specific outputs are returned correctly

### 2) Generic Numbered Menu Template (Standard Layout, Inheritable)

Problem:
- Menus are implemented ad-hoc as `MenuOption[]` passed to `cli.menu(...)`.
- Many menus already follow numeric keys and include `0`, but some sub-menus use letter keys (`y/r/m/b`), and layout consistency is not enforced.
- `CLIInterface.menu()` prints a default numeric key if `opt.key` is missing, but validation uses `options.map(o => o.key || '')`, which silently breaks menus that omit keys.

Proposal (OOP, with optional FP helpers):
- Add a generic numbered menu base class that:
  - Renders a standard format:
    - `1. [OPTION A]`
    - `2. [OPTION B]`
    - `...`
    - `0. EXIT` (or `0. BACK`)
  - Maps selection to a typed value.
  - Provides a single place to implement validation and "back/exit" semantics.

Suggested API:
```ts
// src/cli/menus/numbered-menu.ts
export interface NumberedChoice<T> {
  label: string;
  description?: string;
  value: T;
}

export abstract class NumberedMenu<T> {
  abstract title: string;
  abstract choices(): NumberedChoice<T>[];
  exitLabel(): string { return 'Exit'; }

  async run(cli: CLIInterface): Promise<T | null> {
    // 1..N choices, 0 exit/back
  }
}
```

Implemented (current):
- `src/cli/menus/numbered-menu.ts`
- `src/cli/menus/settings-menu.ts` and `src/cli/menus/preset-management-menu.ts` adopt it

Trade-offs:
- Pros: enforces consistent UX; eliminates key-management bugs; enables menu-level unit tests; reduces repetitive menu boilerplate in `src/index.ts`.
- Cons: more files/classes; slightly slower to add a one-off menu; any future non-numeric hotkeys become a deliberate opt-out.

Testing impact:
- Unit tests for menu rendering and selection mapping using fake prompt input:
  - invalid selection retries
  - `0` returns `null`
  - correct typed `value` returned

### 3) Command Pattern for CLI + Interactive Flows (Shared Core)

Problem:
- `src/index.ts` contains interactive flow orchestration, CLI mode logic, and business rules in one file.
- Many handlers share a common sequence (select input, validate, choose options, resolve output, dry-run flow, execute, log).
- `process.exit(...)` is called directly in several places, making the program difficult to test and reuse as a library.

Proposal (OOP + FP):
- Introduce a `Command` interface and implement each operation as a command class.
- Extract "plan building" into pure functions (FP) that return a structured plan:
  - input(s)
  - output destination(s)
  - ffmpeg/yt-dlp command args
  - expected artifacts
- Keep execution and side effects (spawn, db/log writes, console output) in command `run()` methods.

Suggested API:
```ts
// src/cli/commands/command.ts
export interface CommandContext {
  cli: CLIInterface;
  ffmpeg: FFmpegWrapper;
  downloader: MediaDownloader;
  db: DatabaseManager;
  logger: Logger;
  organizer: OutputOrganizer;
  config: ConfigManager;
  clock: { now(): number };
}

export interface Command {
  id: string;
  label: string;
  description?: string;
  run(ctx: CommandContext): Promise<void>;
}
```

Implemented (current):
- `src/cli/commands/command.ts`, `src/cli/commands/context.ts`, `src/cli/commands/interactive-commands.ts`
- `src/index.ts` interactive menu is now command-driven

Trade-offs:
- Pros: removes the "god file" pressure on `src/index.ts`; enables per-command tests; encourages reuse between interactive and CLI modes; aligns with OOP while keeping planning logic pure and testable.
- Cons: larger refactor; requires careful wiring of shared state and lifecycle (closing readline, graceful shutdown); more initial ceremony than direct functions.

Testing impact:
- Unit tests for plan builders (pure functions).
- Command tests using injected fakes (fake CLI answers, fake process runner, in-memory DB).
- CLI-mode argument combination tests can map args to a command selection without running real FFmpeg.

### 4) Replace Singletons-at-Import with Explicit App Context Creation

Problem:
- Instantiated singletons at import time create unavoidable side effects (config/db creation) and make tests order-dependent.
- It also makes it harder to run multiple independent contexts (e.g., future server mode, worker mode, parallel batch jobs).

Proposal (OOP):
- Replace `export const x = new X()` patterns with:
  - exported classes
  - exported `createX(...)` factories
  - a single `createAppContext()` in `src/app/context.ts`
- Keep convenience exports only for runtime entrypoints, not for the library surface.

Trade-offs:
- Pros: test isolation; ability to use `Database(':memory:')`; deterministic time via injected `clock`; easier mocking; fewer hidden global dependencies.
- Cons: touches many imports; slightly more plumbing in production code; more explicit parameter passing.

Testing impact:
- Enables safe unit tests without touching `~/.multimedia-toolkit`.
- Enables parallel tests without shared global state collisions.

### 5) Consolidate Output Naming/Organization (One Source of Truth)

Problem:
- Output path organization is duplicated:
  - `src/config/config.ts` implements `getOrganizedOutputPath(...)` (currently unused).
  - `src/utils/logger.ts` implements `OutputOrganizer.getOutputPath(...)` (actively used).
  - Both implement their own sanitization rules and directory layout (year/month vs year/month/day).

Proposal (FP):
- Pick one implementation as the source of truth (recommend `OutputOrganizer` since it already supports tags and customDir).
- Move sanitization + filename generation to pure helpers in `src/utils/path.ts`:
  - `sanitizeFileName(...)`
  - `buildTimestampedName(...)` (inject clock for test determinism)
  - `ensureDir(...)` (I/O boundary)

Trade-offs:
- Pros: fewer inconsistencies; tests cover one set of rules; docs can be updated to match.
- Cons: requires choosing a directory layout and updating docs and any consumer expectations.

Testing impact:
- Unit tests for naming rules and sanitization.
- Snapshot tests for a deterministic `clock` to avoid flaky timestamps.

Status:
- Implemented via `src/utils/path.ts`, with `OutputOrganizer` and `ConfigManager` sharing the same logic.

### 6) Process Runner Helper for Bun.spawn() (Standardized Result + Errors)

Problem:
- `Bun.spawn()` usage is repeated across `src/media/ffmpeg.ts`, `src/media/downloader.ts`, and `src/config/config.ts`.
- Error messages vary and stdout/stderr collection is duplicated.

Proposal (FP with typed errors):
- Add a small `runProcess(...)` helper that returns a typed `OperationResult` including:
  - `exitCode`
  - captured `stdout`/`stderr` (as strings, optionally truncated)
  - optional `timedOut` state
- Use it everywhere external tools are invoked, including FZF.

Trade-offs:
- Pros: consistent error behavior; fewer bugs; tests can mock a process runner at one seam.
- Cons: abstraction must still allow streaming output for long-running tools (yt-dlp progress, ffmpeg progress).

Testing impact:
- Unit tests for the helper with controlled inputs (and/or integration tests for trivial commands like `echo`).
- Higher-level module tests can inject a fake runner and assert command args.

Status:
- Implemented: `src/utils/process-runner.ts` with timeout/truncation, used in ffmpeg/downloader/config/fzf, with unit tests in `src/utils/process-runner.test.ts`.

### 7) Database Layer Improvements: Type Safety + Transactions

Problem:
- `src/db/database.ts` has type safety gaps and a likely return-type bug in `createProcess(...)` (declared `number` but returning an object from `last_insert_rowid()`).
- Schema evolution is handled via best-effort `ALTER TABLE ... ADD COLUMN` in a loop; no explicit migration tracking.

Proposal (OOP repository pattern):
- Split `DatabaseManager` into repositories with prepared statements:
  - `ProcessHistoryRepo`
  - `PresetRepo`
  - `ConfigRepo`
  - `TagsRepo`
- Fix return types and use typed mapping functions.
- Wrap multi-step operations in transactions where appropriate.
- Add a minimal migration mechanism (even if only for internal schema versioning).

Trade-offs:
- Pros: clearer boundaries; easier unit tests with in-memory DB; fewer runtime surprises; safer schema changes.
- Cons: more files and boilerplate; migration system adds complexity (but pays off quickly).

Testing impact:
- Fast unit tests using `new Database(':memory:')`.
- Schema assertions (tables/columns exist).
- Transaction tests (ensure atomic behavior).

Status:
- Implemented: migrations live in `src/db/migrations.ts` and repositories under `src/db/repositories/`.
- `createProcess(...)` now returns a numeric ID.

### 8) FZF Integration: Move to Bun.spawn() and Make It Testable

Problem:
- `src/utils/fzf.ts` uses Node `child_process.spawn` and `which`.
- The "find | fzf" shell pipeline is hard to test and potentially fragile across shells.

Proposal:
- Replace `child_process.spawn` with `Bun.spawn`.
- Replace `which` with a direct attempt to run `fzf --version` (or `command -v fzf` via shell) using the shared process runner.
- Separate concerns:
  - `buildFzfShellCommand(...)` (pure, testable)
  - `parseFzfOutput(...)` (pure, testable)
  - `runInteractiveFzf(...)` (I/O boundary)

Trade-offs:
- Pros: Bun-first implementation; fewer Node-compat traps; unit-testable parsing/command building; consistent process handling.
- Cons: interactive TTY behavior must be validated carefully (keep `bun run test-fzf.ts` as a required manual check when changing this area).

Testing impact:
- Unit tests for command-building and output parsing.
- Manual smoke test remains the source of truth for terminal UX.

Status:
- Implemented: `buildFzfShellCommand(...)` and `parseFzfOutput(...)` live in `src/utils/fzf.ts` with unit tests in `src/utils/fzf.test.ts`. `test-fzf.ts` continues as the manual smoke test.

## Testing Strategy (bun:test)

### Recommended Layers

1) Unit tests (fast, no external tools)
- Focus on pure logic and deterministic output:
  - path sanitization + output path resolution
  - menu selection mapping
  - time parsing/formatting helpers
  - ffmpeg argument builders and parsing helpers (silence parsing, chapter clip mapping)
  - waveform rendering (snapshot)

2) Integration tests (optional, gated by tool availability)
- If `ffmpeg`/`ffprobe` exist, test a minimal end-to-end extraction using:
  - a generated synthetic input (`ffmpeg -f lavfi ...`) OR a small fixture file
- Skip automatically when tools are missing.

3) CLI argument combination tests (no FFmpeg execution)
- Make `parseArguments()` and the CLI routing pure (return structured intent + exit code).
- Assert:
  - invalid combinations produce correct non-zero exit code and message
  - output path resolution rules (file vs directory) match `docs/user-guide.md`

### Test Placement

Preferred (matches repo guidelines): co-locate tests with modules
- `src/utils/path.test.ts`
- `src/cli/menus/numbered-menu.test.ts`
- `src/media/ffmpeg-args.test.ts` (pure builders)
- `src/db/database.test.ts` (in-memory DB)

If you prefer the structure described in `docs/development.md`, keep it but mirror the same tests:
- `tests/unit/...` and `tests/integration/...`

### Key Test Seams to Introduce

To make the test suite reliable, add injectable seams:
- `clock.now()` for deterministic timestamps in filenames and logs
- `paths` / base directory configuration (avoid writing to `~/.multimedia-toolkit` in tests)
- `processRunner` abstraction for `Bun.spawn()` calls
- `promptAdapter` abstraction for CLI input (so menus/dialogs can be tested without readline)

## Suggested Incremental Roadmap (Updated)

Phase 0: Enable safe tests (no refactor churn yet)
- Stop import-time side effects (or add env override so tests write to a temp root)
- Add the first unit tests for pure utilities (waveform, sanitize, time)

Phase 1: Refactor for reuse in the CLI (user-requested UX consistency) ✅
- Implement the output destination + rename dialog helper
- Implement the generic numbered menu template and adopt it for main/settings/presets menus

Phase 2: Core architecture cleanup for maintainability ✅
- Introduce `CommandContext` and convert handlers into command classes incrementally
- Extract pure "plan builders" from the command implementations

Phase 3: Bun alignment and robustness ✅
- Replace Node `child_process` usage in `src/utils/fzf.ts` with `Bun.spawn()` ✅
- Consolidate output organization (single source of truth) ✅
- Add database repository layer + migrations ✅

Phase 4: Remove import-time side effects (Proposal #4) ✅
- Problem context (resolved): singleton exports (`config`, `db`, `logger`, `ffmpeg`, `downloader`, `cli`) used to allocate resources and touch `~/.multimedia-toolkit` at import time, making `bun:test` unsafe and order-dependent.
- Implemented `createAppContext()` in `src/app/context.ts` to wire dependencies via explicit factories (config/db/logger/ffmpeg/downloader/organizer/presets/visualizer/clock).
- Base-path configuration is now injectable (env/constructor options) so tests can point to a temp root and avoid touching user state.
- Singleton exports were replaced with exported classes or `createX(...)` factories; runtime entrypoints construct the single instance.
- `src/cli/commands/context.ts` now constructs from `createAppContext()` instead of shared singletons.
- Added context wiring tests using `Database(':memory:')` and temp dirs.

Phase 5: Process runner + FZF test seams (Proposals #6 + #8) ✅
- Problem context (resolved): `Bun.spawn()` usage was duplicated and inconsistent across media/config modules, and FZF used inline shell building/parse logic that was hard to unit test.
- Added `src/utils/process-runner.ts` with a typed `runProcess(...)` helper that captures stdout/stderr, exitCode, and supports timeouts/truncation; supports streaming via callbacks.
- Replaced direct `Bun.spawn()` calls in `src/media/ffmpeg.ts`, `src/media/downloader.ts`, `src/config/config.ts`, and `src/utils/fzf.ts` with the shared runner.
- Split FZF into pure helpers (`buildFzfShellCommand(...)`, `parseFzfOutput(...)`) plus an I/O boundary function; `bun run test-fzf.ts` remains the manual verification step.
- Added unit tests for command building, parsing, and process-runner error handling, and updated this doc to reflect new helper usage.
- Helper usage: prefer `runProcess(...)` for new subprocess calls, and import `buildFzfShellCommand(...)`/`parseFzfOutput(...)` for unit tests around the FZF boundary.

## Notes on Bun/ESM Compatibility

Areas to prioritize:
- Keep ESM-only imports (logger no longer uses `require(...)`).
- Prefer `runProcess(...)`/`Bun.spawn()` over Node's `child_process` for process management.
- Prefer `@/` path aliases (already configured in `tsconfig.json`) to avoid deep relative imports and simplify refactors.
