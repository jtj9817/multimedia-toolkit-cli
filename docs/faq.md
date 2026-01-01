# Frequently Asked Questions (FAQ)

Common questions and answers about Media Audio Toolkit.

## Table of Contents

- [General](#general)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Audio Quality](#audio-quality)
- [File Formats](#file-formats)
- [Performance](#performance)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

## General

### What is Media Audio Toolkit?

Media Audio Toolkit is a comprehensive command-line tool for extracting and converting audio from video and audio files. It combines the functionality of multiple shell scripts into a unified, TypeScript-based application with both interactive and CLI modes.

### Why use this instead of FFmpeg directly?

**Benefits over raw FFmpeg**:
- User-friendly interactive interface
- Fuzzy file selection with FZF integration
- Saved presets for repeated tasks
- Organized output with automatic timestamping
- Process history and statistics tracking
- Quality presets optimized for different use cases
- Batch processing with progress tracking

### Is it free and open source?

Yes! Media Audio Toolkit is released under the MIT license.

### What platforms does it support?

- **Linux**: Full support (tested on Ubuntu, Pop!_OS)
- **macOS**: Full support
- **Windows**: Via WSL (Windows Subsystem for Linux)

## Installation & Setup

### Do I need Node.js?

No! The toolkit uses [Bun](https://bun.sh), a modern JavaScript runtime that's faster than Node.js. You need to install Bun, not Node.js.

### What are the system requirements?

**Required**:
- Bun v1.0+
- FFmpeg and FFprobe
- 100MB free disk space (for toolkit itself)
- Additional space for output files

**Optional**:
- yt-dlp (for URL downloads)
- fzf (for enhanced file selection)

### How much disk space do I need?

- **Toolkit**: ~10-50 MB
- **Output files**: Depends on format and quality
  - MP3 (192k): ~90 MB per hour of audio
  - FLAC (lossless): ~300-500 MB per hour

### Can I install it globally?

Yes:
```bash
bun install -g media-audio-toolkit

# Then run from anywhere
media-audio-toolkit --help
```

## Usage

### What's the difference between interactive and CLI mode?

**Interactive Mode**:
- Menu-driven interface
- Guided file selection with FZF
- Best for: Learning, complex operations, occasional use

**CLI Mode**:
- Direct command-line usage
- Scriptable and automatable
- Best for: Automation, batch scripts, power users

### How do I convert a video to MP3?

**Simplest way**:
```bash
bun run src/index.ts video.mp4
```

**With quality control**:
```bash
bun run src/index.ts -i video.mp4 -f mp3 -q music_high
```

**Interactive mode**:
```bash
bun run src/index.ts --interactive
# Select [1] Extract Audio
```

### Can I process multiple files at once?

Yes! Three ways:

1. **Interactive batch mode** (recommended):
   ```bash
   bun run src/index.ts --interactive
   # Select [4] Batch Process
   # Use FZF to select multiple files
   ```

2. **CLI with multiple inputs**:
   ```bash
   bun run src/index.ts video1.mp4 video2.mp4 video3.mkv
   ```

3. **Directory processing**:
   ```bash
   bun run src/index.ts -b --input ./videos/ -f mp3
   ```

### Where are output files saved?

**Default location**: `~/Music/AudioExtracted/`

**Organization** (if enabled in config):
```
AudioExtracted/
└── 2025/
    └── 01/
        └── files...
```

**Change location**:
- Interactive: [9] Settings > [1] Change output directory
- Config file: Edit `~/.media-audio-toolkit/config.json`

### How do I clip a specific part of a video?

```bash
# Extract 60 seconds starting at 1:30
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60

# Or interactively
bun run src/index.ts --interactive
# Select [2] Clip Audio
```

### Can I save frequently-used clip timings?

Yes! Use **presets**:

1. Interactive mode: [7] Manage Presets > [3] Create Preset
2. Define your clips once
3. Reuse with: `bun run src/index.ts -i video.mp4 -p "my-preset"`

### Does it work with YouTube links?

Yes, with yt-dlp installed:

```bash
bun run src/index.ts -u "https://youtube.com/watch?v=..."
```

Works with 1000+ sites supported by yt-dlp.

## Audio Quality

### Which quality preset should I use?

| Preset | Use Case | Why |
|--------|----------|-----|
| `speech` | Podcasts, audiobooks | Small files, optimized for voice |
| `music_low` | Background music | Good balance of size/quality |
| `music_medium` | **General use** | Recommended default |
| `music_high` | High-fidelity music | Best quality for lossy formats |
| `optimized_webm` | WebM/Opus streaming | Efficient web playback |
| `lossless` | Archival, editing | No quality loss (large files) |

### What's the difference between bitrates?

- **64k (speech)**: Voice-optimized, small files
- **128k (music_low)**: Acceptable music quality
- **128k (optimized_webm)**: WebM/Opus optimized for streaming
- **192k (music_medium)**: Good music quality (most people can't hear difference from higher)
- **320k (music_high)**: Maximum MP3 quality
- **Lossless**: Perfect reproduction, large files

### Can I customize quality settings?

Quality presets are fixed, but you can:
1. Choose appropriate preset for your needs
2. Select format (MP3, FLAC, OPUS, etc.)
3. In future versions: Custom quality settings planned

### Will converting improve audio quality?

**No!** Converting cannot improve quality, only preserve or reduce it.

**Example**: Converting 128k MP3 to 320k doesn't improve quality, just wastes space.

**Best practice**: Match or slightly exceed source quality.

## File Formats

### Which format should I use?

| Format | When to Use |
|--------|-------------|
| **MP3** | Maximum compatibility, general purpose |
| **AAC** | Modern devices, better than MP3 at same bitrate |
| **OPUS** | Best compression, streaming, modern use |
| **WEBM** | Opus in WebM container for browser-friendly output |
| **FLAC** | Archival, lossless, re-encoding later |
| **WAV** | Uncompressed, editing, maximum compatibility |
| **OGG** | Open source preference |

### What's the difference between FLAC and WAV?

- **FLAC**: Compressed lossless (~40-50% of WAV size)
- **WAV**: Uncompressed lossless (large files)
- **Quality**: Identical (both lossless)
- **Recommendation**: Use FLAC unless you need WAV for compatibility

### Can it extract from any video format?

Yes, if FFmpeg supports it:
- MP4, MKV, AVI, MOV, WEBM, FLV, WMV, M4V
- And many more

### Can it convert audio formats too?

Yes! Input can be audio or video:
```bash
# Audio to audio conversion
bun run src/index.ts audio.wav -f mp3
bun run src/index.ts audio.mp3 -f flac -q lossless
```

## Performance

### How long does extraction take?

**Typical speeds**:
- Extracting from 1-hour video: 1-3 minutes
- Clipping 1 minute: 5-10 seconds
- Batch processing 10 files: 5-15 minutes

**Factors**:
- Input file size
- Output quality/format
- CPU performance
- Disk speed

### Can I speed it up?

**Already optimized**:
- Fast seeking for clips
- Efficient FFmpeg parameters
- Bun's high-performance runtime

**Additional tips**:
- Use SSD over HDD
- Close other applications
- Use appropriate quality (don't overencode)

### Does it process files in parallel?

Currently: Sequential processing

Future: Parallel batch processing (controlled by `maxConcurrentJobs`)

### It's using a lot of CPU, is that normal?

Yes! Audio/video transcoding is CPU-intensive. FFmpeg uses available CPU cores for encoding.

## Features

### Can it extract chapters from videos?

Yes!
```bash
bun run src/index.ts -i podcast.mp4 --chapters
```

Or interactive mode: [5] Extract Chapters

### Can it split audio at silent points?

Yes!
```bash
bun run src/index.ts -i recording.mp3 --silence
```

Or interactive mode: [6] Split by Silence

### Does it preserve metadata?

Yes, by default. Includes:
- Title, artist, album
- Cover art
- Comments
- Chapter markers (if applicable)

To strip metadata:
```bash
bun run src/index.ts -i video.mp4 --strip-metadata
```

### Can I preview clips before saving?

Yes, with `--preview` flag (CLI) or in interactive mode.

Plays first and last 5 seconds of the clip.

### What's FZF and why should I use it?

**FZF** = Command-line fuzzy finder

**Benefits**:
- Type to search filenames instantly
- Multi-select with Tab key
- Preview file information
- Much faster than typing paths

**Install**: `sudo apt install fzf`

### Can I use it in my own scripts?

Yes! CLI mode is designed for scripting:

```bash
#!/bin/bash
for video in *.mp4; do
  bun run /path/to/media-audio-toolkit/src/index.ts "$video" -f mp3 -q music_high
done
```

## Troubleshooting

### "FFmpeg not found"

**Install FFmpeg**:
```bash
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # macOS
```

See [Troubleshooting Guide](./troubleshooting.md#ffmpeg-not-found)

### "yt-dlp required for URL downloads"

**Install yt-dlp**:
```bash
pip install yt-dlp
```

Optional - only needed for downloading from URLs.

### Output file has no sound

**Possible causes**:
1. Input has no audio track
2. Clipping beyond file duration
3. Corrupted input file

**Solutions**:
- Verify input: `ffprobe input.mp4`
- Check duration before clipping
- Test with different input file

See [Troubleshooting Guide](./troubleshooting.md#output-file-is-silent)

### FZF shows empty list

**Check**:
- Are there media files in current directory?
- Is directory accessible?
- Are file extensions supported?

**Solution**: Use manual path input option

### Process is taking forever

**Expected for**:
- Large files (2+ hours)
- High-quality output
- Lossless formats

**If abnormally slow**:
- Check disk space
- Check CPU isn't throttling
- Try lower quality preset

### Configuration keeps resetting

**Check permissions**:
```bash
ls -la ~/.media-audio-toolkit/
```

**Fix**:
```bash
chmod 755 ~/.media-audio-toolkit
chmod 644 ~/.media-audio-toolkit/config.json
```

## Still Have Questions?

- **Read the documentation**: Start with [Getting Started](./getting-started.md)
- **Check troubleshooting**: [Troubleshooting Guide](./troubleshooting.md)
- **Search issues**: [GitHub Issues](https://github.com/your-repo/media-audio-toolkit/issues)
- **Ask a question**: Open a new issue or discussion

---

**Have a question not answered here?** Please open an issue so we can add it!
