# Getting Started with Media Audio Toolkit

This guide will help you install and start using Media Audio Toolkit in just a few minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First Run](#first-run)
- [Quick Examples](#quick-examples)
- [Next Steps](#next-steps)

## Prerequisites

Before installing Media Audio Toolkit, ensure you have the following:

### Required

1. **Bun Runtime** (v1.0 or higher)
   ```bash
   # Install Bun
   curl -fsSL https://bun.sh/install | bash

   # Verify installation
   bun --version
   ```

2. **FFmpeg and FFprobe**
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg

   # macOS
   brew install ffmpeg

   # Verify installation
   ffmpeg -version
   ffprobe -version
   ```

### Optional (Recommended)

3. **yt-dlp** - For downloading from URLs (YouTube, etc.)
   ```bash
   # Using pip
   pip install yt-dlp

   # Or using apt (Ubuntu/Debian)
   sudo apt install yt-dlp

   # Verify installation
   yt-dlp --version
   ```

4. **fzf** - For enhanced fuzzy file selection
   ```bash
   # Ubuntu/Debian
   sudo apt install fzf

   # macOS
   brew install fzf

   # Snap (any Linux)
   sudo snap install fzf

   # Verify installation
   fzf --version
   ```

## Installation

### Option 1: Clone from Repository

```bash
# Clone the repository
git clone https://github.com/your-username/media-audio-toolkit.git

# Navigate to directory
cd media-audio-toolkit

# Install dependencies
bun install

# Make the main script executable (optional)
chmod +x src/index.ts
```

### Option 2: Global Installation

```bash
# Install globally with Bun
bun install -g media-audio-toolkit

# Now you can run it from anywhere
media-audio-toolkit --help
```

### Verify Installation

After installation, verify everything is working:

```bash
# Check if the toolkit can find all required tools
bun run src/index.ts --config

# You should see output showing your configuration and available tools
```

## First Run

### Option A: Interactive Mode (Recommended for Beginners)

The interactive mode provides a guided menu system:

```bash
bun run src/index.ts --interactive
```

You'll be greeted with a menu:

```
╔══════════════════════════════════════════════════════════════╗
║              Media Audio Toolkit v1.0.0                      ║
║     Comprehensive Audio Extraction & Conversion Tool          ║
╚══════════════════════════════════════════════════════════════╝

┌────────────┐
│  Main Menu  │
└────────────┘

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

Enter your choice:
```

### Option B: Command Line Mode

For quick, one-off conversions:

```bash
# Convert a single video file to MP3
bun run src/index.ts video.mp4

# The output will be saved with default settings
```

## Quick Examples

### Example 1: Extract Audio from a Video

Convert a video file to MP3:

```bash
bun run src/index.ts input.mp4
```

The output will be saved as `input_<timestamp>.mp3` in your configured output directory (default: `~/Music/AudioExtracted/`).

### Example 2: Specify Output Format and Quality

Extract high-quality audio as FLAC:

```bash
bun run src/index.ts -i video.mkv -f flac -q music_high
```

### Example 3: Clip a Specific Segment

Extract 60 seconds starting at 1:30:

```bash
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60 -o clip.mp3
```

### Example 4: Download from YouTube

Download and extract audio from a YouTube video:

```bash
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ" -f mp3 -q music_high
```

### Example 5: Batch Process a Directory (Interactive)

```bash
# Start interactive mode
bun run src/index.ts --interactive

# Then select option [4] Batch Process
# Choose whether to use FZF for file selection or manual directory input
# Select your files and configure output settings
```

### Example 6: Extract Chapters

If your media file has chapter markers:

```bash
bun run src/index.ts -i podcast.mp4 --chapters -o ./chapters/
```

## Understanding the Basics

### Output Formats

The toolkit supports these audio formats:
- **MP3** - Most compatible, good compression
- **AAC** - Modern compression, excellent quality
- **FLAC** - Lossless compression
- **WAV** - Uncompressed, highest quality
- **OGG** - Open format, good compression
- **OPUS** - Best compression for voice/music
- **WEBM** - Opus in WebM container

### Quality Presets

Choose from these quality presets:

| Preset | Best For | Bitrate | Size |
|--------|----------|---------|------|
| `speech` | Podcasts, audiobooks | 64k | Smallest |
| `music_low` | Background music | 128k | Small |
| `music_medium` | General listening | 192k | Medium |
| `music_high` | Audiophile quality | 320k | Large |
| `optimized_webm` | WebM/Opus streaming | 128k | Small |
| `lossless` | Archival (FLAC/WAV) | N/A | Largest |

### File Organization

By default, files are auto-organized by date:
```
~/Music/AudioExtracted/
├── 2025/
│   └── 01/
│       ├── audio1_1704672000.mp3
│       └── audio2_1704758400.mp3
```

You can change this in [Configuration](./configuration.md).

## Launcher Script

For convenience, you can use the standalone launcher:

```bash
# Make it executable
chmod +x mat

# Run from anywhere
./mat --interactive

# Or copy to your PATH
sudo cp mat /usr/local/bin/
mat --help
```

## Next Steps

Now that you're set up, explore these topics:

1. **[User Guide](./user-guide.md)** - Comprehensive feature walkthrough
2. **[Interactive Mode](./interactive-mode.md)** - Detailed menu system guide
3. **[Configuration](./configuration.md)** - Customize default settings
4. **[FZF Integration](./features/fzf-integration.md)** - Enhanced file browsing
5. **[Clipping Guide](./features/clipping.md)** - Precise segment extraction

## Getting Help

If you encounter issues:

1. Check the **[Troubleshooting Guide](./troubleshooting.md)**
2. Review the **[FAQ](./faq.md)**
3. Run with `--verbose` flag for detailed output
4. Open an issue on GitHub

## Common First-Time Issues

### "FFmpeg not found"
**Solution**: Install FFmpeg as shown in [Prerequisites](#required)

### "Permission denied"
**Solution**: Make the script executable:
```bash
chmod +x src/index.ts
```

### "Cannot find output directory"
**Solution**: The toolkit will create it automatically. Ensure you have write permissions:
```bash
mkdir -p ~/Music/AudioExtracted
```

### "yt-dlp required for URL downloads"
**Solution**: Install yt-dlp as shown in [Optional Prerequisites](#optional-recommended)

---

**Ready to dive deeper?** Check out the [User Guide](./user-guide.md) for comprehensive feature documentation.
