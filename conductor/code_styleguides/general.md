# General Code Style Principles

This document outlines general coding principles that apply across all languages and frameworks used in this project.

## Readability
- Code should be easy to read and understand by humans.
- Avoid overly clever or obscure constructs.

## Consistency
- Follow existing patterns in the codebase.
- Maintain consistent formatting, naming, and structure.

## Simplicity
- Prefer simple solutions over complex ones.
- Break down complex problems into smaller, manageable parts.

## Maintainability
- Write code that is easy to modify and extend.
- Minimize dependencies and coupling.

## Documentation
- Document *why* something is done, not just *what*.
- Keep documentation up-to-date with code changes.

## Runtime Environment (Bun.js)
- **Performance First:** Leverage Bun's high-performance native APIs (`Bun.serve`, `Bun.file`) whenever possible.
- **Modern Standards:** Write code that targets modern ESNext standards. Avoid legacy patterns required by older Node.js versions.
- **Zero-Dependency Philosophy:** Prefer built-in Bun utilities (test runner, sqlite, password hashing) over adding external npm packages.