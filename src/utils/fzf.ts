/**
 * FZF Integration Module
 * Provides fuzzy file selection using fzf for enhanced file browsing
 */

import { spawn } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import type { OperationResult } from '../types';

export interface FzfOptions {
  /**
   * Starting directory for file search
   */
  directory?: string;

  /**
   * Allow multiple file selection
   */
  multi?: boolean;

  /**
   * File extensions to filter (e.g., ['mp4', 'mkv', 'mp3'])
   */
  extensions?: string[];

  /**
   * Preview command for fzf
   */
  preview?: boolean;

  /**
   * Custom prompt message
   */
  prompt?: string;

  /**
   * Show hidden files
   */
  showHidden?: boolean;

  /**
   * Search depth limit
   */
  maxDepth?: number;
}

export class FzfSelector {
  /**
   * Escape a shell argument for safe single-quoting
   */
  private escapeForShell(arg: string): string {
    return `'${arg.replace(/'/g, `'"'"'`)}'`;
  }

  /**
   * Check if fzf is available on the system
   */
  async isFzfAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('which', ['fzf'], { stdio: 'pipe' });
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Select files using fzf
   */
  async selectFiles(options: FzfOptions = {}): Promise<OperationResult<string[]>> {
    const {
      directory = process.cwd(),
      multi = false,
      extensions = [],
      preview = true,
      prompt = 'Select file(s)',
      showHidden = false,
      maxDepth = undefined
    } = options;

    // Check if fzf is available
    if (!(await this.isFzfAvailable())) {
      return {
        success: false,
        error: 'fzf is not installed. Install with: sudo apt install fzf'
      };
    }

    // Validate directory
    if (!existsSync(directory)) {
      return {
        success: false,
        error: `Directory not found: ${directory}`
      };
    }

    if (!statSync(directory).isDirectory()) {
      return {
        success: false,
        error: `Not a directory: ${directory}`
      };
    }

    try {
      const files = await this.runFzf(directory, {
        multi,
        extensions,
        preview,
        prompt,
        showHidden,
        maxDepth
      });

      if (files.length === 0) {
        return {
          success: false,
          error: 'No files selected'
        };
      }

      return {
        success: true,
        data: files
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FZF selection failed'
      };
    }
  }

