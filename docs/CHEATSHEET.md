# Multimedia Toolkit Cheat Sheet

Quick reference for common commands and operations.

## 🚀 Quick Start

```bash
# Interactive mode (easiest)
bun run src/index.ts --interactive

# Simple conversion
bun run src/index.ts video.mp4

# Get help
bun run src/index.ts --help
```

## 📥 Basic Operations

### Extract Audio
```bash
# Default settings (MP3, medium quality)
bun run src/index.ts video.mp4

# High quality MP3
bun run src/index.ts -i video.mp4 -f mp3 -q music_high

# Lossless FLAC
bun run src/index.ts -i video.mp4 -f flac -q lossless

# Speech optimized
bun run src/index.ts -i podcast.mp4 -f mp3 -q speech
```

### Clipping
```bash
# Clip 60 seconds starting at 1:30
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60

# Clip from start to end time
bun run src/index.ts -i video.mp4 -s 00:00:30 -e 00:05:45

# Clip with seconds notation
bun run src/index.ts -i video.mp4 -s 90 -d 120
```

### Download from URL
```bash
# YouTube video
bun run src/index.ts -u "https://youtube.com/watch?v=..."

# With quality
bun run src/index.ts -u "URL" -f mp3 -q music_high

# Download and clip
bun run src/index.ts -u "URL" -s 30 -d 120
```

## 📦 Batch Operations

```bash
# Multiple files
bun run src/index.ts video1.mp4 video2.mp4 video3.mkv

# Using -i flag
bun run src/index.ts -i video1.mp4 -i video2.mp4 -f flac

# Best: Interactive with FZF
bun run src/index.ts --interactive
# Select [4] Batch Process
```

## 🎯 Advanced Features

### Extract Chapters
```bash
# All chapters
bun run src/index.ts -i podcast.mp4 --chapters

# With output directory
bun run src/index.ts -i podcast.mp4 --chapters -o ./chapters/
```

### Split by Silence
```bash
# Auto-split at silent points
bun run src/index.ts -i recording.mp3 --silence

# With output directory
bun run src/index.ts -i recording.wav --silence -o ./segments/
```

### Using Presets
```bash
# List available presets
bun run src/index.ts --list-presets

# Apply preset
bun run src/index.ts -i video.mp4 -p "my-preset"
```

### Metadata
```bash
# Preserve metadata (default)
bun run src/index.ts -i video.mp4 --preserve-metadata

# Strip metadata
bun run src/index.ts -i video.mp4 --strip-metadata

# Add tags
bun run src/index.ts -i video.mp4 -t "project,final"
```

## ⚙️ Configuration

```bash
# View configuration
bun run src/index.ts --config

# Interactive settings
bun run src/index.ts --interactive
# Select [9] Settings
```

**Config file location**: `~/.multimedia-toolkit/config.json`

## 📊 Information Commands

```bash
# Version
bun run src/index.ts --version

# Help
bun run src/index.ts --help

# List presets
bun run src/index.ts --list-presets

# View history
bun run src/index.ts --list-history

# Statistics
bun run src/index.ts --stats

# Export logs
bun run src/index.ts --export-logs json
```

## 🔍 Utility Options

```bash
# Dry run (test without executing)
bun run src/index.ts -i video.mp4 --dry-run

# Show waveform
bun run src/index.ts -i audio.mp3 -w

# Preview clip
bun run src/index.ts -i video.mp4 -s 30 -d 60 --preview
```

## 📁 Output Options

```bash
# Specific output file
bun run src/index.ts -i video.mp4 -o audio.mp3

# Output directory
bun run src/index.ts -i video.mp4 -o ./output/

# Absolute path
bun run src/index.ts -i video.mp4 -o /mnt/storage/audio.mp3
```

## 🎵 Format Reference

| Format | Use Case | Size | Quality |
|--------|----------|------|---------|
| `mp3` | Universal compatibility | Medium | Good |
| `aac` | Modern devices | Small | Excellent |
| `opus` | Best compression | Smallest | Excellent |
| `webm` | Web playback (Opus) | Smallest | Excellent |
| `flac` | Archival/lossless | Large | Perfect |
| `wav` | Uncompressed | Largest | Perfect |
| `ogg` | Open source | Medium | Good |

