# Technology Stack - Multimedia Toolkit

## Core Runtime & Language
- **Bun.js (v1.0+):** Primary runtime for its high performance and native TypeScript support.
- **TypeScript:** Ensuring type safety and maintainable code across the toolkit's modular architecture.

## Media Processing Engines
- **FFmpeg & FFprobe:** The industry-standard suite for all media transcoding, extraction, and metadata analysis.
- **yt-dlp (Optional):** Integrated for downloading high-quality media from over 1000+ streaming sites.

## User Interface & Interaction
- **fzf (Optional):** Utilized for fuzzy searching and interactive multi-file selection with live previews.
- **Custom Terminal UI:** Numbered menus and ASCII visualizations built directly for the terminal.

## Data Persistence & Tooling
- **SQLite (Bun-native):** Handles process history, clip presets, and metadata storage with zero external dependencies.
- **oxlint:** High-performance linter for maintaining code quality.
