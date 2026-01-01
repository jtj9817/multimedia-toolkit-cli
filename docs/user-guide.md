# User Guide

Complete guide to using Multimedia Toolkit for audio extraction and conversion.

## Table of Contents

- [Basic Extraction](#basic-extraction)
- [Video Transcoding](#video-transcoding)
- [Clipping Audio](#clipping-audio)
- [Batch Processing](#batch-processing)
- [URL Downloads](#url-downloads)
- [Chapter Extraction](#chapter-extraction)
- [Silence Detection](#silence-detection)
- [Using Presets](#using-presets)
- [Advanced Features](#advanced-features)

## Basic Extraction

### Simple Conversion

Convert a video file to audio format:

```bash
# Uses default settings (MP3, medium quality)
bun run src/index.ts video.mp4
```

**Output**: `~/Music/AudioExtracted/2025/01/video_1704672000.mp3`

### Specify Format and Quality

```bash
# High-quality FLAC
bun run src/index.ts -i video.mkv -f flac -q music_high

# Speech-optimized MP3
bun run src/index.ts -i podcast.mp4 -f mp3 -q speech

# Lossless WAV
bun run src/index.ts -i concert.mkv -f wav -q lossless
```

### Custom Output Path

```bash
# Specify exact output file
bun run src/index.ts -i video.mp4 -o /path/to/output/myaudio.mp3

# Specify output directory only (filename auto-generated)
bun run src/index.ts -i video.mp4 -o /path/to/output/
```

### Metadata Handling

```bash
# Strip all metadata
bun run src/index.ts -i video.mp4 --strip-metadata

# Preserve metadata (default)
bun run src/index.ts -i video.mp4 --preserve-metadata
```

## Video Transcoding

Convert video files to WebM, MP4, or MKV with optimized presets.

```bash
# Discord-optimized WebM (1080p default)
bun run src/index.ts -i clip.mov --video-preset any-to-webm

# MP4 output
bun run src/index.ts -i clip.mov --video-format mp4

# Override resolution and quality
bun run src/index.ts -i clip.mov --video-format webm --resolution 720p --video-quality 31
```

## Clipping Audio

### Single Clip

Extract a specific time segment:

```bash
# Start at 1:30, extract 60 seconds
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60

# Start at 90 seconds (alternative notation)
bun run src/index.ts -i video.mp4 -s 90 -d 60

# Use start and end times
bun run src/index.ts -i video.mp4 -s 00:01:30 -e 00:03:45
```

### Time Format Options

The toolkit accepts multiple time formats:

```bash
# HH:MM:SS format
-s 00:01:30

# MM:SS format
-s 01:30

# Seconds as integer
-s 90

# Seconds with decimals
-s 90.5
```

### Multiple Clips (Interactive Mode)

For extracting multiple segments from the same file:

```bash
bun run src/index.ts --interactive
# Select option [2] Clip Audio
# Follow prompts to define multiple clips
```

**Example interaction**:
```
Define clips (enter empty start time when done)

Clip 1 start time (or press Enter to finish): 00:00:30
Specify end time instead of duration? [y/N]: n
Duration (seconds): 45
Label (optional): intro

✓ Added clip 1

Clip 2 start time (or press Enter to finish): 00:05:00
Specify end time instead of duration? [y/N]: n
Duration (seconds): 120
Label (optional): main_segment

✓ Added clip 2

Clip 3 start time (or press Enter to finish): [Enter to finish]
```

### Preview Before Extracting

Preview clips before saving (plays first/last 5 seconds):

```bash
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60 --preview
```

### Waveform Visualization

View an ASCII waveform of the audio:

```bash
bun run src/index.ts -i audio.mp3 -w

# Or in interactive mode, when clipping
```

**Example output**:
```
Duration: 00:05:30

▁▂▃▅▇█▇▅▃▂▁▁▂▃▅▇█▇▅▃▂▁▁▂▃▅▇█▇▅▃▂▁
▁▁▂▂▃▃▄▄▅▅▆▆▇▇██▇▇▆▆▅▅▄▄▃▃▂▂▁▁
```

## Batch Processing

### Process Multiple Files (CLI)

Process all media files in a directory:

```bash
# Process all files in ./videos/ to MP3
bun run src/index.ts -b --input ./videos/ -f mp3 -q music_high

# Process specific file extensions
bun run src/index.ts -b --input ./videos/ -f mp3 --extensions "mp4,mkv"
```

### Interactive Batch Processing with FZF

The interactive mode offers enhanced file selection:

```bash
bun run src/index.ts --interactive
# Select [4] Batch Process
# Choose "Yes" to use FZF for file selection
```

**FZF controls**:
- **Type** to fuzzy search filenames
- **Tab** to select/deselect individual files
- **Ctrl+A** to select all matches
- **Ctrl+D** to deselect all
- **Enter** to confirm selection
- **Esc** to cancel

### Processing Results

During batch processing, you'll see progress:

```
Processing: [2/10] video02.mp4
Created: /path/to/output/video02_1704672000.mp3

Processing: [3/10] video03.mp4
Created: /path/to/output/video03_1704672100.mp3

...

Batch complete: 9 succeeded, 1 failed
```

## URL Downloads

### Download from YouTube

```bash
# Basic download and conversion
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ"

# Specify format and quality
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ" -f mp3 -q music_high

# Custom output path
bun run src/index.ts -u "https://youtube.com/watch?v=dQw4w9WgXcQ" -o ./downloads/song.mp3
```

### Download and Clip

Download a video and extract specific segments:

```bash
# Download then use preset for clipping
bun run src/index.ts -u "https://youtube.com/watch?v=..." -p "my-preset"

# Or in interactive mode for manual clip definition
bun run src/index.ts --interactive
# Select [3] Download & Extract
# Enter URL
# Choose whether to clip
# Define clips interactively
```

### Supported Platforms

Thanks to yt-dlp, you can download from:
- YouTube
- Vimeo
- SoundCloud
- Twitch
- And [1000+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

## Chapter Extraction

Extract chapters as separate audio files:

### CLI Mode

```bash
# Extract all chapters
bun run src/index.ts -i podcast.mp4 --chapters -o ./chapters/

# Extract with specific format
bun run src/index.ts -i audiobook.m4b --chapters -f mp3 -q speech
```

### Interactive Mode

```bash
bun run src/index.ts --interactive
# Select [5] Extract Chapters
# Select your media file
# View chapter list
# Choose to extract all or specific chapters
```

**Example chapter listing**:
```
┌────────────────────────────────────────────────────────┐
│ # │ Title              │ Start    │ End      │ Duration │
├────────────────────────────────────────────────────────┤
│ 1 │ Introduction       │ 00:00:00 │ 00:05:23 │ 00:05:23 │
│ 2 │ Chapter 1: Setup   │ 00:05:23 │ 00:15:47 │ 00:10:24 │
│ 3 │ Chapter 2: Usage   │ 00:15:47 │ 00:32:19 │ 00:16:32 │
│ 4 │ Conclusion         │ 00:32:19 │ 00:38:45 │ 00:06:26 │
└────────────────────────────────────────────────────────┘

Extract all chapters? [Y/n]:
```

### Output

Extracted chapters are saved with descriptive names:
```
chapters/
├── 01_Introduction.mp3
├── 02_Chapter_1_Setup.mp3
├── 03_Chapter_2_Usage.mp3
└── 04_Conclusion.mp3
```

## Silence Detection

Automatically split audio at silent points:

### CLI Mode

```bash
# Use default silence detection
bun run src/index.ts -i recording.mp3 --silence

# Custom silence threshold and duration
bun run src/index.ts -i recording.mp3 --silence \
  --threshold -30dB \
  --min-silence 0.5 \
  --min-segment 5
```

### Interactive Mode

```bash
bun run src/index.ts --interactive
# Select [6] Split by Silence
# Configure detection parameters:
```

**Parameter guide**:
- **Silence threshold** (default: -30dB): Audio below this level is considered silence
  - More negative = only very quiet parts are silence
  - Less negative = more aggressive splitting
- **Min silence duration** (default: 0.5s): How long silence must last to trigger a split
- **Min segment duration** (default: 5s): Minimum length of resulting segments

### Use Cases

**Podcast editing**:
```bash
# Split interview recording at natural pauses
bun run src/index.ts -i interview.wav --silence -o ./segments/
```

**Voice recordings**:
```bash
# Split voice memos into separate topics
bun run src/index.ts -i voice_memo.m4a --silence --threshold -35dB
```

**Music albums**:
```bash
# Split live recording into individual songs
bun run src/index.ts -i live_concert.flac --silence --min-silence 2
```

## Using Presets

Presets let you save and reuse clip configurations.

### Create a Preset (Interactive)

```bash
bun run src/index.ts --interactive
# Select [7] Manage Presets
# Select [3] Create Preset
# Define preset name and clips
```

### Use a Preset

```bash
# Apply preset to a file
bun run src/index.ts -i video.mp4 -p "my-preset"

# Apply preset to multiple files
bun run src/index.ts -i video1.mp4 -i video2.mp4 -p "intro-outro"
```

### Example Presets

**Intro/Outro Remover**:
```
Name: remove-intro-outro
Clips:
  - Start: 00:00:30, Duration: 3570 (skip first 30s, take 59:30)
```

**Highlights Extractor**:
```
Name: game-highlights
Clips:
  - Start: 00:05:23, Duration: 45, Label: first_goal
  - Start: 00:18:47, Duration: 38, Label: second_goal
  - Start: 00:42:15, Duration: 52, Label: final_score
```

### List Presets

```bash
# CLI
bun run src/index.ts --list-presets

# Interactive
bun run src/index.ts --interactive
# Select [7] Manage Presets
# Select [1] List Presets
```

### Export/Import Presets

```bash
# Export all presets to JSON
bun run src/index.ts --interactive
# [7] Manage Presets > [5] Export Presets

# Presets are saved in: ~/.multimedia-toolkit/presets.db
# Export creates: ~/Music/AudioExtracted/presets_export_<timestamp>.json
```

## Advanced Features

### Dry Run Mode

Preview commands without executing:

```bash
bun run src/index.ts -i video.mp4 --dry-run

# Output:
# [DRY RUN] ffmpeg -y -i video.mp4 -vn -c:a libmp3lame -b:a 192k...
```

### Merge Multiple Clips

Merge extracted clips into a single file:

```bash
bun run src/index.ts -i video.mp4 -s 00:00:30 -d 60 -s 00:05:00 -d 90 -m
```

### Tagging for Organization

Add tags to help organize outputs:

```bash
bun run src/index.ts -i video.mp4 -t "project,client,final"

# Tags are stored in database and can be searched later
```

### View Processing History

```bash
# CLI
bun run src/index.ts --list-history

# Interactive
bun run src/index.ts --interactive
# Select [8] View History
```

### Export Processing Logs

```bash
# Export as JSON
bun run src/index.ts --export-logs json

# Export as CSV
bun run src/index.ts --export-logs csv
```

### Usage Statistics

```bash
bun run src/index.ts --stats
```

**Example output**:
```
┌─────────────────────────────────────────┐
│         Usage Statistics                │
├─────────────────────────────────────────┤
│ Total conversions: 127                  │
│ Completed: 124                          │
│ Failed: 3                               │
│ Total output: 4.2 GB                    │
│ Today's conversions: 5                  │
│ Log directory: ~/.multimedia-toolkit/ │
└─────────────────────────────────────────┘
```

## Tips and Best Practices

### 💡 Performance Tips

1. **Use appropriate quality presets**: Don't use `lossless` for voice recordings
2. **Batch process similar files**: More efficient than individual conversions
3. **Use fast seeking**: When clipping, start time seeking is optimized automatically

### 💡 Quality Tips

1. **Match source quality**: Don't upsample (e.g., 128k source → 320k output doesn't improve quality)
2. **Use lossless for editing**: If you'll re-encode later, start with FLAC/WAV
3. **Consider file size**: `opus` gives excellent quality at lower bitrates

### 💡 Workflow Tips

1. **Save common configurations as presets**: For recurring tasks
2. **Use interactive mode when experimenting**: CLI for automation
3. **Preview clips before processing**: Especially for long files
4. **Organize by date or project**: Configure in [Settings](./configuration.md)

### ⚠️ Common Pitfalls

1. **Don't clip beyond file duration**: Check duration first with `--waveform` or in interactive mode
2. **Ensure sufficient disk space**: Especially for lossless formats
3. **Verify FFmpeg installation**: Run `ffmpeg -version` if you encounter issues

## Next Steps

- **[Configuration Guide](./configuration.md)** - Customize default behavior
- **[CLI Reference](./cli-reference.md)** - Complete command-line options
- **[FZF Integration](./features/fzf-integration.md)** - Master fuzzy file search
- **[Troubleshooting](./troubleshooting.md)** - Solve common issues

---

**Questions?** Check the [FAQ](./faq.md) or open an issue on GitHub.
