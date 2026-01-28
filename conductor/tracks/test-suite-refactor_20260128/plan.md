# Implementation Plan: Test Suite Refactor & Modernization

## Phase 1: Core Context & Isolation Infrastructure
GOAL: Establish the foundational dependency injection pattern and ensure the application context can be perfectly isolated for testing.

TASKS:
- [ ] Task: Refactor `AppContext` and factory in `src/app/context.ts`
    - [ ] Write failing tests in `src/app/context.test.ts` that demonstrate the need for isolated base directories and in-memory databases
    - [ ] Refactor `createAppContext` and the `AppContext` type to strictly enforce dependency injection and support mocking
- [ ] Task: Conductor - User Manual Verification 'Core Context & Isolation Infrastructure' (Protocol in workflow.md)

## Phase 2: Filesystem and Path Logic Refactor
GOAL: Refactor path-related utilities to use the injected context and separate path planning from filesystem state.

TASKS:
- [ ] Task: Refactor `src/utils/path.ts` for Context Injection
    - [ ] Write failing tests for `path.ts` utilities (sanitization, timestamping) using a mocked `AppContext`
    - [ ] Update `path.ts` functions to accept context and implement "Plan Builder" patterns for path organization
- [ ] Task: Conductor - User Manual Verification 'Filesystem and Path Logic Refactor' (Protocol in workflow.md)

## Phase 3: Process Runner and FZF Logic Refactor
GOAL: Modernize process execution and interactive search utilities to follow the deterministic "Plan Builder" pattern.

TASKS:
- [ ] Task: Refactor `src/utils/process-runner.ts`
    - [ ] Write failing tests for `ProcessRunner` using injected mocks for `Bun.spawn` behavior
    - [ ] Implement context-aware process running and pure planning for argument assembly
- [ ] Task: Refactor `src/utils/fzf.ts`
    - [ ] Write failing tests for FZF command generation and output parsing
    - [ ] Refactor FZF logic to separate command planning from terminal execution
- [ ] Task: Conductor - User Manual Verification 'Process Runner and FZF Logic Refactor' (Protocol in workflow.md)

## Phase 4: Miscellaneous Utilities and Reliability Verification
GOAL: Complete the refactor of remaining utility modules and verify the overall reliability of the suite.

TASKS:
- [ ] Task: Refactor remaining utility modules for Dependency Injection
    - [ ] Refactor `src/utils/clock.ts`, `src/utils/format.ts`, and `src/utils/logger.ts` to use injected context
    - [ ] Refactor `src/utils/process-logging.ts`, `src/utils/visualizer.ts`, and `src/utils/presets.ts`
- [ ] Task: Final System Reliability Verification
    - [ ] Create a verification script to run the full suite (`bun test`) 10 times in parallel/sequence
    - [ ] Verify zero flakiness and deterministic behavior across all refactored modules
- [ ] Task: Conductor - User Manual Verification 'Remaining Utilities and Reliability Verification' (Protocol in workflow.md)
