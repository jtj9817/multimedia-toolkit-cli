# Video-to-Video Transcoding Plan

## Phase 1: Scope and UX definition [checkpoint: 6e7ed2f]
GOAL:
Define the product surface and supported conversion targets for video-to-video transcoding.

CONTEXT:
The current toolkit is audio-focused, with FFmpeg wrappers and CLI flows centered on extraction and audio conversion. A new video pipeline must align with existing CLI/config patterns.

TASKS:
- [x] Inventory confirms FFmpeg usage is centralized in `src/media/ffmpeg.ts`, logging is handled via `src/utils/logger.ts`, and CLI flows live in `src/index.ts` and `src/cli/interface.ts`. [inventory checked]
- [x] Defined primary targets: Any-to-WebM, Any-to-MP4, Any-to-MKV, captured in `video-transcoding-presets.json`. [verified existing file]
- [x] Baseline profile behavior per target includes container, default video/audio codecs, and resolution policy (WebM defaults to 1080p). [verified in json]
- [x] Proposed UX surface: add a "Transcode Video" menu entry alongside existing audio options, plus CLI flags `--video-format`, `--video-quality`, `--resolution`, and `--video-preset`. [defined in plan]

REQUIREMENTS:
- WebM default uses 1080p output and is optimized for Discord.
- WebM audio settings must include the optimized Opus settings from commit `d47cdb4ddc63787ca74076a699dd3fd2eac04d23` (`optimized_webm` preset and `-vbr on -compression_level 10 -application audio`).
- Profiles cover common HandBrake-style options (quality target, resolution scaling, and container selection) without adding a complex UI.

GUIDELINES:
- Keep CLI flags and config keys in kebab-case.
- Preserve existing audio conversion behaviors and defaults.
- Prefer explicit, well-named presets over ad-hoc FFmpeg flags in the UI.

## Phase 2: Core FFmpeg pipeline [checkpoint: afe40e8]
GOAL:
Implement the FFmpeg command builder for video-to-video conversions with reusable presets.

CONTEXT:
The current `FFmpegWrapper` supports audio extraction and clip/chapter workflows. Video transcoding requires new builder methods and type support, while reusing logging and output path helpers.

TASKS:
- [x] Added `VideoOutputFormat`, transcode preset types, and per-target defaults in `src/types.ts` and `src/media/video-presets.ts`. [verified with tests]
- [x] Implemented `transcodeVideo` in `src/media/ffmpeg.ts` with `OperationResult` output matching existing patterns. [verified existing implementation]
- [x] Added Any-to-WebM, Any-to-MP4, Any-to-MKV presets with codec, CRF, and scaling defaults. [verified in video-presets.ts]
- [x] Implemented resolution scaling to 1080p with aspect ratio preservation and padding for the WebM preset. [verified in transcodeVideo logic]
- [x] Applied WebM audio settings from commit `d47cdb4ddc63787ca74076a699dd3fd2eac04d23` using Opus with `-vbr on -compression_level 10 -application audio` and the `optimized_webm` preset values. [verified in transcodeVideo logic]

REQUIREMENTS:
- WebM defaults to 1080p and Discord-optimized settings.
- MP4 defaults to H.264 + AAC unless overridden.
- MKV defaults to H.264 or H.265 + AAC/Opus (documented and configurable).
- Provide dry-run support that prints the full FFmpeg command.

GUIDELINES:
- Use `@/` import aliases and 2-space indentation.
- Keep FFmpeg argument assembly deterministic and testable.
- Reuse existing metadata preservation and thread settings where applicable.

## Phase 3: CLI, config, and logging integration [checkpoint: f6b23b3]
GOAL:
Expose video transcoding through CLI options, interactive menus, and configuration defaults.

CONTEXT:
The CLI already handles format selection and logging for audio operations. Video transcodes should follow the same UX patterns.

TASKS:
- [x] Added an interactive "Transcode Video" menu entry that uses `transcodeVideo`. [verified in interactive-commands.ts]
- [x] Added CLI flags for `--video-format`, `--video-quality`, `--resolution`, and `--video-preset` aligned to Phase 2 presets. [verified in index.ts]
- [x] Added config defaults for video output format, resolution, and preset, plus settings menu controls. [verified in config.ts and settings-menu.ts]
- [x] Extended logging records, CSV exports, and DB schema to track video preset, resolution, and output format. [verified in process-logging.ts, logger.ts, and migrations.ts]
- [x] Updated docs to describe video-to-video workflows and the new flags. [verified and updated docs/]

REQUIREMENTS:
- Any-to-WebM is the first-class option with Discord-optimized defaults.
- Output path organization must respect existing `organizeBy` settings.
- CLI help text mirrors actual defaults and preset names.

GUIDELINES:
- Keep flag parsing consistent with existing `src/index.ts` patterns.
- Avoid breaking changes to existing audio CLI workflows.
- Use the same error handling and progress output style as current commands.

## Phase 4: Validation and test coverage
GOAL:
Ensure the transcoding feature is reliable, testable, and documented.

CONTEXT:
The repo uses Bun tests and manual smoke tests (including FFmpeg and FZF dependencies). New video transcode functionality needs coverage at the command-building layer and at least one manual validation run.

TASKS:
- [ ] Add unit tests for FFmpeg command assembly for each target format.
- [ ] Add tests for resolution scaling and preset mapping (including WebM optimized audio flags).
- [ ] Validate with sample inputs from `docs/samples` or a staged local fixture.
- [ ] Update docs with examples for Any-to-WebM, Any-to-MP4, Any-to-MKV.

REQUIREMENTS:
- `bun test` passes with new tests.
- Manual conversion examples produce playable outputs with expected container/codec values.
- WebM outputs use 1080p resolution and the optimized Opus audio settings.

GUIDELINES:
- Document any external binary requirements in test descriptions.
- Keep tests co-located with the feature they cover.
- Avoid committing large media artifacts; use lightweight sample clips.
