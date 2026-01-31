# Development Guide

Guide for developers who want to contribute to or extend Multimedia Toolkit.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Building](#building)
- [Debugging](#debugging)
- [Adding Features](#adding-features)
- [Common Tasks](#common-tasks)

## Development Setup

### Prerequisites

- **Bun** v1.0+ - Runtime and package manager
- **FFmpeg/FFprobe** - For testing media operations
- **Git** - Version control
- **Code Editor** - VS Code recommended with TypeScript support

### Clone and Install

```bash
# Clone repository
git clone https://github.com/your-username/multimedia-toolkit.git
cd multimedia-toolkit

# Install dependencies
bun install

# Verify setup
bun run src/index.ts --version
```

### Development Dependencies

```bash
# Install development tools
bun add -d bun-types

# Optional: Install shellcheck for shell script validation
sudo apt install shellcheck

# Optional: Install pre-commit hooks
pip install pre-commit
pre-commit install
```

### IDE Setup

#### VS Code

**Recommended Extensions**:
- TypeScript and JavaScript Language Features (built-in)
- Error Lens
- ESLint (if configured)
- Prettier (if configured)

**settings.json**:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "files.associations": {
    "*.ts": "typescript"
  }
}
```

#### TypeScript Configuration

The project uses `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Project Structure

```
multimedia-toolkit/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── types.ts           # Type definitions
│   ├── app/               # Application context and paths
│   │   ├── context.ts     # Dependency injection factory
│   │   └── paths.ts       # Path resolution
│   ├── cli/               # CLI interface modules
│   │   ├── interface.ts   # Main CLI interface
│   │   ├── commands/      # Command pattern implementation
│   │   ├── menus/         # Menu system components
│   │   └── dialogs/       # User interaction dialogs
│   ├── config/            # Configuration management
│   ├── db/                # Database operations
│   │   ├── database.ts    # SQLite manager
│   │   └── repositories/  # Repository pattern for DB ops
│   ├── media/             # Media processing (FFmpeg, downloader)
│   └── utils/             # Utility modules
│       ├── fzf.ts         # FZF integration
│       ├── logger.ts      # Logging
│       ├── presets.ts     # Preset management
│       ├── visualizer.ts  # Waveform visualization
│       ├── clock.ts       # Time abstraction
│       ├── process-runner.ts  # Process execution
│       └── format.ts      # Formatting utilities
├── tests/                 # Test files (mirrors src/ structure)
│   ├── app/
│   ├── cli/
│   ├── config/
│   ├── db/
│   ├── media/
│   └── utils/
├── dist/                  # Build output (generated)
├── docs/                  # Documentation
├── mat                    # Launcher script
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript config
└── README.md             # Main readme
```

See [Architecture Overview](./architecture.md) for detailed module documentation.

## Development Workflow

### Running in Development

```bash
# Run with auto-reload on file changes
bun --watch run src/index.ts --interactive

# Run specific command
bun run src/index.ts -i test.mp4 -f mp3
```

### Making Changes

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes** to source files

3. **Test changes**:
   ```bash
   # Manual testing
   bun run src/index.ts --interactive

   # With sample files
   bun run src/index.ts test-files/sample.mp4
   ```

4. **Run type checking**:
   ```bash
   bunx tsc --noEmit
   ```

5. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples**:
```bash
git commit -m "feat: add support for AAC format"
git commit -m "fix: handle paths with spaces correctly"
git commit -m "docs: update configuration guide"
git commit -m "refactor: simplify FFmpeg command building"
```

## Code Style

### TypeScript Guidelines

1. **Use explicit types** for function parameters and returns:
   ```typescript
   // Good
   async function extractAudio(
     inputPath: string,
     outputPath: string
   ): Promise<OperationResult<string>> {
     // ...
   }

   // Avoid
   async function extractAudio(inputPath, outputPath) {
     // ...
   }
   ```

2. **Use interfaces** for object types:
   ```typescript
   interface ExtractionOptions {
     format: OutputFormat;
     quality: string;
     preserveMetadata: boolean;
   }
   ```

3. **Use enums or const objects** for constants:
   ```typescript
   const QUALITY_PRESETS = {
     speech: { bitrate: '64k', ... },
     music_high: { bitrate: '320k', ... }
   } as const;
   ```

4. **Prefer async/await** over callbacks:
   ```typescript
   // Good
   const result = await ffmpeg.extractAudio(input, output);

   // Avoid
   ffmpeg.extractAudio(input, output, (err, result) => { ... });
   ```

5. **Use OperationResult pattern** for error handling:
   ```typescript
   function doSomething(): OperationResult<string> {
     try {
       // ...
       return { success: true, data: result };
     } catch (error) {
       return { success: false, error: String(error) };
     }
   }
   ```

### Naming Conventions

- **Variables/Functions**: `camelCase`
  ```typescript
  const outputPath = getOutputPath();
  async function extractAudio() { }
  ```

- **Classes**: `PascalCase`
  ```typescript
  class FFmpegWrapper { }
  class ConfigManager { }
  ```

- **Constants**: `SCREAMING_SNAKE_CASE`
  ```typescript
  const DEFAULT_BITRATE = '192k';
  const OUTPUT_FORMATS = ['mp3', 'flac'] as const;
  ```

- **Types/Interfaces**: `PascalCase`
  ```typescript
  interface MediaMetadata { }
  type OutputFormat = 'mp3' | 'flac';
  ```

- **Private members**: Prefix with underscore
  ```typescript
  class Example {
    private _internalState: string;
  }
  ```

### Code Organization

1. **Imports** at top, grouped:
   ```typescript
   // Node/Bun built-ins
   import { join } from 'path';
   import { existsSync } from 'fs';

   // Project modules
   import { config } from './config/config';
   import { ffmpeg } from './media/ffmpeg';

   // Types
   import type { OutputFormat, MediaMetadata } from './types';
   ```

2. **Constants** after imports

3. **Types/Interfaces** before functions

4. **Functions** organized by related functionality

5. **Main/export** at bottom

### Documentation

Use JSDoc comments for public APIs:

```typescript
/**
 * Extract audio from a media file
 *
 * @param inputPath - Path to input media file
 * @param outputPath - Path for output audio file
 * @param options - Extraction options
 * @returns Operation result with output path
 *
 * @example
 * ```typescript
 * const result = await extractAudio(
 *   'video.mp4',
 *   'audio.mp3',
 *   { format: 'mp3', quality: 'music_high' }
 * );
 * ```
 */
async function extractAudio(
  inputPath: string,
  outputPath: string,
  options: ExtractionOptions
): Promise<OperationResult<string>> {
  // ...
}
```

## Testing

We have moved to a **Bun-first** testing strategy using `bun:test`.

For a complete guide on how to write, run, and structure tests, please see the **[Testing Strategy](./testing.md)** document.

### Quick Start

```bash
# Run all tests
bun test

# Watch mode
bun test --watch
```

### Key Principles

1.  **Isolation**: Use `createAppContext` with `:memory:` databases.
2.  **Pure Logic**: Test "plan builders" separately from execution.
3.  **No Side Effects**: Tests should not touch `~/.multimedia-toolkit`.

See [Testing Strategy](./testing.md) for full details.

## Building

### Development Build

```bash
# Type check
bunx tsc --noEmit

# Bundle for distribution
bun build src/index.ts --outdir ./dist --target bun
```

### Production Build

```bash
# Build with optimizations
bun build src/index.ts --outdir ./dist --target bun --minify

# Make executable
chmod +x dist/index.js
```

## Debugging

### Console Debugging

Add debug output:

```typescript
console.log('Debug:', { variable, state });
console.error('Error occurred:', error);
```

### Bun Debugger

```bash
# Run with debugger
bun --inspect run src/index.ts

# Then attach debugger from VS Code or Chrome DevTools
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Multimedia Toolkit",
      "program": "${workspaceFolder}/src/index.ts",
      "args": ["--interactive"],
      "cwd": "${workspaceFolder}",
      "env": {},
      "strictEnv": false,
      "watchMode": false,
      "stopOnEntry": false,
      "noDebug": false,
      "runtime": "bun",
      "runtimeArgs": []
    }
  ]
}
```

### Debugging Tips

1. **Use verbose FFmpeg output**:
   ```typescript
   const args = [..., '-v', 'verbose'];
   ```

2. **Log FFmpeg commands**:
   ```typescript
   console.log('Executing:', ['ffmpeg', ...args].join(' '));
   ```

3. **Dry run mode** for testing without execution:
   ```bash
   bun run src/index.ts -i test.mp4 --dry-run
   ```

## Adding Features

### Add New Output Format

1. **Update types** (`src/types.ts`):
   ```typescript
   export const OUTPUT_FORMATS = [..., 'new_format'] as const;
   ```

2. **Add codec mapping** (`src/media/ffmpeg.ts`):
   ```typescript
   const codecMap: Record<OutputFormat, string> = {
     // ...
     new_format: 'codec_name'
   };
   ```

3. **Test the format**:
   ```bash
   bun run src/index.ts -i test.mp4 -f new_format
   ```

4. **Update documentation**

### Add New Quality Preset

1. **Update types** (`src/types.ts`):
   ```typescript
   export const QUALITY_PRESETS = {
     // ...
     new_preset: {
       name: 'new_preset',
       bitrate: '256k',
       sampleRate: 48000,
       channels: 2,
       description: 'Description'
     }
   };
   ```

2. **Test the preset**

3. **Update documentation**

### Add New Menu Option

1. **Create handler function** (`src/index.ts`):
   ```typescript
   async function handleNewFeature(): Promise<void> {
     // Implementation
   }
   ```

2. **Add menu option**:
   ```typescript
   const menuOptions: MenuOption[] = [
     // ...
     {
       key: 'n',
       label: 'New Feature',
       description: 'Does something new',
       action: handleNewFeature
     }
   ];
   ```

3. **Test in interactive mode**

### Add New CLI Flag

1. **Add to argument parser** (`src/index.ts`):
   ```typescript
   const { values } = parseArgs({
     options: {
       // ...
       'new-flag': { type: 'boolean' }
     }
   });
   ```

2. **Handle flag** in `runCliMode()`:
   ```typescript
   if (values['new-flag']) {
     // Handle flag
   }
   ```

3. **Update help text**

4. **Document in CLI reference**

## Common Tasks

### Add Logging

```typescript
import { logger } from './utils/logger';

logger.info('Info message');
logger.success('Success!');
logger.error('Error occurred');
logger.warn('Warning');
```

### Add Configuration Option

1. **Update type** (`src/types.ts`):
   ```typescript
   export interface AppConfig {
     // ...
     newOption: string;
   }
   ```

2. **Add default** (`src/config/config.ts`):
   ```typescript
   const DEFAULT_CONFIG: AppConfig = {
     // ...
     newOption: 'default_value'
   };
   ```

3. **Use in code**:
   ```typescript
   const value = config.get('newOption');
   ```

### Add Database Field

1. **Update schema** (`src/db/database.ts`):
   ```typescript
   db.exec(`
     CREATE TABLE IF NOT EXISTS processes (
       -- ...
       new_field TEXT
     )
   `);
   ```

2. **Update type** (`src/types.ts`):
   ```typescript
   interface ProcessRecord {
     // ...
     newField?: string;
   }
   ```

3. **Use in queries**

## Performance Optimization

### Process Spawning

- Use `Bun.spawn()` instead of `child_process`
- Stream large outputs instead of buffering
- Reuse process results when possible

### File I/O

- Use `Bun.file()` and `Bun.write()` for efficient I/O
- Batch database operations
- Use appropriate buffer sizes

### Memory Management

- Clean up temporary files
- Close database connections
- Avoid loading large files into memory

## Contributing

See [Contributing Guide](./contributing.md) for:
- Pull request process
- Code review guidelines
- Issue reporting
- Community guidelines

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Project Architecture](./architecture.md)

---

**Questions?** Open an issue or discussion on GitHub!
