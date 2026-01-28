# API Reference

Complete reference for all modules, classes, and functions in Multimedia Toolkit.

## Table of Contents

- [Core Modules](#core-modules)
- [CLI Interface](#cli-interface)
- [FFmpeg Wrapper](#ffmpeg-wrapper)
- [Configuration Manager](#configuration-manager)
- [Database](#database)
- [FZF Selector](#fzf-selector)
- [Logger](#logger)
- [Presets Manager](#presets-manager)
- [Downloader](#downloader)
- [Visualizer](#visualizer)
- [Type Definitions](#type-definitions)

## Core Modules

### Main Entry Point

**File**: `src/index.ts`

**Exports**: None (application entry point)

**Functions**:

#### `main()`
```typescript
async function main(): Promise<void>
```
Application entry point. Parses arguments and routes to interactive or CLI mode.

**Flow**:
1. Parse command-line arguments
2. Handle version/help flags
3. Validate external tools
4. Route to interactive or CLI mode

---

## CLI Interface

**File**: `src/cli/interface.ts`

**Export**: `cli` (CLIInterface instance)

### Class: `CLIInterface`

Interactive terminal interface for user interaction.

#### Methods

##### `prompt()`
```typescript
async prompt(question: string, defaultValue?: string): Promise<string>
```
Prompt user for text input.

**Parameters**:
- `question`: Question to display
- `defaultValue`: Default value if user presses Enter

**Returns**: User's input or default value

**Example**:
```typescript
const name = await cli.prompt('Enter name', 'default');
```

---

##### `confirm()`
```typescript
async confirm(question: string, defaultYes: boolean = true): Promise<boolean>
```
Prompt for yes/no confirmation.

**Parameters**:
- `question`: Question to display
- `defaultYes`: Default to yes if true

**Returns**: `true` for yes, `false` for no

**Example**:
```typescript
if (await cli.confirm('Continue?', true)) {
  // User confirmed
}
```

---

##### `menu()`
```typescript
async menu(title: string, options: MenuOption[]): Promise<string>
```
Display interactive menu and get selection.

**Parameters**:
- `title`: Menu title
- `options`: Array of menu options

**Returns**: Selected option key

**Example**:
```typescript
const choice = await cli.menu('Main Menu', [
  { key: '1', label: 'Option 1', action: async () => {} },
  { key: '2', label: 'Option 2', action: async () => {} }
]);
```

---

##### `selectFromList()`
```typescript
async selectFromList<T>(
  title: string,
  items: T[],
  displayFn: (item: T, index: number) => string,
  allowMultiple: boolean = false
): Promise<T[]>
```
Display numbered list for selection.

**Parameters**:
- `title`: List title
- `items`: Array of items
- `displayFn`: Function to convert item to display string
- `allowMultiple`: Allow selecting multiple items

**Returns**: Array of selected items

**Example**:
```typescript
const files = await cli.selectFromList(
  'Select files',
  fileList,
  (f) => basename(f),
  true // Allow multiple
);
```

---

##### `selectMediaFile()`
```typescript
async selectMediaFile(directory?: string): Promise<string>
```
Select a single media file using FZF (with fallback to manual input).

**Parameters**:
- `directory`: Starting directory (defaults to cwd)

**Returns**: Selected file path, or empty string if user chose to go back

**Example**:
```typescript
const file = await cli.selectMediaFile(process.cwd());
if (file) {
  // Process file
}
```

---

##### `selectMediaFiles()`
```typescript
async selectMediaFiles(directory?: string): Promise<string[]>
```
Select multiple media files using FZF.

**Parameters**:
- `directory`: Starting directory

**Returns**: Array of selected file paths

---

##### `withSpinner()`
```typescript
async withSpinner<T>(message: string, task: () => Promise<T>): Promise<T>
```
Execute async task with spinner animation.

**Parameters**:
- `message`: Status message to display
- `task`: Async function to execute

**Returns**: Result of task function

**Example**:
```typescript
const result = await cli.withSpinner(
  'Processing...',
  () => ffmpeg.extractAudio(input, output)
);
```

---

##### `box()`
```typescript
box(title: string, content: string[]): void
```
Display boxed message.

**Parameters**:
- `title`: Box title
- `content`: Array of content lines

**Example**:
```typescript
cli.box('Info', [
  'Line 1',
  'Line 2',
  'Line 3'
]);
```

---

##### `table()`
```typescript
table(headers: string[], rows: string[][]): void
```
Display formatted table.

**Parameters**:
- `headers`: Column headers
- `rows`: 2D array of row data

**Example**:
```typescript
cli.table(
  ['Name', 'Age', 'City'],
  [
    ['Alice', '30', 'NYC'],
    ['Bob', '25', 'LA']
  ]
);
```

---

##### `success()`, `error()`, `warn()`, `info()`
```typescript
success(message: string): void
error(message: string): void
warn(message: string): void
info(message: string): void
```
Display colored status messages.

**Example**:
```typescript
cli.success('Operation completed!');
cli.error('Something went wrong');
cli.warn('Be careful');
cli.info('FYI: ...');
```

---

## FFmpeg Wrapper

**File**: `src/media/ffmpeg.ts`

**Export**: `ffmpeg` (FFmpegWrapper instance)

### Class: `FFmpegWrapper`

Wrapper for FFmpeg/FFprobe operations.

#### Methods

##### `getMediaInfo()`
```typescript
async getMediaInfo(inputPath: string): Promise<OperationResult<MediaMetadata>>
```
Get detailed metadata about a media file.

**Parameters**:
- `inputPath`: Path to media file

**Returns**: `OperationResult` with `MediaMetadata`

**Example**:
```typescript
const result = await ffmpeg.getMediaInfo('video.mp4');
if (result.success) {
  console.log(`Duration: ${result.data.duration}s`);
  console.log(`Bitrate: ${result.data.bitrate}`);
}
```

---

##### `extractAudio()`
```typescript
async extractAudio(
  inputPath: string,
  outputPath: string,
  options?: {
    format?: OutputFormat;
    quality?: string | QualityPreset;
    clip?: TimeClip;
    preserveMetadata?: boolean;
    dryRun?: boolean;
  }
): Promise<OperationResult<{ command: string; outputPath: string }>>
```
Extract audio from media file.

**Parameters**:
- `inputPath`: Input media file path
- `outputPath`: Output audio file path
- `options`: Extraction options

**Returns**: `OperationResult` with command and output path

**Example**:
```typescript
const result = await ffmpeg.extractAudio(
  'video.mp4',
  'audio.mp3',
  {
    format: 'mp3',
    quality: 'music_high',
    clip: { startTime: '00:01:30', duration: 60 }
  }
);
```

---

##### `transcodeVideo()`
```typescript
async transcodeVideo(
  inputPath: string,
  outputPath: string,
  options?: VideoTranscodeOptions
): Promise<OperationResult<{ command: string; outputPath: string }>>
```
Transcode video between formats (WebM, MP4, MKV).

**Parameters**:
- `inputPath`: Input video file path
- `outputPath`: Output video file path
- `options`: Transcoding options (preset, resolution, quality)

**Returns**: `OperationResult` with command and output path

**Example**:
```typescript
const result = await ffmpeg.transcodeVideo(
  'input.mov',
  'output.webm',
  {
    presetKey: 'any-to-webm',
    resolution: '1080p'
  }
);
```

---

##### `extractMultipleClips()`
```typescript
async extractMultipleClips(
  inputPath: string,
  clips: TimeClip[],
  outputDir: string,
  options?: {
    format?: OutputFormat;
    quality?: string;
    dryRun?: boolean;
  }
): Promise<OperationResult<{ outputs: string[]; commands: string[] }>>
```
Extract multiple time segments from a single file.

**Parameters**:
- `inputPath`: Input file
- `clips`: Array of time clips
- `outputDir`: Output directory
- `options`: Extraction options

**Returns**: Array of output paths and commands

**Example**:
```typescript
const clips = [
  { startTime: '00:00:30', duration: 45, label: 'intro' },
  { startTime: '00:05:00', duration: 120, label: 'main' }
];
const result = await ffmpeg.extractMultipleClips(
  'video.mp4',
  clips,
  './output/',
  { format: 'mp3', quality: 'music_medium' }
);
```

---

##### `extractChapters()`
```typescript
async extractChapters(
  inputPath: string,
  outputDir: string,
  options?: {
    format?: OutputFormat;
    quality?: string;
    chapterIndices?: number[];
    dryRun?: boolean;
  }
): Promise<OperationResult<{ outputs: string[]; chapters: Chapter[] }>>
```
Extract chapters as separate files.

**Parameters**:
- `inputPath`: Input file with chapters
- `outputDir`: Output directory
- `options`: Extraction options including specific chapter indices

**Returns**: Output paths and chapter information

---

##### `splitBySilence()`
```typescript
async splitBySilence(
  inputPath: string,
  outputDir: string,
  options?: {
    format?: OutputFormat;
    quality?: string;
    noiseThreshold?: string;
    minSilenceDuration?: number;
    minSegmentDuration?: number;
    dryRun?: boolean;
  }
): Promise<OperationResult<{ outputs: string[]; segments: number }>>
```
Split audio at silent points.

**Parameters**:
- `inputPath`: Input audio file
- `outputDir`: Output directory
- `options`: Detection and split options

**Returns**: Output file paths and segment count

---

##### `detectSilence()`
```typescript
async detectSilence(
  inputPath: string,
  options?: {
    noiseThreshold?: string;
    minDuration?: number;
  }
): Promise<OperationResult<SilenceSegment[]>>
```
Detect silent segments in audio.

**Parameters**:
- `inputPath`: Input audio file
- `options`: Detection options

**Returns**: Array of silence segments

---

##### `getWaveformData()`
```typescript
async getWaveformData(inputPath: string): Promise<OperationResult<WaveformData>>
```
Extract waveform data for visualization.

**Parameters**:
- `inputPath`: Input audio file

**Returns**: Waveform sample data

---

##### `formatTime()`
```typescript
formatTime(seconds: number): string
```
Format seconds as HH:MM:SS.

**Parameters**:
- `seconds`: Time in seconds

**Returns**: Formatted time string

**Example**:
```typescript
ffmpeg.formatTime(3661); // "01:01:01"
ffmpeg.formatTime(90);   // "00:01:30"
```

---

## Configuration Manager

**File**: `src/config/config.ts`

**Export**: `config` (ConfigManager instance)

### Class: `ConfigManager`

Manages application configuration.

#### Methods

##### `get()`
```typescript
get<K extends keyof AppConfig>(key: K): AppConfig[K]
```
Get configuration value.

**Example**:
```typescript
const outputDir = config.get('defaultOutputDir');
const quality = config.get('defaultQuality');
```

---

##### `set()`
```typescript
set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void
```
Set configuration value (auto-saves).

**Example**:
```typescript
config.set('defaultQuality', 'music_high');
config.set('autoOrganize', false);
```

---

##### `getAll()`
```typescript
getAll(): AppConfig
```
Get entire configuration object.

---

##### `setMultiple()`
```typescript
setMultiple(updates: Partial<AppConfig>): void
```
Update multiple configuration values at once.

**Example**:
```typescript
config.setMultiple({
  defaultFormat: 'flac',
  defaultQuality: 'lossless',
  organizeBy: 'format'
});
```

---

##### `reset()`
```typescript
reset(): void
```
Reset configuration to defaults.

---

##### `validateTools()`
```typescript
async validateTools(): Promise<{ valid: boolean; missing: string[] }>
```
Check if required external tools are available.

**Returns**: Validation result with list of missing tools

**Example**:
```typescript
const check = await config.validateTools();
if (!check.valid) {
  console.error(`Missing: ${check.missing.join(', ')}`);
}
```

---

##### `getOutputDir()`
```typescript
getOutputDir(subDir?: string): string
```
Get output directory, creating it if needed.

**Parameters**:
- `subDir`: Optional subdirectory

**Returns**: Full output directory path

---

##### `getOrganizedOutputPath()`
```typescript
getOrganizedOutputPath(
  baseName: string,
  format: OutputFormat,
  source?: string
): string
```
Generate organized output path based on settings.

**Parameters**:
- `baseName`: Base filename
- `format`: Output format
- `source`: Source identifier (optional)

**Returns**: Full output file path with organization

---

## Database

**File**: `src/db/database.ts`

**Export**: `db` (Database instance)

### Class: `Database`

SQLite database operations.

#### Process History Methods

##### `createProcess()`
```typescript
createProcess(record: Partial<ProcessRecord>): void
```
Log a conversion process to database.

---

##### `getRecentProcesses()`
```typescript
getRecentProcesses(limit: number = 50): ProcessRecord[]
```
Get recent process history.

---

##### `getProcessStats()`
```typescript
getProcessStats(): {
  total: number;
  completed: number;
  failed: number;
  totalSize: number;
}
```
Get aggregate statistics.

---

#### Configuration Methods

##### `setConfig()`, `getConfig()`, `getAllConfig()`
```typescript
setConfig(key: string, value: string): void
getConfig(key: string): string | null
getAllConfig(): Record<string, string>
```
Configuration storage (backup to JSON file).

---

#### Preset Methods

##### `createPreset()`, `getPreset()`, `getAllPresets()`, `deletePreset()`
```typescript
createPreset(preset: ClipPreset): number
getPreset(name: string): ClipPreset | null
getAllPresets(): ClipPreset[]
deletePreset(name: string): void
```
CRUD operations for clip presets.

---

## FZF Selector

**File**: `src/utils/fzf.ts`

**Export**: `fzfSelector` (FzfSelector instance)

### Class: `FzfSelector`

FZF integration for fuzzy file selection.

#### Methods

##### `isFzfAvailable()`
```typescript
async isFzfAvailable(): Promise<boolean>
```
Check if FZF is installed.

---

##### `selectFile()`
```typescript
async selectFile(options?: FzfOptions): Promise<OperationResult<string>>
```
Select single file with FZF.

**Options**:
- `directory`: Starting directory
- `extensions`: File extensions to filter
- `preview`: Enable preview window
- `prompt`: Custom prompt text

---

##### `selectFiles()`
```typescript
async selectFiles(options?: FzfOptions): Promise<OperationResult<string[]>>
```
Select multiple files with FZF.

---

## Logger

**File**: `src/utils/logger.ts`

**Export**: `logger`, `organizer`

### Class: `Logger`

Logging and console output.

#### Methods

##### `info()`, `success()`, `error()`, `warn()`
```typescript
info(message: string): void
success(message: string): void
error(message: string): void
warn(message: string): void
```
Console output with colors.

---

##### `logToFile()`
```typescript
logToFile(record: ProcessRecord): void
```
Write process record to log file.

---

##### `exportProcessHistory()`
```typescript
exportProcessHistory(format: 'json' | 'csv'): string
```
Export all logs to file.

**Returns**: Path to exported file

---

### Class: `OutputOrganizer`

Handles output file organization.

##### `getOutputPath()`
```typescript
getOutputPath(
  baseName: string,
  format: OutputFormat,
  options?: { customDir?: string }
): string
```
Generate organized output path.

---

## Presets Manager

**File**: `src/utils/presets.ts`

**Export**: `presets` (PresetManager instance)

### Class: `PresetManager`

Manage clip presets.

#### Methods

##### `create()`, `get()`, `getAll()`, `delete()`
```typescript
create(preset: ClipPreset): OperationResult<number>
get(name: string): OperationResult<ClipPreset>
getAll(): OperationResult<ClipPreset[]>
delete(name: string): OperationResult<void>
```
CRUD operations for presets.

---

##### `createFromClips()`
```typescript
createFromClips(
  name: string,
  clips: TimeClip[],
  sourcePattern?: string
): OperationResult<void>
```
Create preset from clip array.

---

##### `exportToJson()`
```typescript
exportToJson(): string
```
Export all presets to JSON string.

---

## Type Definitions

**File**: `src/types.ts`

### Key Types

```typescript
// Output formats
type OutputFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'opus' | 'webm';

// Time clip
interface TimeClip {
  startTime: string;
  endTime?: string;
  duration?: number;
  label?: string;
}

// Quality preset
interface QualityPreset {
  name: string;
  bitrate: string;
  sampleRate: number;
  channels: 1 | 2;
  description: string;
}

// Operation result
interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Media metadata
interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  chapters?: Chapter[];
}

// Process record
interface ProcessRecord {
  id?: number;
  jobId: string;
  inputPath: string;
  inputType: string;
  outputPath: string;
  outputFormat: string;
  qualityPreset: string;
  status: string;
  createdAt: string;
  // ... more fields
}
```

See `src/types.ts` for complete type definitions.

---

## Usage Examples

### Extract Audio with Error Handling

```typescript
import { ffmpeg, cli } from './cli/interface';

async function extractWithErrorHandling(input: string, output: string) {
  const result = await ffmpeg.extractAudio(input, output, {
    format: 'mp3',
    quality: 'music_high'
  });

  if (result.success) {
    cli.success(`Created: ${result.data!.outputPath}`);
  } else {
    cli.error(`Failed: ${result.error}`);
  }
}
```

### Batch Process with Progress

```typescript
const files = ['video1.mp4', 'video2.mp4', 'video3.mp4'];
let completed = 0;

for (const file of files) {
  logger.progress(completed + 1, files.length, basename(file));

  const result = await ffmpeg.extractAudio(file, `${file}.mp3`);

  if (result.success) {
    completed++;
  }
}

cli.success(`Completed ${completed}/${files.length}`);
```

---

**Next**: [Architecture](./architecture.md) | [User Guide](./user-guide.md)
