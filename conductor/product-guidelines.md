# Product Guidelines - Multimedia Toolkit

## Communication Tone
- **Technical & Precise:** The toolkit uses standard industry terminology (bitrate, codecs, CRF) to ensure clarity for its target audience. Error messages are detailed and actionable, providing enough context for users to troubleshoot media-specific issues effectively.

## Documentation Standards
- **Markdown-First & Comprehensive:** All major features must be documented in the `docs/` directory using Markdown. Documentation should include high-level overviews, specific CLI usage examples, and guides for navigating interactive menus. Each feature document should serve as both a user guide and a technical reference.

## Visual and Interactive Design
- **Consistency:** Interaction patterns are standardized across the application. Menus follow a consistent numbering system and always provide a clear exit or "back" path. Output formatting (logs, tables, status messages) is uniform across all modules.
- **Visual Feedback:** The toolkit provides active feedback during media processing. This includes progress indicators for long-running tasks, ASCII-based waveform visualizations for audio analysis, and color-coded status messages (e.g., green for success, red for errors) to improve glanceability in the terminal.
