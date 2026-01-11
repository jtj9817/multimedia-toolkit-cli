# CLI Reference

Complete command-line interface reference for Multimedia Toolkit.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Input Options](#input-options)
- [Output Options](#output-options)
  - [Audio Output Options](#audio-output-options)
  - [Video Output Options](#video-output-options)
  - [GIF/WebP Output Options](#gifwebp-output-options)
- [Clipping Options](#clipping-options)
- [Feature Flags](#feature-flags)
- [Metadata Options](#metadata-options)
- [Workflow Options](#workflow-options)
- [Information Commands](#information-commands)
- [Examples](#examples)

## Basic Usage

```bash
# Interactive mode (default if no arguments)
bun run src/index.ts
bun run src/index.ts --interactive

# CLI mode (direct file processing)
bun run src/index.ts [options] [input-files...]

# Help
bun run src/index.ts --help

# Version
bun run src/index.ts --version
```

## Input Options

### `-i, --input <file>`

Specify input file. Can be used multiple times for batch processing.

**Type**: String (file path)

**Multiple**: Yes

**Examples**:
```bash
# Single file
bun run src/index.ts -i video.mp4

# Multiple files
bun run src/index.ts -i video1.mp4 -i video2.mp4 -i video3.mkv

# Positional argument (shorthand)
bun run src/index.ts video.mp4
```

---

### `-u, --url <url>`

Download from URL before processing. Requires yt-dlp.

**Type**: String (URL)

**Multiple**: Yes

**Supported Platforms**: YouTube, Vimeo, SoundCloud, and 1000+ more

**Examples**:
```bash
# YouTube video
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ"

# Multiple URLs
bun run src/index.ts -u "URL1" -u "URL2"

# URL with format specification
bun run src/index.ts -u "https://youtube.com/watch?v=..." -f mp3 -q music_high
```

---

## Output Options

### `-o, --output <path>`

Specify output file or directory.

**Type**: String (file path or directory)

**Default**: Auto-generated in configured output directory

**Examples**:
```bash
# Specific file
bun run src/index.ts -i video.mp4 -o audio.mp3

# Specific directory (filename auto-generated)
bun run src/index.ts -i video.mp4 -o ./output/

# Absolute path
bun run src/index.ts -i video.mp4 -o /mnt/storage/audio.mp3
```

---

### `-f, --format <format>`

Output audio format.

**Type**: String

**Options**: `mp3`, `wav`, `flac`, `aac`, `ogg`, `opus`, `webm`

**Default**: From configuration (default: `mp3`)

**Examples**:
```bash
# MP3 format
bun run src/index.ts -i video.mp4 -f mp3

# Lossless FLAC
bun run src/index.ts -i video.mp4 -f flac

# Compressed OPUS
bun run src/index.ts -i video.mp4 -f opus
```

**Format Comparison**:
| Format | Use Case | Compression | Quality |
|--------|----------|-------------|---------|
| mp3 | Universal compatibility | Lossy | Good |
| aac | Modern devices | Lossy | Excellent |
| ogg | Open source preference | Lossy | Good |
| opus | Best compression | Lossy | Excellent |
| webm | Web playback | Lossy | Excellent |
| flac | Archival | Lossless | Perfect |
| wav | Uncompressed | None | Perfect |

---

### `-q, --quality <preset>`

Quality preset for encoding.

**Type**: String

**Options**: `speech`, `music_low`, `music_medium`, `music_high`, `optimized_webm`, `lossless`

**Default**: From configuration (default: `music_medium`)

**Examples**:
```bash
# Speech optimized (64k, mono)
bun run src/index.ts -i podcast.mp4 -q speech

# High quality music (320k, stereo)
bun run src/index.ts -i concert.mkv -q music_high

# Lossless (FLAC/WAV only)
bun run src/index.ts -i video.mp4 -f flac -q lossless
```

**Quality Presets**:
| Preset | Bitrate | Sample Rate | Channels | Size/Hour |
|--------|---------|-------------|----------|-----------|
| speech | 64k | 16 kHz | Mono | ~30 MB |
| music_low | 128k | 44.1 kHz | Stereo | ~60 MB |
| music_medium | 192k | 44.1 kHz | Stereo | ~90 MB |
| music_high | 320k | 48 kHz | Stereo | ~150 MB |
| optimized_webm | 128k | 48 kHz | Stereo | ~60 MB |
| lossless | Variable | 48 kHz | Stereo | ~300-500 MB |

---

### `--video-format <format>`

Video output format for transcoding.

**Type**: String

**Options**: `webm`, `mp4`, `mkv`

**Default**: From configuration (default: `webm`)

**Examples**:
```bash
# Transcode to WebM
bun run src/index.ts -i input.mov --video-format webm

# Transcode to MP4
bun run src/index.ts -i input.mov --video-format mp4
```

---

### `--video-preset <preset>`

Video transcode preset.

**Type**: String

**Options**: `any-to-webm`, `any-to-mp4`, `any-to-mkv`

**Default**: From configuration (default: `any-to-webm`)

**Examples**:
```bash
# Use the Discord-optimized WebM preset
bun run src/index.ts -i input.mov --video-preset any-to-webm
```

---

### `--resolution <size>`

Override the output resolution for video transcodes.

**Type**: String

**Options**: `source`, `1080p`, `720p`

**Default**: From configuration (default: `1080p`)

**Examples**:
```bash
# Keep source resolution
bun run src/index.ts -i input.mov --video-format webm --resolution source
```

---

### `--video-quality <value>`

Video quality override. Use a CRF number or a bitrate value.

**Type**: String

**Examples**:
```bash
# CRF-based quality
bun run src/index.ts -i input.mov --video-format webm --video-quality 31

# Bitrate-based quality
bun run src/index.ts -i input.mov --video-format mp4 --video-quality 2500k
```

---

### `--gif-webp-preset <preset>`

GIF or WebP conversion preset.

**Type**: String

**GIF Options**: `gif-discord`, `gif-high-quality`, `gif-small-file`, `gif-smooth-loop`

**WebP Options**: `webp-discord`, `webp-high-quality`, `webp-small-file`, `webp-lossless`

**Default**: From configuration (default: `gif-discord`)

**Examples**:
```bash
# Create Discord-optimized GIF (max 8MB, 480px, 30fps)
bun run src/index.ts -i video.mp4 --gif-webp-preset gif-discord -o output.gif

# Create high-quality WebP animation
bun run src/index.ts -i video.mp4 --gif-webp-preset webp-high-quality -o output.webp

# Create small file size GIF
bun run src/index.ts -i video.mp4 --gif-webp-preset gif-small-file -o output.gif

# Create lossless WebP animation
bun run src/index.ts -i video.mp4 --gif-webp-preset webp-lossless -o output.webp
```

**Preset Details**:

| Preset | Format | FPS | Width | Quality | Loop | Use Case |
|--------|--------|-----|-------|---------|------|----------|
| gif-discord | GIF | 30 | 480px | Floyd-Steinberg dither | Infinite | Discord uploads (8MB limit) |
| gif-high-quality | GIF | 60 | 720px | Floyd-Steinberg dither | Infinite | Best visual quality |
| gif-small-file | GIF | 10 | 320px | Floyd-Steinberg dither | Infinite | Minimal file size |
| gif-smooth-loop | GIF | 60 | 480px | Sierra dither | Infinite | Smooth animations |
| webp-discord | WebP | 30 | 480px | 80 | Infinite | Discord uploads (smaller than GIF) |
| webp-high-quality | WebP | 60 | 720px | 90 | Infinite | Best quality, smaller than GIF |
| webp-small-file | WebP | 15 | 320px | 70 | Infinite | Minimal file size |
| webp-lossless | WebP | 30 | 720px | 100 | Infinite | Perfect quality preservation |

---

## Clipping Options

### `-s, --start <time>`

Start time for clipping.

**Type**: String (time)

**Format**: `HH:MM:SS`, `MM:SS`, or seconds

**Examples**:
```bash
# HH:MM:SS format
bun run src/index.ts -i video.mp4 -s 00:01:30

# MM:SS format
bun run src/index.ts -i video.mp4 -s 01:30

# Seconds
bun run src/index.ts -i video.mp4 -s 90

# With decimals
bun run src/index.ts -i video.mp4 -s 90.5
```

---

### `-d, --duration <seconds>`

Duration to extract (in seconds).

**Type**: Number

**Used with**: `-s, --start`

**Examples**:
```bash
# Extract 60 seconds starting at 1:30
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60

# Extract 2.5 minutes
bun run src/index.ts -i video.mp4 -s 00:05:00 -d 150
```

---

### `-e, --end <time>`

End time for clipping (alternative to duration).

**Type**: String (time)

**Format**: `HH:MM:SS`, `MM:SS`, or seconds

**Mutually exclusive with**: `-d, --duration`

**Examples**:
```bash
# From 1:30 to 3:45
bun run src/index.ts -i video.mp4 -s 00:01:30 -e 00:03:45

# Entire file from start point
bun run src/index.ts -i video.mp4 -s 00:00:30
```

---

### `-p, --preset <name>`

Use saved clip preset.

**Type**: String (preset name)

**Examples**:
```bash
# Apply preset to file
bun run src/index.ts -i video.mp4 -p "intro-outro"

# Apply to multiple files
bun run src/index.ts -i video1.mp4 -i video2.mp4 -p "highlights"
```

**See also**: `--list-presets` to view available presets

---

## Feature Flags

### `--chapters`

Extract chapters as separate files.

**Type**: Boolean flag

**Requires**: Input file with chapter markers

**Examples**:
```bash
# Extract all chapters
bun run src/index.ts -i podcast.mp4 --chapters

# With output directory
bun run src/index.ts -i podcast.mp4 --chapters -o ./chapters/

# With format
bun run src/index.ts -i audiobook.m4b --chapters -f mp3 -q speech
```

**Output**: `01_Chapter_Title.mp3`, `02_Next_Chapter.mp3`, etc.

---

### `--silence`

Split audio by detected silence.

**Type**: Boolean flag

**Examples**:
```bash
# Basic silence detection
bun run src/index.ts -i recording.mp3 --silence

# With output directory
bun run src/index.ts -i recording.wav --silence -o ./segments/

# Note: In interactive mode, you can configure threshold parameters
```

**Use Cases**:
- Split podcast recordings at pauses
- Separate voice memo topics
- Extract individual songs from live recordings

---

### `-m, --merge`

Merge multiple clips into single file.

**Type**: Boolean flag

**Used with**: Multiple `-s`/`-d` clip specifications

**Examples**:
```bash
# Merge two clips
bun run src/index.ts -i video.mp4 \
  -s 00:00:30 -d 60 \
  -s 00:05:00 -d 90 \
  -m -o highlights.mp3
```

---

### `--preview`

Preview clip before saving (plays first/last 5 seconds).

**Type**: Boolean flag

**Requires**: Audio player installed

**Examples**:
```bash
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60 --preview
```

---

### `-w, --waveform`

Display ASCII waveform visualization.

**Type**: Boolean flag

**Examples**:
```bash
# View waveform before clipping
bun run src/index.ts -i audio.mp3 -w

# With processing
bun run src/index.ts -i audio.mp3 -w -s 30 -d 60
```

---

## Metadata Options

### `--strip-metadata`

Remove all metadata from output.

**Type**: Boolean flag

**Removes**: ID3 tags, cover art, comments, etc.

**Examples**:
```bash
# Strip metadata
bun run src/index.ts -i video.mp4 --strip-metadata

# Clean output for privacy
bun run src/index.ts -i personal_video.mp4 -f mp3 --strip-metadata
```

---

### `--preserve-metadata`

Keep original metadata (default behavior).

**Type**: Boolean flag

**Preserves**: Title, artist, album, cover art, etc.

**Examples**:
```bash
# Explicit preservation
bun run src/index.ts -i music_video.mp4 --preserve-metadata

# Default (can be omitted)
bun run src/index.ts -i music_video.mp4
```

---

### `-t, --tags <tags>`

Add tags for organization (comma-separated).

**Type**: String

**Used for**: Searching and filtering in history

**Examples**:
```bash
# Single tag
bun run src/index.ts -i video.mp4 -t "project_alpha"

# Multiple tags
bun run src/index.ts -i video.mp4 -t "work,client,final_version"
```

---

## Workflow Options

### `--interactive`

Launch interactive mode with menu system.

**Type**: Boolean flag

**Examples**:
```bash
# Interactive mode
bun run src/index.ts --interactive

# Default if no arguments
bun run src/index.ts
```

---

### `--dry-run`

Show commands without executing.

**Type**: Boolean flag

**Use case**: Test command construction before running

**Examples**:
```bash
# See what will be executed
bun run src/index.ts -i video.mp4 --dry-run

# Output: [DRY RUN] ffmpeg -y -i video.mp4 -vn ...
```

---

### `-b, --batch`

Process multiple files from directory.

**Type**: Boolean flag

**Used with**: `--input <directory>`

**Examples**:
```bash
# Batch process directory
bun run src/index.ts -b --input ./videos/ -f mp3 -q music_high

# Better: Use interactive mode for enhanced FZF selection
bun run src/index.ts --interactive
# Then select [4] Batch Process
```

---

### `-c, --config`

Show current configuration.

**Type**: Boolean flag

**Examples**:
```bash
# View configuration
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
│ ...                                      │
└─────────────────────────────────────────┘
```

---

## Information Commands

### `-h, --help`

Display help message.

**Examples**:
```bash
bun run src/index.ts --help
bun run src/index.ts -h
```

---

### `-v, --version`

Display version number.

**Examples**:
```bash
bun run src/index.ts --version
bun run src/index.ts -v
```

---

### `--list-presets`

List all saved clip presets.

**Examples**:
```bash
bun run src/index.ts --list-presets
```

**Output**:
```
Saved Presets:
1. intro-outro (2 clips)
2. highlights (3 clips)
3. commercial-breaks (4 clips)
```

---

### `--list-history`

Show recent conversion history.

**Examples**:
```bash
bun run src/index.ts --list-history
```

**Output**: Table of recent conversions with date, input, format, status

---

### `--export-logs <format>`

Export process logs to file.

**Type**: String

**Options**: `json`, `csv`

**Examples**:
```bash
# Export as JSON
bun run src/index.ts --export-logs json

# Export as CSV
bun run src/index.ts --export-logs csv
```

**Output**: File path where logs were exported

---

### `--stats`

Display usage statistics.

**Examples**:
```bash
bun run src/index.ts --stats
```

**Output**:
```
┌─────────────────────────────────────────┐
│         Usage Statistics                │
├─────────────────────────────────────────┤
│ Total conversions: 127                  │
│ Completed: 124                          │
│ Failed: 3                               │
│ Total output: 4.2 GB                    │
│ Today's conversions: 5                  │
└─────────────────────────────────────────┘
```

---

## Examples

### Basic Extraction

```bash
# Simple conversion
bun run src/index.ts video.mp4

# Specify format
bun run src/index.ts -i video.mkv -f flac

# High quality
bun run src/index.ts -i concert.mp4 -f mp3 -q music_high
```

### Clipping

```bash
# Extract 30 seconds from 1 minute mark
bun run src/index.ts -i video.mp4 -s 00:01:00 -d 30

# Extract from start to end times
bun run src/index.ts -i video.mp4 -s 00:00:30 -e 00:05:45

# Multiple clips from same file (use interactive mode)
bun run src/index.ts --interactive
# Select [2] Clip Audio
```

### URL Downloads

```bash
# Download and convert YouTube video
bun run src/index.ts -u "https://youtube.com/watch?v=..."

# Download with specific quality
bun run src/index.ts -u "https://youtube.com/watch?v=..." -f mp3 -q music_high

# Download and clip
bun run src/index.ts -u "URL" -s 30 -d 120
```

### Batch Processing

```bash
# Process multiple files
bun run src/index.ts video1.mp4 video2.mp4 video3.mkv -f mp3

# Batch with same settings
bun run src/index.ts -i video1.mp4 -i video2.mp4 -f flac -q lossless

# Better: Interactive batch with FZF
bun run src/index.ts --interactive
# Select [4] Batch Process
```

### Chapter Extraction

```bash
# Extract all chapters
bun run src/index.ts -i podcast.mp4 --chapters

# Chapters with specific format
bun run src/index.ts -i audiobook.m4b --chapters -f mp3 -q speech -o ./chapters/
```

### Advanced Usage

```bash
# Dry run to test command
bun run src/index.ts -i video.mp4 -s 10 -d 60 --dry-run

# Strip metadata for privacy
bun run src/index.ts -i video.mp4 -f mp3 --strip-metadata -t "public"

# Custom output with organization
bun run src/index.ts -i video.mp4 -f flac -q lossless -o ~/Archive/

# Combine multiple options
bun run src/index.ts -i video.mp4 \
  -s 00:05:30 -d 300 \
  -f mp3 -q music_high \
  --strip-metadata \
  -t "project,final" \
  -o output.mp3
```

---

## Exit Codes

- `0`: Success
- `1`: Error (missing tools, invalid arguments, failed operation)

## Notes

- **Paths with spaces**: Automatically handled, or use quotes: `"path with spaces.mp4"`
- **Multiple inputs**: Process sequentially (not parallel in CLI mode)
- **Dry run**: Use to verify commands before execution
- **Interactive mode**: Recommended for complex operations

## See Also

- [User Guide](./user-guide.md) - Detailed usage guide
- [Configuration](./configuration.md) - Customize defaults
- [Troubleshooting](./troubleshooting.md) - Common issues

---

**Quick Reference**: Use `bun run src/index.ts --help` for on-demand help
