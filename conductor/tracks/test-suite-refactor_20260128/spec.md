# Specification: Test Suite Refactor & Modernization

## Overview
This track involves a comprehensive refactor of the Multimedia Toolkit's test suite and underlying architecture to align with the "Bun-first" testing philosophy defined in `docs/testing.md`. The goal is to move from a side-effect-heavy testing approach to a deterministic, isolated, and plan-based system using strict dependency injection.

## Scope
- **Core Application Context:** Refactor `src/app/context.ts` and `src/app/context.test.ts` to ensure perfect isolation.
- **Utility Modules:** Refactor `src/utils/` (path, fzf, process-runner, etc.) to use context injection and the "Plan Builder" pattern.
- **Migration:** Replace existing legacy tests with new, high-fidelity tests that follow the updated philosophy.

## Functional Requirements
1.  **Full Context Injection:** All utility functions and managers that interact with the filesystem, environment, or external processes MUST accept `AppContext` (or a specific subset interface) as an argument.
2.  **Plan Builder Pattern:** Utility logic must be separated into "Planning" (pure functions that return command arguments or execution steps) and "Execution" (side-effect wrappers).
3.  **Isolated Test Environment:** Tests must not touch the user's real home directory or global state. Use temporary directories and `:memory:` SQLite databases for every test run.
4.  **Deterministic Behavior:** Inject time sources (`clock`) and filesystem roots to eliminate flakiness.

## Non-Functional Requirements
- **Performance:** Maintain or improve the speed of the test suite by utilizing Bun's native test runner efficiency.
- **Maintainability:** Standardize test naming (`*.test.ts`) and co-locate tests with their source files.
- **Deterministic Reliability:** The test suite must exhibit zero flakiness. This must be confirmed by running the suite multiple times in parallel and simulated CI environments.

## Acceptance Criteria
- [ ] `src/app/context.ts` refactored to support robust mocking and isolation.
- [ ] All functions in `src/utils/` (path, fzf, process-runner) updated to use `AppContext` injection.
- [ ] All utility command logic refactored to return argument lists/execution plans.
- [ ] Existing tests in `src/app/` and `src/utils/` migrated to the new pattern.
- [ ] Test coverage for refactored modules is >95%.
- [ ] `bun test` passes for the entire suite.
- [ ] **Reliability Verification:** Suite successfully passes 10 consecutive runs in parallel without failure.

## Out of Scope
- Refactoring `src/media/ffmpeg.ts` or `src/db/` repositories (these will be addressed in a subsequent track).
- Adding new functional features to the toolkit.
