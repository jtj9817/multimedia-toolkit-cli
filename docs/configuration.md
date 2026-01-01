# Configuration Guide

Complete guide to configuring Multimedia Toolkit's behavior and default settings.

## Table of Contents

- [Configuration Locations](#configuration-locations)
- [Configuration Options](#configuration-options)
- [Viewing Configuration](#viewing-configuration)
- [Modifying Configuration](#modifying-configuration)
- [Output Organization](#output-organization)
- [Quality Presets](#quality-presets)
- [Advanced Configuration](#advanced-configuration)

## Configuration Locations

### Primary Configuration File

**Location**: `~/.multimedia-toolkit/config.json`

**Format**: JSON

**Created**: Automatically on first run with default values

**Example**:
```json
{
  "defaultOutputDir": "/home/user/Music/AudioExtracted",
  "defaultQuality": "music_medium",
  "defaultFormat": "mp3",
  "defaultVideoFormat": "webm",
  "defaultVideoPreset": "any-to-webm",
  "defaultVideoResolution": "1080p",
  "autoOrganize": true,
  "organizeBy": "date",
  "preserveMetadata": true,
  "logOutputs": true,
  "logFormat": "json",
  "ytdlpPath": "yt-dlp",
  "ffmpegPath": "ffmpeg",
  "ffprobePath": "ffprobe",
  "maxConcurrentJobs": 2,
  "tempDir": "/home/user/.multimedia-toolkit/temp"
}
```

### Database Configuration

**Location**: `~/.multimedia-toolkit/data.db`

**Purpose**:
- Backup configuration storage
- Process history
- Saved presets

**Note**: Configuration is stored in both JSON file and database for redundancy

### Environment Variables

Currently not supported, but planned for future releases.

## Configuration Options

### `defaultOutputDir`

**Type**: String (path)

**Default**: `~/Music/AudioExtracted`

**Description**: Base directory for all output files

**Example**:
```json
"defaultOutputDir": "/media/external/AudioOutput"
```

**Behavior**:
- Directory is created automatically if it doesn't exist
- Subdirectories created based on `organizeBy` setting
- Must have write permissions

---

### `defaultQuality`

**Type**: String (preset name)

**Default**: `music_medium`

**Options**: `speech`, `music_low`, `music_medium`, `music_high`, `optimized_webm`, `lossless`

**Description**: Default quality preset for audio extraction

**Example**:
```json
"defaultQuality": "music_high"
```

**See Also**: [Quality Presets](#quality-presets)

---

### `defaultFormat`

**Type**: String (format)

**Default**: `mp3`

**Options**: `mp3`, `wav`, `flac`, `aac`, `ogg`, `opus`, `webm`

**Description**: Default output audio format

**Example**:
```json
"defaultFormat": "flac"
```

**Recommendation**:
- Use `mp3` for compatibility
- Use `flac` for archival
- Use `opus` for efficiency
- Use `webm` for browser-friendly Opus output

---

### `defaultVideoFormat`

**Type**: String (format)

**Default**: `webm`

**Options**: `webm`, `mp4`, `mkv`

**Description**: Default output video format for transcodes

**Example**:
```json
"defaultVideoFormat": "mp4"
```

---

### `defaultVideoPreset`

**Type**: String (preset)

**Default**: `any-to-webm`

**Options**: `any-to-webm`, `any-to-mp4`, `any-to-mkv`

**Description**: Default video transcode preset

**Example**:
```json
"defaultVideoPreset": "any-to-mp4"
```

---

### `defaultVideoResolution`

**Type**: String (resolution)

**Default**: `1080p`

**Options**: `source`, `1080p`, `720p`

**Description**: Default resolution used for video transcodes

**Example**:
```json
"defaultVideoResolution": "720p"
```

---

### `autoOrganize`

**Type**: Boolean

**Default**: `true`

**Description**: Automatically organize output files into subdirectories

**Example**:
```json
"autoOrganize": false
```

**When `true`**: Files organized according to `organizeBy` setting

**When `false`**: All files saved directly in `defaultOutputDir`

---

### `organizeBy`

**Type**: String (strategy)

**Default**: `date`

**Options**: `date`, `source`, `format`, `custom`

**Description**: How to organize output files when `autoOrganize` is `true`

**Examples**:

**`date` (default)**:
```
~/Music/AudioExtracted/
├── 2025/
│   ├── 01/
│   │   ├── audio1.mp3
│   │   └── audio2.mp3
│   └── 02/
│       └── audio3.mp3
```

**`source`**:
```
~/Music/AudioExtracted/
├── video_podcast/
│   └── episode1.mp3
├── youtube_music/
│   └── song.mp3
```

**`format`**:
```
~/Music/AudioExtracted/
├── mp3/
│   └── audio1.mp3
├── flac/
│   └── audio2.flac
```

**`custom`**:
```
~/Music/AudioExtracted/
├── 2025-01-15/
├── 2025-01-16/
```

---

### `preserveMetadata`

**Type**: Boolean

**Default**: `true`

**Description**: Keep original metadata (title, artist, album, etc.) in output files

**Example**:
```json
"preserveMetadata": false
```

**When `true`**: Copies ID3 tags, cover art, etc. to output

**When `false`**: Output file has no metadata

**Note**: Can be overridden per-operation with `--strip-metadata` flag

---

### `logOutputs`

**Type**: Boolean

**Default**: `true`

**Description**: Log all operations to files in `~/.multimedia-toolkit/logs/`

**Example**:
```json
"logOutputs": false
```

**Log Contents**:
- Input/output paths
- Formats and quality used
- Timestamps
- Success/failure status
- FFmpeg commands executed

---

### `logFormat`

**Type**: String

**Default**: `json`

**Options**: `json`, `csv`

**Description**: Format for log files

**JSON Example** (`~/.multimedia-toolkit/logs/2025-01-15.json`):
```json
{
  "jobId": "a1b2c3d4-...",
  "inputPath": "/path/to/video.mp4",
  "outputPath": "/path/to/audio.mp3",
  "outputFormat": "mp3",
  "qualityPreset": "music_medium",
  "status": "completed",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**CSV Example** (`~/.multimedia-toolkit/logs/2025-01-15.csv`):
```csv
jobId,inputPath,outputPath,outputFormat,qualityPreset,status,createdAt
a1b2c3d4-...,/path/to/video.mp4,/path/to/audio.mp3,mp3,music_medium,completed,2025-01-15T10:30:00.000Z
```

---

### `ytdlpPath`

**Type**: String (command)

**Default**: `yt-dlp`

**Description**: Path or command for yt-dlp executable

**Example**:
```json
"ytdlpPath": "/usr/local/bin/yt-dlp"
```

**Note**: Can be just command name if in PATH

---

### `ffmpegPath`

**Type**: String (command)

**Default**: `ffmpeg`

**Description**: Path or command for FFmpeg executable

**Example**:
```json
"ffmpegPath": "/opt/ffmpeg/bin/ffmpeg"
```

---

### `ffprobePath`

**Type**: String (command)

**Default**: `ffprobe`

**Description**: Path or command for FFprobe executable

**Example**:
```json
"ffprobePath": "/opt/ffmpeg/bin/ffprobe"
```

---

### `maxConcurrentJobs`

**Type**: Number (integer)

**Default**: `2`

**Description**: Maximum number of simultaneous conversions (for future batch optimization)

**Example**:
```json
"maxConcurrentJobs": 4
```

**Note**: Currently not fully implemented, planned for future versions

---

### `tempDir`

**Type**: String (path)

**Default**: `~/.multimedia-toolkit/temp`

**Description**: Directory for temporary files during processing

**Example**:
```json
"tempDir": "/tmp/multimedia-toolkit"
```

**Usage**:
- Intermediate files during downloads
- Partial clips before merging
- Waveform data cache

## Viewing Configuration

### CLI Mode

```bash
# Show current configuration
bun run src/index.ts --config
```

**Output**:
```
┌─────────────────────────────────────────┐
│         Current Configuration           │
├─────────────────────────────────────────┤
│ Output Directory: /home/user/Music/...  │
│ Default Quality:  music_medium          │
│ Default Format:   mp3                   │
│ Auto Organize:    true                  │
│ Organize By:      date                  │
│ Preserve Meta:    true                  │
│ Log Outputs:      true                  │
│ Log Format:       json                  │
│ Max Concurrent:   2                     │
└─────────────────────────────────────────┘
```

### Interactive Mode

```bash
bun run src/index.ts --interactive
# Select [10] Settings
```

### Direct File Access

```bash
# View configuration file
cat ~/.multimedia-toolkit/config.json

# Edit with your favorite editor
nano ~/.multimedia-toolkit/config.json
```

## Modifying Configuration

### Method 1: Interactive Settings Menu

**Most user-friendly option**

```bash
bun run src/index.ts --interactive
# Select [9] Settings
```

**Available options**:
- `[1]` Change output directory
- `[2]` Change default quality
- `[3]` Change default format
- `[4]` Change default video preset
- `[5]` Change default video format
- `[6]` Change default video resolution
- `[7]` Toggle auto-organize
- `[8]` Reset to defaults

**Example interaction**:
```
Settings

  [1] Change output directory
  [2] Change default quality
  [3] Change default format
  [4] Change default video preset
  [5] Change default video format
  [6] Change default video resolution
  [7] Toggle auto-organize
  [8] Reset to defaults
  [0] Back

Enter your choice: 2

Select Quality Preset

  [speech] SPEECH - Optimized for speech/podcasts (64k, 16000Hz)
  [music_low] MUSIC LOW - Music - Low quality (128k, 44100Hz)
  [music_medium] MUSIC MEDIUM - Music - Medium quality (192k, 44100Hz)
  [music_high] MUSIC HIGH - Music - High quality (320k, 48000Hz)
  [optimized_webm] OPTIMIZED WEBM - Optimized for WebM/Opus output (128k, 48000Hz)
  [lossless] LOSSLESS - Lossless (FLAC/WAV only) (0, 48000Hz)

Enter your choice: music_high

✓ Updated
```

### Method 2: Edit Configuration File

```bash
# Open in editor
nano ~/.multimedia-toolkit/config.json

# Make changes, save, exit
# Configuration loads automatically on next run
```

**Example edit**:
```json
{
  "defaultOutputDir": "/media/external/Audio",
  "defaultQuality": "music_high",
  "defaultFormat": "flac",
  "defaultVideoFormat": "mp4",
  "defaultVideoPreset": "any-to-mp4",
  "defaultVideoResolution": "720p",
  "autoOrganize": true,
  "organizeBy": "format"
}
```

### Method 3: Delete and Reset

```bash
# Remove configuration file
rm ~/.multimedia-toolkit/config.json

# Next run will create new default configuration
bun run src/index.ts --config
```

### Method 4: Programmatic (Future Feature)

Planned for future versions:
```bash
# Set individual values via CLI
bun run src/index.ts --set defaultQuality=music_high
bun run src/index.ts --set autoOrganize=false
```

## Output Organization

### Understanding Organization Strategies

#### Date Organization (`organizeBy: "date"`)

**Best for**: General use, chronological archiving

**Structure**:
```
outputDir/
└── YYYY/
    └── MM/
        └── files...
```

**Example**:
```
~/Music/AudioExtracted/
├── 2025/
│   ├── 01/
│   │   ├── video1_1704067200.mp3
│   │   └── video2_1704153600.mp3
│   └── 02/
│       └── video3_1704240000.mp3
└── 2024/
    └── 12/
        └── old_video_1703980800.mp3
```

#### Source Organization (`organizeBy: "source"`)

**Best for**: Multi-project workflows, client work

**Structure**:
```
outputDir/
└── source_name/
    └── files...
```

**Example**:
```
~/Music/AudioExtracted/
├── podcast_interviews/
│   ├── episode1.mp3
│   └── episode2.mp3
├── youtube_music/
│   └── song.mp3
└── client_project/
    └── voiceover.wav
```

**Note**: Source name derived from input filename or URL

#### Format Organization (`organizeBy: "format"`)

**Best for**: Format-specific workflows, encoding comparison

**Structure**:
```
outputDir/
└── format/
    └── files...
```

**Example**:
```
~/Music/AudioExtracted/
├── mp3/
│   ├── audio1.mp3
│   └── audio2.mp3
├── flac/
│   └── lossless_audio.flac
└── opus/
    └── compressed_audio.opus
```

#### Custom Organization (`organizeBy: "custom"`)

**Best for**: Daily batch processing, date-specific archiving

**Structure**:
```
outputDir/
└── YYYY-MM-DD/
    └── files...
```

**Example**:
```
~/Music/AudioExtracted/
├── 2025-01-15/
│   ├── morning_podcast.mp3
│   └── afternoon_interview.mp3
└── 2025-01-16/
    └── evening_music.flac
```

### Disabling Organization

Set `autoOrganize: false` to save all files directly in `defaultOutputDir`:

```json
{
  "autoOrganize": false
}
```

**Result**:
```
~/Music/AudioExtracted/
├── video1_1704067200.mp3
├── video2_1704153600.mp3
├── video3_1704240000.mp3
└── video4_1704326400.mp3
```

## Quality Presets

Detailed documentation: [Quality Presets Explained](./quality-presets.md)

### Quick Reference

| Preset | Use Case | Bitrate | Sample Rate | Channels | File Size |
|--------|----------|---------|-------------|----------|-----------|
| `speech` | Podcasts, audiobooks | 64k | 16 kHz | Mono | ~30 MB/hour |
| `music_low` | Background music | 128k | 44.1 kHz | Stereo | ~60 MB/hour |
| `music_medium` | General listening | 192k | 44.1 kHz | Stereo | ~90 MB/hour |
| `music_high` | High fidelity | 320k | 48 kHz | Stereo | ~150 MB/hour |
| `optimized_webm` | WebM/Opus streaming | 128k | 48 kHz | Stereo | ~60 MB/hour |
| `lossless` | Archival (FLAC/WAV) | Variable | 48 kHz | Stereo | ~300-500 MB/hour |

## Advanced Configuration

### Custom Tool Paths

If FFmpeg, FFprobe, or yt-dlp are installed in non-standard locations:

```json
{
  "ffmpegPath": "/opt/custom/ffmpeg",
  "ffprobePath": "/opt/custom/ffprobe",
  "ytdlpPath": "/home/user/.local/bin/yt-dlp"
}
```

### Network Storage Output

For saving directly to NAS or network storage:

```json
{
  "defaultOutputDir": "/mnt/nas/Audio",
  "tempDir": "/tmp/multimedia-toolkit"
}
```

**Note**: Ensure network storage is mounted before running

### Performance Tuning

For systems with more resources:

```json
{
  "maxConcurrentJobs": 4
}
```

**Recommendation**:
- 2 jobs: Default, balanced
- 4 jobs: High-performance systems
- 1 job: Low-memory systems

## Configuration Best Practices

### 💡 Recommended Settings

**For Podcast Processing**:
```json
{
  "defaultFormat": "mp3",
  "defaultQuality": "speech",
  "organizeBy": "source",
  "preserveMetadata": true
}
```

**For Music Archiving**:
```json
{
  "defaultFormat": "flac",
  "defaultQuality": "lossless",
  "organizeBy": "date",
  "preserveMetadata": true
}
```

**For Quick Conversions**:
```json
{
  "defaultFormat": "opus",
  "defaultQuality": "music_medium",
  "autoOrganize": false
}
```

### ⚠️ Common Mistakes

1. **Don't set `defaultQuality: "lossless"` with `defaultFormat: "mp3"`**
   - Lossless only works with FLAC/WAV

2. **Ensure output directory has sufficient space**
   - Check with `df -h ~/Music/AudioExtracted`

3. **Don't use network storage for `tempDir`**
   - Use local storage for temp files for better performance

## Troubleshooting Configuration

### Configuration Not Loading

**Check**:
```bash
# Verify file exists and is readable
cat ~/.multimedia-toolkit/config.json

# Check JSON syntax
bun run -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME + '/.multimedia-toolkit/config.json', 'utf-8')))"
```

### Configuration Resets on Every Run

**Cause**: File permissions issue

**Fix**:
```bash
chmod 644 ~/.multimedia-toolkit/config.json
```

### Custom Tool Paths Not Working

**Verify**:
```bash
# Test each tool path
/path/to/ffmpeg -version
/path/to/ffprobe -version
/path/to/yt-dlp --version
```

## Next Steps

- [User Guide](./user-guide.md) - Apply your configuration
- [Quality Presets Explained](./quality-presets.md) - Deep dive into audio quality
- [Output Organization](./output-organization.md) - Advanced organization strategies

---

**Questions?** See [FAQ](./faq.md) or [Troubleshooting](./troubleshooting.md)
