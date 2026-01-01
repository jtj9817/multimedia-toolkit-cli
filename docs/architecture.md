# Architecture Overview

Technical documentation of Media Audio Toolkit's system design, module structure, and data flow.

## Table of Contents

- [System Architecture](#system-architecture)
- [Module Structure](#module-structure)
- [Data Flow](#data-flow)
- [Core Components](#core-components)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   CLI Entry Point                        │
│                   (src/index.ts)                         │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
        ▼                          ▼
┌───────────────┐          ┌──────────────┐
│  Interactive  │          │  CLI Mode    │
│     Mode      │          │   Parser     │
└───────┬───────┘          └──────┬───────┘
        │                         │
        └─────────┬───────────────┘
                  │
    ┌─────────────┼──────────────┐
    │             │              │
    ▼             ▼              ▼
┌────────┐  ┌─────────┐   ┌──────────┐
│ FFmpeg │  │  Config │   │ Database │
│ Module │  │ Manager │   │  Module  │
└────┬───┘  └────┬────┘   └────┬─────┘
     │           │             │
     └───────────┴─────────────┘
                  │
           ┌──────┴───────┐
           │              │
           ▼              ▼
    ┌───────────┐  ┌──────────┐
    │  Logger   │  │ Presets  │
    │  Module   │  │  Module  │
    └───────────┘  └──────────┘
```

### Architecture Principles

1. **Modular Design**: Each component has a single responsibility
2. **Separation of Concerns**: CLI, business logic, and I/O are separate
3. **Singleton Pattern**: Configuration and database use singleton instances
4. **Async/Await**: All I/O operations are asynchronous
5. **Type Safety**: Full TypeScript type coverage

## Module Structure

### Directory Layout

```
src/
├── index.ts              # Main entry point, CLI argument parsing
├── types.ts              # TypeScript type definitions
│
├── cli/
│   └── interface.ts      # Interactive CLI, menus, prompts
│
├── config/
│   └── config.ts         # Configuration management
│
├── db/
│   └── database.ts       # SQLite database operations
│
├── media/
│   ├── ffmpeg.ts         # FFmpeg wrapper and operations
│   └── downloader.ts     # yt-dlp wrapper for URL downloads
│
└── utils/
    ├── fzf.ts            # FZF integration for file selection
    ├── logger.ts         # Logging and output organization
    ├── presets.ts        # Clip preset management
    └── visualizer.ts     # Waveform visualization
```

## Core Components

### 1. Main Entry Point (`index.ts`)

**Responsibilities**:
- Parse command-line arguments
- Route to interactive or CLI mode
- Orchestrate high-level operations
- Handle interactive mode menu logic

**Key Functions**:
- `main()`: Application entry point
- `parseArguments()`: CLI argument parser
- `runInteractiveMode()`: Interactive menu loop
- `runCliMode()`: Non-interactive execution
- Handler functions for each menu option

**Dependencies**: All other modules

```typescript
// Example flow
main() → parseArguments() → {
  interactive → runInteractiveMode() → menu handlers
  cli → runCliMode() → direct operations
}
```

### 2. CLI Interface (`cli/interface.ts`)

**Responsibilities**:
- Terminal UI rendering (menus, tables, boxes)
- User input prompts and validation
- FZF integration for file selection
- Spinner and progress indicators

**Key Classes**:
```typescript
class CLIInterface {
  prompt(question, defaultValue): Promise<string>
  confirm(question, defaultYes): Promise<boolean>
  menu(title, options): Promise<string>
  selectFromList(title, items, displayFn): Promise<T[]>
  selectMediaFile(directory): Promise<string>
  selectMediaFiles(directory): Promise<string[]>
  withSpinner(message, task): Promise<T>
  // ... display helpers (box, table, success, error, etc.)
}
```

**Pattern**: Singleton exported as `cli`

### 3. FFmpeg Wrapper (`media/ffmpeg.ts`)

**Responsibilities**:
- Execute FFmpeg/FFprobe commands
- Audio extraction and conversion
- Clipping operations
- Chapter extraction
- Silence detection
- Waveform data extraction

**Key Classes**:
```typescript
class FFmpegWrapper {
  getMediaInfo(inputPath): Promise<OperationResult<MediaMetadata>>
  extractAudio(inputPath, outputPath, options): Promise<OperationResult>
  extractMultipleClips(inputPath, clips, outputDir): Promise<OperationResult>
  extractChapters(inputPath, outputDir, options): Promise<OperationResult>
  splitBySilence(inputPath, outputDir, options): Promise<OperationResult>
  detectSilence(inputPath, options): Promise<OperationResult<SilenceSegment[]>>
  getWaveformData(inputPath): Promise<OperationResult<WaveformData>>
  formatTime(seconds): string
}
```

**Pattern**: Singleton exported as `ffmpeg`

**Process Spawning**:
```typescript
// All external commands use Bun.spawn() for async execution
const proc = Bun.spawn(['ffmpeg', ...args], {
  stdout: 'pipe',
  stderr: 'pipe'
});
await proc.exited;
```

### 4. Configuration Manager (`config/config.ts`)

**Responsibilities**:
- Load/save configuration from JSON and SQLite
- Manage default settings
- Tool validation (FFmpeg, yt-dlp, etc.)
- Output path generation
- File organization logic

**Key Classes**:
```typescript
class ConfigManager {
  // Singleton pattern
  private static instance: ConfigManager

  get<K>(key: K): AppConfig[K]
  set<K>(key: K, value: AppConfig[K]): void
  getAll(): AppConfig
  setMultiple(updates): void
  reset(): void

  validateTools(): Promise<{ valid, missing }>
  getOutputDir(subDir?): string
  getOrganizedOutputPath(baseName, format, source?): string
}
```

**Storage**:
- Primary: `~/.media-audio-toolkit/config.json`
- Backup: SQLite database
- Auto-creates directories on first run

### 5. Database Module (`db/database.ts`)

**Responsibilities**:
- SQLite operations for process history
- Configuration storage (backup)
- Preset storage
- Statistics queries

**Key Classes**:
```typescript
class Database {
  // Process history
  createProcess(record): void
  getRecentProcesses(limit): ProcessRecord[]
  getProcessStats(): { total, completed, failed, totalSize }

  // Configuration
  setConfig(key, value): void
  getConfig(key): string | null
  getAllConfig(): Record<string, string>

  // Presets
  createPreset(preset): number
  getPreset(name): ClipPreset | null
  getAllPresets(): ClipPreset[]
  deletePreset(name): void
}
```

**Schema**: See [Database Schema](./database-schema.md)

### 6. FZF Integration (`utils/fzf.ts`)

**Responsibilities**:
- Check FZF availability
- Execute FZF with appropriate options
- Parse FZF output
- Handle multi-select mode

**Key Classes**:
```typescript
class FzfSelector {
  isFzfAvailable(): Promise<boolean>
  selectFile(options): Promise<OperationResult<string>>
  selectFiles(options): Promise<OperationResult<string[]>>
}
```

**Process**:
1. Build file list with `find` or Bun.glob
2. Pipe to FZF with preview command
3. Parse selected file(s)
4. Return absolute paths

### 7. Logger Module (`utils/logger.ts`)

**Responsibilities**:
- Console output formatting
- File logging (JSON/CSV)
- Output organization
- Progress indicators

**Key Classes**:
```typescript
class Logger {
  info(message): void
  success(message): void
  error(message): void
  warn(message): void
  header(text): void
  progress(current, total, filename): void

  logToFile(record): void
  exportProcessHistory(format): string
  getLogStats(): { todayLogs, logDir }
}

class OutputOrganizer {
  getOutputPath(baseName, format, options?): string
  organize(file, organizationType): string
}
```

**Log Location**: `~/.media-audio-toolkit/logs/`

### 8. Presets Module (`utils/presets.ts`)

**Responsibilities**:
- CRUD operations for clip presets
- Preset validation
- Import/export to JSON
- Database integration

**Key Classes**:
```typescript
class PresetManager {
  create(preset): OperationResult<number>
  createFromClips(name, clips, sourcePattern?): OperationResult
  get(name): OperationResult<ClipPreset>
  getAll(): OperationResult<ClipPreset[]>
  delete(name): OperationResult
  listPresets(): string
  formatPreset(preset): string
  exportToJson(): string
}
```

## Data Flow

### Audio Extraction Flow

```
User Input
    ↓
Argument Parsing
    ↓
Validate Input File
    ↓
Get Media Info (FFprobe)
    ↓
Determine Output Path (Config)
    ↓
Build FFmpeg Command
    ↓
Execute FFmpeg
    ↓
Log Process (Database)
    ↓
Organize Output (Logger)
    ↓
Return Success/Error
```

### Interactive Mode Flow

```
Launch Interactive Mode
    ↓
Validate Tools (Config)
    ↓
Display Main Menu (CLI)
    ↓
User Selection
    ↓
    ├─ Extract Audio
    │   └─ FZF File Select → FFmpeg Extract → Database Log
    │
    ├─ Clip Audio
    │   └─ File Select → Clip Definition → FFmpeg Extract → Save Preset?
    │
    ├─ Download & Extract
    │   └─ URL Input → yt-dlp Download → Optional Clip → FFmpeg Extract
    │
    ├─ Batch Process
    │   └─ FZF Multi-Select → Loop FFmpeg Extract → Progress Display
    │
    ├─ Extract Chapters
    │   └─ File Select → Parse Chapters → FFmpeg Extract All
    │
    ├─ Split by Silence
    │   └─ File Select → Detect Silence → FFmpeg Split → Database Log
    │
    ├─ Manage Presets
    │   └─ CRUD Operations on Presets (Database)
    │
    ├─ View History
    │   └─ Query Database → Display Table
    │
    └─ Settings
        └─ Modify Config → Save
```

## Design Patterns

### 1. Singleton Pattern

**Used in**: Config, Database, Logger, CLI Interface

**Rationale**: Single source of truth for shared state

```typescript
class ConfigManager {
  private static instance: ConfigManager | null = null;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
}

export const config = ConfigManager.getInstance();
```

### 2. Result Pattern

**Used in**: All modules for error handling

```typescript
interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Usage
const result = await ffmpeg.extractAudio(input, output);
if (result.success) {
  console.log(result.data.outputPath);
} else {
  console.error(result.error);
}
```

**Benefits**:
- No exception throwing for expected errors
- Explicit error handling
- Type-safe error and data access

### 3. Facade Pattern

**Used in**: FFmpegWrapper, Downloader

**Rationale**: Simplify complex external tool interactions

```typescript
// Complex FFmpeg command construction hidden behind simple interface
ffmpeg.extractAudio(input, output, { format, quality });
```

### 4. Strategy Pattern

**Used in**: Output organization, quality presets

```typescript
// Different organization strategies
organizeBy: 'date' | 'source' | 'format' | 'custom'

// Different quality strategies
QUALITY_PRESETS = {
  speech: { bitrate: '64k', ... },
  music_high: { bitrate: '320k', ... },
  // ...
}
```

## Technology Stack

### Runtime & Language

- **Bun**: JavaScript runtime (replaces Node.js)
  - Fast startup time
  - Built-in TypeScript support
  - Efficient process spawning
- **TypeScript**: Type-safe development
  - Full type coverage
  - Interface-driven design

### External Dependencies

- **FFmpeg**: Audio/video processing
- **FFprobe**: Media file analysis
- **yt-dlp** (optional): URL downloads
- **fzf** (optional): Fuzzy file finder

### Data Storage

- **SQLite**: Structured data (Bun's built-in SQLite)
  - Process history
  - Configuration backup
  - Presets storage
- **JSON**: Primary configuration file
- **CSV/JSON**: Log exports

### No External NPM Packages

The project has zero npm dependencies (except `bun-types` for development). This provides:
- Fast installation
- Minimal attack surface
- No dependency conflicts
- Simplified maintenance

## Performance Considerations

### Process Spawning

- Use `Bun.spawn()` instead of `child_process` for better performance
- Pipe stdout/stderr for large outputs
- Use `-ss` before `-i` in FFmpeg for fast seeking

### File I/O

- Use Bun's native file operations (`Bun.write()`, `Bun.glob()`)
- Stream large files when possible
- Batch SQLite operations

### Concurrency

- `maxConcurrentJobs` setting limits parallel processing
- Use async/await throughout for non-blocking I/O
- Spawn processes concurrently when appropriate

## Error Handling

### Layers

1. **Tool Validation**: Check external tools at startup
2. **Input Validation**: Validate file paths, URLs, options
3. **Operation Results**: Use `OperationResult<T>` pattern
4. **User Feedback**: Clear error messages via CLI interface
5. **Logging**: Record errors to database and log files

### Example Error Flow

```typescript
try {
  const result = await ffmpeg.extractAudio(input, output);
  if (!result.success) {
    cli.error(result.error || 'Extraction failed');
    logger.error(`Failed: ${input} - ${result.error}`);
    db.createProcess({ ...record, status: 'failed', errorMessage: result.error });
    return;
  }
  cli.success(`Audio extracted: ${result.data.outputPath}`);
} catch (error) {
  cli.error(`Unexpected error: ${error}`);
}
```

## Extension Points

### Adding New Features

1. **New Output Format**: Add to `OUTPUT_FORMATS` in `types.ts`, update codec map in `ffmpeg.ts`
2. **New Quality Preset**: Add to `QUALITY_PRESETS` in `types.ts`
3. **New Operation**: Add handler function in `index.ts`, add menu option
4. **New CLI Flag**: Add to `parseArgs()` options in `index.ts`

### Adding New Modules

Follow the existing pattern:
1. Create file in appropriate subdirectory
2. Export singleton instance if stateful
3. Use `OperationResult<T>` for return types
4. Import types from `types.ts`
5. Update this documentation

## Testing Considerations

See [Testing Guide](./testing.md) for details on:
- Unit testing strategies
- Integration testing with FFmpeg
- Mocking external tools
- Testing interactive CLI components

---

**Next**: [API Reference](./api-reference.md) | [Database Schema](./database-schema.md)
