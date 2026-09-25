# Multimedia Toolkit

A comprehensive Bun.js-based multimedia processing tool for audio extraction, video transcoding, and animated image conversion. Combines functionality from multiple shell scripts into a unified, feature-rich application.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-v1.0+-black)](https://bun.sh)

---

## 🎵 Overview

Multimedia Toolkit is a powerful command-line tool for extracting and converting audio from video files, transcoding videos between formats, and creating animated GIFs and WebP images. It features both an interactive menu-driven interface and a scriptable CLI mode, making it perfect for both casual users and automation workflows.

**What makes it special:**
- 🎯 **Interactive & CLI modes** - User-friendly menus or scriptable commands
- 🔍 **FZF integration** - Fuzzy file search with live preview, plus fzf-driven output directory browsing
- 🎬 **Video transcoding** - Convert between WebM, MP4, and MKV formats
- 🖼️ **GIF/WebP creation** - Generate animated images from videos
- 📦 **Batch processing** - Handle multiple files efficiently
- 📖 **Chapter extraction** - Split by metadata chapters
- 🔇 **Silence detection** - Auto-split at silent points
- 💾 **Preset system** - Save and reuse clip configurations
- 📊 **Process tracking** - SQLite database with history and statistics
- 🎨 **Waveform visualization** - ASCII art preview of audio

---

## ✨ Features

### Input Sources
- Extract audio from video files (MP4, MKV, AVI, MOV, WEBM, FLV, WMV)
- Transcode video files between formats (WebM, MP4, MKV)
- Convert videos to animated GIF or WebP images
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
- **Audio Formats**: MP3, AAC, OGG, OPUS, WEBM, FLAC, WAV
- **Video Formats**: WebM, MP4, MKV
- **Video clipping**: Keep source streams or clip first and transcode to MP4, WebM, or MKV
- **Image Formats**: GIF, WebP (animated)
- **Quality presets**: Speech, Music (low/medium/high), Optimized WEBM, Lossless
- Configurable bitrate/quality per format
- Merge multiple clips into single output file
- Preserve or strip metadata (artist, album, cover art)

### Video Transcoding
- **Any-to-WebM**: VP9 video and Opus audio, capped at 1080p; multi-threaded two-pass VP9 encoding
- **Any-to-MP4**: Universal compatibility with H.264 video and AAC audio
- **Any-to-MKV**: Flexible container with H.264/H.265 support
- Resolution caps that never upscale, follow portrait/landscape orientation, and never letterbox
- Quality control via CRF (Constant Rate Factor) or bitrate modes
- Target file size (e.g. `--target-size 10` for Discord's 10 MB upload limit)
- Real frame rate measured from packet timestamps, so variable-frame-rate phone/social video hits bitrate and size targets
- Custom video and audio codec selection

### GIF/WebP Conversion
- **GIF Presets**: Discord-optimized, high quality, small file, smooth loop
- **WebP Presets**: Discord-optimized, high quality, small file, lossless
- Configurable frame rate, dimensions, and loop settings
- Advanced dithering options for GIFs (Floyd-Steinberg, Sierra, Bayer)
- WebP compression and lossless modes
- Custom palette generation for GIFs (full or diff mode)

### Workflow Improvements
- **Interactive mode** with guided menu system
- **FZF integration** for fuzzy file search and selection
  - Browse files from current directory with live preview
  - Filter by media file extensions automatically
  - Multi-select files with keyboard shortcuts (Tab, Ctrl+A)
  - Browse output directories with directory-only candidates and live name filtering
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

### 2. Install Multimedia Toolkit

```bash
# Clone repository
git clone https://github.com/your-username/multimedia-toolkit.git
cd multimedia-toolkit

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
║              Multimedia Toolkit v1.0.0                      ║
║     Comprehensive Audio Extraction & Conversion Tool          ║
╚══════════════════════════════════════════════════════════════╝

Main Menu

  [1] Extract Audio - Convert video/audio to audio format
  [2] Clip Audio - Extract specific time segments
  [3] Clip Video - Create source-format or transcoded video clips
  [4] Download & Extract - Download from URL and extract audio
  [5] Batch Process - Process multiple files
  [6] Extract Chapters - Split by metadata chapters
  [7] Split by Silence - Auto-split at silent points
  [8] Transcode Video - Convert video to WebM/MP4/MKV
  [9] Convert to GIF/WebP - Create animated GIFs or WebP images
  [10] Manage Presets - Save/load clip time presets
  [11] View History - See recent conversions
  [12] Settings - Configure default options
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
-f, --format <fmt>      Audio format: mp3, wav, flac, aac, ogg, opus, webm
-q, --quality <preset>  Audio quality: speech, music_low, music_medium, music_high, optimized_webm, lossless
--video-format <fmt>    Video format: webm, mp4, mkv
--video-preset <name>   Video preset: any-to-webm, any-to-mp4, any-to-mkv
--video-quality <val>   Video quality: CRF number or bitrate like 2500k
--resolution <res>      Max video resolution: source, 2160p, 1440p, 1080p, 720p, 480p
--target-size <MB>      Keep video output under this size (e.g. 10 for Discord)
--single-pass           Skip two-pass encoding (faster WebM, slightly larger files)
--gif-webp-preset <key> GIF/WebP preset (see presets list)
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

Configuration is stored in `~/.multimedia-toolkit/config.json` and SQLite database.

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
nano ~/.multimedia-toolkit/config.json
```

**Default settings:**
- Output directory: the directory you launch the toolkit from (set a fixed override in Settings; the `MULTIMEDIA_TOOLKIT_OUTPUT_DIR` environment variable is also honored)
- Default format: MP3
- Default quality: music_medium
- Auto-organize: By date (YYYY/MM/)
- Preserve metadata: Yes

---

## 📁 Project Structure

```
multimedia-toolkit/
├── src/
│   ├── index.ts          # Main entry point
│   ├── types.ts          # TypeScript type definitions
│   ├── app/
│   │   ├── context.ts    # Application context factory (dependency injection)
│   │   └── paths.ts      # Path resolution and validation
│   ├── cli/
│   │   ├── interface.ts  # Interactive CLI module
│   │   ├── commands/     # Command pattern implementation
│   │   ├── menus/        # Menu system components
│   │   └── dialogs/      # User interaction dialogs
│   ├── config/
│   │   └── config.ts     # Configuration management
│   ├── db/
│   │   ├── database.ts   # SQLite database manager
│   │   └── repositories/ # Repository pattern for DB operations
│   ├── media/
│   │   ├── ffmpeg.ts     # FFmpeg wrapper
│   │   └── downloader.ts # URL downloader (yt-dlp)
│   └── utils/
│       ├── fzf.ts        # FZF integration
│       ├── logger.ts     # Logging and output organization
│       ├── presets.ts    # Clip preset management
│       ├── visualizer.ts # Waveform visualization
│       ├── clock.ts      # Time abstraction for testing
│       ├── process-runner.ts # Process execution abstraction
│       ├── process-logging.ts # Process output logging
│       └── format.ts     # Formatting utilities
├── tests/                # Test files (mirrors src/ structure)
│   ├── app/
│   ├── cli/
│   ├── config/
│   ├── db/
│   ├── media/
│   └── utils/
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

### Convert Video to WebM That Fits Discord's 10 MB Limit
```bash
bun run src/index.ts -i video.mp4 --video-format webm --target-size 10
```

### Create Animated GIF from Video
```bash
bun run src/index.ts -i video.mp4 --gif-webp-preset gif-discord -o output.gif
```

### Create Video Clips
```bash
# Keep source streams (fast/lossless; cuts can align to a nearby keyframe)
bun run src/index.ts -i video.mp4 --video-clip 90:150 -o ./clips

# Clip first, then transcode the verified clip
bun run src/index.ts -i video.mp4 --video-clip 90:150 --video-format webm -o ./clips
```

Repeat `--video-clip` for multiple ranges. Generated names include
`_CLIP_YYYYMMDD-HHmmss`; empty or unreadable output files are deleted.

### Create High-Quality WebP Animation
```bash
bun run src/index.ts -i video.mp4 --gif-webp-preset webp-high-quality -o output.webp
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
- [GitHub Issues](https://github.com/your-repo/multimedia-toolkit/issues)

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
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/multimedia-toolkit/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/multimedia-toolkit/discussions)
- ❓ **FAQ**: [docs/faq.md](./docs/faq.md)

---

**Happy audio extracting!** 🎵