## 🎚️ Quality Presets

| Preset | Bitrate | Use Case | Size/Hour |
|--------|---------|----------|-----------|
| `speech` | 64k | Podcasts, audiobooks | ~30 MB |
| `music_low` | 128k | Background music | ~60 MB |
| `music_medium` | 192k | General music (default) | ~90 MB |
| `music_high` | 320k | High fidelity | ~150 MB |
| `optimized_webm` | 128k | WebM/Opus streaming | ~60 MB |
| `lossless` | N/A | FLAC/WAV archival | ~300-500 MB |

## ⌨️ Time Format Options

| Format | Example | Description |
|--------|---------|-------------|
| `HH:MM:SS` | `01:30:45` | Hours:Minutes:Seconds |
| `MM:SS` | `90:30` | Minutes:Seconds |
| `seconds` | `5445` | Seconds as integer |
| `seconds.ms` | `5445.5` | With milliseconds |

## 🔑 Common Flags

```bash
-i, --input <file>         Input file
-o, --output <path>        Output file/directory
-f, --format <fmt>         Output format (mp3, flac, etc.)
-q, --quality <preset>     Quality preset
-s, --start <time>         Start time for clip
-d, --duration <sec>       Duration in seconds
-e, --end <time>           End time for clip
-p, --preset <name>        Use saved preset
-u, --url <url>            Download from URL
-m, --merge                Merge multiple clips
-w, --waveform             Show waveform
-b, --batch                Batch process directory
-t, --tags <tags>          Add tags
--chapters                 Extract chapters
--silence                  Split by silence
--strip-metadata           Remove metadata
--dry-run                  Test without executing
--interactive              Interactive mode
--help                     Show help
--version                  Show version
```

## 🐛 Quick Troubleshooting

```bash
# FFmpeg not found
sudo apt install ffmpeg

# yt-dlp not found
pip install yt-dlp

# FZF not found
sudo apt install fzf

# Permission denied
chmod +x src/index.ts

# Check configuration
cat ~/.multimedia-toolkit/config.json

# View logs
ls -la ~/.multimedia-toolkit/logs/
```

## 💡 Pro Tips

1. **Use interactive mode** for complex operations
2. **Save presets** for repeated clip patterns
3. **Use FZF** for faster file selection
4. **Dry run first** for complex commands
5. **Match source quality** - don't overencode
6. **Use tags** for better organization
7. **Check disk space** before batch operations
8. **Preview clips** before final extraction

## 🔗 Quick Links

- [Getting Started](./getting-started.md) - Installation & setup
- [User Guide](./user-guide.md) - Complete feature guide
- [CLI Reference](./cli-reference.md) - All CLI options
- [Configuration](./configuration.md) - Customize settings
- [Troubleshooting](./troubleshooting.md) - Solve problems
- [FAQ](./faq.md) - Common questions

## 📋 Common Task Recipes

### Convert entire movie to audiobook
```bash
bun run src/index.ts -i movie.mp4 -f mp3 -q speech -o audiobook.mp3
```

### Extract music video to high-quality audio
```bash
bun run src/index.ts -i music_video.mp4 -f flac -q lossless
```

### Batch convert all videos in folder
```bash
bun run src/index.ts --interactive
# [4] Batch Process > Use FZF > Select all > Choose format/quality
```

### Download YouTube playlist and extract audio
```bash
# Download each video first with yt-dlp
yt-dlp -f best "playlist_url" -o "%(playlist_index)s-%(title)s.%(ext)s"

# Then batch convert
bun run src/index.ts --interactive
# [4] Batch Process
```

### Extract intro and outro from video
```bash
# Save as preset first
bun run src/index.ts --interactive
# [7] Manage Presets > [3] Create Preset
# Define: Clip 1: 0-30s (intro), Clip 2: 58:30-60:00 (outro)

# Then use preset
bun run src/index.ts -i video.mp4 -p "intro-outro"
```

### Split podcast by chapters
```bash
bun run src/index.ts -i podcast.mp4 --chapters -f mp3 -q speech -o ./episodes/
```

---

**Print this cheat sheet for quick reference!**

For complete documentation, see [Documentation Index](./DOCUMENTATION_INDEX.md)
