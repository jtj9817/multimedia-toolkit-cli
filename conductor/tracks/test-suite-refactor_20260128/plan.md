# Implementation Plan: Test Suite Refactor & Modernization

## Phase 1: Core Context & Isolation Infrastructure [checkpoint: 87c04bb]
GOAL: Establish the foundational dependency injection pattern and ensure the application context can be perfectly isolated for testing.

TASKS:
- [x] Task: Refactor `AppContext` and factory in `src/app/context.ts` d8d418a
    - [x] Write failing tests in `src/app/context.test.ts` that demonstrate the need for isolated base directories and in-memory databases
    - [x] Ensure all tests use `createAppContext` with `dbPath: ':memory:'` and a temp `baseDir` (per `docs/testing.md`)
    - [x] Add explicit anti-pattern checks in tests or helpers (no global config/db import, no hardcoded user paths)
    - [x] Refactor `createAppContext` and the `AppContext` type to strictly enforce dependency injection and support mocking
- [x] Task: Conductor - User Manual Verification 'Core Context & Isolation Infrastructure' (Protocol in workflow.md)

## Phase 2: Filesystem and Path Logic Refactor [checkpoint: 3862c16]
GOAL: Refactor path-related utilities to use the injected context and separate path planning from filesystem state.

TASKS:
- [x] Task: Refactor `src/utils/path.ts` for Context Injection 11d8082
    - [ ] Write failing tests for `path.ts` utilities (sanitization, timestamping) using a mocked `AppContext`
    - [ ] Mock time sources (`clock`) for deterministic timestamp tests (avoid `Bun.sleep`)
    - [ ] Update `path.ts` functions to accept context and implement "Plan Builder" patterns for path organization
- [x] Task: Conductor - User Manual Verification 'Filesystem and Path Logic Refactor' (Protocol in workflow.md)

## Phase 3: Process Runner and FZF Logic Refactor
GOAL: Modernize process execution and interactive search utilities to follow the deterministic "Plan Builder" pattern.

TASKS:
- [ ] Task: Refactor `src/utils/process-runner.ts`
    - [ ] Write tests that validate planned inputs/outputs and runner results; mock `Bun.spawn` only when strictly necessary
    - [ ] Implement context-aware process running and pure planning for argument assembly (test the plan, not heavy execution)
- [ ] Task: Refactor `src/utils/fzf.ts`
    - [ ] Write failing tests for FZF command generation and output parsing
    - [ ] Refactor FZF logic to separate command planning from terminal execution
    - [ ] Run manual `bun run test-fzf.ts` for interactive verification
- [ ] Task: Conductor - User Manual Verification 'Process Runner and FZF Logic Refactor' (Protocol in workflow.md)

## Phase 4: Miscellaneous Utilities and Reliability Verification
GOAL: Complete the refactor of remaining utility modules and verify the overall reliability of the suite.

TASKS:
- [ ] Task: Refactor remaining utility modules for Dependency Injection
    - [ ] Refactor `src/utils/clock.ts`, `src/utils/format.ts`, and `src/utils/logger.ts` to use injected context
    - [ ] Refactor `src/utils/process-logging.ts`, `src/utils/visualizer.ts`, and `src/utils/presets.ts`
    - [ ] Ensure tests mock `console.error` for expected error paths to avoid console noise
- [ ] Task: Final System Reliability Verification
    - [ ] Create a verification script to run the full suite (`bun test`) 10 times in parallel/sequence
    - [ ] Verify zero flakiness and deterministic behavior across all refactored modules
- [ ] Task: Conductor - User Manual Verification 'Remaining Utilities and Reliability Verification' (Protocol in workflow.md)

## Compliance Checklist (docs/testing.md)
- [ ] All tests use `createAppContext` with `dbPath: ':memory:'` and temp `baseDir`
- [ ] No global `config`/`db` imports in testable modules; no hardcoded user paths
- [ ] "Plan Builder" logic tested as pure functions; heavy execution mocked or avoided
- [ ] Minimal mocking of `Bun.spawn`; prefer validating inputs/outputs
- [ ] Mock `console.error` when errors are expected to keep output clean
- [ ] Avoid `Bun.sleep`; use deterministic completion signals (e.g., `process.exited`)
- [ ] Co-locate tests and use `*.test.ts` with `bun:test`
- [ ] Run manual `bun run test-fzf.ts` when FZF/CLI behavior changes
