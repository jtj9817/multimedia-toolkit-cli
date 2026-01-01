# Multimedia Toolkit Documentation

Welcome to the comprehensive documentation for Multimedia Toolkit - a powerful Bun.js-based audio extraction and conversion tool.

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](./getting-started.md)** - Installation, setup, and first steps
- **[Tutorial: Your First Audio Extraction](./tutorial-first-extraction.md)** - Step-by-step walkthrough

### User Guides
- **[User Guide](./user-guide.md)** - Complete feature reference and usage examples
- **[Interactive Mode Guide](./interactive-mode.md)** - Using the interactive CLI interface
- **[Command Line Reference](./cli-reference.md)** - All CLI flags and options
- **[Configuration Guide](./configuration.md)** - Customizing default settings

### Features
- **[Audio Clipping](./features/clipping.md)** - Extract specific segments with precision
- **[Batch Processing](./features/batch-processing.md)** - Process multiple files efficiently
- **[Chapter Extraction](./features/chapters.md)** - Split media by chapter markers
- **[Silence Detection](./features/silence-detection.md)** - Auto-split by silence
- **[URL Downloads](./features/url-downloads.md)** - YouTube and streaming support
- **[Presets System](./features/presets.md)** - Save and reuse time clip configurations
- **[FZF Integration](./features/fzf-integration.md)** - Enhanced file selection

### Technical Documentation
- **[Architecture Overview](./architecture.md)** - System design and module structure
- **[API Reference](./api-reference.md)** - Module and function documentation
- **[Database Schema](./database-schema.md)** - SQLite data structures
- **[FFmpeg Integration](./ffmpeg-integration.md)** - How FFmpeg is utilized

### Advanced Topics
- **[Quality Presets Explained](./quality-presets.md)** - Understanding bitrates and encoding
- **[Output Organization](./output-organization.md)** - Auto-organizing files by date/source/format
- **[Metadata Handling](./metadata-handling.md)** - Preserving and stripping metadata
- **[Waveform Visualization](./waveform-visualization.md)** - ASCII waveform rendering

### Development
- **[Development Guide](./development.md)** - Setting up development environment
- **[Contributing](./contributing.md)** - How to contribute to the project
- **[Testing Guide](./testing.md)** - Running and writing tests
- **[Code Style](./code-style.md)** - TypeScript conventions

### Troubleshooting
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions
- **[FAQ](./faq.md)** - Frequently asked questions
- **[Error Messages](./error-messages.md)** - Understanding error output

## 🚀 Quick Links

### Most Common Tasks
1. [Extract audio from a video file](./user-guide.md#basic-extraction)
2. [Clip specific segments](./user-guide.md#clipping-audio)
3. [Download from YouTube](./features/url-downloads.md)
4. [Batch process a directory](./features/batch-processing.md)
5. [Extract chapters](./features/chapters.md)

### Getting Help
- [Troubleshooting Guide](./troubleshooting.md) - Start here if something isn't working
- [FAQ](./faq.md) - Common questions answered
- [GitHub Issues](https://github.com/your-repo/multimedia-toolkit/issues) - Report bugs or request features

## 📖 Documentation Conventions

Throughout this documentation, you'll see these indicators:

- 💡 **Tip** - Helpful suggestions and best practices
- ⚠️ **Warning** - Important considerations or limitations
- 📝 **Note** - Additional context or information
- 🔧 **Advanced** - Advanced usage or technical details
- ⚡ **Performance** - Optimization tips

## Project Overview

Multimedia Toolkit combines the functionality of multiple shell scripts into a unified, feature-rich application:

- **Extract audio** from video files (MP4, MKV, AVI, MOV, WEBM)
- **Download and convert** from URLs (YouTube, streaming sites)
- **Clip precise segments** with multiple time ranges
- **Split automatically** by silence or chapter markers
- **Batch process** entire directories
- **Organize outputs** by date, source, or format
- **Interactive CLI** with fuzzy file search (FZF integration)

## System Requirements

- **Runtime**: [Bun](https://bun.sh) v1.0+
- **Required Tools**: FFmpeg and FFprobe
- **Optional Tools**: yt-dlp (for URL downloads), fzf (enhanced file selection)
- **Operating System**: Linux, macOS (Windows via WSL)

## Version Information

Current Version: **1.0.0**

This documentation reflects features available in version 1.0.0. For version-specific information, see the [Changelog](../CHANGELOG.md).

## Contributing to Documentation

Found an error or want to improve the docs? See our [Documentation Contribution Guide](./contributing-docs.md).

---

**Happy audio extracting!** 🎵