  /**
   * Run fzf with specified options
   */
  private async runFzf(
    directory: string,
    options: Required<Omit<FzfOptions, 'directory'>>
  ): Promise<string[]> {
    return new Promise((resolvePromise, reject) => {
      // Build the shell command for finding files
      let findCmd = `find "${directory}"`;

      if (options.maxDepth !== undefined) {
        findCmd += ` -maxdepth ${options.maxDepth}`;
      }

      if (!options.showHidden) {
        findCmd += ` -not -path '*/\\.*'`;
      }

      findCmd += ' -type f';

      // Add extension filters using proper shell syntax
      if (options.extensions.length > 0) {
        const extPatterns = options.extensions.map(ext => `-name '*.${ext}'`).join(' -o ');
        findCmd += ` \\( ${extPatterns} \\)`;
      }

      // Build fzf arguments
      const fzfArgs: string[] = [
        '--ansi',
        '--border',
        '--height=80%',
        '--reverse',
        `--prompt=${options.prompt} > `,
        '--info=inline',
        '--bind=ctrl-a:select-all,ctrl-d:deselect-all,ctrl-t:toggle-all',
        '--header=Tab: select multiple | Ctrl+A: select all | Enter: confirm | Esc: cancel'
      ];

      if (options.multi) {
        fzfArgs.push('--multi');
      }

      if (options.preview) {
        // Use ffprobe for media files, bat/cat for others
        const previewCmd = `
          file={};
          root="\${FZF_PREVIEW_ROOT:-}";
          if [ -n "$root" ]; then
            case "$file" in
              /*) ;;
              *) file="$root/$file" ;;
            esac;
          fi;
          if [ ! -e "$file" ]; then
            echo "File not found: $file";
            exit 0;
          fi;
          case "$file" in
            *.mp4|*.mkv|*.avi|*.mov|*.webm|*.mp3|*.wav|*.flac|*.aac|*.ogg|*.opus|*.m4a)
              echo "📹 Media File Information:";
              echo "─────────────────────────";
              if command -v ffprobe >/dev/null 2>&1; then
                if command -v bun >/dev/null 2>&1; then
                bun -e '(async () => {
                  const filePath = process.argv[1];
                  if (!filePath) {
                    console.error("No path provided");
                    process.exit(1);
                  }
                  const ffprobe = Bun.which("ffprobe");
                  if (!ffprobe) {
                    console.log("ffprobe not found");
                    process.exit(0);
                  }
                  const proc = Bun.spawn(
                    [ffprobe, "-v", "error", "-of", "json", "-show_format", "-show_streams", filePath],
                    { stdout: "pipe", stderr: "pipe" }
                  );
                  const [stdout, stderr, code] = await Promise.all([
                    proc.stdout.text(),
                    proc.stderr.text(),
                    proc.exited
                  ]);
                  if (code !== 0) {
                    console.log((stderr || ("ffprobe failed with exit code " + code)).trim());
                    process.exit(0);
                  }
                  let media;
                  try {
                    media = JSON.parse(stdout);
                  } catch (err) {
                    console.log("Unable to parse ffprobe JSON");
                    process.exit(0);
                  }
                  const fmt = (val) => (val === null || val === undefined || val === "" ? "N/A" : String(val));
                  const format = media.format || {};
                  const streams = Array.isArray(media.streams) ? media.streams : [];
                  const video = streams.find((s) => s && s.codec_type === "video");
                  const audio = streams.find((s) => s && s.codec_type === "audio");
                  const fileName = filePath.split("/").pop() || filePath;
                  const videoLabel = video
                    ? (fmt(video.codec_name) + " " + fmt(video.width) + "x" + fmt(video.height) +
                      (video.avg_frame_rate && video.avg_frame_rate !== "0/0" ? " @ " + video.avg_frame_rate + " fps" : ""))
                    : "N/A";
                  const audioLabel = audio
                    ? (fmt(audio.codec_name) +
                      (audio.channels ? " " + audio.channels + "ch" : "") +
                      (audio.sample_rate ? " @ " + audio.sample_rate + " Hz" : ""))
                    : "N/A";
                  const lines = [
                    "File: " + fileName,
                    "Container: " + fmt(format.format_name),
                    "Container Name: " + fmt(format.format_long_name),
                    "Duration: " + fmt(format.duration) + "s",
                    "Size: " + fmt(format.size) + " bytes",
                    "Bitrate: " + fmt(format.bit_rate),
                    "Video: " + videoLabel,
                    "Audio: " + audioLabel
                  ];
                  for (const line of lines) console.log(line);
                })().catch((err) => {
                  console.log(err?.message || err);
                  process.exit(0);
                });' -- "$file";
                else
                  info=$(ffprobe -v error -show_entries format=duration,size,bit_rate,format_name,format_long_name -of default=nw=1 "$file" 2>/dev/null) || {
                    echo "Unable to read media info (ffprobe error)";
                    exit 0;
                  }
                  duration=$(printf "%s\n" "$info" | awk -F= '$1=="duration"{print $2}')
                  size=$(printf "%s\n" "$info" | awk -F= '$1=="size"{print $2}')
                  bitrate=$(printf "%s\n" "$info" | awk -F= '$1=="bit_rate"{print $2}')
                  format_name=$(printf "%s\n" "$info" | awk -F= '$1=="format_name"{print $2}')
                  format_long_name=$(printf "%s\n" "$info" | awk -F= '$1=="format_long_name"{print $2}')
                  fmt() { if [ -n "$1" ]; then printf "%s" "$1"; else printf "N/A"; fi; }
                  fileName=\${file##*/};
                  echo "File: $fileName";
                  echo "Container: $(fmt "$format_name")";
                  echo "Container Name: $(fmt "$format_long_name")";
                  echo "Duration: $(fmt "$duration")s";
                  echo "Size: $(fmt "$size") bytes";
                  echo "Bitrate: $(fmt "$bitrate")";
                fi;
              else
                echo "ffprobe not found";
                ls -lh -- "$file";
              fi;
              ;;
            *.txt|*.md|*.json|*.yml|*.yaml|*.sh|*.ts|*.js|*.py)
              if command -v bat >/dev/null 2>&1; then
                bat --color=always --style=numbers --line-range=:50 "$file";
              else
                echo "📄 File Information:";
                echo "─────────────────────────";
                if command -v bun >/dev/null 2>&1; then
                  bun -e '(async () => {
                    const path = process.argv[1];
                    if (!path) {
                      console.error("No path provided");
                      process.exit(1);
                    }
                    const file = Bun.file(path);
                    const stats = await file.stat();
                    const formatMs = (ms) => (typeof ms === "number" ? new Date(ms).toISOString() : "N/A");
                    const lines = [
                      ["Path", path],
                      ["Size", stats.size + " bytes"],
                      ["Mode", stats.mode],
                      ["UID", stats.uid],
                      ["GID", stats.gid],
                      ["Accessed", formatMs(stats.atimeMs)],
                      ["Modified", formatMs(stats.mtimeMs)],
                      ["Changed", formatMs(stats.ctimeMs)],
                      ["Birth", formatMs(stats.birthtimeMs)],
                      ["Last Modified", file.lastModified]
                    ];
                    for (const [label, value] of lines) {
                      console.log(label + ": " + value);
                    }
                  })().catch((err) => {
                    console.error(err?.message || err);
                    process.exit(1);
                  });' -- "$file";
                else
                  file -- "$file";
                  echo "";
                  ls -lh -- "$file";
                fi;
              fi;
              ;;
            *)
              echo "📄 File Information:";
              echo "─────────────────────────";
              if command -v bun >/dev/null 2>&1; then
              bun -e '(async () => {
                const path = process.argv[1];
                if (!path) {
                  console.error("No path provided");
                  process.exit(1);
                }
                const file = Bun.file(path);
                const stats = await file.stat();
                const formatMs = (ms) => (typeof ms === "number" ? new Date(ms).toISOString() : "N/A");
                const lines = [
                  ["Path", path],
                  ["Size", stats.size + " bytes"],
                  ["Mode", stats.mode],
                  ["UID", stats.uid],
                  ["GID", stats.gid],
                  ["Accessed", formatMs(stats.atimeMs)],
                  ["Modified", formatMs(stats.mtimeMs)],
                  ["Changed", formatMs(stats.ctimeMs)],
                  ["Birth", formatMs(stats.birthtimeMs)],
                  ["Last Modified", file.lastModified]
                ];
                for (const [label, value] of lines) {
                  console.log(label + ": " + value);
                }
                })().catch((err) => {
                  console.error(err?.message || err);
                  process.exit(1);
                });' -- "$file";
              else
                file -- "$file";
                echo "";
                ls -lh -- "$file";
              fi;
              ;;
          esac
        `.trim();

        fzfArgs.push(
          '--preview',
          previewCmd,
          '--preview-window=right:50%:wrap'
        );
      }

      // Use shell to execute the piped command properly
      const shellCmd = `${findCmd} 2>/dev/null | fzf ${fzfArgs.map(arg => this.escapeForShell(arg)).join(' ')}`;

      const previewRoot = resolve(directory);
      const proc = spawn('bash', ['-c', shellCmd], {
        stdio: ['inherit', 'pipe', 'inherit'],
        env: {
          ...process.env,
          SHELL: process.env.SHELL && process.env.SHELL.includes('bash') ? process.env.SHELL : 'bash',
          FZF_PREVIEW_ROOT: previewRoot
        }
      });

      let output = '';

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      proc.on('error', (err) => {
        reject(new Error(`FZF command failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const files = output
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(f => resolve(f.trim()));
          resolvePromise(files);
        } else if (code === 1) {
          // No match found or user pressed Esc
          resolvePromise([]);
        } else if (code === 130) {
          // User canceled with Ctrl+C
          resolvePromise([]);
        } else {
          // Other exit codes - treat as canceled
          resolvePromise([]);
        }
      });
    });
  }

  /**
   * Select a single file
   */
  async selectFile(options: Omit<FzfOptions, 'multi'> = {}): Promise<OperationResult<string>> {
    const result = await this.selectFiles({ ...options, multi: false });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data![0]
    };
  }

  /**
   * Select media files specifically
   */
  async selectMediaFiles(directory?: string, multi: boolean = false): Promise<OperationResult<string[]>> {
    return this.selectFiles({
      directory,
      multi,
      extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'],
      preview: true,
      prompt: multi ? 'Select media file(s)' : 'Select media file'
    });
  }
}

export const fzfSelector = new FzfSelector();
