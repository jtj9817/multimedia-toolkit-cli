# Troubleshooting Guide

Solutions to common issues when using Multimedia Toolkit.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Tool Detection Issues](#tool-detection-issues)
- [Audio Extraction Issues](#audio-extraction-issues)
- [File Selection Issues](#file-selection-issues)
- [URL Download Issues](#url-download-issues)
- [Performance Issues](#performance-issues)
- [Output Issues](#output-issues)
- [Configuration Issues](#configuration-issues)
- [Interactive Mode Issues](#interactive-mode-issues)

## Installation Issues

### "Bun command not found"

**Problem**: `bun: command not found`

**Solution**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"

# Reload shell
source ~/.bashrc

# Verify
bun --version
```

---

### "Cannot find module"

**Problem**: Import errors when running the toolkit

**Solution**:
```bash
# Navigate to project directory
cd multimedia-toolkit

# Install dependencies
bun install

# Verify installation
bun run src/index.ts --version
```

---

### "Permission denied" on Linux

**Problem**: Cannot execute `src/index.ts`

**Solution**:
```bash
# Make executable
chmod +x src/index.ts

# Or run with bun explicitly
bun run src/index.ts
```

---

## Tool Detection Issues

### "FFmpeg not found"

**Problem**: `Required tools missing: ffmpeg`

**Diagnosis**:
```bash
# Check if FFmpeg is installed
which ffmpeg
ffmpeg -version
```

**Solution**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
```

**Alternative**: Specify custom FFmpeg path in configuration:
```json
{
  "ffmpegPath": "/usr/local/bin/ffmpeg"
}
```

---

### "FFprobe not found"

**Problem**: `Required tools missing: ffprobe`

**Note**: FFprobe is usually installed with FFmpeg

**Solution**:
```bash
# Check installation
which ffprobe

# If missing, reinstall FFmpeg
sudo apt install --reinstall ffmpeg

# Verify
ffprobe -version
```

---

### "yt-dlp required for URL downloads"

**Problem**: Trying to download from URL without yt-dlp

**Solution**:
```bash
# Install yt-dlp
pip install yt-dlp

# Or using apt (Ubuntu 22.04+)
sudo apt install yt-dlp

# Or using pipx
pipx install yt-dlp

# Verify
yt-dlp --version
```

**Alternative**: Use file input instead of URLs

---

### "FZF not available"

**Problem**: FZF features not working

**Impact**: Falls back to manual file path entry

**Solution** (optional, but recommended):
```bash
# Ubuntu/Debian
sudo apt install fzf

# macOS
brew install fzf

# Snap (any Linux)
sudo snap install fzf

# Verify
fzf --version
```

**Workaround**: Use manual file path input when prompted

---

## Audio Extraction Issues

### "Input file not found"

**Problem**: `File not found: /path/to/file.mp4`

**Diagnosis**:
```bash
# Check if file exists
ls -l /path/to/file.mp4

# Check current directory
pwd
ls
```

**Solutions**:
1. Use absolute paths:
   ```bash
   bun run src/index.ts /full/path/to/video.mp4
   ```

2. Navigate to directory first:
   ```bash
   cd /directory/with/video
   bun run ../multimedia-toolkit/src/index.ts video.mp4
   ```

3. Use FZF in interactive mode to browse and select files

---

### "Invalid time format"

**Problem**: Error when specifying start time

**Valid Formats**:
- `HH:MM:SS` - e.g., `01:30:45`
- `MM:SS` - e.g., `90:30` (90 minutes, 30 seconds)
- Seconds as integer - e.g., `5445`
- Seconds with decimals - e.g., `5445.5`

**Invalid Examples**:
- `1:30:45` - missing leading zero (use `01:30:45`)
- `90` alone without context - ambiguous
- Negative times

**Solution**:
```bash
# Correct usage
bun run src/index.ts -i video.mp4 -s 00:01:30 -d 60
bun run src/index.ts -i video.mp4 -s 90 -d 60
```

---

### "FFmpeg failed: codec not found"

**Problem**: Unsupported format or codec

**Common Causes**:
- Trying to use OPUS with old FFmpeg version
- Missing codec libraries

**Solution**:
```bash
# Update FFmpeg
sudo apt update
sudo apt upgrade ffmpeg

# Or install full version with all codecs
sudo apt install ffmpeg ffmpeg-extra

# Check available codecs
ffmpeg -codecs | grep opus
```

**Workaround**: Use a different output format:
```bash
# Instead of OPUS, use MP3
bun run src/index.ts -i video.mp4 -f mp3
```

---

### "Output file is silent"

**Problem**: Extracted audio has no sound

**Diagnosis**:
```bash
# Check input file
ffprobe input.mp4 2>&1 | grep "Audio:"

# If no audio stream, that's the problem
```

**Common Causes**:
1. Input file has no audio track
2. Audio track is in unsupported format
3. Clipping parameters beyond file duration

**Solutions**:
1. Verify input has audio:
   ```bash
   ffplay input.mp4  # Should hear audio
   ```

2. Check file duration before clipping:
   ```bash
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
   ```

3. Use interactive mode to view waveform first

---

### "Quality preset 'lossless' with MP3 format"

**Problem**: Warning or error about incompatible quality/format

**Explanation**: Lossless quality only works with FLAC or WAV

**Solution**:
```bash
# Use lossless with FLAC
bun run src/index.ts -i video.mp4 -f flac -q lossless

# Or use MP3 with appropriate quality
bun run src/index.ts -i video.mp4 -f mp3 -q music_high
```

---

## File Selection Issues

### FZF shows no files

**Problem**: FZF opens but shows empty list

**Diagnosis**:
```bash
# Check current directory has media files
ls *.{mp4,mkv,avi,mov,mp3,wav}

# Or use find
find . -type f \( -name "*.mp4" -o -name "*.mkv" \)
```

**Solutions**:
1. Navigate to correct directory
2. Use manual path input option
3. Check file extensions are supported

---

### "FZF canceled"

**Problem**: User pressed Esc or Ctrl+C in FZF

**Not an error**: This is expected behavior

**Options**:
- Choose "Retry" to reopen FZF
- Choose "Manual input" to type path
- Choose "Back" to return to menu

---

### Selected file path has spaces

**Problem**: Paths with spaces cause issues

**Status**: Should work correctly (paths are quoted)

**If issues persist**:
```bash
# Use quotes in manual input
"/path/with spaces/video.mp4"

# Or use FZF which handles this automatically
```

---

## URL Download Issues

### "yt-dlp failed to download"

**Problem**: URL download fails

**Common Causes**:
1. Invalid URL
2. Video is private/deleted
3. Geographic restrictions
4. yt-dlp needs updating

**Solutions**:

1. Verify URL works in browser

2. Update yt-dlp:
   ```bash
   pip install --upgrade yt-dlp
   # or
   sudo apt upgrade yt-dlp
   ```

3. Test yt-dlp directly:
   ```bash
   yt-dlp -F "https://youtube.com/watch?v=..."
   ```

4. Check for error messages in verbose mode

---

### "Video is age-restricted"

**Problem**: Cannot download age-restricted content

**Solution**: yt-dlp may need authentication
```bash
# Download with cookies (not currently supported in toolkit)
# As a workaround, download manually first:
yt-dlp -x --audio-format mp3 "URL"

# Then use toolkit on downloaded file
bun run src/index.ts downloaded_file.mp3
```

---

### "Download is very slow"

**Problem**: URL download takes forever

**Possible Causes**:
- Large file size
- Slow network connection
- Server throttling

**Workaround**: Download file first, then use toolkit
```bash
# Download video
yt-dlp "URL" -o video.mp4

# Then extract audio
bun run src/index.ts video.mp4
```

---

## Performance Issues

### Extraction is slow

**Problem**: FFmpeg processing takes a long time

**Expected**: Audio extraction speed depends on:
- Input file size
- Output quality
- CPU performance
- File format

**Optimization Tips**:

1. **Use appropriate quality**:
   ```bash
   # Don't use lossless unless needed
   bun run src/index.ts -i video.mp4 -q music_medium
   ```

2. **Check disk speed**:
   ```bash
   # Use local storage, not network drives
   ```

3. **Close other applications** to free up CPU

4. **For clipping, use fast seek**:
   - The toolkit automatically optimizes this

**Benchmarks**:
- Extracting from 2-hour video: 1-3 minutes
- Clipping 1 minute: 5-10 seconds

---

### High memory usage

**Problem**: System runs out of memory

**Solutions**:
1. Process files one at a time
2. Reduce `maxConcurrentJobs` in config
3. Close other applications
4. Use a lighter format (MP3 instead of FLAC)

---

## Output Issues

### "No space left on device"

**Problem**: Cannot write output file

**Diagnosis**:
```bash
# Check disk space
df -h ~/Music/AudioExtracted

# Check output directory
du -sh ~/Music/AudioExtracted
```

**Solutions**:
1. Free up disk space
2. Change output directory to different disk:
   ```json
   {
     "defaultOutputDir": "/mnt/external/Audio"
   }
   ```
3. Use compressed format (OPUS instead of FLAC)

---

### "Cannot create output directory"

**Problem**: Permission denied when creating output dir

**Diagnosis**:
```bash
# Check permissions
ls -ld ~/Music
ls -ld ~/Music/AudioExtracted
```

**Solution**:
```bash
# Create directory with correct permissions
mkdir -p ~/Music/AudioExtracted
chmod 755 ~/Music/AudioExtracted

# Or choose different directory
bun run src/index.ts --interactive
# [9] Settings > [1] Change output directory
```

---

### Output file exists

**Problem**: Overwrites existing file

**Current Behavior**: FFmpeg uses `-y` flag (overwrite)

**Workaround**: Output files include timestamp to avoid collisions

**If concerned**:
1. Backup important files first
2. Use custom output path with unique name
3. Check output directory before batch operations

---

### Wrong file organization

**Problem**: Files not organized as expected

**Check Configuration**:
```bash
bun run src/index.ts --config
```

**Fix Organization**:
```bash
bun run src/index.ts --interactive
# [9] Settings > Change organize settings
```

**Organization Options**:
- `date`: `YYYY/MM/`
- `source`: `source_name/`
- `format`: `mp3/`, `flac/`, etc.
- `custom`: `YYYY-MM-DD/`

---

## Configuration Issues

### Configuration not persisting

**Problem**: Settings reset after restart

**Diagnosis**:
```bash
# Check config file
cat ~/.multimedia-toolkit/config.json

# Check permissions
ls -l ~/.multimedia-toolkit/config.json
```

**Solutions**:
1. Ensure directory is writable:
   ```bash
   chmod 755 ~/.multimedia-toolkit
   chmod 644 ~/.multimedia-toolkit/config.json
   ```

2. Check disk not full:
   ```bash
   df -h ~
   ```

---

### Invalid JSON in config

**Problem**: `Could not parse config file`

**Fix**:
```bash
# Validate JSON
cat ~/.multimedia-toolkit/config.json | json_pp

# If invalid, delete and regenerate
rm ~/.multimedia-toolkit/config.json
bun run src/index.ts --config
```

---

## Interactive Mode Issues

### Terminal garbled after crash

**Problem**: Terminal shows strange characters

**Solution**:
```bash
# Reset terminal
reset

# Or
stty sane
```

---

### Menu not responding

**Problem**: Cannot select menu options

**Solutions**:
1. Ensure stdin/stdout not redirected
2. Run in proper terminal (not through SSH with issues)
3. Check terminal supports ANSI colors

---

### Ctrl+C doesn't exit

**Problem**: Cannot interrupt operation

**Solution**:
- Use `Ctrl+Z` to suspend, then `kill %1`
- Or close terminal window
- Report as bug if persistent

---

## Getting More Help

### Enable Verbose Mode

For detailed error information:

```bash
bun run src/index.ts -i video.mp4 --verbose
```

### Check Logs

View recent logs:

```bash
# Recent processes
bun run src/index.ts --list-history

# View log files
cat ~/.multimedia-toolkit/logs/$(date +%Y-%m-%d).json
```

### Collect Debug Information

When reporting issues, include:

1. **System info**:
   ```bash
   uname -a
   bun --version
   ffmpeg -version | head -1
   ```

2. **Error message**: Copy exact error text

3. **Command used**: What you ran

4. **Input file info**:
   ```bash
   ffprobe input.mp4
   ```

5. **Configuration**:
   ```bash
   cat ~/.multimedia-toolkit/config.json
   ```

---

## Common Error Messages Explained

### `Error: spawn ffmpeg ENOENT`
**Meaning**: FFmpeg not found in PATH
**Fix**: Install FFmpeg or configure `ffmpegPath`

### `Error: EISDIR: illegal operation on a directory`
**Meaning**: Tried to use directory as file
**Fix**: Specify file, not directory

### `Error: EACCES: permission denied`
**Meaning**: No permission to read/write file
**Fix**: Check file permissions or choose different location

### `FFmpeg exited with code 1`
**Meaning**: FFmpeg command failed
**Fix**: Check input file is valid, has audio track, and format is supported

---

## Still Having Issues?

1. **Search Existing Issues**: [GitHub Issues](https://github.com/your-repo/multimedia-toolkit/issues)

2. **Ask for Help**: Open a new issue with:
   - Description of problem
   - Steps to reproduce
   - Error messages
   - System info (see above)

3. **Check Documentation**:
   - [User Guide](./user-guide.md)
   - [FAQ](./faq.md)
   - [Configuration Guide](./configuration.md)

---

**Last Updated**: 2025-01-15
