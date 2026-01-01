# Media Audio Toolkit

A comprehensive Bun.js-based audio extraction and conversion tool that combines functionality from multiple shell scripts into a unified, feature-rich application.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-v1.0+-black)](https://bun.sh)

---

## 🎵 Overview

Media Audio Toolkit is a powerful command-line tool for extracting and converting audio from video and audio files. It features both an interactive menu-driven interface and a scriptable CLI mode, making it perfect for both casual users and automation workflows.

**What makes it special:**
- 🎯 **Interactive & CLI modes** - User-friendly menus or scriptable commands
- 🔍 **FZF integration** - Fuzzy file search with live preview
- 📦 **Batch processing** - Handle multiple files efficiently
- 🎬 **Chapter extraction** - Split by metadata chapters
- 🔇 **Silence detection** - Auto-split at silent points
- 💾 **Preset system** - Save and reuse clip configurations
- 📊 **Process tracking** - SQLite database with history and statistics
- 🎨 **Waveform visualization** - ASCII art preview of audio

---

## ✨ Features

### Input Sources
- Extract audio from video files (MP4, MKV, AVI, MOV, WEBM, FLV, WMV)
- Support URLs (YouTube, Vimeo, SoundCloud via yt-dlp - 1000+ sites)
- Accept multiple input files for batch processing
- Local audio file format conversion

### Clipping Enhancements
- Extract multiple clips from a single file in one session
- Split audio by detected silence/pauses
- Extract chapters from files with metadata chapters
- Preview clip before saving (plays first/last 5 seconds)
- Save time presets for frequently clipped segments

### Output Options
- **Formats**: MP3, AAC, OGG, OPUS, WEBM, FLAC, WAV
- **Quality presets**: Speech, Music (low/medium/high), Optimized WEBM, Lossless
- Configurable bitrate/quality per format
- Merge multiple clips into single output file
- Preserve or strip metadata (artist, album, cover art)

### Workflow Improvements
- **Interactive mode** with guided menu system
- **FZF integration** for fuzzy file search and selection
  - Browse files from current directory with live preview
  - Filter by media file extensions automatically
  - Multi-select files with keyboard shortcuts (Tab, Ctrl+A)
  - Graceful fallback to manual input if FZF unavailable
- Configuration file for default settings
- Interactive waveform visualization (ASCII art)
- Dry-run mode showing commands without executing
- Process history and statistics tracking

### Organization
- Auto-organize output by date/source/format into subdirectories
- Generate JSON/CSV log of all clips created
- Tag-based file naming system
- SQLite database for metadata storage

---

## 📋 Requirements

### Required
- **[Bun](https://bun.sh)** v1.0+ - Modern JavaScript runtime
- **FFmpeg** and **FFprobe** - Media processing tools

### Optional (Recommended)
- **yt-dlp** - For URL downloads (YouTube, etc.)
- **fzf** - Enhanced fuzzy file selection

---

## 🚀 Installation

### 1. Install Prerequisites

**Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Install FFmpeg:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

### 2. Install Media Audio Toolkit

```bash
# Clone repository
git clone https://github.com/your-username/media-audio-toolkit.git
cd media-audio-toolkit

# Install dependencies
bun install

# Verify installation
bun run src/index.ts --version
```

### 3. Optional: Install Enhanced Features

**For URL downloads (YouTube, etc.):**
```bash
pip install yt-dlp
# or
sudo apt install yt-dlp
```

**For enhanced file selection:**
```bash
# Ubuntu/Debian
sudo apt install fzf

# macOS
brew install fzf

# Snap (any Linux)
sudo snap install fzf
```

When fzf is installed, the toolkit automatically uses it for file selection in interactive mode, providing:
- Fuzzy search across all files in the current directory
- Live preview of media file information (duration, format, bitrate)
- Multi-select capability with Tab key
- Keyboard shortcuts (Ctrl+A to select all, Ctrl+D to deselect all)

If fzf is not available, the toolkit gracefully falls back to manual file path input.

---

## 📖 Quick Start

### Interactive Mode (Recommended for Beginners)

```bash
# Launch interactive menu
bun run src/index.ts --interactive

# Or simply (defaults to interactive if no arguments)
bun run src/index.ts
```

**You'll see:**
```
╔══════════════════════════════════════════════════════════════╗
║              Media Audio Toolkit v1.0.0                      ║
║     Comprehensive Audio Extraction & Conversion Tool          ║
╚══════════════════════════════════════════════════════════════╝

Main Menu

  [1] Extract Audio - Convert video/audio to audio format
  [2] Clip Audio - Extract specific time segments
  [3] Download & Extract - Download from URL and extract audio
  [4] Batch Process - Process multiple files
  [5] Extract Chapters - Split by metadata chapters
  [6] Split by Silence - Auto-split at silent points
  [7] Manage Presets - Save/load clip time presets
  [8] View History - See recent conversions
  [9] Settings - Configure default options
  [0] Exit - Quit the program
```

### Command Line Mode (For Automation)

**Basic conversion:**
```bash
bun run src/index.ts video.mp4
```

**Extract with clipping:**
```bash
bun run src/index.ts -i video.mkv -s 00:01:30 -d 60 -o clip.mp3
```

**Download from YouTube:**
```bash
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ" -f mp3 -q music_high
```

**Batch process directory:**
```bash
bun run src/index.ts -b --input ./videos -f mp3 -q music_high
```

**Extract all chapters:**
```bash
bun run src/index.ts -i podcast.mp4 --chapters -o ./chapters/
```

**Split by silence:**
```bash
bun run src/index.ts -i recording.mp3 --silence
```

**Use a saved preset:**
```bash
bun run src/index.ts -i video.mp4 -p "my-preset"
```

---

## 🎛️ CLI Options

### Input Options
```
-i, --input <file>      Input file(s), can be specified multiple times
-u, --url <url>         URL to download (YouTube, streaming sites)
```

### Output Options
```
-o, --output <path>     Output file or directory
-f, --format <fmt>      Output format: mp3, wav, flac, aac, ogg, opus, webm
-q, --quality <preset>  Quality preset: speech, music_low, music_medium, music_high, optimized_webm, lossless
```

### Clipping Options
```
-s, --start <time>      Start time (HH:MM:SS or seconds)
-d, --duration <sec>    Duration in seconds
-e, --end <time>        End time (alternative to duration)
-p, --preset <name>     Use a saved clip preset
```

### Features
```
--chapters              Extract chapters as separate files
--silence               Split audio by detected silence
-m, --merge             Merge multiple clips/files into one
--preview               Preview clip before saving (plays first/last 5s)
-w, --waveform          Display ASCII waveform visualization
```

### Metadata
```
--strip-metadata        Remove all metadata from output
--preserve-metadata     Keep original metadata (default)
-t, --tags <tags>       Add tags (comma-separated) for organization
```

### Workflow
```
--interactive           Launch interactive mode
--dry-run               Show commands without executing
-b, --batch             Process multiple files from directory
-c, --config            Show/edit configuration
```

### Information
```
--list-presets          List saved clip presets
--list-history          Show recent conversion history
--export-logs <format>  Export logs (json/csv)
--stats                 Show usage statistics
-h, --help              Show this help message
-v, --version           Show version
```

---

## 🎚️ Quality Presets

| Preset | Bitrate | Sample Rate | Channels | Use Case | Size/Hour |
|--------|---------|-------------|----------|----------|-----------|
| **speech** | 64k | 16 kHz | Mono | Podcasts, audiobooks | ~30 MB |
| **music_low** | 128k | 44.1 kHz | Stereo | Background music | ~60 MB |
| **music_medium** | 192k | 44.1 kHz | Stereo | Standard quality (default) | ~90 MB |
| **music_high** | 320k | 48 kHz | Stereo | High-quality music | ~150 MB |
| **optimized_webm** | 128k | 48 kHz | Stereo | WebM/Opus streaming | ~60 MB |
| **lossless** | Variable | 48 kHz | Stereo | FLAC/WAV archival | ~300-500 MB |

---

## ⚙️ Configuration

Configuration is stored in `~/.media-audio-toolkit/config.json` and SQLite database.

**View current configuration:**
```bash
bun run src/index.ts --config
```

**Edit configuration:**
```bash
# Interactive settings menu
bun run src/index.ts --interactive
# Select [9] Settings

# Or edit directly
nano ~/.media-audio-toolkit/config.json
```

**Default settings:**
- Output directory: `~/Music/AudioExtracted/`
- Default format: MP3
- Default quality: music_medium
- Auto-organize: By date (YYYY/MM/)
- Preserve metadata: Yes

---

## 📁 Project Structure

```
media-audio-toolkit/
├── src/
│   ├── index.ts          # Main entry point
│   ├── types.ts          # TypeScript type definitions
│   ├── cli/
│   │   └── interface.ts  # Interactive CLI module
│   ├── config/
│   │   └── config.ts     # Configuration management
│   ├── db/
│   │   └── database.ts   # SQLite database manager
│   ├── media/
│   │   ├── ffmpeg.ts     # FFmpeg wrapper
│   │   └── downloader.ts # URL downloader (yt-dlp)
│   └── utils/
│       ├── fzf.ts        # FZF integration
│       ├── logger.ts     # Logging and output organization
│       ├── presets.ts    # Clip preset management
│       └── visualizer.ts # Waveform visualization
├── docs/                 # Comprehensive documentation
├── dist/                 # Build output
├── mat                   # Launcher script
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📚 Documentation

### 📖 Getting Started
- **[Quick Start Guide](./docs/getting-started.md)** - Installation, setup, and first steps
- **[User Guide](./docs/user-guide.md)** - Complete feature reference with examples
- **[CLI Reference](./docs/cli-reference.md)** - All command-line options
- **[Configuration Guide](./docs/configuration.md)** - Customizing default settings
- **[FAQ](./docs/faq.md)** - Frequently asked questions

### 🔧 Features
- **[Audio Clipping](./docs/user-guide.md#clipping-audio)** - Extract specific segments
- **[Batch Processing](./docs/user-guide.md#batch-processing)** - Process multiple files
- **[Chapter Extraction](./docs/user-guide.md#chapter-extraction)** - Split by chapters
- **[Silence Detection](./docs/user-guide.md#silence-detection)** - Auto-split by silence
- **[URL Downloads](./docs/user-guide.md#url-downloads)** - YouTube support
- **[Preset System](./docs/user-guide.md#using-presets)** - Save clip configurations

### 🏗️ Technical Documentation
- **[Architecture Overview](./docs/architecture.md)** - System design and module structure
- **[API Reference](./docs/api-reference.md)** - Module and function documentation
- **[Development Guide](./docs/development.md)** - Setting up development environment

### 🆘 Help & Support
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues and solutions
- **[Cheat Sheet](./docs/CHEATSHEET.md)** - Quick reference for common commands

📑 **[Complete Documentation Index](./docs/DOCUMENTATION_INDEX.md)**

---

## 💡 Common Use Cases

### Convert Video to MP3
```bash
bun run src/index.ts video.mp4
```

### Extract Specific Segment
```bash
# Extract 2 minutes starting at 1:30
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 120
```

### Download YouTube Video as Audio
```bash
bun run src/index.ts -u "https://youtube.com/watch?v=..." -f mp3 -q music_high
```

### Batch Convert Entire Folder
```bash
# Interactive mode with FZF (recommended)
bun run src/index.ts --interactive
# Select [4] Batch Process, use FZF to select files

# Or CLI mode
bun run src/index.ts -b --input ./videos/ -f mp3
```

### Split Podcast by Chapters
```bash
bun run src/index.ts -i podcast.mp4 --chapters -f mp3 -q speech -o ./episodes/
```

### Auto-Split Recording at Pauses
```bash
bun run src/index.ts -i long_recording.wav --silence -o ./segments/
```

---

## 🔍 Examples

### Example 1: Music Video to High-Quality Audio
```bash
bun run src/index.ts -i music_video.mp4 -f flac -q lossless -o music.flac
```

### Example 2: Clip Multiple Segments
```bash
# Use interactive mode for ease
bun run src/index.ts --interactive
# [2] Clip Audio
# Define multiple clips with labels
# Optionally save as preset for reuse
```

### Example 3: Process All Videos in Directory
```bash
# Interactive with visual file selection
bun run src/index.ts --interactive
# [4] Batch Process
# Use FZF to browse and select files with Tab
# Choose format: MP3, quality: music_high
```

### Example 4: Extract Intro and Outro
```bash
# Create a preset once
bun run src/index.ts --interactive
# [7] Manage Presets > [3] Create Preset
# Name: "intro-outro"
# Clip 1: 0-30s (intro)
# Clip 2: 58:30-60:00 (outro)

# Then reuse on any video
bun run src/index.ts -i video.mp4 -p "intro-outro"
```

---

## 🐛 Troubleshooting

### Common Issues

**"FFmpeg not found"**
```bash
# Install FFmpeg
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # macOS
```

**"yt-dlp required for URL downloads"**
```bash
# Install yt-dlp (optional, for URL downloads only)
pip install yt-dlp
```

**"FZF not available"**
```bash
# Install fzf (optional, for enhanced file selection)
sudo apt install fzf
```

**More help:**
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [FAQ](./docs/faq.md)
- [GitHub Issues](https://github.com/your-repo/media-audio-toolkit/issues)

---

## 🤝 Contributing

Contributions are welcome! Please see:
- **[Development Guide](./docs/development.md)** - Setup and workflow
- **[Architecture Overview](./docs/architecture.md)** - System design

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [FFmpeg](https://ffmpeg.org) - Multimedia framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloader
- [fzf](https://github.com/junegunn/fzf) - Fuzzy finder

---

## 📞 Support

- 📖 **Documentation**: [docs/](./docs/)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/media-audio-toolkit/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/media-audio-toolkit/discussions)
- ❓ **FAQ**: [docs/faq.md](./docs/faq.md)

---

**Happy audio extracting!** 🎵
